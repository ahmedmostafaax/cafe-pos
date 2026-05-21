import { useState } from "react";
import { useApp } from "../hooks/useApp";
import { fmtDate } from "../lib/format";
import { STATUS_COLOR, STATUS_LABEL } from "../lib/constants";
import { TAKEAWAY_TABLE_ID, getCartItemKey } from "../model/orderOptionUtils";
import { isTakeawayOrder } from "../model/orderHelpers";
import { OptionTags } from "./modals/OptionSelectorModal";
import { ItemNote, OrderNoteLine } from "./OrderNotes";

export default function OrderHistoryList({ orders: list, onOrderDeleted, onOrderUpdated, readOnly = false }) {
  const { selectPayMethod, changePayMethod, confirmDanger, deleteOrder, setOrders, showToast, user } = useApp();
  const [exp, setExp] = useState({});
  const sorted = [...list].sort((a, b) => b.createdAt - a.createdAt);
  if (!sorted.length) return (
    <div className="state">
      <div className="state-icon">无</div>
      <div className="state-title">暂无订单记录</div>
      <div className="state-hint">当前条件下没有可显示的订单。</div>
    </div>
  );
  return (
    <div>
      {sorted.map((order) => (
        <div key={order.id} className={`oh-row${exp[order.id] ? " open" : ""}`}>
          <div className="oh-head" onClick={() => setExp((prev) => ({ ...prev, [order.id]: !prev[order.id] }))}>
            <div className="oh-id">{order.id}</div>
            <div className="oh-tbl">{isTakeawayOrder(order) ? TAKEAWAY_TABLE_ID : order.tableNo}</div>
            <div className="oh-info">
              {fmtDate(order.createdAt)} · {order.guests}人 · {isTakeawayOrder(order) ? "外卖" : "堂食"}
              {order.service?.waiterName ? ` · 服务员 ${order.service.waiterName}` : ""}
            </div>
            <div className="oh-amt">¥{order.total.toFixed(2)}</div>
            <div className="oh-pay">{order.payMethod}</div>
            <div className="oh-stat" style={{ background: `${STATUS_COLOR[order.status]}18`, color: STATUS_COLOR[order.status], border: `1px solid ${STATUS_COLOR[order.status]}30` }}>
              {STATUS_LABEL[order.status]}
            </div>
            <div className="oh-chev">▶</div>
          </div>
          {exp[order.id] && (
            <div className="oh-detail">
              {order.items.map((item, index) => (
                <div key={getCartItemKey(item, index)} className="oh-di-wrap">
                  <div className="oh-di">
                    <span className="q">×{item.qty}</span>
                    <span className="n">{item.name}</span>
                    <span className="p">¥{(item.price * item.qty).toFixed(2)}</span>
                  </div>
                  <OptionTags selectedOptions={item.selectedOptions} className="opt-tags compact" tagClassName="opt-tag compact" />
                  <ItemNote note={item.note} className="item-note compact" />
                </div>
              ))}
              <OrderNoteLine note={order.note} />
              {!readOnly && (
              <div className="oh-actions">
                {order.status !== "unpaid" && order.status !== "cancelled" && (
                  <button className="oh-act-btn" onClick={async () => {
                    const picked = await selectPayMethod(order);
                    if (!picked || picked === order.payMethod) return;
                    changePayMethod(order, picked);
                    onOrderUpdated?.({ ...order, payMethod: picked });
                    showToast(`订单 ${order.id} 已改为 ${picked}`);
                  }}>修改支付方式</button>
                )}
                <button className="oh-act-btn danger" onClick={async () => {
                  const reason = window.prompt(`确认删除订单 ${order.id}？请填写删除原因（必填）：`, "");
                  const trimmed = (reason || "").trim();
                  if (!trimmed) return;
                  const ok = await confirmDanger(`确认删除订单 ${order.id}？该订单将记入软删档案。`, { title: "删除订单", confirmText: "删除订单" });
                  if (!ok) return;
                  const success = await deleteOrder(order.id, { reason: trimmed, byName: user?.name || "" });
                  if (success) {
                    setOrders((prev) => prev.filter((o) => o.id !== order.id));
                    onOrderDeleted?.(order.id);
                    showToast(`订单 ${order.id} 已删除`);
                  }
                }}>删除订单</button>
              </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export { OrderHistoryList };
