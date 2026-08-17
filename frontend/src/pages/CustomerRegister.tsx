import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

const CustomerRegister = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [captchaId, setCaptchaId] = useState("");
  const [question, setQuestion] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/customer/captcha").then((r) => {
      setCaptchaId(r.data.data?.captchaId || r.data.captchaId);
      setQuestion(r.data.data?.question || r.data.question || "");
    }).catch(() => {});
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("كلمة المرور غير متطابقة");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/customer/register", {
        name,
        email,
        password,
        passwordConfirm: confirm,
        phone,
        captchaId,
        captchaAnswer,
      });
      navigate("/customer-login");
    } catch (err: any) {
      setError(err?.response?.data?.message || "تعذر التسجيل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4">
      <div className="w-full max-w-md carolina-card p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="text-3xl">☕</div>
          <h1 className="text-xl font-bold mt-2">إنشاء حساب</h1>
          <p className="text-xs text-[#7a6a5c] mt-1">للطلب الأونلاين ومتابعة طلباتك</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <input className="carolina-input" placeholder="الاسم" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="carolina-input" type="email" placeholder="البريد" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="carolina-input" placeholder="موبايل" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
          <input className="carolina-input" type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <input className="carolina-input" type="password" placeholder="تأكيد كلمة المرور" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          {question && (
            <div>
              <label className="text-xs text-[#7a6a5c] mb-1 block">تحقق: {question}</label>
              <input className="carolina-input" value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} required inputMode="numeric" />
            </div>
          )}
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-100">{error}</p>}
          <button type="submit" disabled={loading} className="carolina-btn w-full">{loading ? "..." : "تسجيل"}</button>
        </form>
        <p className="text-center text-sm text-[#7a6a5c] mt-4">
          لديك حساب؟ <Link to="/customer-login" className="text-[#9c6b4a] font-semibold">دخول</Link>
        </p>
      </div>
    </div>
  );
};

export default CustomerRegister;
