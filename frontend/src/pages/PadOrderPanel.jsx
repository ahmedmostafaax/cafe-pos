import { useState, useCallback, useEffect, useRef } from "react";
import { useApp } from "../hooks/useApp";
import LazyImage, { getAssetUrl } from "../components/LazyImage";
import { OptionTags } from "../components/modals/OptionSelectorModal";
import { ProductDetailModal } from "../components/modals/ProductDetailModal";
import PadPaymentGuideModal from "../components/modals/PadPaymentGuideModal";
import socket from "../lib/socket";
import { TABLE_IDS } from "../lib/constants";
import {
  TAKEAWAY_GUESTS,
  TAKEAWAY_TABLE_ID,
  getNowTimestamp,
  hasItemOptions,
} from "../model/orderOptionUtils";
import { createOrderPayload } from "../model/orderDataModel";

export default function PadOrderPanel() {
  useEffect(() => {
    document.body.classList.add("tp-host");
    return () => document.body.classList.remove("tp-host");
  }, []);
  const { menu, cats, openTables, settings, user, showToast } = useApp();
  const [padTableId, setPadTableId] = useState("");
  const [tab, setTab] = useState(null);
  const [cart, setCart] = useState([]);
  const [detailItem, setDetailItem] = useState(null);
  const [orderNote, setOrderNote] = useState("");
  const [paymentHint, setPaymentHint] = useState(null);
  const [submittedOrders, setSubmittedOrders] = useState([]);
  const [quickOpen, setQuickOpen] = useState(false);
  const cartIconRef = useRef(null);

  const isTakeaway = padTableId === TAKEAWAY_TABLE_ID;
  const tableInfo = !isTakeaway && padTableId ? openTables[padTableId] : null;
  const selectedLabel = !padTableId ? "未选择" : isTakeaway ? TAKEAWAY_TABLE_ID : `${padTableId} 号桌`;
  const openTableIdsSorted = Object.keys(openTables).sort((a, b) => {
    const an = Number(a), bn = Number(b);
    if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
    return String(a).localeCompare(String(b));
  });

  const triggerBump = useCallback(() => {
    const el = cartIconRef.current;
    if (!el) return;
    el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
  }, []);
  const addCartLine = useCallback((cartItem) => {
    setCart((prev) => {
      const exists = prev.find((item) => item.cartKey === cartItem.cartKey);
      if (!exists) return [...prev, cartItem];
      return prev.map((item) => item.cartKey === cartItem.cartKey ? { ...item, qty: item.qty + cartItem.qty } : item);
    });
    triggerBump();
  }, [triggerBump]);
  const changeQty = (cartKey, delta) => {
    setCart((prev) => prev.map((item) => item.cartKey === cartKey ? { ...item, qty: Math.max(0, item.qty + delta) } : item).filter((item) => item.qty > 0));
  };

  const activeTab = tab && cats.includes(tab) ? tab : cats[0] || null;
  const filteredMenu = activeTab
    ? menu.filter((item) => item.category === activeTab && item.available)
      .sort((a, b) => Number(!!b.isSignature) - Number(!!a.isSignature))
    : [];
  const cartCount = cart.reduce((s, item) => s + item.qty, 0);
  const cartTotal = cart.reduce((s, item) => s + item.price * item.qty, 0);
  const canSubmit = cart.length > 0 && !!padTableId;

  const submitOrder = () => {
    if (!canSubmit) return;
    const now = getNowTimestamp();
    const guests = isTakeaway ? TAKEAWAY_GUESTS : (tableInfo?.guests ?? 1);
    const order = createOrderPayload({
      tableNo: isTakeaway ? TAKEAWAY_TABLE_ID : padTableId,
      guests,
      dineIn: !isTakeaway,
      payMethod: "待确认",
      items: cart.map((item) => ({ ...item, status: "pending" })),
      total: +cartTotal.toFixed(2),
      discount: 1,
      createdAt: now,
      status: "unpaid",
      fromTable: false,
      tableInfo: isTakeaway ? null : tableInfo,
      user,
      note: orderNote.trim(),
      serviceMode: tableInfo?.serviceMode,
    });
    socket.emit("new_order", order, (result) => {
      if (!result?.ok) { showToast(result?.message || "下单失败，请重试", "err"); return; }
      const submitted = result?.order || order;
      setSubmittedOrders((prev) => [submitted, ...prev]);
      setPaymentHint({
        id: submitted.id || "",
        total: Number(submitted.total ?? cartTotal).toFixed(2),
        createdAt: submitted.createdAt || now,
      });
      setCart([]);
      setOrderNote("");
    });
  };

  const reportPayment = (method) => {
    if (paymentHint?.id) socket.emit('report_payment', { id: paymentHint.id, method });
  };
  const dismissPay = () => {
    setPaymentHint(null);
    setSubmittedOrders([]);
  };

  const handleOpenedTable = (tableId) => {
    setQuickOpen(false);
    setPadTableId(String(tableId));
    showToast(`${tableId} 号桌已开台`);
  };

  return (
    <div className="tp pad-page">
      {/* 顶部桌台选择器 */}
      <div className="pad-toolbar">
        <div className="pad-toolbar-label">点单到：</div>
        <div className="pad-toolbar-chips">
          <button
            className={`pad-chip${isTakeaway ? " a" : ""}`}
            onClick={() => setPadTableId(TAKEAWAY_TABLE_ID)}
          >
            🥡 {TAKEAWAY_TABLE_ID}
          </button>
          {openTableIdsSorted.length === 0 && (
            <div className="pad-toolbar-empty">尚未开台。请「快速开台」</div>
          )}
          {openTableIdsSorted.map((id) => {
            const info = openTables[id];
            return (
              <button
                key={id}
                className={`pad-chip${padTableId === id ? " a" : ""}`}
                onClick={() => setPadTableId(id)}
              >
                {id} 号桌 · {info?.guests || 1}位
              </button>
            );
          })}
          <button className="pad-chip quick-open" onClick={() => setQuickOpen(true)}>
            + 快速开台
          </button>
        </div>
        <div className="pad-toolbar-status">
          已选：<b>{selectedLabel}</b>
          {tableInfo?.waiterName ? ` · ${tableInfo.waiterName}` : ""}
        </div>
      </div>

      {/* 分类标签 */}
      <div className="tp-tabs-wrap">
        <div className="tp-tabs">
          {cats.map((cat) => (
            <button key={cat} className={`tp-tab${activeTab === cat ? " a" : ""}`} onClick={() => setTab(cat)}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="tp-main">
        {!padTableId && (
          <div className="tp-mode-card">
            <div>
              <div className="tp-mode-title">请先选择桌台或外卖</div>
              <div className="tp-mode-sub">点单前先指定目的地，避免下错单。</div>
            </div>
          </div>
        )}

        {submittedOrders.length > 0 && (
          <div className="tp-confirm">
            <div className="tp-confirm-title">
              <div className="tp-confirm-check">✓</div>
              本次代点已提交 {submittedOrders.length} 笔
            </div>
            <div className="tp-confirm-sub">付款方式由顾客在平板上选择并扫码完成。</div>
            <div className="tp-confirm-list">
              {submittedOrders.map((order, index) => (
                <div key={order.id || `${order.createdAt}-${index}`} className="tp-confirm-item">
                  {order.id} · {order.items.map((it) => `${it.name}${it.note ? `〔${it.note}〕` : ""}×${it.qty}`).join("、")} · ¥{Number(order.total || 0).toFixed(2)}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab && (
          <div className="tp-section">
            <div className="tp-section-head">
              <div className="tp-section-title">{activeTab}</div>
              <div className="tp-section-sub">{filteredMenu.length} items</div>
            </div>
            <div className="tp-grid">
              {filteredMenu.length === 0 && <div className="tp-empty-grid">该分类暂无可点菜品</div>}
              {filteredMenu.map((item, index) => {
                const inCartQty = cart.filter((c) => c.menuId === item.id).reduce((sum, c) => sum + c.qty, 0);
                const imageSrc = item.imageUrl ? getAssetUrl(item.imageUrl) : "";
                return (
                  <div
                    key={item.id}
                    className={`tp-card${!item.available ? " na" : ""}${imageSrc ? " has-image" : ""}${item.isSignature ? " signature" : ""}`}
                    style={{ "--i": index }}
                    onClick={() => item.available && setDetailItem(item)}
                  >
                    {imageSrc && (
                      <div className="tp-card-image-wrap">
                        <LazyImage className="tp-card-image" src={imageSrc} alt={item.name} />
                      </div>
                    )}
                    <div className="tp-card-top">
                      <div className="tp-card-station">{item.station === "kitchen" ? "后厨" : "吧台"}</div>
                      {item.isSignature && <div className="tp-card-signature">★ 招牌</div>}
                      {hasItemOptions(item) && <div className="tp-card-tag">可选规格</div>}
                      {inCartQty > 0 && <div className="tp-card-incart">× {inCartQty}</div>}
                    </div>
                    <div className="tp-card-name">{item.name}</div>
                    <div className="tp-card-desc">{item.desc}</div>
                    <div className="tp-card-foot">
                      <div className="tp-card-price">{item.price}</div>
                      {item.available
                        ? <button className="tp-card-add" onClick={(e) => { e.stopPropagation(); setDetailItem(item); }} aria-label={`加入 ${item.name}`}>+</button>
                        : <div className="tp-card-na-tag">暂时售罄</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 底部固定购物车面板 */}
      <div className="pad-cart-dock">
        <div className="pad-cart-head">
          <div ref={cartIconRef} className="pad-cart-ic">🛒
            {cartCount > 0 && <div className="tp-cartbar-dot">{cartCount}</div>}
          </div>
          <div className="pad-cart-info">
            <div className="pad-cart-meta">{cartCount} 件 · {selectedLabel}</div>
            <div className="pad-cart-amt">¥{cartTotal.toFixed(2)}</div>
          </div>
          <input
            className="pad-cart-note"
            value={orderNote}
            maxLength={120}
            onChange={(e) => setOrderNote(e.target.value)}
            placeholder="整单备注（可选）"
          />
          <button className="tp-sheet-submit" disabled={!canSubmit} onClick={submitOrder}>
            提交并支付
          </button>
        </div>
        {cart.length > 0 && (
          <div className="pad-cart-items">
            {cart.map((item) => (
              <div key={item.cartKey} className="pad-cart-item">
                <div className="pad-cart-item-main">
                  <div className="pad-cart-item-name">{item.name}</div>
                  <OptionTags selectedOptions={item.selectedOptions} className="tp-opt-tags" tagClassName="tp-opt-tag" />
                  {item.note && <div className="tp-item-note">备注：{item.note}</div>}
                  <div className="pad-cart-item-price">¥{(item.price * item.qty).toFixed(2)}</div>
                </div>
                <div className="tp-si-qc">
                  <button className="tp-qb" onClick={() => changeQty(item.cartKey, -1)}>−</button>
                  <div className="tp-qn">{item.qty}</div>
                  <button className="tp-qb" onClick={() => changeQty(item.cartKey, 1)}>+</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {detailItem && (
        <ProductDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onConfirm={(cartItem) => { addCartLine(cartItem); setDetailItem(null); }}
        />
      )}

      {quickOpen && (
        <PadQuickOpenDialog
          onClose={() => setQuickOpen(false)}
          onOpened={handleOpenedTable}
        />
      )}

      {paymentHint && (
        <PadPaymentGuideModal
          paymentHint={paymentHint}
          settings={settings}
          onReportOnly={reportPayment}
          onDismiss={dismissPay}
        />
      )}
    </div>
  );
}

function PadQuickOpenDialog({ onClose, onOpened }) {
  const { openTables, setOpenTables, orders, setOrders, settings, users, user } = useApp();
  const customTableIds = Array.isArray(settings?.tableIds) ? settings.tableIds.filter((id) => !TABLE_IDS.includes(id)) : [];
  const allTableIds = [...TABLE_IDS, ...customTableIds];
  const freeTableIds = allTableIds.filter((id) => !openTables[id]);
  const waiterOptions = users.filter((item) => item.roles.includes("front") || item.roles.includes("admin"));
  const [tableId, setTableId] = useState(freeTableIds[0] || "");
  const [guests, setGuests] = useState(2);
  const [waiterId, setWaiterId] = useState(user?.id ? String(user.id) : (waiterOptions[0]?.id ? String(waiterOptions[0].id) : ""));
  const [serviceMode, setServiceMode] = useState("normal");
  const [note, setNote] = useState("");

  const open = () => {
    if (!tableId) return;
    const matched = waiterOptions.find((item) => String(item.id) === waiterId);
    const openedAt = getNowTimestamp();
    const payload = {
      guests: Math.max(1, Number(guests || 1)),
      openedAt,
      updatedAt: openedAt,
      waiterId: matched ? String(matched.id) : null,
      waiterName: matched?.name || "",
      serviceMode,
      note: note.trim(),
      openedById: user?.id ?? null,
      openedByName: user?.name || "",
      tableNo: tableId,
    };
    const staleOrders = orders.filter((o) => String(o.tableNo ?? "") === String(tableId) && o.status !== "archived");
    if (staleOrders.length > 0) {
      const staleIds = new Set(staleOrders.map((o) => o.id));
      setOrders((prev) => prev.map((o) => (staleIds.has(o.id) ? { ...o, status: "archived" } : o)));
      staleOrders.forEach((o) => socket.emit("update_status", { id: o.id, status: "archived" }));
    }
    setOpenTables((prev) => ({ ...prev, [tableId]: payload }));
    onOpened?.(tableId);
  };

  return (
    <div className="tp-mo">
      <div className="tp-mo-bg" onClick={onClose} />
      <div className="tp-mo-content" style={{ textAlign: "left", padding: "24px" }}>
        <div className="tp-mo-title" style={{ marginBottom: 16, fontSize: 22 }}>快速开台</div>
        <div style={{ display: "grid", gridTemplateColumns: "88px 1fr", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div className="fl">桌号</div>
          <select className="cs" value={tableId} onChange={(e) => setTableId(e.target.value)}>
            {!freeTableIds.length && <option value="">所有桌都已开台</option>}
            {freeTableIds.map((id) => <option key={id} value={id}>{id} 号桌</option>)}
          </select>
          <div className="fl">人数</div>
          <select className="cs" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
            {[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n} 人</option>)}
          </select>
          <div className="fl">服务员</div>
          <select className="cs" value={waiterId} onChange={(e) => setWaiterId(e.target.value)}>
            <option value="">未分配</option>
            {waiterOptions.map((item) => <option key={item.id} value={String(item.id)}>{item.name}</option>)}
          </select>
          <div className="fl">服务节奏</div>
          <select className="cs" value={serviceMode} onChange={(e) => setServiceMode(e.target.value)}>
            <option value="normal">常规</option><option value="priority">加急</option><option value="vip">VIP</option>
          </select>
          <div className="fl" style={{ alignSelf: "flex-start", paddingTop: 8 }}>备注</div>
          <textarea className="fta" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="过敏源 / 庆生 / 偏好等" />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="tp-pay-btn neutral" style={{ width: "auto", padding: "12px 22px" }} onClick={onClose}>取消</button>
          <button className="tp-pay-btn primary" style={{ width: "auto", padding: "12px 22px" }} disabled={!tableId} onClick={open}>开台并选中</button>
        </div>
      </div>
    </div>
  );
}
