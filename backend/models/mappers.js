const { safeJSONParse } = require('../utils/json');

function rowToOrder(row) {
  if (!row) return null;
  const extra = safeJSONParse(row.extra, {});
  const items = safeJSONParse(row.items, []).map(item => ({
    ...item,
    price: Number(item?.price ?? 0),
    qty: Number(item?.qty ?? 1),
    optionDelta: Number(item?.optionDelta ?? 0),
    selectedOptions: Array.isArray(item?.selectedOptions)
      ? item.selectedOptions
      : safeJSONParse(item?.selectedOptions, []),
  })).map(item => ({
    ...item,
    selectedOptions: item.selectedOptions.map(group => ({
      ...group,
      choices: Array.isArray(group?.choices) ? group.choices.map(choice => ({
        ...choice,
        priceDelta: Number(choice?.priceDelta ?? 0),
      })) : [],
    })),
  }));
  const total = Number(row.totalPrice ?? 0);
  const discount = Number(extra.discount ?? extra?.totals?.discountRate ?? 1);
  const subtotal = Number(extra?.totals?.subtotal ?? (discount ? total / discount : total));
  return {
    id: row.id,
    tableNo: row.tableId,
    items,
    status: row.status === 'active' ? 'preparing' : row.status,
    total,
    subtotal,
    totals: {
      subtotal,
      discountRate: discount,
      discountAmount: Number(extra?.totals?.discountAmount ?? (subtotal - total)),
      total,
    },
    createdAt: Number(row.createdAt ?? 0),
    updatedAt: Number(extra.updatedAt ?? row.createdAt ?? Date.now()),
    guests: Number(extra.guests ?? 1),
    dineIn: extra.dineIn ?? true,
    payMethod: extra.payMethod ?? extra?.payment?.method ?? '',
    payment: {
      method: extra?.payment?.method ?? extra.payMethod ?? '',
      status: extra?.payment?.status ?? ((row.status === 'unpaid') ? 'pending' : 'paid'),
      confirmedAt: extra?.payment?.confirmedAt ?? null,
    },
    discount,
    fromTable: extra.fromTable ?? false,
    source: extra?.source ?? { channel: (extra.fromTable ? 'table-qr' : 'front-desk'), createdById: null, createdByName: '' },
    service: extra?.service ?? { waiterId: null, waiterName: '', mode: 'normal', note: '' },
    note: extra?.note ?? extra?.service?.note ?? '',
    deletedAt: Number(extra.deletedAt ?? 0) || null,
    deletedByName: extra.deletedByName ?? '',
    deletedReason: extra.deletedReason ?? '',
    customerPaymentReported: extra.customerPaymentReported || null,
    schemaVersion: Number(extra.schemaVersion ?? 1),
  };
}

function orderToRow(order) {
  let dbStatus = order.status; if(dbStatus==='preparing') dbStatus='active';
  const total = Number(order.total ?? order.totalPrice ?? order?.totals?.total ?? 0);
  const discount = Number(order.discount ?? order?.totals?.discountRate ?? 1);
  const subtotal = Number(order.subtotal ?? order?.totals?.subtotal ?? (discount ? total / discount : total));
  const extra = {
    guests: order.guests,
    dineIn: order.dineIn,
    payMethod: order.payMethod ?? order?.payment?.method ?? '',
    discount,
    fromTable: order.fromTable,
    updatedAt: Number(order.updatedAt ?? Date.now()),
    schemaVersion: Number(order.schemaVersion ?? 1),
    note: order.note ?? '',
    deletedAt: Number(order.deletedAt ?? 0) || null,
    deletedByName: order.deletedByName ?? '',
    deletedReason: order.deletedReason ?? '',
    customerPaymentReported: order.customerPaymentReported || null,
    payment: {
      method: order?.payment?.method ?? order.payMethod ?? '',
      status: order?.payment?.status ?? (order.status === 'unpaid' ? 'pending' : 'paid'),
      confirmedAt: order?.payment?.confirmedAt ?? null,
    },
    source: order?.source ?? { channel: order.fromTable ? 'table-qr' : 'front-desk', createdById: null, createdByName: '' },
    service: order?.service ?? { waiterId: null, waiterName: '', mode: 'normal', note: '' },
    totals: {
      subtotal,
      discountRate: discount,
      discountAmount: Number(order?.totals?.discountAmount ?? (subtotal - total)),
      total,
    },
  };
  return {
    id: order.id,
    tableId: order.tableNo || order.tableId || '',
    items: JSON.stringify(order.items || []),
    status: dbStatus,
    totalPrice: total,
    createdAt: order.createdAt || Date.now(),
    extra: JSON.stringify(extra),
  };
}

function rowToUser(row) { if(!row)return null; return {id:row.id,name:row.name,username:row.username,password:row.password,roles:safeJSONParse(row.roles, [])}; }

function userToRow(u) { return {id:u.id,name:u.name||'',username:u.username||'',password:u.password||'',roles:JSON.stringify(u.roles||[])}; }

function rowToMenuItem(row) {
  if(!row) return null;
  return { id:row.id, name:row.name, station:row.station, category:row.category, price:Number(row.price ?? 0),
    desc:row.desc||'', recipe:row.recipe||'', available:Boolean(row.available),
    imageUrl:row.imageUrl||'', isSignature:Boolean(row.isSignature),
    options:safeJSONParse(row.options, []).map(group => ({
      ...group,
      choices: Array.isArray(group?.choices) ? group.choices.map(choice => ({
        ...choice,
        priceDelta: Number(choice?.priceDelta ?? 0),
      })) : [],
    })) };
}

function menuItemToRow(item) {
  return { id:item.id, name:item.name||'', station:item.station||'kitchen', category:item.category||'',
    price:item.price||0, desc:item.desc||'', recipe:item.recipe||'', available:item.available?1:0,
    options:JSON.stringify(item.options||[]), sort:item.sort??item.id??0,
    imageUrl:item.imageUrl||'', isSignature:item.isSignature?1:0 };
}

function rowToDailyReport(row) {
  if (!row) return null;
  return {
    day: row.day,
    startAt: Number(row.startAt || 0),
    endAt: Number(row.endAt || 0),
    summary: safeJSONParse(row.summary, {}),
    hourly: safeJSONParse(row.hourly, []),
    topItems: safeJSONParse(row.topItems, []),
    categoryBreakdown: safeJSONParse(row.categoryBreakdown, []),
    payMethodBreakdown: safeJSONParse(row.payMethodBreakdown, []),
    orderCount: Number(row.orderCount || 0),
    revenue: Number(row.revenue || 0),
    updatedAt: Number(row.updatedAt || 0),
  };
}

module.exports = {
  rowToOrder,
  orderToRow,
  rowToUser,
  userToRow,
  rowToMenuItem,
  menuItemToRow,
  rowToDailyReport,
};

