import { useState } from "react";
import api from "../api/axios";
import { playPaymentSound } from "../utils/beep";

interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  orderId?: string;
  publicToken?: string;
  totalAmount: number;
  tableId?: string;
  onSuccess: (order: any) => void;
}

type PayTab = "kashier_card" | "instapay" | "wallet";

export const PaymentGatewayModal = ({
  isOpen,
  onClose,
  orderNumber,
  orderId,
  publicToken,
  totalAmount,
  tableId,
  onSuccess,
}: PaymentGatewayModalProps) => {
  const [tab, setTab] = useState<PayTab>("kashier_card");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "processing" | "success">("form");

  // Form Fields
  const [cardNumber, setCardNumber] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");

  const [instaId, setInstaId] = useState("");
  const [walletPhone, setWalletPhone] = useState("");

  if (!isOpen) return null;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStep("processing");

    // Simulate gateway handoff
    setTimeout(async () => {
      try {
        const payMethod =
          tab === "kashier_card"
            ? "kashier_card (Visa/MasterCard)"
            : tab === "instapay"
            ? `instapay (${instaId || "user@instapay"})`
            : `smart_wallet (${walletPhone || "010xxxx"})`;

        const endpoint = publicToken
          ? `/orders/track/${publicToken}/pay-gateway`
          : "/orders/pay-gateway";

        const { data } = await api.post(endpoint, {
          token: publicToken,
          orderId,
          method: payMethod,
          gatewayRef: `KSH-${Date.now().toString().slice(-6)}`,
          amount: totalAmount,
        });

        playPaymentSound();
        setStep("success");
        setTimeout(() => {
          onSuccess(data.data.order);
          onClose();
        }, 1600);
      } catch (err: any) {
        alert(err.response?.data?.message || "فشلت عملية الدفع، يرجى المحاولة لاحقاً");
        setStep("form");
        setLoading(false);
      }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="card-luxury w-full max-w-md bg-[#121626] border-[#374167] shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        {/* Gateway Header */}
        <div className="bg-gradient-to-r from-[#1c243c] via-[#242e4c] to-[#1c243c] p-4 border-b border-[#2d3758] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e94560] grid place-items-center text-white font-bold text-sm shadow">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">بوابة دفع كاشير | Kashier</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  🔒 مشفر 256-bit
                </span>
              </div>
              <p className="text-[11px] text-slate-400">دفع إلكتروني آمن وفوري</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-white p-1 text-lg"
          >
            ✕
          </button>
        </div>

        {/* Order Summary Bar */}
        <div className="bg-[#0b0e17] px-5 py-3 flex items-center justify-between border-b border-[#242c47]">
          <div>
            <span className="text-xs text-slate-400">رقم الطلب: </span>
            <span className="text-xs font-bold text-white font-mono">{orderNumber}</span>
            {tableId && <span className="text-xs text-slate-400 mr-2">(طاولة {tableId})</span>}
          </div>

          <div className="text-left">
            <span className="text-xs text-slate-400 block">المبلغ المطلوب:</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{totalAmount} ج.م</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5">
          {step === "processing" ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" />
              <h4 className="text-base font-bold text-white">جاري معالجة الدفع عبر كاشير...</h4>
              <p className="text-xs text-slate-400">يرجى الانتظار ثوانٍ قليلة لتأكيد العملية</p>
            </div>
          ) : step === "success" ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 text-3xl grid place-items-center mx-auto animate-bounce border border-emerald-500/40">
                ✓
              </div>
              <h4 className="text-lg font-bold text-white">تم الدفع بنجاح!</h4>
              <p className="text-xs text-slate-300">تم إرسال التأكيد إلى الكاشير وتحديث طلبك فورياً</p>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0b0e17] rounded-xl border border-[#242c47] mb-5">
                <button
                  type="button"
                  onClick={() => setTab("kashier_card")}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    tab === "kashier_card"
                      ? "bg-[#e94560] text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  💳 فيزا / ميزة
                </button>
                <button
                  type="button"
                  onClick={() => setTab("instapay")}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    tab === "instapay"
                      ? "bg-purple-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  ⚡ إنستاباي
                </button>
                <button
                  type="button"
                  onClick={() => setTab("wallet")}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    tab === "wallet"
                      ? "bg-rose-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  📱 محفظة ذكية
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handlePay} className="space-y-3.5">
                {tab === "kashier_card" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">رقم البطاقة البنكية</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          maxLength={19}
                          placeholder="4123 4567 8901 2345"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="input-modern font-mono text-sm tracking-wider"
                        />
                        <span className="absolute left-3 top-2.5 text-xs text-slate-500">VISA / MC</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">تاريخ الانتهاء</label>
                        <input
                          type="text"
                          required
                          maxLength={5}
                          placeholder="MM/YY"
                          value={cardExp}
                          onChange={(e) => setCardExp(e.target.value)}
                          className="input-modern font-mono text-sm text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">رمز الأمان CVV</label>
                        <input
                          type="password"
                          required
                          maxLength={4}
                          placeholder="123"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="input-modern font-mono text-sm text-center"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">اسم حامل البطاقة</label>
                      <input
                        type="text"
                        required
                        placeholder="AHMED MAHMOUD"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="input-modern text-sm uppercase"
                      />
                    </div>
                  </>
                )}

                {tab === "instapay" && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 leading-relaxed">
                      💡 ادخل عنوان الـ IPA الخاص بك أو رقم الهاتف لتحويل المبلغ مباشرة عبر إنستاباي.
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">عنوان الدفع IPA / رقم إنستاباي</label>
                      <input
                        type="text"
                        required
                        placeholder="yourname@instapay"
                        value={instaId}
                        onChange={(e) => setInstaId(e.target.value)}
                        className="input-modern font-mono text-sm text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>
                )}

                {tab === "wallet" && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 leading-relaxed">
                      💡 ادعم جميع محافظ مصر (فودافون كاش، اتصالات كاش، أورنج كاش، وي باي، والمحافظ البنكية).
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">رقم المحفظة الإلكترونية</label>
                      <input
                        type="tel"
                        required
                        placeholder="01012345678"
                        value={walletPhone}
                        onChange={(e) => setWalletPhone(e.target.value)}
                        className="input-modern font-mono text-sm text-left"
                        dir="ltr"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2"
                  >
                    <span>🔒</span>
                    <span>دفع الآن {totalAmount} ج.م عبر كاشير</span>
                  </button>
                  <p className="text-[10px] text-center text-slate-500 mt-2">
                    المعاملة محمية ومؤمنة بواسطة بوابة كاشير المعتمدة
                  </p>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default PaymentGatewayModal;
