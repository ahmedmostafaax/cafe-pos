import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../hooks/useApp";
import { fmtDate, fmtElapsed } from "../lib/format";
import { API_BASE } from "../lib/api";
import {
  PAY_METHOD_KEYS,
  TABLE_IDS,
} from "../lib/constants";
import socket from "../lib/socket";
import {
  TAKEAWAY_GUESTS,
  TAKEAWAY_TABLE_ID,
  createCartItem,
  getCartItemKey,
  getNowTimestamp,
  hasItemOptions,
} from "../model/orderOptionUtils";
import {
  createOrderPayload,
  normalizeOrder,
  normalizeOrders,
} from "../model/orderDataModel";
import {
  isTakeawayOrder,
  isOrderServed,
  isCurrentTableSessionOrder,
} from "../model/orderHelpers";
import { OptionSelectorModal, OptionTags } from "../components/modals/OptionSelectorModal";
import LazyImage from "../components/LazyImage";
import { ItemNote, OrderNoteLine } from "../components/OrderNotes";
import OrderHistoryList from "../components/OrderHistoryList";

/* ─── 桌台管理（前台 "桌台管理" tab）─── */
function TableMgmt() {
  const { openTables, setOpenTables, orders, setOrders, showToast, users, user, settings, confirmDanger } = useApp();
  const [sel, setSel] = useState(null);
  const [guestDraft, setGuestDraft] = useState(2);
  const [waiterDraft, setWaiterDraft] = useState("");
  const [serviceModeDraft, setServiceModeDraft] = useState("normal");
  const [noteDraft, setNoteDraft] = useState("");
  const selInfo = sel ? openTables[sel] : null;
  const waiterOptions = users.filter((item) => item.roles.includes("front") || item.roles.includes("admin"));
  const selectedGuests = Math.max(1, Number(guestDraft || selInfo?.guests || 2));
  const serviceModeLabel = { normal: "常规", priority: "加急", vip: "VIP" };

  const hydrateDraft = useCallback((tableId, tableInfo = null) => {
    const info = tableInfo || openTables[tableId] || null;
    const defaultWaiter = user?.id ?? waiterOptions[0]?.id ?? "";
    if (!info) {
      setGuestDraft(2); setWaiterDraft(defaultWaiter ? String(defaultWaiter) : "");
      setServiceModeDraft("normal"); setNoteDraft(""); return;
    }
    setGuestDraft(Number(info.guests || 2));
    setWaiterDraft(info.waiterId ? String(info.waiterId) : "");
    setServiceModeDraft(info.serviceMode || "normal");
    setNoteDraft(info.note || "");
  }, [openTables, user?.id, waiterOptions]);

  const toggleTableSelection = (tableId) => {
    const nextSel = sel === tableId ? null : tableId;
    setSel(nextSel);
    if (!nextSel) { setNoteDraft(""); return; }
    hydrateDraft(nextSel);
  };

  const resolveWaiter = useCallback((waiterId) => {
    const normalizedId = String(waiterId || "").trim();
    if (!normalizedId) return { waiterId: null, waiterName: "" };
    const matched = waiterOptions.find((item) => String(item.id) === normalizedId);
    return { waiterId: matched ? String(matched.id) : normalizedId, waiterName: matched?.name || "" };
  }, [waiterOptions]);

  const buildTablePayload = useCallback((tableId, openedAt) => {
    const now = getNowTimestamp();
    const waiter = resolveWaiter(waiterDraft);
    return { guests: selectedGuests, openedAt, updatedAt: now, waiterId: waiter.waiterId, waiterName: waiter.waiterName, serviceMode: serviceModeDraft, note: noteDraft.trim(), openedById: user?.id ?? null, openedByName: user?.name || "", tableNo: tableId };
  }, [noteDraft, resolveWaiter, selectedGuests, serviceModeDraft, user?.id, user?.name, waiterDraft]);

  const openTable = (tableId) => {
    const openedAt = getNowTimestamp();
    const payload = buildTablePayload(tableId, openedAt);
    const staleOrders = orders.filter((order) => String(order.tableNo ?? "") === String(tableId) && order.status !== "archived");
    if (staleOrders.length > 0) {
      const staleIds = new Set(staleOrders.map((order) => order.id));
      setOrders((prev) => prev.map((order) => (staleIds.has(order.id) ? { ...order, status: "archived" } : order)));
      staleOrders.forEach((order) => socket.emit("update_status", { id: order.id, status: "archived" }));
    }
    setOpenTables((prev) => ({ ...prev, [tableId]: payload }));
    showToast(`${tableId}号桌已开台，${selectedGuests}位${payload.waiterName ? ` · 服务员 ${payload.waiterName}` : ""}`);
    setSel(null); setNoteDraft("");
  };

  const updateTableMeta = (tableId) => {
    if (!selInfo) return;
    const payload = buildTablePayload(tableId, selInfo.openedAt ?? getNowTimestamp());
    setOpenTables((prev) => ({ ...prev, [tableId]: { ...prev[tableId], ...payload, openedAt: prev[tableId]?.openedAt ?? selInfo.openedAt ?? payload.openedAt } }));
    showToast(`${tableId}号桌信息已更新：${selectedGuests}位 · ${serviceModeLabel[payload.serviceMode]}${payload.waiterName ? ` · ${payload.waiterName}` : ""}`);
  };

  const closeTable = async (tableId) => {
    const openedAt = Number(openTables[tableId]?.openedAt ?? 0);
    const tableActiveOrders = orders.filter((order) => String(order.tableNo ?? "") === String(tableId) && order.status !== "archived");
    const sessionOrders = tableActiveOrders.filter((order) => isCurrentTableSessionOrder(order, tableId, openedAt));
    const unpaidOrderCount = sessionOrders.filter((order) => order.status === "unpaid").length;
    if (unpaidOrderCount > 0) { showToast(`该桌还有 ${unpaidOrderCount} 笔未支付订单，请先确认收款或删除后再结台`, "err"); return; }
    const unservedOrderCount = sessionOrders.filter((order) => !isOrderServed(order)).length;
    if (unservedOrderCount > 0) {
      showToast(`该桌还有 ${unservedOrderCount} 笔订单未全部出餐，请等待后厨和吧台都出餐后再结台`, "err");
      return;
    }
    const ok = await confirmDanger(`确认为 ${tableId} 号桌结台吗？结台后将关闭当前桌台会话。`, { title: "结台", confirmText: "结台" });
    if (!ok) return;
    setOpenTables((prev) => { const next = { ...prev }; delete next[tableId]; return next; });
    const closingOrderIds = new Set(tableActiveOrders.map((order) => order.id));
    setOrders((prev) => prev.map((order) => (closingOrderIds.has(order.id) ? { ...order, status: "archived" } : order)));
    tableActiveOrders.forEach((order) => socket.emit("update_status", { id: order.id, status: "archived" }));
    showToast(`${tableId}号桌已结台`); setSel(null);
  };

  return (
    <div>
      <div style={{ fontSize: "12px", color: "var(--td)", marginBottom: "14px", lineHeight: 1.8 }}>
        开台后顾客可通过 <span style={{ color: "var(--blue)" }}>/table/:id</span> 扫码自助点单
      </div>
      <div className="tbl-grid">
        {[...TABLE_IDS, ...((settings?.tableIds || []).filter((id) => !TABLE_IDS.includes(id)))].map((tableId) => {
          const info = openTables[tableId];
          return (
            <div key={tableId} className={`tbl-cell ${info ? "occ" : "free"}${sel === tableId ? " sel" : ""}`} onClick={() => toggleTableSelection(tableId)}>
              <div className="tbl-num">{tableId}</div>
              {info ? (
                <>
                  <div className="tbl-status" style={{ color: "var(--acc)" }}>使用中</div>
                  <div className="tbl-guests">{info.guests}人 · {fmtElapsed(info.openedAt)}</div>
                  <div style={{ fontSize: "11px", color: "var(--td)", marginTop: 2 }}>
                    {info.waiterName ? `服务员 ${info.waiterName}` : "待分配"} · {serviceModeLabel[info.serviceMode || "normal"]}
                  </div>
                </>
              ) : (
                <div className="tbl-status" style={{ color: "var(--td)" }}>空闲</div>
              )}
            </div>
          );
        })}
      </div>
      {sel && (
        <div className="tbl-panel">
          {!selInfo ? (
            <>
              <div className="tbl-panel-title">开台 · {sel} 号桌</div>
              <div style={{ display: "grid", gridTemplateColumns: "88px 1fr", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <div className="fl">用餐人数</div>
                <select className="cs" value={selectedGuests} onChange={(e) => setGuestDraft(+e.target.value)}>
                  {[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n} 人</option>)}
                </select>
                <div className="fl">服务员</div>
                <select className="cs" value={waiterDraft} onChange={(e) => setWaiterDraft(e.target.value)}>
                  <option value="">未分配</option>
                  {waiterOptions.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}
                </select>
                <div className="fl">服务节奏</div>
                <select className="cs" value={serviceModeDraft} onChange={(e) => setServiceModeDraft(e.target.value)}>
                  <option value="normal">常规</option><option value="priority">加急</option><option value="vip">VIP</option>
                </select>
                <div className="fl" style={{ alignSelf: "flex-start", paddingTop: 8 }}>备注</div>
                <textarea className="fta" rows={2} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="过敏源、庆生、偏好等" />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="addb" style={{ margin: 0 }} onClick={() => openTable(sel)}>开 台</button>
                <button className="bcn" onClick={() => setSel(null)}>取消</button>
              </div>
            </>
          ) : (
            <>
              <div className="tbl-panel-title">{sel} 号桌 · {selInfo.guests}人 · {fmtElapsed(selInfo.openedAt)}</div>
              <div style={{ display: "grid", gridTemplateColumns: "88px 1fr", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <div className="fl">调整人数</div>
                <select className="cs" value={selectedGuests} onChange={(e) => setGuestDraft(+e.target.value)}>
                  {[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n} 人</option>)}
                </select>
                <div className="fl">服务员</div>
                <select className="cs" value={waiterDraft} onChange={(e) => setWaiterDraft(e.target.value)}>
                  <option value="">未分配</option>
                  {waiterOptions.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}
                </select>
                <div className="fl">服务节奏</div>
                <select className="cs" value={serviceModeDraft} onChange={(e) => setServiceModeDraft(e.target.value)}>
                  <option value="normal">常规</option><option value="priority">加急</option><option value="vip">VIP</option>
                </select>
                <div className="fl" style={{ alignSelf: "flex-start", paddingTop: 8 }}>备注</div>
                <textarea className="fta" rows={2} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="过敏源、庆生、偏好等" />
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button className="actb" onClick={() => updateTableMeta(sel)}>更 新</button>
              </div>
              <div className="fl" style={{ marginBottom: 6 }}>顾客点单地址：</div>
              <div className="tbl-url">{window.location.origin}/table/{sel}</div>
              <div className="tbl-action-row">
                <button className="actb del" onClick={() => closeTable(sel)}>结 台</button>
                <button className="bcn" onClick={() => setSel(null)}>收起</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── 菜品网格（FrontPanel 的中间面板）─── */
function FrontMenuGrid({ items, cart, onSelect }) {
  const sorted = [...items].sort((a, b) => (Number(!!b.isSignature) - Number(!!a.isSignature)) || (Number(a.sort || 0) - Number(b.sort || 0)));
  return (
    <div className="mg">
      {!sorted.length && (
        <div className="state" style={{ gridColumn: "1/-1" }}>
          <div className="state-icon">空</div>
          <div className="state-title">该分类暂无菜品</div>
          <div className="state-hint">请到后台菜单管理添加，或切换其他分类查看。</div>
        </div>
      )}
      {sorted.map((item) => {
        const cartQty = cart.filter((c) => c.menuId === item.id).reduce((s, c) => s + c.qty, 0);
        return (
          <div key={item.id} className={`mc ${item.station === "kitchen" ? "kit" : "bar"}${!item.available ? " na" : ""}${item.isSignature ? " signature" : ""}`} onClick={() => onSelect(item)}>
            {item.imageUrl && <LazyImage src={item.imageUrl} alt={item.name} className="mc-image" />}
            {item.isSignature && <div className="mc-sig">★ 招牌</div>}
            {hasItemOptions(item) && <div className="mc-opt">可选规格</div>}
            <div className="mc-name">{item.name}</div>
            <div className="mc-price">{item.price}</div>
            <div className="mc-desc">{item.desc}</div>
            <div className="mc-st">{item.station === "kitchen" ? "后厨" : "吧台"}</div>
            {!item.available && <div className="mc-na-tag">沽清</div>}
            {cartQty > 0 && <div className="mc-badge">{cartQty}</div>}
          </div>
        );
      })}
    </div>
  );
}

/* ─── 今日订单 tab ─── */
function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { from: start.getTime(), to: end.getTime() };
}

function FrontTodayOrdersPanel() {
  const { openTables, users, user, showToast } = useApp();
  const [orders, setOrdersLocal] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      const range = getTodayRange();
      setLoading(true); setError("");
      try {
        const params = new URLSearchParams({
          from: String(range.from),
          to: String(range.to),
          limit: "500",
          offset: "0",
        });
        const response = await fetch(`${API_BASE}/api/orders?${params.toString()}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "今日订单加载失败");
        setOrdersLocal(normalizeOrders(Array.isArray(data) ? data : [], { tables: openTables, users, user }));
      } catch (err) {
        if (err.name !== "AbortError") { setError(err.message || "今日订单加载失败"); setOrdersLocal([]); }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [openTables, reloadKey, user, users]);

  return (
    <>
      <div className="orders-pagebar">
        <div>今日订单 · 当前载入 {orders.length} 单</div>
        <div className="orders-page-actions">
          <button className="actb" disabled={loading} onClick={() => { showToast("已刷新今日订单"); setReloadKey((key) => key + 1); }}>刷新</button>
        </div>
      </div>
      {error && <div className="dash-empty slim">{error}</div>}
      {!error && loading && <div className="dash-empty slim">今日订单加载中...</div>}
      {!error && !loading && (
        <OrderHistoryList
          orders={orders}
          onOrderDeleted={(id) => setOrdersLocal((prev) => prev.filter((order) => order.id !== id))}
          onOrderUpdated={(nextOrder) => setOrdersLocal((prev) => prev.map((order) => order.id === nextOrder.id ? nextOrder : order))}
        />
      )}
      {!error && !loading && !orders.length && (
        <button className="actb orders-refresh" onClick={() => setReloadKey((key) => key + 1)}>重新加载</button>
      )}
    </>
  );
}

/* ─── FrontPanel 本体 ─── */
const CART_DRAFT_KEY = "pos_front_cart_demo_v1";
const readCartDraft = () => {
  try {
    const raw = localStorage.getItem(CART_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch { return null; }
};

export default function FrontPanel() {
  const { menu, cats, orders, setOrders, showToast, openTables, setOpenTables, user, users, settings, confirmDanger, deleteOrder } = useApp();
  const customTableIds = Array.isArray(settings?.tableIds) ? settings.tableIds.filter((id) => !TABLE_IDS.includes(id)) : [];
  const draft = useRef(readCartDraft()).current;
  const [tab, setTab] = useState("搜索");
  const [tableNo, setTableNo] = useState(draft?.tableNo || TABLE_IDS[0]);
  const [guests, setGuests] = useState(draft?.guests || "2");
  const [dineIn, setDineIn] = useState(draft?.dineIn !== false);
  const [pay, setPay] = useState(draft?.pay || "微信");
  const [cart, setCart] = useState(Array.isArray(draft?.cart) ? draft.cart : []);
  const [disc, setDisc] = useState(draft?.disc || "1.0");
  const [manualTotalEnabled, setManualTotalEnabled] = useState(!!draft?.manualTotalEnabled);
  const [manualTotal, setManualTotal] = useState(draft?.manualTotal || "");
  const [flash, setFlash] = useState(false);
  const [search, setSearch] = useState("");
  const [orderServiceMode, setOrderServiceMode] = useState(draft?.serviceMode || "normal");
  const [orderNote, setOrderNote] = useState(draft?.orderNote || "");
  const [optionItem, setOptionItem] = useState(null);
  const lastDineInTable = useRef(TABLE_IDS[0]);
  const lastDineInGuests = useRef("2");
  const currentTableInfo = dineIn && tableNo !== TAKEAWAY_TABLE_ID ? openTables[tableNo] : null;
  const tableIsOpened = Boolean(currentTableInfo);
  const displayedGuests = tableIsOpened ? String(currentTableInfo.guests) : guests;

  useEffect(() => { if (tableNo !== TAKEAWAY_TABLE_ID) lastDineInTable.current = tableNo; }, [tableNo]);
  useEffect(() => { if (dineIn && !tableIsOpened) lastDineInGuests.current = guests; }, [dineIn, guests, tableIsOpened]);

  const addCartLine = useCallback((cartItem) => {
    setCart((prev) => {
      const exists = prev.find((item) => item.cartKey === cartItem.cartKey);
      if (!exists) return [...prev, cartItem];
      return prev.map((item) => item.cartKey === cartItem.cartKey ? { ...item, qty: item.qty + cartItem.qty } : item);
    });
  }, []);

  const handleMenuSelect = (item) => {
    if (!item.available) return;
    if (hasItemOptions(item)) { setOptionItem(item); return; }
    addCartLine(createCartItem(item));
  };

  const unpaidOrders = orders.filter((o) => o.status === "unpaid").sort((a, b) => b.createdAt - a.createdAt);

  const specialTabs = ["搜索", "今日订单", "桌台管理", "待付款"];
  const activeTab = specialTabs.includes(tab) || cats.includes(tab) ? tab : cats[0] || "搜索";

  const applyDiningMode = (nextDineIn) => {
    setDineIn(nextDineIn);
    if (nextDineIn) {
      const nextTableNo = lastDineInTable.current || TABLE_IDS[0];
      setTableNo(nextTableNo);
      if (!openTables[nextTableNo]) setGuests(lastDineInGuests.current || "2");
      return;
    }
    setTableNo(TAKEAWAY_TABLE_ID);
    setGuests(String(TAKEAWAY_GUESTS));
  };

  const handleTableChange = (value) => {
    setTableNo(value);
    if (value === TAKEAWAY_TABLE_ID) { applyDiningMode(false); return; }
    setDineIn(true);
    if (!openTables[value]) setGuests(lastDineInGuests.current || "2");
  };

  const changeQty = (cartKey, delta) => {
    setCart((prev) => prev.map((item) => item.cartKey === cartKey ? { ...item, qty: Math.max(0, item.qty + delta) } : item).filter((item) => item.qty > 0));
  };

  const recallToCart = useCallback(async (order) => {
    if (!order || !Array.isArray(order.items)) return;
    if (cart.length > 0) {
      const ok = await confirmDanger(
        `当前购物车有 ${cart.length} 项，撤回订单 ${order.id} 会覆盖现有内容。继续？`,
        { title: "撤回到当前订单", confirmText: "覆盖并撤回" }
      );
      if (!ok) return;
    }
    const recalledItems = order.items.map((item) => ({
      ...item,
      cartKey: item.cartKey || getCartItemKey(item),
      done: false,
      status: "pending",
      qty: Number(item.qty || 1),
    }));
    setCart(recalledItems);
    if (order.tableNo && order.tableNo !== TAKEAWAY_TABLE_ID) {
      setTableNo(order.tableNo);
      setDineIn(true);
    } else if (order.tableNo === TAKEAWAY_TABLE_ID) {
      setDineIn(false);
    }
    if (order.payMethod) setPay(order.payMethod);
    if (order.note) setOrderNote(order.note);
    if (order.service?.mode) setOrderServiceMode(order.service.mode);
    const success = await deleteOrder(order.id, { reason: "撤回到当前订单", byName: user?.name || "" });
    if (success) {
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      showToast(`订单 ${order.id} 已撤回到当前订单`);
    }
  }, [cart.length, confirmDanger, deleteOrder, setOrders, showToast, user?.name]);

  const raw = cart.reduce((s, item) => s + item.price * item.qty, 0);
  const parsed = parseFloat(disc);
  const discountValue = Math.min(Math.max(isNaN(parsed) ? 1 : parsed, 0), 1);
  const parsedManualTotal = parseFloat(manualTotal);
  const total = manualTotalEnabled && Number.isFinite(parsedManualTotal) && parsedManualTotal >= 0
    ? +parsedManualTotal.toFixed(2)
    : +(raw * discountValue).toFixed(2);

  useEffect(() => {
    try {
      localStorage.setItem(CART_DRAFT_KEY, JSON.stringify({
        cart, tableNo, dineIn, pay, disc, manualTotalEnabled, manualTotal,
        orderNote, guests, serviceMode: orderServiceMode,
      }));
    } catch {/* ignore */}
  }, [cart, tableNo, dineIn, pay, disc, manualTotalEnabled, manualTotal, orderNote, guests, orderServiceMode]);

  const submit = () => {
    if (!cart.length) return;
    const createdAt = getNowTimestamp();
    const trimmedNote = orderNote.trim();
    const guestCount = dineIn ? (tableIsOpened ? Number(currentTableInfo.guests ?? 1) : (parseInt(displayedGuests, 10) || 1)) : TAKEAWAY_GUESTS;
    let nextTableInfo = currentTableInfo;
    if (dineIn && !tableIsOpened) {
      const autoOpened = { guests: guestCount, openedAt: openTables[tableNo]?.openedAt ?? createdAt, updatedAt: createdAt, waiterId: user?.id ? String(user.id) : null, waiterName: user?.name || "", serviceMode: orderServiceMode, note: trimmedNote };
      const staleOrders = orders.filter((order) => String(order.tableNo ?? "") === String(tableNo) && order.status !== "archived");
      if (staleOrders.length > 0) {
        const staleIds = new Set(staleOrders.map((order) => order.id));
        setOrders((prev) => prev.map((order) => (staleIds.has(order.id) ? { ...order, status: "archived" } : order)));
        staleOrders.forEach((order) => socket.emit("update_status", { id: order.id, status: "archived" }));
      }
      setOpenTables((prev) => ({ ...prev, [tableNo]: autoOpened }));
      nextTableInfo = autoOpened;
    }
    const order = createOrderPayload({
      tableNo: dineIn ? tableNo : TAKEAWAY_TABLE_ID, guests: guestCount, dineIn, payMethod: pay,
      items: cart.map((item) => ({ ...item, status: "pending" })),
      total, discount: discountValue, createdAt, status: "preparing", fromTable: false,
      tableInfo: dineIn ? nextTableInfo : null, user, note: trimmedNote, serviceMode: orderServiceMode,
    });
    socket.emit("new_order", order, (result) => {
      if (!result?.ok) {
        showToast(result?.message || "订单提交失败，请重试", "err");
        return;
      }
      const finalId = result?.order?.id || "";
      setCart([]); setOrderServiceMode("normal"); setOrderNote("");
      setManualTotalEnabled(false); setManualTotal("");
      setFlash(true);
      showToast(
        dineIn && !tableIsOpened
          ? `${tableNo}号桌已自动开台，订单 ${finalId} 已提交 · ¥${total}`
          : `订单 ${finalId} 已提交 · ¥${total}`
      );
      setTimeout(() => setFlash(false), 600);
    });
  };

  const normalizedSearch = search.trim().toLowerCase();
  const searchResults = normalizedSearch ? menu.filter((item) => `${item.name}${item.desc}${item.category}`.toLowerCase().includes(normalizedSearch)) : [];

  // 分类计数
  const catCounts = cats.reduce((acc, c) => { acc[c] = menu.filter((m) => m.category === c).length; return acc; }, {});

  return (
    <>
      {flash && <div className="flash" />}
      <div className="fp">
        {/* ── 左侧分类栏 ── */}
        <div className="fp-cats">
          <div className="fp-cats-hd">菜单分类</div>
          {cats.map((cat) => (
            <button key={cat} className={`fp-cat${activeTab === cat ? " a" : ""}`} onClick={() => { setTab(cat); setSearch(""); }}>
              <span>{cat}</span>
              <span className="fp-cat-count">{catCounts[cat] || 0}</span>
            </button>
          ))}
          <div className="fp-cat-divider" />
          <button className={`fp-cat${activeTab === "搜索" ? " a" : ""}`} onClick={() => setTab("搜索")}>
            <span>🔍 搜索菜品</span>
          </button>
          <button className={`fp-cat${activeTab === "桌台管理" ? " a" : ""}`} onClick={() => setTab("桌台管理")}>
            <span>📋 桌台管理</span>
          </button>
          <button className={`fp-cat${activeTab === "待付款" ? " a" : ""}`} onClick={() => setTab("待付款")}>
            <span>⏳ 待付款</span>
            {unpaidOrders.length > 0 && <span className={`fp-cat-badge${unpaidOrders.length > 0 ? " pulse" : ""}`}>{unpaidOrders.length}</span>}
          </button>
          <button className={`fp-cat${activeTab === "今日订单" ? " a" : ""}`} onClick={() => setTab("今日订单")}>
            <span>📄 今日订单</span>
          </button>
        </div>

        {/* ── 中间菜单区 ── */}
        <div className="mp">
          {!specialTabs.includes(activeTab) && (
            <div className="panel-scroll">
              <FrontMenuGrid items={menu.filter((item) => item.category === activeTab)} cart={cart} onSelect={handleMenuSelect} />
            </div>
          )}
          {activeTab === "搜索" && (
            <div className="panel-scroll">
              <input className="srch-in" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索菜品名称、描述或分类..." autoFocus />
              <div className="srch-hint">{normalizedSearch ? `找到 ${searchResults.length} 个结果` : "输入关键词搜索全部菜品"}</div>
              {normalizedSearch ? <FrontMenuGrid items={searchResults} cart={cart} onSelect={handleMenuSelect} /> : <div className="empty" style={{ padding: "24px 0" }}>输入关键词开始搜索</div>}
            </div>
          )}
          {activeTab === "桌台管理" && <div className="panel-scroll"><TableMgmt /></div>}
          {activeTab === "今日订单" && <div className="panel-scroll"><FrontTodayOrdersPanel /></div>}
          {activeTab === "待付款" && (
            <div className="panel-scroll">
              {!unpaidOrders.length && (
                <div className="state">
                  <div className="state-icon">✓</div>
                  <div className="state-title">暂无待付款订单</div>
                  <div className="state-hint">所有桌台都已结清，可以安心忙碌其他事。</div>
                </div>
              )}
              {unpaidOrders.map((order) => {
                const reportedKey = order.customerPaymentReported || null;
                const reportedLabel = reportedKey === "wechat" ? "微信" : reportedKey === "alipay" ? "支付宝" : reportedKey === "cash" ? "现金" : reportedKey;
                return (
                  <div key={order.id} className="unpaid-card">
                    <div className="unpaid-head">
                      <div className="unpaid-tbl">{isTakeawayOrder(order) ? TAKEAWAY_TABLE_ID : `${order.tableNo}号桌`}</div>
                      <div className="unpaid-time">{fmtDate(order.createdAt)}</div>
                      <div className="unpaid-amt">¥{order.total.toFixed(2)}</div>
                    </div>
                    <div className="unpaid-items">
                      {order.items.map((item, index) => <span key={getCartItemKey(item, index)} className="unpaid-item">{item.name}{item.note ? ` · ${item.note}` : ""}×{item.qty}</span>)}
                    </div>
                    {order.fromTable && (
                      <div className="unpaid-pay-alert">扫码自助订单：请确认顾客已按 ¥{order.total.toFixed(2)} 完成桌上二维码付款，再选择付款方式确认收款。</div>
                    )}
                    <OrderNoteLine note={order.note} />
                    {reportedKey && (
                      <div className="unpaid-pay-reported">
                        顾客已通过 <span className="unpaid-pay-reported-name">{reportedLabel}</span> 支付成功，请核对后选择支付方式
                      </div>
                    )}
                    <div className="unpaid-id">{order.id}</div>
                    <div className="unpaid-actions unpaid-actions-col">
                      <div className="unpaid-pay-row">
                        {["微信", "支付宝", "现金", "银行卡"].map((method) => {
                          const methodKey = PAY_METHOD_KEYS[method] || "";
                          const isReported = methodKey && reportedKey === methodKey;
                          const cls = isReported ? `pb pb-reported pb-${methodKey}` : "pb";
                          return (
                            <button key={method} className={cls} onClick={() => {
                              const confirmedAt = getNowTimestamp();
                              const updated = normalizeOrder({ ...order, status: "preparing", payMethod: method, updatedAt: confirmedAt, payment: { ...(order.payment || {}), method, status: "paid", confirmedAt } }, { tables: openTables, users, user });
                              setOrders((prev) => prev.map((o) => o.id === order.id ? updated : o));
                              socket.emit("update_status", { id: order.id, status: "preparing", payMethod: method, payment: updated.payment, updatedAt: confirmedAt });
                              showToast(`订单 ${order.id} 已确认收款 · ${method} · ¥${order.total.toFixed(2)}`);
                            }}>
                              {method}
                            </button>
                          );
                        })}
                      </div>
                      <div className="unpaid-pay-row">
                        <button className="recall-btn" onClick={() => recallToCart(order)}>撤回到当前订单</button>
                        <button className="delete-unpaid-btn" onClick={async () => {
                          const reason = window.prompt(`确认删除未支付订单 ${order.id}？请填写删除原因（必填）：`, "");
                          const trimmed = (reason || "").trim();
                          if (!trimmed) return;
                          const ok = await confirmDanger(`确认删除订单 ${order.id} 吗？删除后将记入软删档案，无法直接还原。`, { title: "删除订单", confirmText: "删除订单" });
                          if (!ok) return;
                          const success = await deleteOrder(order.id, { reason: trimmed, byName: user?.name || "" });
                          if (success) {
                            setOrders((prev) => prev.filter((item) => item.id !== order.id));
                            showToast(`未支付订单 ${order.id} 已删除`);
                          }
                        }}>删除订单</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 右侧订单面板 ── */}
        <div className="op">
          <div className="c-head">
            <div className="c-title">当前订单{dineIn ? ` · ${tableNo}号桌` : " · 外卖"}</div>
            <div className="oc">
              <select className="cs" value={tableNo} onChange={(e) => handleTableChange(e.target.value)}>
                {TABLE_IDS.map((id) => <option key={id} value={id}>{id}号桌</option>)}
                {customTableIds.map((id) => <option key={id} value={id}>{id}</option>)}
                <option value={TAKEAWAY_TABLE_ID}>{TAKEAWAY_TABLE_ID}</option>
              </select>
              <select className="cs" value={displayedGuests} onChange={(e) => setGuests(e.target.value)} disabled={!dineIn || tableIsOpened}>
                {[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n}人</option>)}
              </select>
              <div className="dt-row">
                <button className={`db${dineIn ? " a" : ""}`} onClick={() => applyDiningMode(true)}>堂食</button>
                <button className={`db${!dineIn ? " a" : ""}`} onClick={() => applyDiningMode(false)}>外卖</button>
              </div>
              {dineIn && (
                <div className="dt-note">
                  {tableIsOpened
                    ? `${tableNo}号桌已开台，${currentTableInfo.guests}位。${currentTableInfo.waiterName ? `服务员：${currentTableInfo.waiterName}。` : "未分配服务员。"}`
                    : `${tableNo}号桌未开台，提交时将自动开台。`}
                </div>
              )}
            </div>
          </div>

          <div className="cart-items">
            {!cart.length && <div className="empty" style={{ padding: "28px 0", fontSize: "14px" }}>点击左侧菜品添加至订单</div>}
            {cart.map((item) => (
              <div key={item.cartKey} className="oir">
                <div className="oii">
                  <div className="oin">{item.name}</div>
                  <OptionTags selectedOptions={item.selectedOptions} />
                  <ItemNote note={item.note} className="item-note compact" />
                  <div className="oip">¥{item.price} × {item.qty} = ¥{(item.price * item.qty).toFixed(2)}</div>
                </div>
                <div className="qc">
                  <button className="qb" onClick={() => changeQty(item.cartKey, -1)}>−</button>
                  <div className="qn">{item.qty}</div>
                  <button className="qb" onClick={() => changeQty(item.cartKey, 1)}>+</button>
                </div>
              </div>
            ))}
          </div>

          <div className="c-foot">
            <div className="d-row">
              <div className="dl">服务节奏</div>
              <select className="cs" style={{ maxWidth: "95px" }} value={orderServiceMode} onChange={(e) => setOrderServiceMode(e.target.value)}>
                <option value="normal">常规</option><option value="priority">加急</option><option value="vip">VIP</option>
              </select>
            </div>
            <input className="fi" style={{ marginBottom: 8 }} value={orderNote} onChange={(e) => setOrderNote(e.target.value)} placeholder="订单备注（可选）：少冰、忌葱、庆生..." />
            <div className="d-row">
              <div className="dl">折扣</div>
              <input className="di" value={disc} onChange={(e) => setDisc(e.target.value)} placeholder="1.0" disabled={manualTotalEnabled} />
              <div className="dl" style={{ color: "var(--acc)" }}>{Math.round(discountValue * 10)}折</div>
            </div>
            <div className="d-row manual-total-row">
              <label className="dl">
                <input type="checkbox" checked={manualTotalEnabled} onChange={(e) => setManualTotalEnabled(e.target.checked)} style={{ marginRight: 4 }} />
                改总价
              </label>
              {manualTotalEnabled && (
                <input
                  className="di"
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualTotal}
                  onChange={(e) => setManualTotal(e.target.value)}
                  placeholder={`原价 ¥${(raw * discountValue).toFixed(2)}`}
                />
              )}
            </div>
            <div className="p-row">
              {["微信", "支付宝", "现金", "银行卡"].map((method) => {
                const methodKey = PAY_METHOD_KEYS[method] || "";
                return (
                  <button key={method} className={`pb${pay === method ? ` a${methodKey ? ` pb-${methodKey}` : ""}` : ""}`} onClick={() => setPay(method)}>{method}</button>
                );
              })}
            </div>
            <div className="t-row">
              <div className="tl">合计</div>
              <div>
                <span className="ta">{total.toFixed(2)}</span>
                {discountValue < 1 && <span className="to">¥{raw.toFixed(2)}</span>}
              </div>
            </div>
            <button className="sub-btn" disabled={!cart.length} onClick={submit}>提 交 订 单</button>
          </div>
        </div>
      </div>

      {optionItem && (
        <OptionSelectorModal item={optionItem} onClose={() => setOptionItem(null)}
          onConfirm={(cartItem) => { addCartLine(cartItem); setOptionItem(null); }}
          confirmLabel="加入当前订单" />
      )}
    </>
  );
}
