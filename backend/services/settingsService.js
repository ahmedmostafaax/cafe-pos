const { safeJSONParse } = require('../utils/json');

function createSettingsService({ statements, constants }) {
  const { stmtGetAllSettings, stmtGetSetting, stmtUpsertSetting } = statements;
  const { DEFAULT_STATION_THRESHOLDS, DEFAULT_TABLE_IDS, RESERVED_TABLE_IDS } = constants;

  function normalizeStationThresholds(value) {
    const source = value && typeof value === 'object' ? value : {};
    return ['kitchen', 'bar'].reduce((acc, station) => {
      const fallback = DEFAULT_STATION_THRESHOLDS[station];
      const raw = source[station] && typeof source[station] === 'object' ? source[station] : {};
      const parsedNew = Math.round(Number(raw.newMinutes));
      const newMinutes = Number.isFinite(parsedNew) ? Math.max(1, parsedNew) : fallback.newMinutes;
      const parsedUrgent = Math.round(Number(raw.urgentMinutes));
      const urgentMinutes = Number.isFinite(parsedUrgent) ? Math.max(newMinutes + 1, parsedUrgent) : Math.max(newMinutes + 1, fallback.urgentMinutes);
      acc[station] = { newMinutes, urgentMinutes };
      return acc;
    }, {});
  }

  function normalizePercent(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.min(100, Math.max(0, +parsed.toFixed(3)));
  }

  function normalizeEmployeeCommissions(value) {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return Object.entries(source).reduce((acc, [userId, rates]) => {
      const raw = rates && typeof rates === 'object' ? rates : {};
      const key = String(userId || '').trim();
      if (!key) return acc;
      const next = {
        frontPercent: normalizePercent(raw.frontPercent ?? raw.waiterPercent),
        kitchenPercent: normalizePercent(raw.kitchenPercent),
        barPercent: normalizePercent(raw.barPercent),
      };
      if (next.frontPercent || next.kitchenPercent || next.barPercent) acc[key] = next;
      return acc;
    }, {});
  }

  function normalizeTableIds(value) {
    const source = Array.isArray(value) ? value : [];
    const seen = new Set();
    const normalized = [];
    source.forEach((item) => {
      const next = String(item || '').trim();
      if (!next || RESERVED_TABLE_IDS.has(next) || next.toLowerCase() === 'walkin' || seen.has(next)) return;
      seen.add(next);
      normalized.push(next);
    });
    return normalized;
  }

  function rowToSetting(row) {
    if (!row) return null;
    return { key: row.key, value: safeJSONParse(row.value, {}), updatedAt: Number(row.updatedAt || 0) };
  }

  function getSettingsMap() {
    const settings = {};
    stmtGetAllSettings.all().forEach((row) => { settings[row.key] = rowToSetting(row).value; });
    settings.stationThresholds = normalizeStationThresholds(settings.stationThresholds);
    settings.employeeCommissions = normalizeEmployeeCommissions(settings.employeeCommissions);
    settings.tableIds = normalizeTableIds(settings.tableIds);
    settings.wechatPayQr = settings.wechatPayQr || '';
    settings.alipayQr = settings.alipayQr || '';
    settings.customerSelfPay = settings.customerSelfPay !== false;
    return settings;
  }

  function saveStationThresholds(value) {
    const next = normalizeStationThresholds(value);
    stmtUpsertSetting.run({ key: 'stationThresholds', value: JSON.stringify(next), updatedAt: Date.now() });
    return next;
  }

  function saveEmployeeCommissions(value) {
    const next = normalizeEmployeeCommissions(value);
    stmtUpsertSetting.run({ key: 'employeeCommissions', value: JSON.stringify(next), updatedAt: Date.now() });
    return next;
  }

  function saveTableIds(value) {
    const next = normalizeTableIds(value);
    stmtUpsertSetting.run({ key: 'tableIds', value: JSON.stringify(next), updatedAt: Date.now() });
    return next;
  }

  function saveWechatPayQr(value) {
    const next = String(value || '').trim();
    stmtUpsertSetting.run({ key: 'wechatPayQr', value: JSON.stringify(next), updatedAt: Date.now() });
    return next;
  }

  function saveAlipayQr(value) {
    const next = String(value || '').trim();
    stmtUpsertSetting.run({ key: 'alipayQr', value: JSON.stringify(next), updatedAt: Date.now() });
    return next;
  }

  function saveCustomerSelfPay(value) {
    const next = value !== false;
    stmtUpsertSetting.run({ key: 'customerSelfPay', value: JSON.stringify(next), updatedAt: Date.now() });
    return next;
  }

  if (!stmtGetSetting.get('stationThresholds')) saveStationThresholds(DEFAULT_STATION_THRESHOLDS);
  if (!stmtGetSetting.get('employeeCommissions')) saveEmployeeCommissions({});
  if (!stmtGetSetting.get('tableIds')) saveTableIds(DEFAULT_TABLE_IDS);
  if (!stmtGetSetting.get('customerSelfPay')) saveCustomerSelfPay(true);

  function saveSettings(settings) {
    if(!settings || typeof settings !== 'object' || Array.isArray(settings)) return getSettingsMap();
    if(settings.stationThresholds) saveStationThresholds(settings.stationThresholds);
    if(settings.employeeCommissions !== undefined) saveEmployeeCommissions(settings.employeeCommissions);
    if(settings.tableIds !== undefined) saveTableIds(settings.tableIds);
    if(settings.wechatPayQr !== undefined) saveWechatPayQr(settings.wechatPayQr);
    if(settings.alipayQr !== undefined) saveAlipayQr(settings.alipayQr);
    if(settings.customerSelfPay !== undefined) saveCustomerSelfPay(settings.customerSelfPay);
    return getSettingsMap();
  }

  return {
    normalizeStationThresholds,
    normalizePercent,
    normalizeEmployeeCommissions,
    normalizeTableIds,
    getSettingsMap,
    saveStationThresholds,
    saveEmployeeCommissions,
    saveTableIds,
    saveWechatPayQr,
    saveAlipayQr,
    saveCustomerSelfPay,
    saveSettings,
  };
}

module.exports = { createSettingsService };

