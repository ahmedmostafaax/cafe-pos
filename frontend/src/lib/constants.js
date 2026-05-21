export const TABLE_IDS = Array.from({ length: 20 }, (_, index) => String(index + 1));

export const ROLE_LABELS = {
  front: "前台点单",
  kitchen: "后厨制作",
  bar: "吧台制作",
  admin: "后台管理",
  tablet: "平板代点",
};

export const ROLE_PATHS = {
  front: "/front",
  kitchen: "/kitchen",
  bar: "/bar",
  admin: "/admin",
  tablet: "/pad",
};

export const PATH_ROLES = {
  "/front": "front",
  "/kitchen": "kitchen",
  "/bar": "bar",
  "/admin": "admin",
  "/commission": "commission",
  "/pad": "tablet",
};

export const STATUS_COLOR = {
  unpaid: "#60a5fa",
  preparing: "#c8542c",
  served: "#2d7a50",
  cancelled: "#b84426",
  archived: "#8a7060",
};

export const STATUS_LABEL = {
  unpaid: "待付款",
  preparing: "制作中",
  served: "已出餐",
  cancelled: "已取消",
  archived: "已完成",
};

export const COMMISSION_ROLE_LABELS = {
  front: "服务员",
  kitchen: "后厨",
  bar: "吧台",
  commission: "提成报表",
};

export const PAY_METHODS = ["微信", "支付宝", "现金", "银行卡"];
export const PAY_METHOD_KEYS = {
  "微信": "wechat",
  "支付宝": "alipay",
  "现金": "cash",
  "银行卡": "card",
};

export const DEFAULT_STATION_THRESHOLDS = {
  kitchen: { newMinutes: 5, urgentMinutes: 15 },
  bar: { newMinutes: 3, urgentMinutes: 10 },
};

export const normalizeStationThresholds = (value = {}) =>
  ["kitchen", "bar"].reduce((acc, station) => {
    const fallback = DEFAULT_STATION_THRESHOLDS[station];
    const raw = value?.[station] || {};
    const parsedNew = Math.round(Number(raw.newMinutes));
    const newMinutes = Number.isFinite(parsedNew) ? Math.max(1, parsedNew) : fallback.newMinutes;
    const parsedUrgent = Math.round(Number(raw.urgentMinutes));
    const urgentMinutes = Number.isFinite(parsedUrgent) ? Math.max(newMinutes + 1, parsedUrgent) : Math.max(newMinutes + 1, fallback.urgentMinutes);
    acc[station] = { newMinutes, urgentMinutes };
    return acc;
  }, {});

export const DASHBOARD_RANGES = [
  { key: "today", label: "今日" },
  { key: "day", label: "指定日期" },
  { key: "week", label: "近 7 天" },
  { key: "month", label: "近 30 天" },
  { key: "all", label: "全部" },
];

export const normalizeCustomTableIds = (value = []) => {
  const source = Array.isArray(value) ? value : [];
  const seen = new Set();
  return source.reduce((acc, item) => {
    const next = String(item || "").trim();
    if (!next || TABLE_IDS.includes(next) || ["外卖", "堂食", "walkin"].includes(next) || seen.has(next)) return acc;
    seen.add(next);
    acc.push(next);
    return acc;
  }, []);
};

export const normalizePercent = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, +parsed.toFixed(3)));
};

export const normalizeEmployeeCommissions = (value = {}) => {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return Object.entries(source).reduce((acc, [userId, rates]) => {
    const key = String(userId || "").trim();
    if (!key) return acc;
    const raw = rates && typeof rates === "object" ? rates : {};
    const next = {
      frontPercent: normalizePercent(raw.frontPercent ?? raw.waiterPercent),
      kitchenPercent: normalizePercent(raw.kitchenPercent),
      barPercent: normalizePercent(raw.barPercent),
    };
    if (next.frontPercent || next.kitchenPercent || next.barPercent) acc[key] = next;
    return acc;
  }, {});
};
