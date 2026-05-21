import { useState, useEffect } from "react";
import { useApp } from "../hooks/useApp";
import { ItemNote } from "../components/OrderNotes";
import { OptionTags } from "../components/modals/OptionSelectorModal";
import socket from "../lib/socket";
import { TAKEAWAY_TABLE_ID, getCartItemKey, getNowTimestamp } from "../model/orderOptionUtils";
import { isTakeawayOrder } from "../model/orderHelpers";
import { fmtTime } from "../lib/format";
import { DEFAULT_STATION_THRESHOLDS } from "../lib/constants";

export default function StationPanel({ type }) {
  const { orders, setOrders, menu, settings, showToast } = useApp();
  const [detail, setDetail] = useState(null);
  const [nowTs, setNowTs] = useState(() => getNowTimestamp());
  const stationThresholds = settings?.stationThresholds?.[type] || DEFAULT_STATION_THRESHOLDS[type];

  useEffect(() => {
    const timer = setInterval(() => setNowTs(getNowTimestamp()), 30000);
    return () => clearInterval(timer);
  }, []);

  const stationOrders = orders
    .filter((order) => order.status === "preparing" && order.items.some((item) => item.station === type && item.status === "pending"))
    .sort((a, b) => a.createdAt - b.createdAt);

  const minutesAgo = (ts) => Math.floor((nowTs - ts) / 60000);

  const cols = [
    { key: "new", label: "新订单", labelEn: "INCOMING", orders: stationOrders.filter((o) => minutesAgo(o.createdAt) < stationThresholds.newMinutes), urgent: false },
    { key: "prep", label: "制作中", labelEn: "IN PREP", orders: stationOrders.filter((o) => minutesAgo(o.createdAt) >= stationThresholds.newMinutes && minutesAgo(o.createdAt) < stationThresholds.urgentMinutes), urgent: false },
    { key: "urgent", label: "久候", labelEn: "URGENT", orders: stationOrders.filter((o) => minutesAgo(o.createdAt) >= stationThresholds.urgentMinutes), urgent: true },
  ];

  const totalOrders = stationOrders.length;
  const pendingItemCount = stationOrders.reduce((sum, order) => sum + order.items.filter((item) => item.station === type && item.status === "pending").reduce((itemSum, item) => itemSum + Number(item.qty || 1), 0), 0);
  const avgWait = totalOrders ? Math.round(stationOrders.reduce((sum, order) => sum + minutesAgo(order.createdAt), 0) / totalOrders) : 0;
  const urgentCount = cols[2].orders.length;

  const toggleItem = (orderId, itemKey) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return;
    const updatedItems = order.items.map((item, index) =>
      getCartItemKey(item, index) === itemKey && item.station === type && item.status === "pending"
        ? { ...item, done: !item.done }
        : item
    );
    setOrders((prev) => prev.map((item) => item.id !== orderId ? item : { ...item, items: updatedItems }));
    socket.emit("update_items", { id: orderId, items: updatedItems, status: order.status });
  };

  const serve = (orderId) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return;
    const updatedItems = order.items.map((item) => item.station === type ? { ...item, status: "completed", done: true } : item);
    const allCompleted = updatedItems.every((item) => item.status === "completed");
    const nextStatus = allCompleted ? "archived" : "preparing";
    setOrders((prev) => prev.map((item) => item.id !== orderId ? item : { ...item, items: updatedItems, status: nextStatus }));
    socket.emit("update_items", { id: orderId, items: updatedItems, status: nextStatus });
    showToast(`订单 ${orderId} · ${type === "kitchen" ? "后厨" : "吧台"}已出餐 ✓`);
  };

  const stationName = type === "kitchen" ? "后厨制作" : "吧台制作";
  const stationEm = type === "kitchen" ? "Cucina" : "Bar";

  return (
    <div className="stl">
      {/* 顶部状态栏 */}
      <div className="sth">
        <div className="stt">{stationName} · <em style={{ fontStyle: "italic", color: "var(--acc2)", fontFamily: "var(--serif)" }}>{stationEm}</em></div>
        <div className={`cnt${totalOrders === 0 ? " cnt0" : ""}`} title="当前站点待制作订单数">
          队列 {totalOrders}
        </div>
        <div className="cnt" title="当前站点待制作菜品数量">待做 {pendingItemCount}</div>
        <div className={`cnt${avgWait >= stationThresholds.urgentMinutes ? "" : " cnt0"}`} title="当前站点待制作订单平均等待时间">均等 {avgWait}'</div>
        <div className={`cnt${urgentCount === 0 ? " cnt0" : ""}`} title={`超过 ${stationThresholds.urgentMinutes} 分钟的订单`}>
          久候 {urgentCount}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: "12px", color: "rgba(250,246,238,.4)" }}>
          {new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* 三列看板 */}
      <div className="stl-body">
        {cols.map((col) => (
          <div key={col.key} className={`stl-col${col.urgent ? " col-urgent" : ""}`}>
            <div className="stl-col-hd">
              <span>{col.labelEn} · {col.label}</span>
              <span className="stl-col-hd-count">{col.orders.length}</span>
            </div>
            <div className="stl-col-body">
              {col.orders.length === 0 && (
                <div className="stl-col-empty">— 暂无 —</div>
              )}
              {col.orders.map((order) => {
                const items = order.items
                  .filter((item) => item.station === type && item.status === "pending")
                  .map((item, index) => ({ ...item, _key: getCartItemKey(item, index) }));
                const allDone = items.length > 0 && items.every((item) => item.done);
                const minutes = minutesAgo(order.createdAt);
                const elapsedColor = minutes >= stationThresholds.urgentMinutes ? "var(--red)" : minutes >= stationThresholds.newMinutes ? "var(--acc)" : "var(--green)";

                return (
                  <div key={order.id} className={`ocard${minutes >= stationThresholds.urgentMinutes ? " urg" : ""}${allDone ? " srv" : ""}${isTakeawayOrder(order) ? " takeaway" : ""}`}>
                    <div className="och">
                      <div>
                        <div className="otn">{isTakeawayOrder(order) ? TAKEAWAY_TABLE_ID : order.tableNo}</div>
                        <div style={{ fontSize: "11px", color: "var(--td)" }}>
                          {isTakeawayOrder(order) ? "外卖订单" : `${order.guests}人 · 堂食`}
                        </div>
                        {order.service?.waiterName && (
                          <div style={{ fontSize: "11px", color: "rgba(250,246,238,.4)", marginTop: 2 }}>
                            {order.service.waiterName}
                            {order.service?.mode ? ` · ${order.service.mode}` : ""}
                          </div>
                        )}
                      </div>
                      <div className="om">
                        <div className="otime">{fmtTime(order.createdAt)}</div>
                        <div className="oelap" style={{ color: elapsedColor }}>{minutes}分钟</div>
                        <div className="oid">{order.id}</div>
                      </div>
                    </div>
                    <div className="oitems">
                      {items.map((item) => (
                        <div key={item._key} className={`odr${item.done ? " d" : ""}`} onClick={() => toggleItem(order.id, item._key)}>
                          <div className="dchk">{item.done ? "✓" : ""}</div>
                          <div className="odr-main">
                            <div className="dn">{item.name}</div>
                            <OptionTags selectedOptions={item.selectedOptions} />
                            <ItemNote note={item.note} className="item-note compact" />
                          </div>
                          <div className="dq">×{item.qty}</div>
                        </div>
                      ))}
                    </div>
                    <div className="ocf">
                      <button className="serve-btn" disabled={!allDone} onClick={() => serve(order.id)}>
                        {allDone ? "出 餐 ✓" : "出 餐"}
                      </button>
                      <button className="det-btn" onClick={() => setDetail(order)}>配方</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 配方弹窗 */}
      {detail && (
        <div className="mo" onClick={(e) => e.currentTarget === e.target && setDetail(null)}>
          <div className="mb">
            <div className="mh">
              <div className="mht">订单 {detail.id} · {isTakeawayOrder(detail) ? TAKEAWAY_TABLE_ID : detail.tableNo} · 配方</div>
              <button className="mcl" onClick={() => setDetail(null)}>✕</button>
            </div>
            <div className="mbody">
              {detail.items.filter((item) => item.station === type).map((item, index) => {
                const menuItem = menu.find((c) => c.id === item.menuId);
                return (
                  <div key={getCartItemKey(item, index)} className="ri">
                    <div className="rn">{item.name}<span style={{ fontSize: "12px", color: "var(--td)" }}>×{item.qty}</span></div>
                    <OptionTags selectedOptions={item.selectedOptions} />
                    <ItemNote note={item.note} className="item-note compact" />
                    <div className="rc">{menuItem?.recipe || "暂无配方记录"}</div>
                  </div>
                );
              })}
            </div>
            <div className="mfoot"><button className="bcn" onClick={() => setDetail(null)}>关 闭</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
