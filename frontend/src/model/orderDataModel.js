import { TAKEAWAY_TABLE_ID } from "./orderOptionUtils";

const ORDER_STATUSES = new Set(["unpaid", "preparing", "served", "cancelled", "archived"]);
const ITEM_STATUSES = new Set(["pending", "completed", "cancelled"]);
const SERVICE_MODES = new Set(["normal", "priority", "vip"]);
const PAYMENT_STATUSES = new Set(["pending", "paid", "void"]);

export const ORDER_SCHEMA_VERSION = 2;

const toText = (value, fallback = "") => {
  if (typeof value !== "string") return fallback;
  const next = value.trim();
  return next || fallback;
};

const toNumber = (value, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toTimestamp = (value, fallback = Date.now()) => {
  const next = Number(value);
  if (Number.isFinite(next) && next > 0) return Math.round(next);
  if (fallback === null) return null;
  return Math.round(toNumber(fallback, Date.now()));
};

const toId = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  const next = String(value).trim();
  return next || fallback;
};

// tablet 角色已合并到 front：前端单点折叠，db 不动（旧 tablet 行经 normalize 后等同 front）
const toRoles = (roles) => (Array.isArray(roles)
  ? [...new Set(
      roles
        .map((role) => toText(role))
        .filter(Boolean)
        .map((role) => (role === "tablet" ? "front" : role))
    )]
  : []);

const isPlainObject = (value) => value && typeof value === "object" && !Array.isArray(value);

const buildUsersById = (users = []) =>
  users.reduce((acc, user) => {
    const id = toId(user?.id);
    if (!id) return acc;
    acc[id] = user;
    return acc;
  }, {});

const resolvePaymentStatus = (orderStatus, paymentStatus) => {
  if (PAYMENT_STATUSES.has(paymentStatus)) return paymentStatus;
  if (orderStatus === "cancelled") return "void";
  if (orderStatus === "unpaid") return "pending";
  return "paid";
};

const resolveServiceMode = (value) => {
  if (SERVICE_MODES.has(value)) return value;
  return "normal";
};

const resolveOrderStatus = (value) => (ORDER_STATUSES.has(value) ? value : "preparing");

const resolveItemStatus = (value, done) => {
  if (ITEM_STATUSES.has(value)) return value;
  return done ? "completed" : "pending";
};

const deriveOptionsHash = (item) => toText(item?.optionsHash, "default");

const deriveItemKey = (item, index = 0) => {
  const cartKey = toText(item?.cartKey);
  if (cartKey) return cartKey;
  const itemKey = toText(item?.itemKey);
  if (itemKey) return itemKey;
  const menuId = toId(item?.menuId ?? item?.id, `item-${index}`);
  const note = toText(item?.note);
  return `${menuId}::${deriveOptionsHash(item)}${note ? `::note:${encodeURIComponent(note)}` : ""}`;
};

const normalizeOrderItem = (item, index = 0) => {
  const qty = Math.max(1, Math.round(toNumber(item?.qty, 1)));
  const price = +toNumber(item?.price, 0).toFixed(2);
  const basePrice = +toNumber(item?.basePrice, price).toFixed(2);
  const optionDelta = +toNumber(item?.optionDelta, price - basePrice).toFixed(2);
  const done = !!item?.done;
  const station = item?.station === "bar" ? "bar" : "kitchen";
  const optionsHash = deriveOptionsHash(item);
  const itemKey = deriveItemKey(item, index);
  return {
    ...item,
    menuId: item?.menuId ?? item?.id ?? `item-${index}`,
    cartKey: itemKey,
    itemKey,
    optionsHash,
    name: toText(item?.name, "未命名菜品"),
    station,
    category: toText(item?.category),
    basePrice,
    optionDelta,
    price,
    qty,
    done,
    status: resolveItemStatus(item?.status, done),
    note: toText(item?.note),
    selectedOptions: Array.isArray(item?.selectedOptions) ? item.selectedOptions : [],
  };
};

const computeTotals = (items, discountRate = 1, totalOverride = null) => {
  const subtotal = +items.reduce((sum, item) => sum + toNumber(item.price, 0) * toNumber(item.qty, 0), 0).toFixed(2);
  const discount = clamp(toNumber(discountRate, 1), 0, 1);
  const derivedTotal = +(subtotal * discount).toFixed(2);
  const total = +toNumber(totalOverride, derivedTotal).toFixed(2);
  const discountAmount = +(subtotal - total).toFixed(2);
  return {
    subtotal,
    discountRate: discount,
    discountAmount,
    total,
  };
};

const resolveServiceInfo = (order, tableInfo, usersById) => {
  const source = isPlainObject(order?.service) ? order.service : {};
  const tableSource = isPlainObject(tableInfo) ? tableInfo : {};
  const waiterId = toId(
    source.waiterId
    ?? order?.waiterId
    ?? tableSource.waiterId
    ?? tableSource?.service?.waiterId
    ?? null,
    ""
  );
  const waiterName =
    toText(
      source.waiterName
      ?? order?.waiterName
      ?? tableSource.waiterName
      ?? tableSource?.service?.waiterName
      ?? "",
      ""
    )
    || (waiterId ? toText(usersById[waiterId]?.name, "") : "");
  const mode = resolveServiceMode(source.mode ?? source.serviceMode ?? tableSource.serviceMode);
  const note = toText(source.note ?? order?.note ?? tableSource.note ?? "");
  return {
    waiterId: waiterId || null,
    waiterName,
    mode,
    note,
  };
};

const resolveSourceInfo = (order, user) => {
  const source = isPlainObject(order?.source) ? order.source : {};
  const fromTable = !!order?.fromTable;
  const channel = toText(source.channel || (fromTable ? "table-qr" : "front-desk"), fromTable ? "table-qr" : "front-desk");
  const createdById = toId(source.createdById ?? order?.createdById ?? user?.id, "");
  const createdByName = toText(source.createdByName ?? order?.createdByName ?? user?.name, "");
  return {
    channel,
    createdById: createdById || null,
    createdByName,
  };
};

export function normalizeUsers(users = []) {
  if (!Array.isArray(users)) return [];
  return users.map((user, index) => {
    const usernameFallback = `user_${index + 1}`;
    const username = toText(user?.username, usernameFallback);
    const name = toText(user?.name, username);
    return {
      ...user,
      id: user?.id ?? `user-${index + 1}`,
      name,
      username,
      roles: toRoles(user?.roles),
    };
  });
}

export function normalizeTablesSnapshot(rawTables = {}, users = []) {
  if (!isPlainObject(rawTables)) return {};
  const usersById = buildUsersById(users);
  return Object.entries(rawTables).reduce((acc, [tableId, rawInfo]) => {
    if (!isPlainObject(rawInfo)) return acc;
    const normalizedTableId = toId(tableId, tableId);
    const guests = Math.max(1, Math.round(toNumber(rawInfo.guests, 2)));
    const openedAt = toTimestamp(rawInfo.openedAt, Date.now());
    const waiterId = toId(rawInfo.waiterId ?? rawInfo?.service?.waiterId ?? rawInfo.serverId ?? rawInfo.staffId, "");
    const waiterName =
      toText(rawInfo.waiterName ?? rawInfo?.service?.waiterName ?? rawInfo.serverName ?? rawInfo.staffName, "")
      || (waiterId ? toText(usersById[waiterId]?.name, "") : "");
    const serviceMode = resolveServiceMode(rawInfo.serviceMode ?? rawInfo?.service?.mode);
    const note = toText(rawInfo.note ?? rawInfo.serviceNote);
    acc[normalizedTableId] = {
      ...rawInfo,
      guests,
      openedAt,
      updatedAt: toTimestamp(rawInfo.updatedAt, openedAt),
      waiterId: waiterId || null,
      waiterName,
      serviceMode,
      note,
    };
    return acc;
  }, {});
}

export function normalizeOrder(order, { tables = {}, users = [], user = null } = {}) {
  const tableMap = isPlainObject(tables) ? tables : {};
  const usersById = buildUsersById(users);
  const createdAt = toTimestamp(order?.createdAt, Date.now());
  const id = toId(order?.id, `ORD_${createdAt}`);
  const rawItems = Array.isArray(order?.items) ? order.items : [];
  const items = rawItems.map((item, index) => normalizeOrderItem(item, index));
  const tableNo = toId(order?.tableNo, TAKEAWAY_TABLE_ID);
  const dineIn = order?.dineIn ?? tableNo !== TAKEAWAY_TABLE_ID;
  const normalizedTableNo = dineIn ? tableNo : TAKEAWAY_TABLE_ID;
  const tableInfo = dineIn ? tableMap[normalizedTableNo] : null;
  const status = resolveOrderStatus(order?.status);
  const payMethod = toText(order?.payMethod ?? order?.payment?.method, status === "unpaid" ? "待确认" : "微信");
  const totals = computeTotals(items, order?.discount ?? order?.totals?.discountRate, order?.total ?? order?.totals?.total);
  const paymentStatus = resolvePaymentStatus(status, order?.payment?.status);
  const service = resolveServiceInfo(order, tableInfo, usersById);
  const source = resolveSourceInfo(order, user);
  const note = toText(order?.note ?? service.note);
  return {
    ...order,
    schemaVersion: ORDER_SCHEMA_VERSION,
    id,
    tableNo: normalizedTableNo,
    guests: Math.max(1, Math.round(toNumber(order?.guests, dineIn ? toNumber(tableInfo?.guests, 1) : 1))),
    dineIn,
    payMethod,
    payment: {
      ...(isPlainObject(order?.payment) ? order.payment : {}),
      method: payMethod,
      status: paymentStatus,
      confirmedAt: toTimestamp(order?.payment?.confirmedAt, paymentStatus === "paid" ? createdAt : null),
    },
    fromTable: !!(order?.fromTable || source.channel === "table-qr"),
    source,
    service,
    items,
    subtotal: totals.subtotal,
    discount: totals.discountRate,
    total: totals.total,
    totals,
    note,
    createdAt,
    updatedAt: toTimestamp(order?.updatedAt, createdAt),
    status,
  };
}

export function normalizeOrders(orders = [], context = {}) {
  if (!Array.isArray(orders)) return [];
  return orders.map((order) => normalizeOrder(order, context));
}

export function createOrderPayload({
  id,
  tableNo,
  guests,
  dineIn = true,
  payMethod,
  items = [],
  discount = 1,
  total,
  status = "preparing",
  createdAt = Date.now(),
  fromTable = false,
  tableInfo = null,
  user = null,
  note = "",
  serviceMode,
}) {
  const normalizedItems = Array.isArray(items) ? items.map((item, index) => normalizeOrderItem(item, index)) : [];
  const totals = computeTotals(normalizedItems, discount, total);
  const baseOrder = {
    id,
    tableNo: dineIn ? tableNo : TAKEAWAY_TABLE_ID,
    guests,
    dineIn,
    payMethod: toText(payMethod, status === "unpaid" ? "待确认" : "微信"),
    items: normalizedItems,
    discount: totals.discountRate,
    total: totals.total,
    status: resolveOrderStatus(status),
    createdAt,
    updatedAt: createdAt,
    fromTable,
    note,
    service: {
      waiterId: toId(tableInfo?.waiterId ?? user?.id, "") || null,
      waiterName: toText(tableInfo?.waiterName ?? user?.name, ""),
      mode: resolveServiceMode(serviceMode ?? tableInfo?.serviceMode),
      note: toText(note || tableInfo?.note, ""),
    },
    source: {
      channel: fromTable ? "table-qr" : "front-desk",
      createdById: toId(user?.id, "") || null,
      createdByName: toText(user?.name, ""),
    },
    schemaVersion: ORDER_SCHEMA_VERSION,
    payment: {
      method: toText(payMethod, status === "unpaid" ? "待确认" : "微信"),
      status: status === "unpaid" ? "pending" : "paid",
      confirmedAt: status === "unpaid" ? null : createdAt,
    },
  };
  return normalizeOrder(baseOrder, {
    tables: dineIn && tableInfo ? { [toId(tableNo)]: tableInfo } : {},
    users: user ? [user] : [],
    user,
  });
}
