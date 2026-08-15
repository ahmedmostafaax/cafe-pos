import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getOrderByToken, markTransfer, rateOrder } from "../api/public";
import type { Order } from "../types";

const TrackOrder = () => {
  const { token } = useParams<{ token: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);

  const load = () => {
    if (!token) return;
    getOrderByToken(token).then(setOrder).catch(() => setOrder(null));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [token]);

  if (!order) {
    return <div style={{ color: "#fff", textAlign: "center", paddingTop: 80 }}>جاري التحميل أو الطلب غير موجود...</div>;
  }

  const elapsed = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);

  const handleTransfer = async (method: string) => {
    if (!token) return;
    await markTransfer(token, method);
    load();
    alert("تم إبلاغ المدير بالتحويل. انتظر التأكيد.");
  };

  const handleRate = async () => {
    if (!token) return;
    await rateOrder(token, rating, comment);
    setDone(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f1a", color: "#fff", padding: 20 }}>
      <h1 style={{ textAlign: "center" }}>طلبك {order.orderNumber}</h1>
      <p style={{ textAlign: "center", color: "#aaa" }}>ترابيزة {order.tableId}</p>

      <div style={box}>
        <div>الحالة: <strong>{order.status}</strong></div>
        <div>الدفع: <strong>{order.paymentStatus}</strong></div>
        <div>مرّ عليه: <strong>{elapsed} دقيقة</strong></div>
        <div style={{ marginTop: 12 }}>
          {order.items.map((i, idx) => (
            <div key={idx}>{i.name} × {i.qty}</div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontWeight: "bold", fontSize: 18 }}>
          الإجمالي: {order.totalPrice} ج.م
        </div>
      </div>

      {order.paymentStatus === "unpaid" && (
        <div style={box}>
          <h3>اختر طريقة الدفع</h3>
          <button style={btn} onClick={() => handleTransfer("instapay")}>حولت إنستاباي</button>
          <button style={btn} onClick={() => handleTransfer("wallet")}>حولت محفظة</button>
          <p style={{ fontSize: 13, color: "#aaa", marginTop: 8 }}>
            بعد التحويل اضغط الزر المناسب، المدير هيأكد الاستلام.
          </p>
        </div>
      )}

      {(order.status === "served" || order.status === "archived") && !order.rating && !done && (
        <div style={box}>
          <h3>قيّم تجربتك</h3>
          <div style={{ fontSize: 28, margin: "12px 0" }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                onClick={() => setRating(n)}
                style={{ cursor: "pointer", color: n <= rating ? "#f1c40f" : "#555" }}
              >
                ★
              </span>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="تعليق (اختياري)"
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "none", marginBottom: 12 }}
          />
          <button style={btn} onClick={handleRate}>إرسال التقييم</button>
        </div>
      )}

      {done && <p style={{ textAlign: "center", color: "#2ecc71" }}>شكراً على تقييمك!</p>}
    </div>
  );
};

const box: React.CSSProperties = {
  background: "#1a1a2e",
  borderRadius: 16,
  padding: 20,
  marginBottom: 16,
};

const btn: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: 12,
  marginTop: 8,
  background: "#e94560",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  fontWeight: "bold",
  cursor: "pointer",
};

export default TrackOrder;
