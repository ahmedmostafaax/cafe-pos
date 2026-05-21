function getDayRange(ts = Date.now()) {
  // 用于按"创建当日"匹配订单序号；统一使用 Asia/Shanghai 日界，
  // 保证订单 id 前缀（formatDayKey）与查询窗口对齐。
  const SHANGHAI_OFFSET = 8 * 3600 * 1000;
  const d = new Date(Number(ts) + SHANGHAI_OFFSET);
  const startMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), -8, 0, 0, 0);
  return { startMs, endMs: startMs + 86400000 };
}

function formatDayKey(ts = Date.now()) {
  const SHANGHAI_OFFSET = 8 * 3600 * 1000;
  const d = new Date(Number(ts) + SHANGHAI_OFFSET);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

const SHANGHAI_OFFSET_MS = 8 * 3600 * 1000;

function getShanghaiDayKey(ts = Date.now()) {
  const d = new Date(Number(ts) + SHANGHAI_OFFSET_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function getShanghaiDayRangeByKey(dayKey) {
  const match = String(dayKey || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const startMs = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), -8, 0, 0, 0);
  if (!Number.isFinite(startMs)) return null;
  const endMs = startMs + 86400000;
  return { startMs, endMs, day: `${match[1]}-${match[2]}-${match[3]}` };
}

function getReportDayKey(ts = Date.now()) {
  return getShanghaiDayKey(ts);
}

function getDayRangeByKey(dayKey) {
  return getShanghaiDayRangeByKey(dayKey);
}

module.exports = {
  SHANGHAI_OFFSET_MS,
  getDayRange,
  formatDayKey,
  getShanghaiDayKey,
  getShanghaiDayRangeByKey,
  getReportDayKey,
  getDayRangeByKey,
};

