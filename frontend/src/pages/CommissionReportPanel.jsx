import { useEffect, useState } from "react";
import { useApp } from "../hooks/useApp";
import { API_BASE } from "../lib/api";
import { fmtDateInput, fmtDateTime, fmtMonthInput } from "../lib/format";
import { COMMISSION_ROLE_LABELS } from "../lib/constants";

export default function CommissionReportPanel({ mode = "self", view = "table" }) {
  const { user, users, showToast } = useApp();
  const [scope, setScope] = useState("day");
  const [day, setDay] = useState(() => fmtDateInput());
  const [month, setMonth] = useState(() => fmtMonthInput());
  const [selectedUserId, setSelectedUserId] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const isSelf = mode !== "admin";
  const commissionUsers = users.filter((item) => item.roles.some((role) => ["front", "kitchen", "bar"].includes(role)));

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setError("");
      try {
        const params = new URLSearchParams({ scope });
        if (scope === "month") params.set("month", month);
        else params.set("day", day);
        if (isSelf && user?.id) params.set("userId", String(user.id));
        if (!isSelf && selectedUserId) params.set("userId", selectedUserId);
        const response = await fetch(`${API_BASE}/api/commissions?${params.toString()}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "提成报表加载失败");
        setReport(data);
      } catch (err) {
        if (err.name !== "AbortError") { setError(err.message || "提成报表加载失败"); setReport(null); }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [day, isSelf, month, reloadKey, scope, selectedUserId, user?.id]);

  const employees = report?.employees || [];
  const title = isSelf ? "我的提成" : "员工提成报表";
  const rangeLabel = scope === "month" ? month : day;

  return (
    <div>
      <div className="commission-head">
        <div className="ast" style={{ marginBottom: 0, borderBottom: "none", paddingBottom: 0 }}>{title}</div>
        <div className="commission-actions">
          <div className="dash-filters">
            <button className={`dash-filter${scope === "day" ? " a" : ""}`} onClick={() => setScope("day")}>日结</button>
            <button className={`dash-filter${scope === "month" ? " a" : ""}`} onClick={() => setScope("month")}>月结</button>
          </div>
          {scope === "day"
            ? <input className="fi commission-date" type="date" value={day} onChange={(event) => setDay(event.target.value)} />
            : <input className="fi commission-date" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />}
          {!isSelf && (
            <select className="cs commission-employee" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
              <option value="">全部员工</option>
              {commissionUsers.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}
            </select>
          )}
          <button className="actb orders-refresh" onClick={() => { showToast("已刷新提成报表"); setReloadKey((key) => key + 1); }}>刷新</button>
        </div>
      </div>

      {error && <div className="dash-empty slim">{error}</div>}
      {!error && loading && !report && <div className="dash-empty slim">提成报表加载中...</div>}
      {!error && report && (
        <>
          <div className="commission-summary">
            <div className="dash-card metric">
              <div className="dash-card-kicker">{scope === "month" ? "月结周期" : "日结日期"}</div>
              <div className="dash-card-value small">{rangeLabel}</div>
              <div className="dash-card-meta">生成于 {fmtDateTime(report.generatedAt)}</div>
            </div>
            <div className="dash-card metric">
              <div className="dash-card-kicker">营业额</div>
              <div className="dash-card-value">¥{Number(report.revenue || 0).toFixed(2)}</div>
              <div className="dash-card-meta">{report.orderCount || 0} 单</div>
            </div>
            <div className="dash-card metric">
              <div className="dash-card-kicker">出品额</div>
              <div className="commission-station-sales">
                <div className="commission-station-sale">
                  <span>后厨</span>
                  <strong>¥{Number(report.stationSales?.kitchen || 0).toFixed(2)}</strong>
                </div>
                <div className="commission-station-sale">
                  <span>吧台</span>
                  <strong>¥{Number(report.stationSales?.bar || 0).toFixed(2)}</strong>
                </div>
              </div>
            </div>
            <div className="dash-card metric">
              <div className="dash-card-kicker">{isSelf ? "我的提成" : "提成合计"}</div>
              <div className="dash-card-value">¥{Number(report.totalCommission || 0).toFixed(2)}</div>
              <div className="dash-card-meta">按已设置百分比计算</div>
            </div>
          </div>

          {view === "cards" ? (
            <div className="commission-cards">
              {!employees.length && <div className="commission-empty">暂无提成数据</div>}
              {employees.map((employee) => (
                <div key={employee.userId} className="commission-card">
                  {!isSelf && (
                    <div className="commission-card-head">
                      <div className="commission-card-name">{employee.name}</div>
                      <div className="commission-card-username">{employee.username}</div>
                    </div>
                  )}
                  <div className="commission-card-roles">
                    {(employee.roles || []).filter((role) => COMMISSION_ROLE_LABELS[role]).map((role) => (
                      <span key={role} className={`badge ${role === "kitchen" ? "bk" : role === "bar" ? "bb" : "bf"}`}>{COMMISSION_ROLE_LABELS[role]}</span>
                    ))}
                  </div>
                  <div className="commission-card-rows">
                    <div className="commission-card-row">
                      <span>服务员销售</span>
                      <strong>¥{Number(employee.sales?.front || 0).toFixed(2)}</strong>
                      <em>{employee.orderCount || 0} 桌/单 · {Number(employee.rates?.frontPercent || 0)}% · 提成 ¥{Number(employee.commissions?.front || 0).toFixed(2)}</em>
                    </div>
                    <div className="commission-card-row">
                      <span>后厨商品额</span>
                      <strong>¥{Number(employee.sales?.kitchen || 0).toFixed(2)}</strong>
                      <em>{Number(employee.rates?.kitchenPercent || 0)}% · 提成 ¥{Number(employee.commissions?.kitchen || 0).toFixed(2)}</em>
                    </div>
                    <div className="commission-card-row">
                      <span>吧台商品额</span>
                      <strong>¥{Number(employee.sales?.bar || 0).toFixed(2)}</strong>
                      <em>{Number(employee.rates?.barPercent || 0)}% · 提成 ¥{Number(employee.commissions?.bar || 0).toFixed(2)}</em>
                    </div>
                  </div>
                  <div className="commission-card-total">
                    <span>提成合计</span>
                    <strong>¥{Number(employee.commissions?.total || 0).toFixed(2)}</strong>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="commission-table-wrap">
              <table className="dtb commission-table">
                <thead>
                  <tr>
                    {!isSelf && <th>员工</th>}
                    <th>角色</th><th>服务员销售</th><th>后厨商品额</th><th>吧台商品额</th><th>提成合计</th>
                  </tr>
                </thead>
                <tbody>
                  {!employees.length && (
                    <tr><td colSpan={isSelf ? 5 : 6} className="commission-empty">暂无提成数据</td></tr>
                  )}
                  {employees.map((employee) => (
                    <tr key={employee.userId}>
                      {!isSelf && (
                        <td>
                          <div style={{ fontWeight: 700 }}>{employee.name}</div>
                          <div className="commission-sub">{employee.username}</div>
                        </td>
                      )}
                      <td>
                        {(employee.roles || []).filter((role) => COMMISSION_ROLE_LABELS[role]).map((role) => (
                          <span key={role} className={`badge ${role === "kitchen" ? "bk" : role === "bar" ? "bb" : "bf"}`}>{COMMISSION_ROLE_LABELS[role]}</span>
                        ))}
                      </td>
                      <td>
                        <div className="commission-money">¥{Number(employee.sales?.front || 0).toFixed(2)}</div>
                        <div className="commission-sub">{employee.orderCount || 0} 桌/单 · {Number(employee.rates?.frontPercent || 0)}%</div>
                        <div className="commission-sub">提成 ¥{Number(employee.commissions?.front || 0).toFixed(2)}</div>
                      </td>
                      <td>
                        <div className="commission-money">¥{Number(employee.sales?.kitchen || 0).toFixed(2)}</div>
                        <div className="commission-sub">{Number(employee.rates?.kitchenPercent || 0)}% · 提成 ¥{Number(employee.commissions?.kitchen || 0).toFixed(2)}</div>
                      </td>
                      <td>
                        <div className="commission-money">¥{Number(employee.sales?.bar || 0).toFixed(2)}</div>
                        <div className="commission-sub">{Number(employee.rates?.barPercent || 0)}% · 提成 ¥{Number(employee.commissions?.bar || 0).toFixed(2)}</div>
                      </td>
                      <td><span className="commission-total">¥{Number(employee.commissions?.total || 0).toFixed(2)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
