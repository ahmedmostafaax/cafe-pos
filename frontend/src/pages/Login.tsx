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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bg via-[#12121f] to-[#16213e] p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-2xl text-center">
        <div className="text-4xl mb-2">⚡</div>
        <h1 className="text-2xl font-bold tracking-wider">GODZ</h1>
        <p className="text-gray-500 text-sm mb-6">Restaurant & Cafe System</p>

        <button
          type="button"
          onClick={toggleLang}
          className="mb-5 text-xs border border-border px-3 py-1.5 rounded-lg text-gray-400 hover:text-white"
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
            className="w-full px-4 py-3 rounded-xl bg-bg border border-border text-white placeholder:text-gray-500 focus:outline-none focus:border-godz"
          />
          <input
            type="password"
            placeholder={t("password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-4 py-3 rounded-xl bg-bg border border-border text-white placeholder:text-gray-500 focus:outline-none focus:border-godz"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-godz font-bold hover:bg-godz-dark disabled:opacity-60 transition-colors mt-1"
          >
            {loading ? "..." : t("login")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
