import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getOrderByToken, rateOrder } from "../api/public";
import type { Order } from "../types";
import PaymentGatewayModal from "../components/PaymentGatewayModal";
import Toast from "../components/Toast";
import Spinner from "../components/Spinner";

const statusSteps = [
  { key: "active", label: "تم استلام الطلب", icon: "📋" },
  { key: "preparing", label: "جاري التحضير بالمطبخ والبار", icon: "👨‍🍳" },
  { key: "ready", label: "الطلب جاهز للاستلام", icon: "✨" },
  { key: "served", label: "تم التقديم بالهناء والشفاء", icon: "🍽️" },
];

const TrackOrder = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [rated, setRated] = useState(false);
  const [showGateway, setShowGateway] = useState(false);
  const [toast, setToast] = useState("");

  const load = () => {
    if (!token) return;
    getOrderByToken(token).then(setOrder).catch(() => setOrder(null));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const handleRate = async () => {
    if (!token) return;
    try {
      await rateOrder(token, rating, comment);
      setRated(true);
      setToast("شكراً جزيلاً على تقييمك ورأيك في الخدمة!");
    } catch {
      setToast("تعذر إرسال التقييم");
    }
  };

  if (!order) {
    return (
      <div className="min-h-screen bg-[#0b0e17] flex items-center justify-center p-4">
        <Spinner />
      </div>
    );
  }

  const isPaid = order.paymentStatus === "paid";
  const elapsed = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);

  // Status Step Index
  const currentStepIdx =
    order.status === "served"
      ? 3
      : order.status === "ready"
      ? 2
      : order.status === "preparing"
      ? 1
      : 0;

  return (
    <div className="min-h-screen bg-[#0b0e17] text-slate-100 p-4 md:p-8">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e94560]/15 border border-[#e94560]/30 text-[#e94560] text-xs font-bold">
            <span>⚡ GODZ CAFÉ LIVE TRACKING</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            متابعة طلبك {order.orderNumber}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            طاولة {order.tableId} • تم الطلب منذ {elapsed} دقيقة
          </p>
        </div>

        {/* Live Timeline */}
        <div className="card-luxury p-6 space-y-4">
          <h3 className="text-sm font-bold text-white">حالة الطلب اللحظية:</h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statusSteps.map((step, idx) => {
              const isCurrent = idx === currentStepIdx;
              const isDone = idx < currentStepIdx;

              return (
                <div
                  key={step.key}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    isCurrent
                      ? "bg-[#e94560]/15 border-[#e94560] text-white shadow-lg shadow-[#e94560]/20 scale-105"
                      : isDone
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-[#0f1422] border-[#242c47] text-slate-500"
                  }`}
                >
                  <div className="text-2xl mb-1">{step.icon}</div>
                  <div className="text-xs font-bold leading-tight">{step.label}</div>
                  <div className="text-[10px] mt-1 font-semibold">
                    {isDone ? "✓ مكتمل" : isCurrent ? "● جاري الآن" : "في الانتظار"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Details & Payment Bar */}
        <div className="card-luxury p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#242c47]">
            <span className="font-bold text-white text-base">الأصناف المطلوبة</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                isPaid
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-300 border-amber-500/30"
              }`}
            >
              {isPaid ? "✓ تم الدفع" : "⏳ في انتظار الدفع"}
            </span>
          </div>

          <div className="space-y-2">
            {order.items.map((i, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm p-2 rounded-xl bg-[#0f1422]"
              >
                <div className="font-bold text-white">
                  {i.name} <span className="text-xs text-slate-400 font-normal">× {i.qty}</span>
                </div>
                <div className="font-mono text-emerald-400 font-bold">{i.price * i.qty} ج.م</div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#242c47] flex items-center justify-between">
            <span className="text-slate-400 font-semibold">الإجمالي المطلوب:</span>
            <span className="text-2xl font-bold text-white font-mono">{order.totalPrice} ج.م</span>
          </div>

          {!isPaid && (
            <div className="pt-2">
              <button
                onClick={() => setShowGateway(true)}
                className="btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2"
              >
                <span>⚡</span>
                <span>ادفع الآن عبر بوابة كاشير الإلكترونية ({order.totalPrice} ج.م)</span>
              </button>
            </div>
          )}
        </div>

        {/* Rating Section */}
        <div className="card-luxury p-6 space-y-4">
          <h3 className="text-base font-bold text-white">⭐ تقييمك للخدمة والطعام</h3>

          {rated ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-emerald-300 text-xs">
              شكراً جزيلاً! تم تسجيل تقييمك بنجاح.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-3xl transition-transform hover:scale-125 ${
                      star <= rating ? "text-amber-400" : "text-slate-600"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="اكتب رأيك أو مقترحاتك هنا..."
                className="input-modern text-xs"
              />

              <button onClick={handleRate} className="btn-secondary w-full py-2.5 text-xs font-bold">
                إرسال التقييم
              </button>
            </div>
          )}
        </div>

        {/* Back to table menu */}
        <div className="text-center pt-2">
          <button
            onClick={() => navigate(`/table/${order.tableId}`)}
            className="text-slate-400 hover:text-white text-xs underline"
          >
            ← العودة لقائمة المنيو
          </button>
        </div>
      </div>

      {/* Gateway Modal */}
      <PaymentGatewayModal
        isOpen={showGateway}
        onClose={() => setShowGateway(false)}
        orderNumber={order.orderNumber}
        orderId={order._id}
        publicToken={order.publicToken}
        totalAmount={order.totalPrice}
        tableId={order.tableId}
        onSuccess={() => {
          load();
          setShowGateway(false);
          setToast("تم الدفع بنجاح عبر كاشير!");
        }}
      />
    </div>
  );
};

export default TrackOrder;
