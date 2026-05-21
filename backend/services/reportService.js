const { safeJSONParse } = require('../utils/json');
const {
  SHANGHAI_OFFSET_MS,
  getShanghaiDayKey,
  getShanghaiDayRangeByKey,
  getReportDayKey,
  getDayRangeByKey,
} = require('../utils/time');

function createReportService({ statements, constants, userService, settingsService }) {
  const {
    stmtGetDashboardRowsFrom,
    stmtGetDashboardRowsRange,
    stmtGetCommissionRowsRange,
    stmtGetReportByDay,
    stmtGetReportsFrom,
    stmtGetAllReports,
    stmtUpsertDailyReport,
  } = statements;
  const { DASHBOARD_DB_STATUSES, COMMISSION_DB_STATUSES, COMMISSION_ROLES } = constants;
  const { getAllUsers } = userService;
  const { getSettingsMap, normalizePercent } = settingsService;

  // ════════════════════════════════════════════════════════════
  //  Dashboard 聚合
  // ════════════════════════════════════════════════════════════

  function createHourBuckets() {
    const hourBuckets = {};
    for (let i = 0; i < 24; i++) {
      const hour = String(i).padStart(2, '0') + ':00';
      hourBuckets[hour] = { hour, revenue: 0, orders: 0 };
    }
    return hourBuckets;
  }

  function finalizeDashboard(acc, limitTopItems = true) {
    const orderCount = Number(acc.orderCount || 0);
    const revenue = Number(acc.revenue || 0);
    const guestCount = Number(acc.guestCount || 0);
    const avgTicket = orderCount ? +(revenue / orderCount).toFixed(2) : 0;
    const avgPerGuest = guestCount ? +(revenue / guestCount).toFixed(2) : 0;
    let peakHour = '—', peakRev = 0;
    Object.values(acc.hourBuckets).forEach(h => { if (h.revenue > peakRev) { peakRev = h.revenue; peakHour = h.hour; } });
    const topItems = Object.values(acc.itemSales).sort((a, b) => b.qty - a.qty);
    return {
      summary: {
        revenue: +revenue.toFixed(2),
        orderCount,
        avgTicket,
        guestCount,
        avgPerGuest,
        dineInCount: Number(acc.dineInCount || 0),
        takeawayCount: Number(acc.takeawayCount || 0),
        peakHour,
      },
      hourly: Object.values(acc.hourBuckets).map(h => ({ ...h, revenue: +Number(h.revenue || 0).toFixed(2) })),
      topItems: (limitTopItems ? topItems.slice(0, 15) : topItems).map(item => ({ ...item, revenue: +Number(item.revenue || 0).toFixed(2) })),
      categoryBreakdown: Object.values(acc.categorySales).sort((a, b) => b.revenue - a.revenue).map(item => ({ ...item, revenue: +Number(item.revenue || 0).toFixed(2) })),
      payMethodBreakdown: Object.values(acc.payMethodSales).sort((a, b) => b.revenue - a.revenue).map(item => ({ ...item, revenue: +Number(item.revenue || 0).toFixed(2) })),
    };
  }

  function createDashboardAccumulator() {
    return {
      revenue: 0,
      orderCount: 0,
      guestCount: 0,
      dineInCount: 0,
      takeawayCount: 0,
      hourBuckets: createHourBuckets(),
      itemSales: {},
      categorySales: {},
      payMethodSales: {},
    };
  }

  function addRowsToDashboardAccumulator(acc, rows) {
    rows.forEach(row => {
      const extra = safeJSONParse(row.extra, {});
      const total = Number(row.totalPrice || 0);
      acc.revenue += total;
      acc.orderCount += 1;
      acc.guestCount += Number(extra.guests || 1);
      if (extra.dineIn === false || row.tableId === '外卖') acc.takeawayCount += 1;
      else acc.dineInCount += 1;

      const d = new Date(Number(row.createdAt) + SHANGHAI_OFFSET_MS);
      const hKey = String(d.getUTCHours()).padStart(2, '0') + ':00';
      if (acc.hourBuckets[hKey]) { acc.hourBuckets[hKey].revenue += total; acc.hourBuckets[hKey].orders += 1; }

      const pm = extra.payMethod || '未知';
      if (!acc.payMethodSales[pm]) acc.payMethodSales[pm] = { method: pm, count: 0, revenue: 0 };
      acc.payMethodSales[pm].count += 1;
      acc.payMethodSales[pm].revenue += total;

      const items = safeJSONParse(row.items, []);
      const orderCats = new Set();
      items.forEach(item => {
        const key = item.name || 'unknown';
        const qty = Number(item.qty || 1);
        const itemRevenue = Number(item.price || 0) * qty;
        if (!acc.itemSales[key]) acc.itemSales[key] = { name: key, qty: 0, revenue: 0 };
        acc.itemSales[key].qty += qty;
        acc.itemSales[key].revenue += itemRevenue;

        const cat = item.category || '未分类';
        orderCats.add(cat);
        if (!acc.categorySales[cat]) acc.categorySales[cat] = { category: cat, revenue: 0, orders: 0 };
        acc.categorySales[cat].revenue += itemRevenue;
      });
      orderCats.forEach(c => { if (acc.categorySales[c]) acc.categorySales[c].orders += 1; });
    });
  }

  function computeDashboardFromRows(rows, limitTopItems = true) {
    const acc = createDashboardAccumulator();
    addRowsToDashboardAccumulator(acc, rows);
    return finalizeDashboard(acc, limitTopItems);
  }

  function addDashboardToAccumulator(acc, report) {
    const summary = report.summary || {};
    acc.revenue += Number(summary.revenue || 0);
    acc.orderCount += Number(summary.orderCount || 0);
    acc.guestCount += Number(summary.guestCount || 0);
    acc.dineInCount += Number(summary.dineInCount || 0);
    acc.takeawayCount += Number(summary.takeawayCount || 0);

    (report.hourly || []).forEach(hour => {
      const key = hour.hour;
      if (!acc.hourBuckets[key]) acc.hourBuckets[key] = { hour: key, revenue: 0, orders: 0 };
      acc.hourBuckets[key].revenue += Number(hour.revenue || 0);
      acc.hourBuckets[key].orders += Number(hour.orders || 0);
    });

    (report.topItems || []).forEach(item => {
      const key = item.name || 'unknown';
      if (!acc.itemSales[key]) acc.itemSales[key] = { name: key, qty: 0, revenue: 0 };
      acc.itemSales[key].qty += Number(item.qty || 0);
      acc.itemSales[key].revenue += Number(item.revenue || 0);
    });

    (report.categoryBreakdown || []).forEach(item => {
      const key = item.category || '未分类';
      if (!acc.categorySales[key]) acc.categorySales[key] = { category: key, revenue: 0, orders: 0 };
      acc.categorySales[key].revenue += Number(item.revenue || 0);
      acc.categorySales[key].orders += Number(item.orders || 0);
    });

    (report.payMethodBreakdown || []).forEach(item => {
      const key = item.method || '未知';
      if (!acc.payMethodSales[key]) acc.payMethodSales[key] = { method: key, count: 0, revenue: 0 };
      acc.payMethodSales[key].count += Number(item.count || 0);
      acc.payMethodSales[key].revenue += Number(item.revenue || 0);
    });
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

  function saveDailyReport(dayKey = getReportDayKey(Date.now())) {
    const range = getDayRangeByKey(dayKey);
    if (!range) throw new Error('日期格式应为 YYYY-MM-DD');
    const dashboard = computeDashboardFromRows(stmtGetDashboardRowsRange.all(range.startMs, range.endMs, ...DASHBOARD_DB_STATUSES), false);
    const row = {
      day: range.day,
      startAt: range.startMs,
      endAt: range.endMs,
      summary: JSON.stringify(dashboard.summary),
      hourly: JSON.stringify(dashboard.hourly),
      topItems: JSON.stringify(dashboard.topItems),
      categoryBreakdown: JSON.stringify(dashboard.categoryBreakdown),
      payMethodBreakdown: JSON.stringify(dashboard.payMethodBreakdown),
      orderCount: dashboard.summary.orderCount,
      revenue: dashboard.summary.revenue,
      updatedAt: Date.now(),
    };
    stmtUpsertDailyReport.run(row);
    return rowToDailyReport(stmtGetReportByDay.get(range.day));
  }

  function aggregateDailyReports(rows) {
    const acc = createDashboardAccumulator();
    rows.map(rowToDailyReport).filter(Boolean).forEach(report => addDashboardToAccumulator(acc, report));
    return finalizeDashboard(acc, true);
  }

  function computeDashboard(range, query = {}) {
    // todayStart 用 Asia/Shanghai 当日 00:00，与日界/订单 id 对齐
    const todayStart = getShanghaiDayRangeByKey(getShanghaiDayKey(Date.now())).startMs;
    if (!range || range === 'today') {
      return computeDashboardFromRows(stmtGetDashboardRowsFrom.all(todayStart, ...DASHBOARD_DB_STATUSES), true);
    }
    if (range === 'day') {
      const dayRange = getDayRangeByKey(query.day || getReportDayKey(Date.now()));
      if (!dayRange) throw new Error('日期格式应为 YYYY-MM-DD');
      return computeDashboardFromRows(stmtGetDashboardRowsRange.all(dayRange.startMs, dayRange.endMs, ...DASHBOARD_DB_STATUSES), true);
    }

    const acc = createDashboardAccumulator();
    let reportRows;
    switch (range) {
      case 'week':
        reportRows = stmtGetReportsFrom.all(todayStart - 6 * 86400000);
        break;
      case 'month':
        reportRows = stmtGetReportsFrom.all(todayStart - 29 * 86400000);
        break;
      case 'all':
        reportRows = stmtGetAllReports.all();
        break;
      default:
        return computeDashboardFromRows(stmtGetDashboardRowsFrom.all(todayStart, ...DASHBOARD_DB_STATUSES), true);
    }

    reportRows.map(rowToDailyReport).filter(Boolean).forEach(report => {
      if (report.startAt < todayStart) addDashboardToAccumulator(acc, report);
    });
    addRowsToDashboardAccumulator(acc, stmtGetDashboardRowsFrom.all(todayStart, ...DASHBOARD_DB_STATUSES));
    return finalizeDashboard(acc, true);
  }

  function getMonthRangeByKey(monthKey) {
    const match = String(monthKey || '').trim().match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;
    const startMs = Date.UTC(Number(match[1]), Number(match[2]) - 1, 1, -8, 0, 0, 0);
    const endMs = Date.UTC(Number(match[1]), Number(match[2]), 1, -8, 0, 0, 0);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
    return { startMs, endMs, label: `${match[1]}-${match[2]}`, scope: 'month' };
  }

  function getCommissionRange(query = {}) {
    const scope = String(query.scope || '').toLowerCase() === 'month' ? 'month' : 'day';
    if (scope === 'month') {
      const range = getMonthRangeByKey(query.month || getReportDayKey(Date.now()).slice(0, 7));
      if (!range) throw new Error('月份格式应为 YYYY-MM');
      return range;
    }
    const range = getDayRangeByKey(query.day || getReportDayKey(Date.now()));
    if (!range) throw new Error('日期格式应为 YYYY-MM-DD');
    return { startMs: range.startMs, endMs: range.endMs, label: range.day, scope: 'day' };
  }

  function getOrderWaiter(extra, users) {
    const service = extra?.service || {};
    const waiterId = String(service.waiterId || '').trim();
    if (waiterId) return waiterId;
    const waiterName = String(service.waiterName || '').trim();
    if (!waiterName) return '';
    const matched = users.find(user => String(user.name || '').trim() === waiterName);
    return matched ? String(matched.id) : '';
  }

  function createCommissionAccumulator() {
    return {
      frontSalesByUser: {},
      frontOrdersByUser: {},
      stationSales: { kitchen: 0, bar: 0 },
      orderCount: 0,
      revenue: 0,
    };
  }

  function getCommissionDiscountRate(extra) {
    const raw = extra?.totals?.discountRate ?? extra?.discount ?? 1;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return 1;
    return Math.min(1, Math.max(0, parsed));
  }

  function getCommissionItemAmount(item, discountRate) {
    // 前端 createCartItem 写入的 item.price 已经包含 basePrice + optionDelta；
    // 仅当历史数据缺失 item.price 时，回退到 basePrice + optionDelta。
    const price = Number(item?.price);
    const basePrice = Number(item?.basePrice || 0);
    const optionDelta = Number(item?.optionDelta || 0);
    const qty = Number(item?.qty || 1);
    const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
    const unitPrice = Number.isFinite(price) && price > 0
      ? price
      : Math.max(0, basePrice + optionDelta);
    return Math.max(0, unitPrice) * safeQty * discountRate;
  }

  function addRowsToCommissionAccumulator(acc, rows, users) {
    rows.forEach(row => {
      const extra = safeJSONParse(row.extra, {});
      const total = Number(row.totalPrice || 0);
      const orderTotal = Number.isFinite(total) ? total : 0;
      const discountRate = getCommissionDiscountRate(extra);
      acc.orderCount += 1;
      acc.revenue += orderTotal;

      const waiterId = getOrderWaiter(extra, users);
      if (waiterId) {
        acc.frontSalesByUser[waiterId] = (acc.frontSalesByUser[waiterId] || 0) + orderTotal;
        acc.frontOrdersByUser[waiterId] = (acc.frontOrdersByUser[waiterId] || 0) + 1;
      }

      safeJSONParse(row.items, []).forEach(item => {
        const station = item?.station === 'bar' ? 'bar' : 'kitchen';
        const amount = getCommissionItemAmount(item, discountRate);
        acc.stationSales[station] += amount;
      });
    });
  }

  function roundMoney(value) {
    return +Number(value || 0).toFixed(2);
  }

  function buildCommissionReport(query = {}) {
    const range = getCommissionRange(query);
    const users = getAllUsers();
    const rates = getSettingsMap().employeeCommissions || {};
    const rows = stmtGetCommissionRowsRange.all(range.startMs, range.endMs, ...COMMISSION_DB_STATUSES);
    const acc = createCommissionAccumulator();
    addRowsToCommissionAccumulator(acc, rows, users);
    const requestedUserId = String(query.userId || '').trim();

    const employees = users
      .filter(user => !requestedUserId || String(user.id) === requestedUserId)
      .map(user => {
        const userId = String(user.id);
        const userRates = rates[userId] || {};
        const roleSet = new Set(Array.isArray(user.roles) ? user.roles : []);
        const hasCommissionRole = COMMISSION_ROLES.some(role => roleSet.has(role));
        const frontBase = roleSet.has('front') ? Number(acc.frontSalesByUser[userId] || 0) : 0;
        const kitchenBase = roleSet.has('kitchen') ? Number(acc.stationSales.kitchen || 0) : 0;
        const barBase = roleSet.has('bar') ? Number(acc.stationSales.bar || 0) : 0;
        const normalizedRates = {
          frontPercent: normalizePercent(userRates.frontPercent),
          kitchenPercent: normalizePercent(userRates.kitchenPercent),
          barPercent: normalizePercent(userRates.barPercent),
        };
        const commissions = {
          front: frontBase * normalizedRates.frontPercent / 100,
          kitchen: kitchenBase * normalizedRates.kitchenPercent / 100,
          bar: barBase * normalizedRates.barPercent / 100,
        };
        return {
          userId,
          name: user.name,
          username: user.username,
          roles: user.roles,
          rates: normalizedRates,
          orderCount: Number(acc.frontOrdersByUser[userId] || 0),
          sales: {
            front: roundMoney(frontBase),
            kitchen: roundMoney(kitchenBase),
            bar: roundMoney(barBase),
            total: roundMoney(frontBase + kitchenBase + barBase),
          },
          commissions: {
            front: roundMoney(commissions.front),
            kitchen: roundMoney(commissions.kitchen),
            bar: roundMoney(commissions.bar),
            total: roundMoney(commissions.front + commissions.kitchen + commissions.bar),
          },
          active: hasCommissionRole || !!(normalizedRates.frontPercent || normalizedRates.kitchenPercent || normalizedRates.barPercent),
        };
      })
      .filter(employee => requestedUserId || employee.active)
      .sort((a, b) => b.commissions.total - a.commissions.total || a.name.localeCompare(b.name, 'zh-Hans-CN'));

    const totalCommission = employees.reduce((sum, employee) => sum + employee.commissions.total, 0);
    return {
      scope: range.scope,
      label: range.label,
      startAt: range.startMs,
      endAt: range.endMs,
      generatedAt: Date.now(),
      orderCount: acc.orderCount,
      revenue: roundMoney(acc.revenue),
      stationSales: {
        kitchen: roundMoney(acc.stationSales.kitchen),
        bar: roundMoney(acc.stationSales.bar),
      },
      totalCommission: roundMoney(totalCommission),
      employees,
    };
  }

  function scheduleDailyReportJob() {
    const now = Date.now();
    // 北京时间次日 00:05：今天的 Shanghai 日界 endMs + 5 分钟
    const todayRange = getShanghaiDayRangeByKey(getShanghaiDayKey(now));
    const nextRunMs = todayRange.endMs + 5 * 60 * 1000;
    const timer = setTimeout(() => {
      try {
        const yesterdayKey = getShanghaiDayKey(Date.now() - 86400000);
        const report = saveDailyReport(yesterdayKey);
        console.log(`📊 日结已生成：${report.day}，${report.orderCount} 单，¥${report.revenue}`);
      } catch (err) {
        console.error('❌ 自动日结失败：', err.message);
      } finally {
        scheduleDailyReportJob();
      }
    }, Math.max(1000, nextRunMs - now));
    if (typeof timer.unref === 'function') timer.unref();
  }

  function ensureYesterdayReport() {
    const day = getShanghaiDayKey(Date.now() - 86400000);
    if (!stmtGetReportByDay.get(day)) {
      try { saveDailyReport(day); }
      catch (err) { console.error('❌ 补生成昨日结算失败：', err.message); }
    }
  }



  function getDailyReport(day) {
    return rowToDailyReport(stmtGetReportByDay.get(day));
  }

  return {
    computeDashboard,
    buildCommissionReport,
    saveDailyReport,
    getDailyReport,
    getReportDayKey,
    ensureYesterdayReport,
    scheduleDailyReportJob,
  };
}

module.exports = { createReportService };
