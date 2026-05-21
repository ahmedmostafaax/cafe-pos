import { TAKEAWAY_TABLE_ID } from "./orderOptionUtils";

export const isTakeawayOrder = (order) =>
  order?.dineIn === false || order?.tableNo === TAKEAWAY_TABLE_ID;

export const isOrderItemServed = (item) =>
  item?.status === "completed" || item?.status === "cancelled";

export const isOrderServed = (order) =>
  !Array.isArray(order?.items) || order.items.length === 0 || order.items.every(isOrderItemServed);

export const isCurrentTableSessionOrder = (order, tableId, openedAt) =>
  String(order?.tableNo ?? "") === String(tableId ?? "") &&
  Number(order?.createdAt ?? 0) >= Number(openedAt ?? 0);
