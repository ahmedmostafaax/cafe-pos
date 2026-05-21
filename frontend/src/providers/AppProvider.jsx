import { useCallback, useEffect, useRef, useState } from "react";
import { AppContext } from "../context/AppContext";
import { useApp } from "../hooks/useApp";
import { getNowTimestamp } from "../model/orderOptionUtils";
import { normalizeOrder, normalizeOrders, normalizeTablesSnapshot, normalizeUsers } from "../model/orderDataModel";
import socket from "../lib/socket";
import { fetchJSON as libFetchJSON } from "../lib/api";
import {
  normalizeCustomTableIds,
  normalizeEmployeeCommissions,
  normalizeStationThresholds,
  PAY_METHODS,
  PAY_METHOD_KEYS,
} from "../lib/constants";

const normalizeSettings = (settings = {}) => ({
  stationThresholds: normalizeStationThresholds(settings.stationThresholds),
  employeeCommissions: normalizeEmployeeCommissions(settings.employeeCommissions),
  tableIds: normalizeCustomTableIds(settings.tableIds),
  wechatPayQr: settings.wechatPayQr || "",
  alipayQr: settings.alipayQr || "",
  customerSelfPay: settings.customerSelfPay !== false,
});

export default function AppProvider({ children }) {
  const [user, rawSetUser] = useState(() => {
    try {
      const s = sessionStorage.getItem("pos_user");
      if (!s) return null;
      const parsed = JSON.parse(s);
      return normalizeUsers([parsed])[0] || null;
    } catch { return null; }
  });
  const setUser = useCallback((u) => {
    const nextUser = u ? normalizeUsers([u])[0] : null;
    rawSetUser(nextUser);
    if (nextUser) sessionStorage.setItem("pos_user", JSON.stringify(nextUser));
    else sessionStorage.removeItem("pos_user");
  }, []);
  const [authBootstrapReady, setAuthBootstrapReady] = useState(false);
  const [menu, setMenu] = useState([]);
  const [cats, setCats] = useState([]);
  const [users, unsafeSetUsers] = useState([]);
  const [usersReady, setUsersReady] = useState(false);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersLoadError, setUsersLoadError] = useState("");
  const [orders, unsafeSetOrders] = useState([]);
  const [settings, unsafeSetSettings] = useState(() => normalizeSettings());
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [payMethodState, setPayMethodState] = useState(null);
  const [openTables, unsafeSetOpenTables] = useState({});
  const [dataLoading, setDataLoading] = useState(true);
  const tablesFromSocket = useRef(false);
  const toastTimer = useRef(null);
  const mountedRef = useRef(true);
  const confirmResolver = useRef(null);
  const payMethodResolver = useRef(null);

  const showToast = useCallback((msg, type = "ok") => {
    const nextToast = { msg, type, key: getNowTimestamp() };
    setToast(nextToast);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast((current) => (current?.key === nextToast.key ? null : current));
    }, 2500);
  }, []);

  const closeConfirm = useCallback((result) => {
    const resolver = confirmResolver.current;
    confirmResolver.current = null;
    setConfirmState(null);
    resolver?.(result);
  }, []);

  const confirmDanger = useCallback((message, options = {}) => new Promise((resolve) => {
    if (confirmResolver.current) confirmResolver.current(false);
    confirmResolver.current = resolve;
    setConfirmState({
      title: options.title || "确认操作",
      message,
      tone: options.tone || "danger",
      confirmText: options.confirmText || "确认",
      cancelText: options.cancelText || "取消",
    });
  }), []);

  const closePayMethodPicker = useCallback((picked) => {
    const resolver = payMethodResolver.current;
    payMethodResolver.current = null;
    setPayMethodState(null);
    resolver?.(picked || null);
  }, []);

  const selectPayMethod = useCallback((order) => new Promise((resolve) => {
    if (payMethodResolver.current) payMethodResolver.current(null);
    payMethodResolver.current = resolve;
    setPayMethodState({
      orderId: order.id,
      total: Number(order.total || 0),
      current: order.payMethod || order?.payment?.method || "微信",
    });
  }), []);

  const deleteOrder = useCallback(async (orderId, options = {}) => {
    const reason = String(options.reason || "").trim();
    const byName = String(options.byName || "").trim();
    return new Promise((resolve) => {
      socket.emit("delete_order", { id: orderId, deletedByName: byName, deletedReason: reason }, (ack) => {
        if (ack && ack.ok === false) {
          showToast(ack.message || "删除失败", "err");
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }, [showToast]);

  const changePayMethod = useCallback((order, method) => {
    if (!order || !method) return;
    socket.emit("update_status", {
      id: order.id,
      status: order.status,
      payMethod: method,
      payment: { ...(order.payment || {}), method },
      updatedAt: getNowTimestamp(),
    });
  }, []);

  const usersRef = useRef(users);
  usersRef.current = users;
  const setUsers = useCallback((updater) => {
    const prev = usersRef.current;
    const next = typeof updater === "function" ? updater(prev) : updater;
    const normalized = normalizeUsers(next);
    usersRef.current = normalized;
    unsafeSetUsers(normalized);
  }, []);

  const openTablesRef = useRef(openTables);
  openTablesRef.current = openTables;
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const setOrders = useCallback((updater) => {
    const prev = ordersRef.current;
    const next = typeof updater === "function" ? updater(prev) : updater;
    const normalized = normalizeOrders(next, { tables: openTablesRef.current, users: usersRef.current, user });
    ordersRef.current = normalized;
    unsafeSetOrders(normalized);
  }, [user]);

  const setOpenTables = useCallback((updater) => {
    const prev = openTablesRef.current;
    const next = typeof updater === "function" ? updater(prev) : updater;
    const normalized = normalizeTablesSnapshot(next, usersRef.current);
    openTablesRef.current = normalized;
    unsafeSetOpenTables(normalized);
    if (!tablesFromSocket.current) socket.emit("update_tables", normalized);
  }, []);

  const setSettings = useCallback((updater) => {
    const prev = settingsRef.current;
    const next = typeof updater === "function" ? updater(prev) : updater;
    const normalized = normalizeSettings(next);
    settingsRef.current = normalized;
    unsafeSetSettings(normalized);
  }, []);

  const saveSettings = useCallback((nextSettings) => {
    const normalized = normalizeSettings(nextSettings);
    setSettings(normalized);
    socket.emit("save_settings", normalized);
  }, [setSettings]);

  const fetchJSON = useCallback((endpoint) => libFetchJSON(endpoint), []);

  const applyTablesSnapshot = useCallback((tables, usersSnapshot = usersRef.current) => {
    if (!tables || typeof tables !== "object") return;
    const normalized = normalizeTablesSnapshot(tables, usersSnapshot);
    tablesFromSocket.current = true;
    openTablesRef.current = normalized;
    unsafeSetOpenTables(normalized);
    tablesFromSocket.current = false;
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true); setUsersReady(false); setUsersLoadError("");
    try {
      const usersRes = await fetchJSON("/api/users");
      if (!mountedRef.current) return;
      if (Array.isArray(usersRes)) {
        const normalizedUsers = normalizeUsers(usersRes);
        setUsers(normalizedUsers);
        if (Object.keys(openTablesRef.current).length) applyTablesSnapshot(openTablesRef.current, normalizedUsers);
        setOrders((prev) => prev);
      } else { setUsers([]); setUsersLoadError("用户列表接口返回格式错误"); }
    } catch (err) {
      if (!mountedRef.current) return;
      setUsers([]); setUsersLoadError(err.message || "用户数据加载失败");
    } finally {
      if (mountedRef.current) { setUsersLoading(false); setUsersReady(true); }
    }
  }, [applyTablesSnapshot, fetchJSON, setOrders, setUsers]);

  const loadInitialData = useCallback(async () => {
    const [ordersRes, menuRes, catsRes, tablesRes, settingsRes] = await Promise.allSettled([
      fetchJSON("/api/orders?status=active"),
      fetchJSON("/api/menu"),
      fetchJSON("/api/categories"),
      fetchJSON("/api/tables"),
      fetchJSON("/api/settings"),
    ]);
    if (!mountedRef.current) return;
    if (menuRes.status === "fulfilled" && Array.isArray(menuRes.value)) setMenu(menuRes.value);
    if (catsRes.status === "fulfilled" && Array.isArray(catsRes.value)) setCats(catsRes.value);
    if (settingsRes.status === "fulfilled") setSettings(settingsRes.value);
    if (tablesRes.status === "fulfilled") applyTablesSnapshot(tablesRes.value);
    if (ordersRes.status === "fulfilled" && Array.isArray(ordersRes.value)) {
      setOrders(normalizeOrders(ordersRes.value, {
        tables: tablesRes.status === "fulfilled" ? tablesRes.value : openTablesRef.current,
        users: usersRef.current, user,
      }));
    }
    setDataLoading(false);
  }, [applyTablesSnapshot, fetchJSON, setOrders, setSettings, user]);

  useEffect(() => {
    mountedRef.current = true;
    setAuthBootstrapReady(true);
    return () => { mountedRef.current = false; if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  useEffect(() => { loadUsers(); loadInitialData(); }, [loadInitialData, loadUsers]);

  useEffect(() => {
    const handleConnect = () => socket.emit("get_initial_data");
    const handleInitialData = ({ orders: serverOrders, tables: serverTables, users: serverUsers, menu: serverMenu, cats: serverCats, settings: serverSettings }) => {
      const normalizedUsers = Array.isArray(serverUsers) ? normalizeUsers(serverUsers) : usersRef.current;
      if (Array.isArray(serverUsers)) { setUsers(normalizedUsers); setUsersLoadError(""); setUsersLoading(false); setUsersReady(true); }
      applyTablesSnapshot(serverTables, normalizedUsers);
      if (Array.isArray(serverOrders)) setOrders(normalizeOrders(serverOrders, { tables: serverTables || openTablesRef.current, users: normalizedUsers, user }));
      if (Array.isArray(serverUsers)) applyTablesSnapshot(openTablesRef.current, normalizedUsers);
      if (Array.isArray(serverMenu)) setMenu(serverMenu);
      if (Array.isArray(serverCats)) setCats(serverCats);
      if (serverSettings && typeof serverSettings === "object") setSettings(serverSettings);
      setDataLoading(false);
    };
    const handleOrderCreated = (newOrder) => {
      const normalized = normalizeOrder(newOrder, { tables: openTablesRef.current, users: usersRef.current, user });
      setOrders((prev) => { const exists = prev.some((o) => o.id === normalized.id); return exists ? prev.map((o) => o.id === normalized.id ? normalized : o) : [normalized, ...prev]; });
    };
    const handleOrderUpdated = (updatedOrder) => {
      const normalized = normalizeOrder(updatedOrder, { tables: openTablesRef.current, users: usersRef.current, user });
      setOrders((prev) => { const exists = prev.some((o) => o.id === normalized.id); return exists ? prev.map((o) => o.id === normalized.id ? normalized : o) : [normalized, ...prev]; });
    };
    const handleOrderDeleted = ({ id }) => { if (id) setOrders((prev) => prev.filter((o) => o.id !== id)); };
    const handleTablesUpdated = (data) => applyTablesSnapshot(data || {});
    const handleUsersUpdated = (data) => {
      const normalizedUsers = normalizeUsers(Array.isArray(data) ? data : []);
      setUsers(normalizedUsers); applyTablesSnapshot(openTablesRef.current, normalizedUsers);
      setOrders((prev) => prev); setUsersLoadError(""); setUsersLoading(false); setUsersReady(true);
    };
    const handleMenuUpdated = (data) => setMenu(Array.isArray(data) ? data : []);
    const handleCatsUpdated = (data) => setCats(Array.isArray(data) ? data : []);
    const handleSettingsUpdated = (data) => setSettings(data || {});
    const handleSocketError = ({ message }) => message && showToast(message, "err");

    socket.on("connect", handleConnect); socket.on("initial_data", handleInitialData);
    socket.on("order_created", handleOrderCreated); socket.on("order_updated", handleOrderUpdated);
    socket.on("order_deleted", handleOrderDeleted); socket.on("tables_updated", handleTablesUpdated);
    socket.on("users_updated", handleUsersUpdated); socket.on("menu_updated", handleMenuUpdated);
    socket.on("cats_updated", handleCatsUpdated); socket.on("settings_updated", handleSettingsUpdated);
    socket.on("error", handleSocketError);
    if (socket.connected) handleConnect();
    return () => {
      socket.off("connect", handleConnect); socket.off("initial_data", handleInitialData);
      socket.off("order_created", handleOrderCreated); socket.off("order_updated", handleOrderUpdated);
      socket.off("order_deleted", handleOrderDeleted); socket.off("tables_updated", handleTablesUpdated);
      socket.off("users_updated", handleUsersUpdated); socket.off("menu_updated", handleMenuUpdated);
      socket.off("cats_updated", handleCatsUpdated); socket.off("settings_updated", handleSettingsUpdated);
      socket.off("error", handleSocketError);
    };
  }, [applyTablesSnapshot, setOrders, setSettings, setUsers, showToast, user]);

  return (
    <AppContext.Provider value={{ authBootstrapReady, user, setUser, menu, setMenu, orders, setOrders, deleteOrder, changePayMethod, cats, setCats, users, setUsers, usersReady, usersLoading, usersLoadError, loadUsers, openTables, setOpenTables, settings, setSettings, saveSettings, toast, showToast, confirmDanger, selectPayMethod, dataLoading }}>
      {children}
      <InlineConfirmDialog state={confirmState} onCancel={() => closeConfirm(false)} onConfirm={() => closeConfirm(true)} />
      <PayMethodPickerDialog state={payMethodState} onCancel={() => closePayMethodPicker(null)} onConfirm={closePayMethodPicker} />
    </AppContext.Provider>
  );
}

function InlineConfirmDialog({ state, onCancel, onConfirm }) {
  if (!state) return null;
  return (
    <div className="icf-layer" role="presentation" onMouseDown={onCancel}>
      <div className={`icf-card ${state.tone || "danger"}`} role="dialog" aria-modal="true" aria-labelledby="icf-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="icf-mark">!</div>
        <div className="icf-copy">
          <div id="icf-title" className="icf-title">{state.title || "确认操作"}</div>
          <div className="icf-msg">{state.message}</div>
        </div>
        <div className="icf-actions">
          <button className="icf-btn ghost" onClick={onCancel}>{state.cancelText || "取消"}</button>
          <button className="icf-btn danger" onClick={onConfirm}>{state.confirmText || "确认"}</button>
        </div>
      </div>
    </div>
  );
}

function PayMethodPickerDialog({ state, onCancel, onConfirm }) {
  const [picked, setPicked] = useState(state?.current || "微信");
  useEffect(() => {
    if (state) setPicked(state.current || "微信");
  }, [state?.orderId, state?.current]);
  if (!state) return null;
  return (
    <div className="icf-layer" role="presentation" onMouseDown={onCancel}>
      <div className="icf-card pay-pick" role="dialog" aria-modal="true" aria-labelledby="paypick-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="icf-mark" style={{ background: "rgba(45,122,80,.12)", color: "#2d7a50" }}>¥</div>
        <div className="icf-copy">
          <div id="paypick-title" className="icf-title">修改支付方式</div>
          <div className="icf-msg">订单 {state.orderId} · ¥{Number(state.total || 0).toFixed(2)} · 当前 {state.current}</div>
        </div>
        <div className="pay-pick-row">
          {PAY_METHODS.map((method) => {
            const methodKey = PAY_METHOD_KEYS[method] || "";
            return (
              <button key={method} type="button" className={`pb${picked === method ? ` a${methodKey ? ` pb-reported pb-${methodKey}` : ''}` : ""}`} onClick={() => setPicked(method)}>
                {method}
              </button>
            );
          })}
        </div>
        <div className="icf-actions">
          <button className="icf-btn ghost" onClick={onCancel}>取消</button>
          <button className="icf-btn confirm" onClick={() => onConfirm(picked)}>确认修改</button>
        </div>
      </div>
    </div>
  );
}

export function ToastBridge() {
  const { toast } = useApp();
  if (!toast) return null;
  return <div className={`toast${toast.type === "err" ? " err" : ""}`}>{toast.msg}</div>;
}
