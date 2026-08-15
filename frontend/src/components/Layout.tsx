import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";

const Layout = () => {
  const { t, i18n } = useTranslation();
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setOpen(false);
  };

  const toggleLang = () => {
    const newLang = i18n.language === "ar" ? "en" : "ar";
    i18n.changeLanguage(newLang);
    localStorage.setItem("lang", newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? "bg-godz text-white"
        : "text-gray-400 hover:bg-white/5 hover:text-white"
    }`;

  const NavItems = () => (
    <>
      <NavLink to="/" end className={linkClass} onClick={() => setOpen(false)}>
        📊 لوحة التحكم
      </NavLink>
      <NavLink to="/orders" className={linkClass} onClick={() => setOpen(false)}>
        📋 الطلبات
      </NavLink>
      <NavLink to="/kitchen" className={linkClass} onClick={() => setOpen(false)}>
        👨‍🍳 المطبخ
      </NavLink>
      <NavLink to="/bar" className={linkClass} onClick={() => setOpen(false)}>
        🥤 البار
      </NavLink>

      {isAdmin && (
        <>
          <div className="h-px bg-border my-3" />
          <NavLink to="/menu" className={linkClass} onClick={() => setOpen(false)}>
            🍽️ المنيو
          </NavLink>
          <NavLink to="/categories" className={linkClass} onClick={() => setOpen(false)}>
            📁 التصنيفات
          </NavLink>
          <NavLink to="/tables" className={linkClass} onClick={() => setOpen(false)}>
            🪑 الطاولات
          </NavLink>
          <NavLink to="/offers" className={linkClass} onClick={() => setOpen(false)}>
            🎁 العروض
          </NavLink>
          <NavLink to="/users" className={linkClass} onClick={() => setOpen(false)}>
            👥 الموظفين
          </NavLink>
        </>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col bg-sidebar border-l border-border p-3">
        <div className="text-center mb-6 pt-2">
          <div className="text-2xl">⚡</div>
          <h2 className="text-lg font-bold mt-1">GODZ</h2>
          <p className="text-[11px] text-gray-500">Restaurant & Cafe</p>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          <NavItems />
        </nav>

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <button
            onClick={toggleLang}
            className="w-full py-2 rounded-lg bg-card text-sm text-gray-300 hover:bg-white/5"
          >
            {i18n.language === "ar" ? "English" : "عربي"}
          </button>
          <p className="text-xs text-gray-500 text-center truncate">{user?.name}</p>
          <button
            onClick={handleLogout}
            className="w-full py-2 rounded-lg bg-godz text-sm font-semibold hover:bg-godz-dark"
          >
            {t("logout")}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-sidebar/95 backdrop-blur border-b border-border px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg hover:bg-white/5 text-xl"
          aria-label="القائمة"
        >
          ☰
        </button>
        <div className="font-bold text-lg">⚡ GODZ</div>
        <button onClick={toggleLang} className="text-xs text-gray-400 px-2">
          {i18n.language === "ar" ? "EN" : "ع"}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`md:hidden fixed top-0 bottom-0 z-50 w-72 bg-sidebar border-l border-border p-4 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        } ${document.documentElement.dir === "rtl" ? "right-0" : "left-0"}`}
        style={{
          [document.documentElement.dir === "rtl" ? "right" : "left"]: 0,
          transform: open
            ? "translateX(0)"
            : document.documentElement.dir === "rtl"
            ? "translateX(100%)"
            : "translateX(-100%)",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xl font-bold">⚡ GODZ</div>
            <p className="text-xs text-gray-500">{user?.name}</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 text-gray-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
          <NavItems />
        </nav>

        <button
          onClick={handleLogout}
          className="mt-4 w-full py-2.5 rounded-xl bg-godz font-semibold"
        >
          {t("logout")}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
