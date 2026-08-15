import { useEffect, useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCaptcha } from "../api/customer";
import { useCustomerAuth } from "../contexts/CustomerAuthContext";

const CustomerLogin = () => {
  const { login, customer } = useCustomerAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaId, setCaptchaId] = useState("");
  const [question, setQuestion] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadCaptcha = async () => {
    const c = await getCaptcha();
    setCaptchaId(c.captchaId);
    setQuestion(c.question);
    setCaptchaAnswer("");
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  useEffect(() => {
    if (customer) navigate("/order");
  }, [customer, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password, captchaId, captchaAnswer);
      navigate("/order");
    } catch (err: any) {
      setError(err.response?.data?.message || "فشل الدخول");
      loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b12] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#14141f] border border-[#1f1f2e] rounded-3xl p-8">
        <div className="text-center mb-6">
          <div className="text-4xl">⚡</div>
          <h1 className="text-2xl font-black tracking-widest mt-2">GODZ</h1>
          <p className="text-gray-500 text-sm">تسجيل دخول الزبون</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="الإيميل"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#0b0b12] border border-[#2a2a3e] text-white outline-none focus:border-[#e94560]"
          />
          <input
            type="password"
            required
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#0b0b12] border border-[#2a2a3e] text-white outline-none focus:border-[#e94560]"
          />

          <div className="flex gap-2 items-center">
            <div className="flex-1 px-4 py-3 rounded-xl bg-[#1a1a2e] text-sm text-gray-300">
              {question || "..."}
            </div>
            <button type="button" onClick={loadCaptcha} className="px-3 py-3 rounded-xl border border-[#2a2a3e] text-xs">
              تحديث
            </button>
          </div>
          <input
            required
            placeholder="إجابة الكابتشا"
            value={captchaAnswer}
            onChange={(e) => setCaptchaAnswer(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-[#0b0b12] border border-[#2a2a3e] text-white outline-none focus:border-[#e94560]"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}
          <p className="text-xs text-gray-500">بعد 3 محاولات خاطئة يتقفل الحساب 15 دقيقة</p>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#e94560] hover:bg-[#c23a51] font-bold disabled:opacity-60"
          >
            {loading ? "..." : "دخول"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-5">
          مش عندك حساب؟{" "}
          <Link to="/customer-register" className="text-[#e94560] font-semibold">
            سجّل الآن
          </Link>
        </p>
        <p className="text-center mt-3">
          <Link to="/order" className="text-xs text-gray-500">← رجوع للموقع</Link>
        </p>
      </div>
    </div>
  );
};

export default CustomerLogin;
