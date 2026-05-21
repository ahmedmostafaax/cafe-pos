import { getNowTimestamp } from "../model/orderOptionUtils";

export const fmtTime = (ts) => {
  const date = new Date(ts);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

export const fmtDate = (ts) => {
  const date = new Date(ts);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${fmtTime(ts)}`;
};

export const fmtDateInput = (ts = getNowTimestamp()) => {
  const date = new Date(ts);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const fmtMonthInput = (ts = getNowTimestamp()) => {
  const date = new Date(ts);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export const fmtDateTime = (ts) => {
  if (!ts) return "—";
  const date = new Date(ts);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${fmtTime(ts)}`;
};

export const fmtElapsed = (ts) => {
  const minutes = Math.floor((getNowTimestamp() - ts) / 60000);
  return minutes < 60 ? `${minutes}分钟` : `${Math.floor(minutes / 60)}小时${minutes % 60}分`;
};
