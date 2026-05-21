import { useCallback, useEffect, useState } from "react";
import { useApp } from "../hooks/useApp";
import { API_BASE } from "../lib/api";
import { fmtDateInput, fmtDateTime } from "../lib/format";
import { DASHBOARD_RANGES } from "../lib/constants";

export default function DashboardPanel({ refreshKey }) {
  const { showToast } = useApp();
  const [range, setRange] = useState("today");
  const [reportDay, setReportDay] = useState(() => fmtDateInput());
  const [data, setData] = useState(null);
  const [dailyReport, setDailyReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSaving, setReportSaving] = useState(false);
  const [error, setError] = useState("");
  const [reportError, setReportError] = useState("");
  const [dashboardReloadKey, setDashboardReloadKey] = useState(0);

  const loadDailyReport = useCallback(async (day, signal) => {
    setReportLoading(true); setReportError("");
    try {
      const response = await fetch(`${API_BASE}/api/reports/daily/${day}`, { signal });
      const data = await response.json();
      if (response.status === 404) { setDailyReport(null); return; }
      if (!response.ok) throw new Error(data?.error || "日结状态加载失败");
      setDailyReport(data);
    } catch (err) {
      if (err.name !== "AbortError") setReportError(err.message || "日结状态加载失败");
    } finally {
      if (!signal?.aborted) setReportLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setError("");
      try {
        const dayParam = range === "day" ? `&day=${encodeURIComponent(reportDay)}` : "";
        const response = await fetch(`${API_BASE}/api/dashboard?range=${range}${dayParam}`, { signal: controller.signal });
        if (!response.ok) throw new Error("看板数据加载失败");
        setData(await response.json());
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message || "看板数据加载失败");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [dashboardReloadKey, range, refreshKey, reportDay]);

  useEffect(() => {
    const controller = new AbortController();
    loadDailyReport(reportDay, controller.signal);
    return () => controller.abort();
  }, [loadDailyReport, reportDay]);

  const generateDailyReport = async () => {
    setReportSaving(true); setReportError("");
    try {
      const response = await fetch(`${API_BASE}/api/reports/daily?day=${encodeURIComponent(reportDay)}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "生成日结失败");
      setDailyReport(data);
      setDashboardReloadKey((key) => key + 1);
      showToast(`已生成 ${reportDay} 日结`);
    } catch (err) {
      setReportError(err.message || "生成日结失败");
      showToast(err.message || "生成日结失败", "err");
    } finally {
      setReportSaving(false);
    }
  };

  const hourly = data?.hourly || [];
  const topItems = data?.topItems || [];
  const categories = data?.categoryBreakdown || [];
  const payMethods = data?.payMethodBreakdown || [];
  const summary = data?.summary || {};
  const maxHourlyRevenue = Math.max(...hourly.map((item) => item.revenue || 0), 1);
  const maxTopQty = Math.max(...topItems.map((item) => item.qty || 0), 1);
  const maxCategoryRevenue = Math.max(...categories.map((item) => item.revenue || 0), 1);
  const maxPayRevenue = Math.max(...payMethods.map((item) => item.revenue || 0), 1);

  return (
    <div>
      <div className="dash-topbar">
        <div className="ast" style={{ marginBottom: 0, borderBottom: "none", paddingBottom: 0 }}>数据看板</div>
        <div className="dash-filters">
          {DASHBOARD_RANGES.map((item) => (
            <button key={item.key} className={`dash-filter${range === item.key ? " a" : ""}`} onClick={() => setRange(item.key)}>{item.label}</button>
          ))}
          {range === "day" && (
            <input
              type="date"
              className="dash-day-input"
              lang="zh-CN"
              value={reportDay}
              onChange={(e) => setReportDay(e.target.value)}
            />
          )}
        </div>
      </div>
      <div className="daily-report-card">
        <div>
          <div className="daily-report-title">日结管理</div>
          <div className="daily-report-meta">
            {reportLoading ? "读取日结状态中..." : dailyReport
              ? `已生成 · ${dailyReport.orderCount || 0} 单 · ¥${Number(dailyReport.revenue || 0).toFixed(2)} · 更新于 ${fmtDateTime(dailyReport.updatedAt)}`
              : "所选日期尚未生成日结"}
          </div>
          {reportError && <div className="daily-report-error">{reportError}</div>}
        </div>
        <div className="daily-report-actions">
          <input className="fi daily-report-date" type="date" lang="zh-CN" value={reportDay} onChange={(event) => setReportDay(event.target.value)} />
          <button className="bsv daily-report-btn" disabled={reportSaving} onClick={generateDailyReport}>
            {reportSaving ? "生成中..." : dailyReport ? "重新生成日结" : "生成日结"}
          </button>
        </div>
      </div>
      {error && <div className="dash-empty">{error}</div>}
      {!error && loading && !data && <div className="dash-empty">看板数据加载中...</div>}
      {!error && data && (
        <div className="dash-layout">
          <div className="dash-metrics">
            <div className="dash-card metric">
              <div className="dash-card-kicker">营业额</div>
              <div className="dash-card-value">¥{(summary.revenue || 0).toFixed(2)}</div>
              <div className="dash-card-meta">{range === "today" ? "今天累计" : "统计区间累计"}</div>
            </div>
            <div className="dash-card metric">
              <div className="dash-card-kicker">订单数</div>
              <div className="dash-card-value">{summary.orderCount || 0}</div>
              <div className="dash-card-meta">平均客单 ¥{(summary.avgTicket || 0).toFixed(2)}</div>
            </div>
            <div className="dash-card metric">
              <div className="dash-card-kicker">顾客数</div>
              <div className="dash-card-value">{summary.guestCount || 0}</div>
              <div className="dash-card-meta">人均消费 ¥{(summary.avgPerGuest || 0).toFixed(2)}</div>
            </div>
            <div className="dash-card metric">
              <div className="dash-card-kicker">堂食 / 外卖</div>
              <div className="dash-card-value">{summary.dineInCount || 0} / {summary.takeawayCount || 0}</div>
              <div className="dash-card-meta">高峰时段 {summary.peakHour || "—"}</div>
            </div>
          </div>
          <div className="dash-card">
            <div className="dash-card-title">时段分布</div>
            <div className="dash-chart">
              {hourly.map((bucket) => (
                <div key={bucket.hour} className="dash-bar-col">
                  <div className="dash-bar-wrap">
                    <div className="dash-bar" style={{ height: `${Math.max((bucket.revenue / maxHourlyRevenue) * 100, bucket.revenue ? 10 : 4)}%` }} />
                  </div>
                  <div className="dash-bar-label">{bucket.hour.replace(":00", "")}</div>
                  <div className="dash-bar-meta">{bucket.orders}单</div>
                </div>
              ))}
            </div>
          </div>
          <div className="dash-card">
            <div className="dash-card-title">TOP 菜品</div>
            <div className="dash-rank-list">
              {!topItems.length && <div className="dash-empty slim">暂无销售数据</div>}
              {topItems.map((item, index) => (
                <div key={item.name} className="dash-rank-row">
                  <div className="dash-rank-index">{String(index + 1).padStart(2, "0")}</div>
                  <div className="dash-rank-main">
                    <div className="dash-rank-name">{item.name}</div>
                    <div className="dash-rank-track"><div className="dash-rank-fill" style={{ width: `${(item.qty / maxTopQty) * 100}%` }} /></div>
                  </div>
                  <div className="dash-rank-stats"><span>{item.qty} 份</span><strong>¥{item.revenue.toFixed(2)}</strong></div>
                </div>
              ))}
            </div>
          </div>
          <div className="dash-card">
            <div className="dash-card-title">分类占比</div>
            <div className="dash-breakdown-list">
              {!categories.length && <div className="dash-empty slim">暂无分类数据</div>}
              {categories.map((item) => (
                <div key={item.category} className="dash-breakdown-row">
                  <div className="dash-breakdown-head"><span>{item.category}</span><span>¥{item.revenue.toFixed(2)}</span></div>
                  <div className="dash-breakdown-track"><div className="dash-breakdown-fill" style={{ width: `${(item.revenue / maxCategoryRevenue) * 100}%` }} /></div>
                  <div className="dash-breakdown-meta">{item.orders} 单</div>
                </div>
              ))}
            </div>
          </div>
          <div className="dash-card">
            <div className="dash-card-title">支付方式</div>
            <div className="dash-pay-grid">
              {!payMethods.length && <div className="dash-empty slim">暂无支付数据</div>}
              {payMethods.map((item) => (
                <div key={item.method} className="dash-pay-card">
                  <div className="dash-pay-method">{item.method}</div>
                  <div className="dash-pay-value">¥{item.revenue.toFixed(2)}</div>
                  <div className="dash-pay-line"><div className="dash-pay-fill" style={{ width: `${(item.revenue / maxPayRevenue) * 100}%` }} /></div>
                  <div className="dash-pay-count">{item.count} 笔订单</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
