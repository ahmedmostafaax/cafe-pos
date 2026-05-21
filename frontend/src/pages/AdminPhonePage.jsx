import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../hooks/useApp";
import DashboardPanel from "./DashboardPanel";
import CommissionReportPanel from "./CommissionReportPanel";
import OrderHistoryList from "../components/OrderHistoryList";
import socket from "../lib/socket";
import { API_BASE } from "../lib/api";
import { fmtMonthInput } from "../lib/format";
import { ROLE_LABELS, normalizeEmployeeCommissions } from "../lib/constants";
import { getNowTimestamp } from "../model/orderOptionUtils";
import { normalizeOrders } from "../model/orderDataModel";

const TABS = [
  { k: "dashboard", l: "看板" },
  { k: "orders", l: "订单" },
  { k: "commissions", l: "提成" },
  { k: "users", l: "员工" },
];

const ORDER_FILTERS = [
  { key: "all", label: "全部" },
  { key: "current", label: "当前", params: { status: "active" } },
  { key: "preparing", label: "制作中", params: { statusExact: "preparing" } },
  { key: "unpaid", label: "待付款", params: { statusExact: "unpaid" } },
  { key: "archived", label: "已完成", params: { statusExact: "archived" } },
];

function PhoneOrdersPanel() {
  const { openTables, users, user } = useApp();
  const [month, setMonth] = useState(() => fmtMonthInput());
  const [filter, setFilter] = useState("current");
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [orders, setOrdersLocal] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => { setPage(0); }, [month, filter]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setError("");
      try {
        const params = new URLSearchParams({ month, limit: String(pageSize), offset: String(page * pageSize) });
        const activeFilter = ORDER_FILTERS.find((item) => item.key === filter);
        Object.entries(activeFilter?.params || {}).forEach(([key, value]) => params.set(key, value));
        const response = await fetch(`${API_BASE}/api/orders?${params.toString()}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "订单加载失败");
        setOrdersLocal(normalizeOrders(Array.isArray(data) ? data : [], { tables: openTables, users, user }));
      } catch (err) {
        if (err.name !== "AbortError") { setError(err.message || "订单加载失败"); setOrdersLocal([]); }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [filter, month, openTables, page, reloadKey, user, users]);

  const hasNext = orders.length >= pageSize;

  return (
    <div className="ap-section">
      <div className="ap-section-title">订单监控（只读）</div>
      <div className="ap-orders-toolbar">
        <label className="ap-field">
          <span>月份</span>
          <input className="fi" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <div className="ap-chips">
          {ORDER_FILTERS.map((item) => (
            <button key={item.key} className={`ap-chip${filter === item.key ? " a" : ""}`} onClick={() => setFilter(item.key)}>{item.label}</button>
          ))}
        </div>
      </div>
      <div className="ap-pager-row">
        <span>{month} · 第 {page + 1} 页 · {orders.length} 单</span>
        <div className="ap-pager-btns">
          <button className="actb" disabled={page === 0 || loading} onClick={() => setPage((prev) => Math.max(0, prev - 1))}>上一页</button>
          <button className="actb" disabled={!hasNext || loading} onClick={() => setPage((prev) => prev + 1)}>下一页</button>
          <button className="actb" onClick={() => setReloadKey((key) => key + 1)}>刷新</button>
        </div>
      </div>
      {error && <div className="dash-empty slim">{error}</div>}
      {!error && loading && <div className="dash-empty slim">订单加载中...</div>}
      {!error && !loading && <OrderHistoryList orders={orders} readOnly />}
    </div>
  );
}

function PhoneUsersPanel() {
  const { users, settings, saveSettings, showToast, confirmDanger } = useApp();
  const emptyRates = { frontPercent: 0, kitchenPercent: 0, barPercent: 0 };
  const [editUser, setEditUser] = useState(null);

  const getRates = (userId) => ({
    ...emptyRates,
    ...(normalizeEmployeeCommissions(settings.employeeCommissions)[String(userId)] || {}),
  });
  const blankUser = () => ({ id: getNowTimestamp(), name: "", username: "", password: "", roles: [], commissionRates: { ...emptyRates } });
  const startEdit = (item) => setEditUser({ ...item, roles: [...item.roles], commissionRates: getRates(item.id) });
  const toggleRole = (role) => setEditUser((prev) => prev ? { ...prev, roles: prev.roles.includes(role) ? prev.roles.filter((r) => r !== role) : [...prev.roles, role] } : prev);
  const updateRate = (field, value) => setEditUser((prev) => prev ? { ...prev, commissionRates: { ...(prev.commissionRates || emptyRates), [field]: value } } : prev);

  const save = () => {
    if (!editUser) return;
    if (!editUser.name?.trim()) { showToast("请填写姓名", "err"); return; }
    if (!editUser.username?.trim()) { showToast("请填写账号", "err"); return; }
    const userId = String(editUser.id);
    const rawRates = editUser.commissionRates || emptyRates;
    const allowedRates = {
      frontPercent: editUser.roles.includes("front") ? rawRates.frontPercent : 0,
      kitchenPercent: editUser.roles.includes("kitchen") ? rawRates.kitchenPercent : 0,
      barPercent: editUser.roles.includes("bar") ? rawRates.barPercent : 0,
    };
    const nextCommissions = { ...normalizeEmployeeCommissions(settings.employeeCommissions) };
    const normalizedRates = normalizeEmployeeCommissions({ [userId]: allowedRates })[userId];
    if (normalizedRates) nextCommissions[userId] = normalizedRates;
    else delete nextCommissions[userId];
    const { commissionRates, ...userPayload } = editUser;
    socket.emit("save_user", userPayload);
    saveSettings({ ...settings, employeeCommissions: nextCommissions });
    setEditUser(null); showToast("用户已保存 ✓");
  };

  const remove = async (item) => {
    const ok = await confirmDanger(`确认删除用户「${item.name || item.username}」吗？此操作不可恢复。`);
    if (!ok) return;
    socket.emit("delete_user", { id: item.id });
    const nextCommissions = { ...normalizeEmployeeCommissions(settings.employeeCommissions) };
    delete nextCommissions[String(item.id)];
    saveSettings({ ...settings, employeeCommissions: nextCommissions });
    showToast("已删除用户");
  };

  return (
    <div className="ap-section">
      <div className="ap-section-title-row">
        <div className="ap-section-title">员工与权限</div>
        <button className="addb" onClick={() => setEditUser(blankUser())}>+ 新增</button>
      </div>
      <div className="ap-user-list">
        {!users.length && <div className="dash-empty slim">暂无员工</div>}
        {users.map((item) => (
          <div key={item.id} className="ap-user-card">
            <div className="ap-user-head">
              <div className="ap-user-name">{item.name || "（未命名）"}</div>
              <div className="ap-user-username">{item.username}</div>
            </div>
            <div className="ap-user-roles">
              {item.roles.length === 0 && <span className="ap-user-empty">未分配权限</span>}
              {item.roles.map((role) => (
                <span key={role} className={`badge ${role === "kitchen" ? "bk" : role === "bar" ? "bb" : role === "front" ? "bf" : "ba"}`}>{ROLE_LABELS[role] || role}</span>
              ))}
            </div>
            <div className="ap-user-actions">
              <button className="actb" onClick={() => startEdit(item)}>编辑</button>
              <button className="actb del" onClick={() => remove(item)}>删除</button>
            </div>
          </div>
        ))}
      </div>

      {editUser && (
        <div className="ap-sheet" role="dialog" aria-modal="true">
          <div className="ap-sheet-head">
            <div className="ap-sheet-title">{editUser.name ? "编辑员工" : "新增员工"}</div>
            <button className="mcl" onClick={() => setEditUser(null)}>✕</button>
          </div>
          <div className="ap-sheet-body">
            <div className="fg">
              <label className="fl">姓名</label>
              <input className="fi" value={editUser.name} onChange={(e) => setEditUser((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="fg">
              <label className="fl">账号</label>
              <input className="fi" value={editUser.username} onChange={(e) => setEditUser((prev) => ({ ...prev, username: e.target.value }))} autoCapitalize="none" autoCorrect="off" />
            </div>
            <div className="fg">
              <label className="fl">密码</label>
              <input className="fi" type="password" value={editUser.password} onChange={(e) => setEditUser((prev) => ({ ...prev, password: e.target.value }))} placeholder="留空则不修改" />
            </div>
            <div className="fg">
              <label className="fl">权限</label>
              <div className="ap-role-grid">
                {["front", "kitchen", "bar", "admin"].map((role) => {
                  const hasRole = editUser.roles.includes(role);
                  return (
                    <button key={role} type="button" className={`ap-role-btn${hasRole ? " a" : ""}`} onClick={() => toggleRole(role)}>{ROLE_LABELS[role]}</button>
                  );
                })}
              </div>
            </div>
            <div className="fg">
              <label className="fl">提成百分比</label>
              <div className="ap-rate-grid">
                <label className="ap-rate-field">
                  <span>服务员 %</span>
                  <input className="fi" type="number" min="0" max="100" step="0.1" disabled={!editUser.roles.includes("front")} value={editUser.commissionRates?.frontPercent ?? 0} onChange={(e) => updateRate("frontPercent", e.target.value)} />
                </label>
                <label className="ap-rate-field">
                  <span>后厨 %</span>
                  <input className="fi" type="number" min="0" max="100" step="0.1" disabled={!editUser.roles.includes("kitchen")} value={editUser.commissionRates?.kitchenPercent ?? 0} onChange={(e) => updateRate("kitchenPercent", e.target.value)} />
                </label>
                <label className="ap-rate-field">
                  <span>吧台 %</span>
                  <input className="fi" type="number" min="0" max="100" step="0.1" disabled={!editUser.roles.includes("bar")} value={editUser.commissionRates?.barPercent ?? 0} onChange={(e) => updateRate("barPercent", e.target.value)} />
                </label>
              </div>
            </div>
          </div>
          <div className="ap-sheet-foot">
            <button className="bcn" onClick={() => setEditUser(null)}>取消</button>
            <button className="bsv" onClick={save}>保存</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPhonePage() {
  const { user, setUser, orders } = useApp();
  const navigate = useNavigate();
  const [nav, setNav] = useState("dashboard");

  return (
    <div className="admin-phone">
      <header className="ap-head">
        <div className="ap-head-brand">Cafe POS · 手机后台</div>
        <div className="ap-head-user">{user?.name}</div>
        <button className="ap-head-logout" onClick={() => { setUser(null); navigate("/adminphone/login"); }}>退出</button>
      </header>
      <main className="ap-body">
        {nav === "dashboard" && <DashboardPanel refreshKey={orders.length} />}
        {nav === "orders" && <PhoneOrdersPanel />}
        {nav === "commissions" && <CommissionReportPanel mode="admin" view="cards" />}
        {nav === "users" && <PhoneUsersPanel />}
      </main>
      <nav className="ap-tabs">
        {TABS.map((tab) => (
          <button key={tab.k} className={`ap-tab${nav === tab.k ? " a" : ""}`} onClick={() => setNav(tab.k)}>{tab.l}</button>
        ))}
      </nav>
    </div>
  );
}
