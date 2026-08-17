import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";

const Login = () => {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.message || "خطأ في تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  const toggleLang = () => {
    const newLang = i18n.language === "ar" ? "en" : "ar";
    i18n.changeLanguage(newLang);
    localStorage.setItem("lang", newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f7f3ee] via-[#efe6db] to-[#f5ede2] p-4 pt-safe pb-safe">
      <div className="w-full max-w-sm carolina-card p-6 sm:p-8 shadow-2xl text-center animate-in">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#9c6b4a] to-[#6f4a32] grid place-items-center text-2xl shadow-lg shadow-[#9c6b4a]/30">
          ☕
        </div>
        <h1 className="text-2xl font-bold tracking-wider text-[#9c6b4a]">GODZ</h1>
        <p className="text-[#9b816b] text-sm mb-6">Café & Restaurant · GODZ</p>

        <button
          type="button"
          onClick={toggleLang}
          className="mb-5 text-xs border border-[#e2d3c2] px-3 py-2 rounded-lg text-[#7a6a5c] hover:text-[#2c241c] hover:border-[#9c6b4a] min-h-[40px]"
        >
          {i18n.language === "ar" ? "English" : "عربي"}
        </button>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder={t("username")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            className="carolina-input"
          />
          <input
            type="password"
            placeholder={t("password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="carolina-input"
          />
          {error && <p className="text-red-400 text-sm text-right">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="carolina-btn w-full mt-1"
          >
            {loading ? "..." : t("login")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

