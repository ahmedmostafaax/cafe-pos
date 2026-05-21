const { rowToOrder, orderToRow } = require('../models/mappers');
const { getDayRange, formatDayKey } = require('../utils/time');

function createOrderService({ statements, constants }) {
  const {
    stmtInsert,
    stmtUpsertOrder,
    stmtUpdateStatusWithExtra,
    stmtUpdateItemsWithExtra,
    stmtGetActive,
    stmtGetPreparing,
    stmtGetAll,
    stmtGetByStatus,
    stmtGetActivePaged,
    stmtGetPreparingPaged,
    stmtGetAllPaged,
    stmtGetByStatusPaged,
    stmtGetByCreatedRange,
    stmtGetByStatusCreatedRange,
    stmtGetActiveCreatedRange,
    stmtGetPreparingCreatedRange,
    stmtGetById,
    stmtGetByTableActive,
    stmtSoftDeleteOrder,
    stmtCountByCreatedAtRange,
    stmtHasOrderId,
  } = statements;
  const { ACTIVE_DB_STATUSES, OPEN_DB_STATUSES } = constants;

  function mapClientStatusToDb(status) {
    return status === 'preparing' ? 'active' : status;
  }

  function buildOrderIdByDayCount(createdAt = Date.now()) {
    const { startMs, endMs } = getDayRange(createdAt);
    const dayKey = formatDayKey(createdAt);
    let sequence = Number(stmtCountByCreatedAtRange.get(startMs, endMs)?.cnt || 0) + 1;
    let orderId = `${dayKey}-${String(sequence).padStart(3, '0')}`;
    while (stmtHasOrderId.get(orderId)) {
      sequence += 1;
      orderId = `${dayKey}-${String(sequence).padStart(3, '0')}`;
    }
    return orderId;
  }

  function parsePositiveInt(value, fallback, max) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return Math.min(parsed, max);
  }

  function parseOrderTimeRange(query = {}) {
    if (query.month) {
      const match = String(query.month).trim().match(/^(\d{4})-(\d{2})$/);
      if (match) {
        const year = Number(match[1]);
        const monthIndex = Number(match[2]) - 1;
        const start = new Date(year, monthIndex, 1);
        const end = new Date(year, monthIndex + 1, 1);
        if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime())) {
          return { from: start.getTime(), to: end.getTime() };
        }
      }
    }
    const from = query.from !== undefined ? Number(query.from) : null;
    const to = query.to !== undefined ? Number(query.to) : null;
    if (Number.isFinite(from) && Number.isFinite(to) && to > from) return { from, to };
    return null;
  }

  function getOrderRows(query = {}) {
    const status = query.status;
    const statusExact = query.statusExact;
    const limit = parsePositiveInt(query.limit, 500, 5000);
    const offset = parsePositiveInt(query.offset, 0, 100000000);
    const timeRange = parseOrderTimeRange(query);
    const hasPagingOrRange = timeRange || query.limit !== undefined || query.offset !== undefined || query.month !== undefined || query.from !== undefined || query.to !== undefined;
    const normalizedExact = statusExact === undefined || statusExact === null || statusExact === '' ? '' : String(statusExact).trim().toLowerCase();
    const normalized = status === undefined || status === null || status === '' ? '' : String(status).trim().toLowerCase();

    if (normalizedExact) {
      if (!hasPagingOrRange) {
        if (normalizedExact === 'preparing') return stmtGetPreparing.all(...ACTIVE_DB_STATUSES);
        return stmtGetByStatus.all(mapClientStatusToDb(normalizedExact));
      }

      if (timeRange) {
        if (normalizedExact === 'preparing') return stmtGetPreparingCreatedRange.all(...ACTIVE_DB_STATUSES, timeRange.from, timeRange.to, limit, offset);
        return stmtGetByStatusCreatedRange.all(mapClientStatusToDb(normalizedExact), timeRange.from, timeRange.to, limit, offset);
      }

      if (normalizedExact === 'preparing') return stmtGetPreparingPaged.all(...ACTIVE_DB_STATUSES, limit, offset);
      return stmtGetByStatusPaged.all(mapClientStatusToDb(normalizedExact), limit, offset);
    }

    if (!hasPagingOrRange) {
      if (!normalized) return stmtGetAll.all();
      // 前端 /api/orders?status=active 约定：返回当前订单（制作中 + 待付款）。
      // 若后台需要精确的制作中且不含待付款，使用 /api/orders?statusExact=preparing。
      if (normalized === 'active' || normalized === 'preparing') return stmtGetActive.all(...OPEN_DB_STATUSES);
      return stmtGetByStatus.all(mapClientStatusToDb(normalized));
    }

    if (timeRange) {
      if (!normalized) return stmtGetByCreatedRange.all(timeRange.from, timeRange.to, limit, offset);
      if (normalized === 'active' || normalized === 'preparing') return stmtGetActiveCreatedRange.all(...OPEN_DB_STATUSES, timeRange.from, timeRange.to, limit, offset);
      return stmtGetByStatusCreatedRange.all(mapClientStatusToDb(normalized), timeRange.from, timeRange.to, limit, offset);
    }

    if (!normalized) return stmtGetAllPaged.all(limit, offset);
    if (normalized === 'active' || normalized === 'preparing') return stmtGetActivePaged.all(...OPEN_DB_STATUSES, limit, offset);
    return stmtGetByStatusPaged.all(mapClientStatusToDb(normalized), limit, offset);
  }

  function getActiveOrders() {
    return stmtGetActive.all(...OPEN_DB_STATUSES).map(rowToOrder);
  }
  function listOrders(query = {}) {
    return getOrderRows(query).map(rowToOrder);
  }
  function getOrdersByTable(tableId) {
    return stmtGetByTableActive.all(tableId, ...OPEN_DB_STATUSES).map(rowToOrder);
  }
  function getOrderById(id) {
    return rowToOrder(stmtGetById.get(id));
  }
  function createOrder(order) {
    if(!order || typeof order !== 'object') {
      const err = new Error('订单无效');
      err.statusCode = 400;
      throw err;
    }
    const createdAt = Date.now();
    const id = buildOrderIdByDayCount(createdAt);
    const normalizedItems = Array.isArray(order.items)
      ? order.items.map((item) => ({ ...item, orderId: id }))
      : [];
    const nextOrder = { ...order, id, createdAt, items: normalizedItems };
    stmtInsert.run(orderToRow(nextOrder));
    return rowToOrder(stmtGetById.get(id));
  }
  function updateStatus({id,status,payMethod,payment,updatedAt}) {
    if(!id||!status) return null;
    const existingRow = stmtGetById.get(id);
    if(!existingRow) return null;
    const currentOrder = rowToOrder(existingRow);
    const nextOrder = {
      ...currentOrder,
      status,
      payMethod: payMethod ?? currentOrder.payMethod,
      updatedAt: Number(updatedAt ?? Date.now()),
      payment: {
        ...(currentOrder.payment || {}),
        ...(payment || {}),
        method: payment?.method ?? payMethod ?? currentOrder?.payment?.method ?? currentOrder.payMethod,
      },
    };
    stmtUpdateStatusWithExtra.run({
      id,
      status: mapClientStatusToDb(status),
      extra: orderToRow(nextOrder).extra,
    });
    return rowToOrder(stmtGetById.get(id));
  }
  function updateItems({id,items,status}) {
    if(!id || !Array.isArray(items)) return null;
    const existingRow = stmtGetById.get(id);
    if(!existingRow) return null;
    const currentOrder = rowToOrder(existingRow);
    const nextOrder = {
      ...currentOrder,
      items,
      status: status ?? currentOrder.status,
      updatedAt: Date.now(),
    };
    stmtUpdateItemsWithExtra.run({
      id,
      items: JSON.stringify(items),
      status: mapClientStatusToDb(nextOrder.status || 'preparing'),
      extra: orderToRow(nextOrder).extra,
    });
    return rowToOrder(stmtGetById.get(id));
  }
  function deleteOrder(payload = {}) {
    const { id, deletedByName = '', deletedReason = '' } = payload || {};
    if(!id){
      const err = new Error('订单 ID 不能为空');
      err.statusCode = 400;
      throw err;
    }
    const orderRow = stmtGetById.get(id);
    if(!orderRow){
      const err = new Error('订单不存在');
      err.statusCode = 404;
      throw err;
    }
    if(orderRow.status === 'cancelled') return { id, alreadyCancelled: true };
    const now = Date.now();
    const currentOrder = rowToOrder(orderRow);
    const nextOrder = {
      ...currentOrder,
      status: 'cancelled',
      updatedAt: now,
      deletedAt: now,
      deletedByName: String(deletedByName || '').trim(),
      deletedReason: String(deletedReason || '手动删除').trim(),
    };
    stmtSoftDeleteOrder.run({ id, extra: orderToRow(nextOrder).extra });
    return { id };
  }
  function reportPayment({ id, method }) {
    if(!id || !method) return null;
    const row = stmtGetById.get(id);
    if(!row) return null;
    const order = rowToOrder(row);
    if(order.status !== 'unpaid') return null;
    const nextOrder = { ...order, customerPaymentReported: method, updatedAt: Date.now() };
    stmtUpsertOrder.run(orderToRow(nextOrder));
    return nextOrder;
  }

  return {
    mapClientStatusToDb,
    buildOrderIdByDayCount,
    getOrderRows,
    getActiveOrders,
    listOrders,
    getOrdersByTable,
    getOrderById,
    createOrder,
    updateStatus,
    updateItems,
    deleteOrder,
    reportPayment,
  };
}

module.exports = { createOrderService };
