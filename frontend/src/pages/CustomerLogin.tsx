import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCustomerAuth } from "../contexts/CustomerAuthContext";
import api from "../api/axios";

const CustomerLogin = () => {
  const navigate = useNavigate();
  const { login } = useCustomerAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaId, setCaptchaId] = useState("");
  const [question, setQuestion] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadCaptcha = async () => {
    try {
      const { data } = await api.get("/customer/captcha");
      setCaptchaId(data.data?.captchaId || data.captchaId);
      setQuestion(data.data?.question || data.question || "");
    } catch {
      setQuestion("");
    }
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password, captchaId, captchaAnswer);
      navigate("/order");
    } catch (err: any) {
      setError(err?.response?.data?.message || "تعذر الدخول");
      loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4">
      <div className="w-full max-w-md carolina-card p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="text-3xl">☕</div>
          <h1 className="text-xl font-bold mt-2">دخول العملاء</h1>
          <p className="text-xs text-[#7a6a5c] mt-1">اطلب أونلاين بعد تسجيل الدخول</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <input className="carolina-input" type="email" placeholder="البريد" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <input className="carolina-input" type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          {question && (
            <div>
              <label className="text-xs text-[#7a6a5c] mb-1 block">تحقق: {question}</label>
              <input className="carolina-input" value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} required inputMode="numeric" />
            </div>
          )}
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading} className="carolina-btn w-full">{loading ? "..." : "دخول"}</button>
        </form>
        <p className="text-center text-sm text-[#7a6a5c] mt-4">
          ليس لديك حساب؟{" "}
          <Link to="/customer-register" className="text-[#9c6b4a] font-semibold">سجّل</Link>
        </p>
        <Link to="/order" className="block text-center text-xs text-[#9c6b4a] mt-3">العودة للقائمة</Link>
      </div>
    </div>
  );
};

export default CustomerLogin;
