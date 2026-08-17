import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getActiveOrders, updateOrderStatus } from "../api/orders";
import api from "../api/axios";
import type { Order } from "../types";
import Spinner from "../components/Spinner";

const TableView = () => {
  const { tableNo } = useParams<{ tableNo: string }>();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    getActiveOrders()
      .then((all) => setOrders(all.filter((o) => o.tableId === tableNo)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, [tableNo]);

  const confirmPay = async (orderId: string, method: string) => {
    await api.patch(`/orders/${orderId}/pay`, { payMethod: method });
    load();
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ color: "#fff" }}>
      <button onClick={() => navigate("/")} style={backBtn}>← رجوع</button>
      <h1>ترابيزة {tableNo}</h1>

      {orders.length === 0 ? (
        <p style={{ color: "#666", marginTop: 40 }}>مفيش طلبات حالياً على الترابيزة دي</p>
      ) : (
        orders.map((o) => (
          <div key={o._id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <strong style={{ fontSize: 18 }}>{o.orderNumber}</strong>
              <span style={{ color: "#e94560", fontWeight: "bold" }}>{o.totalPrice} ج.م</span>
            </div>

            <div style={{ marginBottom: 12 }}>
              {o.items.map((i, idx) => (
                <div key={idx} style={{ color: "#ccc", marginBottom: 4 }}>
                  {i.name} × {i.qty} 
                  <span style={{ color: "#666", marginRight: 8 }}>({i.station})</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <span style={badge}>الحالة: {o.status}</span>
              <span style={{ ...badge, background: o.paymentStatus === "paid" ? "#10b981" : "#f59e0b" }}>
                الدفع: {o.paymentStatus} {o.payMethod && `(${o.payMethod})`}
              </span>
            </div>

            {o.paymentStatus !== "paid" && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={btn} onClick={() => confirmPay(o._id, "cash")}>تأكيد كاش</button>
                <button style={btn} onClick={() => confirmPay(o._id, "instapay")}>تأكيد إنستاباي</button>
                <button style={btn} onClick={() => confirmPay(o._id, "wallet")}>تأكيد محفظة</button>
              </div>
            )}

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button style={{ ...btn, background: "#3b82f6" }} onClick={() => updateOrderStatus(o._id, "preparing").then(load)}>
                تحضير
              </button>
              <button style={{ ...btn, background: "#10b981" }} onClick={() => updateOrderStatus(o._id, "served").then(load)}>
                تم التقديم
              </button>
              <button style={{ ...btn, background: "#6b7280" }} onClick={() => updateOrderStatus(o._id, "archived").then(load)}>
                أرشفة
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const card: React.CSSProperties = {
  background: "#1a1a2e",
  borderRadius: 16,
  padding: 20,
  marginTop: 16,
  border: "1px solid #4a3a30",
};

const badge: React.CSSProperties = {
  background: "#4a3a30",
  padding: "4px 10px",
  borderRadius: 20,
  fontSize: 12,
};

const btn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "none",
  background: "#9c6b4a",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
};

const backBtn: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #444",
  color: "#aaa",
  padding: "8px 14px",
  borderRadius: 8,
  cursor: "pointer",
  marginBottom: 16,
};

export default TableView;
