import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import "./TablePage.css";
import { useApp } from "../hooks/useApp";
import { getCartItemKey, getNowTimestamp, hasItemOptions } from "../model/orderOptionUtils";
import { OptionTags } from "../components/modals/OptionSelectorModal";
import { ProductDetailModal } from "../components/modals/ProductDetailModal";
import { createOrderPayload } from "../model/orderDataModel";
import socket from "../lib/socket";
import { getAssetUrl } from "../components/LazyImage";

function LazyImage({ src, alt, className }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      <div className={`tp-img-placeholder ${loaded ? 'hidden' : ''}`}>
        <div className="tp-spinner small"></div>
        <div style={{fontSize: '10px', marginTop: '6px', color: 'var(--tm)'}}>加载中</div>
      </div>
      <img
        className={`${className} ${loaded ? 'loaded' : 'loading'}`}
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </>
  );
}

function ItemNote({ note, className = "tp-item-note" }) {
  const text = String(note || "").trim();
  if (!text) return null;
  return <div className={className}>备注：{text}</div>;
}

const formatOrderItemBrief = (item) => {
  const options = item.selectedOptions?.length
    ? `（${item.selectedOptions.flatMap((g) => g.choices.map((c) => `${g.groupLabel}:${c.name}`)).join(" / ")}）`
    : "";
  const note = item.note ? `〔备注：${item.note}〕` : "";
  return `${item.name}${options}${note}×${item.qty}`;
};

/* 全页面挂载时让 body 可滚动（解 index.css 里的 overflow:hidden） */
function useBodyScroll() {
  useEffect(() => {
    document.body.classList.add("tp-host");
    return () => document.body.classList.remove("tp-host");
  }, []);
}

export default function TablePage() {
  useBodyScroll();
  const { id } = useParams();
  const tableId = String(id);
  const { menu, cats, orders, openTables, settings, dataLoading } = useApp();
  const tableInfo = openTables[tableId];
  const tableLabel = `${tableId} 号桌`;
  const sessionStartAt = Number(tableInfo?.openedAt ?? 0);
  const tableOrders = orders.filter(
    (order) =>
      String(order.tableNo ?? "") === tableId
      && Number(order.createdAt ?? 0) >= sessionStartAt
      && (order.status === "preparing" || order.status === "unpaid")
  );

  if (dataLoading && cats.length === 0) {
    return (
      <div className="tp">
        <div className="tp-header">
          <div className="tp-brand-block">
            <div className="tp-brand">Cafe POS <em>Demo</em></div>
            <div className="tp-brand-sub">Artisan Kitchen</div>
          </div>
          <div className="tp-table-pill">
            <div className="tp-table-pill-num">{tableId}</div>
            <div className="tp-table-pill-info">
              <div className="tp-table-pill-label">{tableLabel}</div>
              <div className="tp-table-pill-meta">菜单正在准备中...</div>
            </div>
          </div>
        </div>
        <div className="tp-loading-state">
          <div className="tp-spinner"></div>
          <div className="tp-loading-text">正在为您准备菜单...</div>
        </div>
      </div>
    );
  }

  if (!tableInfo) {
    return (
      <div className="tp">
        <div className="tp-state">
          <div className="tp-state-ic">🔒</div>
          <div className="tp-state-title">{tableLabel} · 待开台</div>
          <div className="tp-state-sub">
            请通知工作人员为您的桌台开台后，
            <br />此页面将自动刷新为点单菜单。
            <div className="tp-state-code">/table/{tableId}</div>
          </div>
          <div className="tp-state-pulse">等待开台中…</div>
        </div>
      </div>
    );
  }

  return (
    <OpenedTableSession
      key={`${tableId}-${tableInfo.openedAt ?? "open"}`}
      tableId={tableId}
      tableInfo={tableInfo}
      tableLabel={tableLabel}
      tableOrders={tableOrders}
      menu={menu}
      cats={cats}
      settings={settings}
    />
  );
}

function OpenedTableSession({ tableId, tableInfo, tableLabel, tableOrders, menu, cats, settings }) {
  const [tab, setTab] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [paymentHint, setPaymentHint] = useState(null);

  /* 加菜时给购物车图标抖动反馈 */
  const cartIconRef = useRef(null);
  const cartBarIconRef = useRef(null);
  const triggerBump = useCallback(() => {
    [cartIconRef.current, cartBarIconRef.current].forEach((el) => {
      if (!el) return;
      el.classList.remove("bump");
      void el.offsetWidth; // reflow
      el.classList.add("bump");
    });
  }, []);

  const addCartLine = useCallback((cartItem) => {
    setCart((prev) => {
      const exists = prev.find((item) => item.cartKey === cartItem.cartKey);
      if (!exists) return [...prev, cartItem];
      return prev.map((item) =>
        item.cartKey === cartItem.cartKey ? { ...item, qty: item.qty + cartItem.qty } : item
      );
    });
    triggerBump();
  }, [triggerBump]);

  const handleMenuSelect = (item) => {
    if (!item.available) return;
    setDetailItem(item);
  };

  const activeTab = tab && cats.includes(tab) ? tab : cats[0] || null;

  const changeQty = (cartKey, delta) => {
    setCart((prev) =>
      prev
        .map((item) => item.cartKey === cartKey ? { ...item, qty: Math.max(0, item.qty + delta) } : item)
        .filter((item) => item.qty > 0)
    );
  };

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const waiterName = tableInfo?.waiterName || tableInfo?.service?.waiterName || "待分配";
  const serviceModeLabel = { normal: "常规", priority: "加急", vip: "VIP" };
  const tableServiceMode = tableInfo?.serviceMode || "normal";
  const selfPayEnabled = settings?.customerSelfPay !== false;

  const submitOrder = () => {
    if (!cart.length) return;
    const now = getNowTimestamp();
    const order = createOrderPayload({
      tableNo: tableId,
      guests: tableInfo?.guests ?? 1,
      dineIn: true,
      payMethod: "待确认",
      items: cart.map((item) => ({ ...item, status: "pending" })),
      total: +cartTotal.toFixed(2),
      discount: 1,
      createdAt: now,
      status: "unpaid",
      fromTable: true,
      tableInfo,
      note: tableInfo?.note || "",
      serviceMode: tableInfo?.serviceMode,
    });
    socket.emit("new_order", order, (result) => {
      if (!result?.ok) return;
      if (selfPayEnabled) {
        setPaymentHint({
          id: result?.order?.id || "",
          total: Number(result?.order?.total ?? cartTotal).toFixed(2),
          createdAt: result?.order?.createdAt || now,
        });
      }
      setCart([]);
      setCartOpen(false);
    });
  };

  const reportPayment = (method) => {
    if (paymentHint?.id) {
      socket.emit('report_payment', { id: paymentHint.id, method });
    }
    setPaymentHint(null);
  };

  const filteredMenu = activeTab
    ? menu
      .filter((item) => item.category === activeTab && item.available)
      .sort((a, b) => Number(!!b.isSignature) - Number(!!a.isSignature))
    : [];

  return (
    <div className="tp">
      {/* ── Header ── */}
      <div className="tp-header">
        <div className="tp-brand-block">
          <div className="tp-brand">Cafe POS <em>Demo</em></div>
          <div className="tp-brand-sub">Artisan Kitchen</div>
        </div>

        <div className="tp-table-pill">
          <div className="tp-table-pill-num">{tableId}</div>
          <div className="tp-table-pill-info">
            <div className="tp-table-pill-label">{tableLabel} · {tableInfo.guests}位</div>
            <div className="tp-table-pill-meta">
              {waiterName} · {serviceModeLabel[tableServiceMode] || tableServiceMode}
              {tableInfo?.note ? ` · ${tableInfo.note}` : ""}
            </div>
          </div>
        </div>

        <button
          ref={cartIconRef}
          className="tp-cart-icon-btn"
          hidden={cartCount === 0}
          onClick={() => setCartOpen(true)}
          aria-label="查看购物车"
        >
          🛒
          {cartCount > 0 && <div className="tp-cart-dot">{cartCount}</div>}
        </button>
      </div>

      {/* ── 分类标签 ── */}
      <div className="tp-tabs-wrap">
        <div className="tp-tabs">
          {cats.map((cat) => (
            <button
              key={cat}
              className={`tp-tab${activeTab === cat ? " a" : ""}`}
              onClick={() => setTab(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── 主体内容 ── */}
      <div className="tp-main">
        {/* 已下单提示 */}
        {tableOrders.length > 0 && (
          <div className="tp-confirm">
            <div className="tp-confirm-title">
              <div className="tp-confirm-check">✓</div>
              已下单 {tableOrders.length} 笔，
              {tableOrders.some((o) => o.status === "unpaid") ? "等待收银确认" : "厨房制作中"}
            </div>
            <div className="tp-confirm-sub">
              您可以继续添加菜品，多次下单均可。工作人员会为您送餐。
            </div>
            <div className="tp-confirm-list">
              {tableOrders.map((order) => (
                <div key={order.id} className="tp-confirm-item">
                  {order.id} · {order.items.map(formatOrderItemBrief).join("、")} · ¥{order.total.toFixed(2)}
                  {order.note ? ` · 整单备注：${order.note}` : ""}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 菜品列表 */}
        {activeTab && (
          <div className="tp-section">
            <div className="tp-section-head">
              <div className="tp-section-title">{activeTab}</div>
              <div className="tp-section-sub">{filteredMenu.length} items</div>
            </div>
            <div className="tp-grid">
              {filteredMenu.length === 0 && (
                <div className="tp-empty-grid">该分类暂无可点菜品</div>
              )}
              {filteredMenu.map((item, index) => {
                const inCartQty = cart
                  .filter((c) => c.menuId === item.id)
                  .reduce((sum, c) => sum + c.qty, 0);
                const imageSrc = getAssetUrl(item.imageUrl);
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
                      <div className="tp-card-station">
                        {item.station === "kitchen" ? "后厨" : "吧台"}
                      </div>
                      {item.isSignature && (
                        <div className="tp-card-signature">★ 招牌</div>
                      )}
                      {hasItemOptions(item) && (
                        <div className="tp-card-tag">可选规格</div>
                      )}
                      {inCartQty > 0 && (
                        <div className="tp-card-incart">× {inCartQty}</div>
                      )}
                    </div>

                    <div className="tp-card-name">{item.name}</div>
                    <div className="tp-card-desc">{item.desc}</div>

                    <div className="tp-card-foot">
                      <div className="tp-card-price">{item.price}</div>
                      {item.available ? (
                        <button
                          className="tp-card-add"
                          onClick={(e) => { e.stopPropagation(); handleMenuSelect(item); }}
                          aria-label={`加入 ${item.name}`}
                        >
                          +
                        </button>
                      ) : (
                        <div className="tp-card-na-tag">暂时售罄</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 本次已点菜单 */}
        {tableOrders.length > 0 && (
          <div className="tp-orders">
            <div className="tp-section-head">
              <div className="tp-section-title">本次已点菜单</div>
              <div className="tp-section-sub">{tableOrders.length} orders</div>
            </div>
            {tableOrders.map((order) => {
              const served = order.status === "archived" || order.items.every((item) => item.status === "completed");
              const isUnpaid = order.status === "unpaid";
              const statusLabel = isUnpaid ? "待付款" : served ? "已出餐" : "制作中";
              const statusBg = isUnpaid ? "rgba(45,95,163,.1)" : served ? "rgba(45,122,80,.1)" : "rgba(200,84,44,.1)";
              const statusColor = isUnpaid ? "#2d5fa3" : served ? "#2d7a50" : "#c8542c";
              const paymentLabel = order.payMethod || (isUnpaid ? "待确认" : "未记录");
              return (
                <div key={order.id} className="tp-order-card">
                  <div className="tp-oc-head">
                    <div className="tp-oc-id">{order.id}</div>
                    <div className="tp-oc-stat" style={{ background: statusBg, color: statusColor }}>
                      {statusLabel}
                    </div>
                  </div>
                  <div className="tp-oc-items">
                    {order.items.map((item, index) => (
                      <div key={getCartItemKey(item, index)} className="tp-oc-row">
                        <span className="tp-oc-name">{item.name} ×{item.qty}</span>
                        <OptionTags selectedOptions={item.selectedOptions} className="tp-opt-tags" tagClassName="tp-opt-tag" />
                        <ItemNote note={item.note} />
                      </div>
                    ))}
                  </div>
                  <ItemNote note={order.note} className="tp-order-note-line" />
                  <div className="tp-oc-foot">
                    <div className="tp-oc-pay">支付方式：{paymentLabel}</div>
                    <div className="tp-oc-total">{order.total.toFixed(2)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ 浮动购物车栏 ═══ */}
      <div className={`tp-cartbar${cartCount > 0 ? " show" : ""}`}>
        <div ref={cartBarIconRef} className="tp-cartbar-ic">
          🛒
          {cartCount > 0 && <div className="tp-cartbar-dot">{cartCount}</div>}
        </div>
        <div className="tp-cartbar-info">
          <div className="tp-cartbar-meta">{cartCount} 件商品</div>
          <div className="tp-cartbar-amt">{cartTotal.toFixed(2)}</div>
        </div>
        <button className="tp-cartbar-cta" onClick={() => setCartOpen(true)}>
          查看订单
        </button>
      </div>

      {/* ── 购物车确认抽屉 ── */}
      {cartOpen && (
        <>
          <div className="tp-sheet-overlay" onClick={() => setCartOpen(false)} />
          <div className="tp-sheet">
            <div className="tp-sheet-head">
              <div>
                <div className="tp-sheet-title">确认订单</div>
                <div className="tp-sheet-table">{tableLabel}</div>
              </div>
              <button className="tp-sheet-close" onClick={() => setCartOpen(false)}>✕</button>
            </div>
            <div className="tp-sheet-body">
              {!cart.length && (
                <div className="tp-sheet-empty">
                  <div className="tp-sheet-empty-ic">🍽</div>
                  购物车为空<br />返回菜单添加菜品
                </div>
              )}
              {cart.map((item) => (
                <div key={item.cartKey} className="tp-sheet-item">
                  <div className="tp-si-main">
                    <div className="tp-si-name">{item.name}</div>
                    <OptionTags selectedOptions={item.selectedOptions} className="tp-opt-tags" tagClassName="tp-opt-tag" />
                    <ItemNote note={item.note} />
                    <div className="tp-si-price">¥{(item.price * item.qty).toFixed(2)}</div>
                  </div>
                  <div className="tp-si-qc">
                    <button className="tp-qb" onClick={() => changeQty(item.cartKey, -1)}>−</button>
                    <div className="tp-qn">{item.qty}</div>
                    <button className="tp-qb" onClick={() => changeQty(item.cartKey, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="tp-sheet-foot">
              <div className="tp-sheet-row">
                <div className="tp-sheet-rl">{tableLabel} · {cartCount} 件</div>
                <div className="tp-sheet-amt">{cartTotal.toFixed(2)}</div>
              </div>
              <button className="tp-sheet-submit" disabled={!cart.length} onClick={submitOrder}>
                下 单
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── 商品详情弹窗 ── */}
      {detailItem && (
        <ProductDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onConfirm={(cartItem) => { addCartLine(cartItem); setDetailItem(null); }}
        />
      )}

      {paymentHint && (
        <PaymentGuideModal
          paymentHint={paymentHint}
          onClose={() => setPaymentHint(null)}
          onReport={reportPayment}
        />
      )}
    </div>
  );
}

function PaymentGuideModal({ paymentHint, onClose, onReport }) {
  if (!paymentHint) return null;
  return (
    <div className="tp-mo">
      <div className="tp-mo-bg" onClick={onClose} />
      <div className="tp-mo-content tp-pay-modal">
        <div className="tp-mo-title">订单提交成功</div>
        <div className="tp-pay-text">
          请扫描卡片上的付款码支付，如需现金支付请至前台。
        </div>
        <div className="tp-pay-total">待支付金额: <b>¥{paymentHint.total}</b></div>
        <div className="tp-pay-actions">
          <button className="tp-pay-btn wechat" onClick={() => onReport('wechat')}>我选择微信支付</button>
          <button className="tp-pay-btn alipay" onClick={() => onReport('alipay')}>我选择支付宝支付</button>
          <button className="tp-pay-btn cash" onClick={() => onReport('cash')}>我选择现金支付</button>
        </div>
      </div>
    </div>
  );
}
