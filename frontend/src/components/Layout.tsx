import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { soundManager } from "../utils/beep";
import { getServiceCalls } from "../api/serviceCalls";
import { io } from "socket.io-client";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: string;
}

const Layout = () => {
  const { t, i18n } = useTranslation();
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pendingCallsCount, setPendingCallsCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [soundOn, setSoundOn] = useState(soundManager.isEnabled());

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

  const toggleSound = () => {
    const next = soundManager.toggle();
    setSoundOn(next);
  };

  // Check pending calls count
  const refreshCallsCount = async () => {
    try {
      const data = await getServiceCalls();
      setPendingCallsCount(data.filter((c: any) => c.status === "open").length);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshCallsCount();
    const interval = setInterval(refreshCallsCount, 12000);

    const socket = io(import.meta.env.VITE_API_BASE?.replace("/api", "") || "http://localhost:3001", {
      transports: ["websocket", "polling"],
    });

    socket.emit("join_manager");

    socket.on("service_call", (call) => {
      soundManager.playServiceCallSound();
      refreshCallsCount();
      setNotifications((prev) => [
        {
          id: String(Date.now()),
          title: "🔔 نداء طاولة جديد",
          message: `طاولة ${call.tableId || call.tableNo} تطلب: ${call.type || "مساعدة"}`,
          time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
          type: "call",
        },
        ...prev.slice(0, 15),
      ]);
    });

    socket.on("staff_call", (call) => {
      soundManager.playServiceCallSound();
      refreshCallsCount();
      setNotifications((prev) => [
        {
          id: String(Date.now()),
          title: "🔔 نداء طاولة",
          message: `طاولة ${call.tableNo} تطلب: ${call.type}`,
          time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
          type: "call",
        },
        ...prev.slice(0, 15),
      ]);
    });

    socket.on("order_created", (order) => {
      soundManager.playNewOrderSound();
      setNotifications((prev) => [
        {
          id: String(Date.now()),
          title: "🛍️ طلب جديد",
          message: `طلب ${order.orderNumber} من طاولة ${order.tableId} بقيمة ${order.totalPrice} ج.م`,
          time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
          type: "order",
        },
        ...prev.slice(0, 15),
      ]);
    });

    socket.on("notification", (notif) => {
      if (notif.type === "payment_success") {
        soundManager.playPaymentSuccessSound();
      }
      setNotifications((prev) => [
        {
          id: String(Date.now()),
          title: notif.title || "تنبيه",
          message: notif.message || "",
          time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
          type: notif.type,
        },
        ...prev.slice(0, 15),
      ]);
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
      isActive
        ? "bg-gradient-to-r from-[#e94560] to-[#c0392b] text-white shadow-md shadow-[#e94560]/20"
        : "text-slate-300 hover:bg-[#1e263d] hover:text-white"
    }`;

  const NavItems = () => (
    <>
      <NavLink to="/" end className={linkClass} onClick={() => setOpen(false)}>
        <span className="flex items-center gap-2.5">
          <span>📊</span> لوحة التحكم
        </span>
      </NavLink>
      <NavLink to="/pos" className={linkClass} onClick={() => setOpen(false)}>
        <span className="flex items-center gap-2.5">
          <span>💻</span> الكاشير (POS)
        </span>
      </NavLink>
      <NavLink to="/orders" className={linkClass} onClick={() => setOpen(false)}>
        <span className="flex items-center gap-2.5">
          <span>📋</span> إدارة الطلبات
        </span>
      </NavLink>
      <NavLink to="/kitchen" className={linkClass} onClick={() => setOpen(false)}>
        <span className="flex items-center gap-2.5">
          <span>👨‍🍳</span> شاشة المطبخ
        </span>
      </NavLink>
      <NavLink to="/bar" className={linkClass} onClick={() => setOpen(false)}>
        <span className="flex items-center gap-2.5">
          <span>🥤</span> شاشة البار
        </span>
      </NavLink>
      <NavLink to="/service-calls" className={linkClass} onClick={() => setOpen(false)}>
        <span className="flex items-center gap-2.5">
          <span>🔔</span> نداءات الطاولات
        </span>
        {pendingCallsCount > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-extrabold animate-pulse">
            {pendingCallsCount}
          </span>
        )}
      </NavLink>
      <NavLink to="/cash" className={linkClass} onClick={() => setOpen(false)}>
        <span className="flex items-center gap-2.5">
          <span>💵</span> الدرج والوردية
        </span>
      </NavLink>

      {isAdmin && (
        <>
          <div className="h-px bg-[#242c47] my-2.5" />
          <div className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            إدارة النظام
          </div>
          <NavLink to="/users" className={linkClass} onClick={() => setOpen(false)}>
            <span className="flex items-center gap-2.5">
              <span>👥</span> الموظفين والشيفتات
            </span>
          </NavLink>
          <NavLink to="/tables" className={linkClass} onClick={() => setOpen(false)}>
            <span className="flex items-center gap-2.5">
              <span>🪑</span> الطاولات و QR
            </span>
          </NavLink>
          <NavLink to="/menu" className={linkClass} onClick={() => setOpen(false)}>
            <span className="flex items-center gap-2.5">
              <span>🍽️</span> قائمة المنيو
            </span>
          </NavLink>
          <NavLink to="/categories" className={linkClass} onClick={() => setOpen(false)}>
            <span className="flex items-center gap-2.5">
              <span>📁</span> التصنيفات
            </span>
          </NavLink>
          <NavLink to="/offers" className={linkClass} onClick={() => setOpen(false)}>
            <span className="flex items-center gap-2.5">
              <span>🎁</span> العروض والكوبونات
            </span>
          </NavLink>
          <NavLink to="/attendance" className={linkClass} onClick={() => setOpen(false)}>
            <span className="flex items-center gap-2.5">
              <span>⏱️</span> الحضور والانصراف
            </span>
          </NavLink>
          <NavLink to="/busy-mode" className={linkClass} onClick={() => setOpen(false)}>
            <span className="flex items-center gap-2.5">
              <span>⚡</span> وضع الذروة
            </span>
          </NavLink>
        </>
      )}
    </>
  );

  return (
    <div className="flex min-h-screen bg-[#0b0e17] text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-[#0f1422] border-l border-[#242c47] p-4">
        {/* Brand */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#242c47]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#e94560] to-[#c0392b] grid place-items-center text-xl shadow-lg shadow-[#e94560]/30">
              ⚡
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wider leading-none">GODZ POS</h2>
              <p className="text-[11px] text-slate-400 mt-1">Café & Restaurant</p>
            </div>
          </div>

          <button
            onClick={toggleSound}
            title={soundOn ? "كتم الصوت" : "تشغيل التنبيهات"}
            className={`p-1.5 rounded-lg border text-sm transition-colors ${
              soundOn ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" : "bg-[#1e263d] border-[#242c47] text-slate-400"
            }`}
          >
            {soundOn ? "🔔" : "🔕"}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto pr-1">
          <NavItems />
        </nav>

        {/* Footer Profile */}
        <div className="mt-auto pt-4 border-t border-[#242c47] flex flex-col gap-2">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#151b2e] border border-[#242c47]">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-[#e94560]/20 text-[#e94560] font-bold grid place-items-center text-xs">
                {user?.name?.charAt(0) || "U"}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 capitalize">{user?.role}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title={t("logout")}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg text-sm transition-colors"
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-[#0f1422]/95 backdrop-blur border-b border-[#242c47] px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg bg-[#1e263d] text-white text-lg"
          aria-label="القائمة"
        >
          ☰
        </button>

        <div className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <span className="font-bold text-white text-base tracking-wider">GODZ POS</span>
        </div>

        <div className="flex items-center gap-2">
          <NavLink to="/service-calls" className="relative p-2 rounded-lg bg-[#1e263d] text-sm">
            🔔
            {pendingCallsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold grid place-items-center">
                {pendingCallsCount}
              </span>
            )}
          </NavLink>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`md:hidden fixed top-0 bottom-0 z-50 w-72 bg-[#0f1422] border-l border-[#242c47] p-4 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        } ${document.documentElement.dir === "rtl" ? "right-0" : "left-0"}`}
      >
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#242c47]">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <span className="font-bold text-white text-lg">GODZ POS</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white text-lg"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto">
          <NavItems />
        </nav>

        <button
          onClick={handleLogout}
          className="mt-4 w-full py-2.5 rounded-xl bg-rose-600 font-bold text-white text-sm"
        >
          تسجيل الخروج
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Floating Action Bar */}
        <header className="hidden md:flex h-16 bg-[#0f1422]/60 backdrop-blur border-b border-[#242c47] px-6 items-center justify-between sticky top-0 z-30">
          <div className="text-xs text-slate-400 font-medium">
            مرحباً بك، <span className="text-white font-bold">{user?.name}</span> ({user?.role})
          </div>

          <div className="flex items-center gap-3">
            {/* Live Service Calls Indicator */}
            <NavLink
              to="/service-calls"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                pendingCallsCount > 0
                  ? "bg-rose-500/15 border-rose-500/40 text-rose-300 animate-pulse"
                  : "bg-[#151b2e] border-[#242c47] text-slate-300 hover:text-white"
              }`}
            >
              <span>🔔</span>
              <span>نداءات الطاولات</span>
              {pendingCallsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
                  {pendingCallsCount}
                </span>
              )}
            </NavLink>

            {/* Notification Bell Menu */}
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="p-2 rounded-xl bg-[#151b2e] border border-[#242c47] text-slate-300 hover:text-white text-sm relative"
              >
                🔔
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#e94560]" />
                )}
              </button>

              {showNotifMenu && (
                <div className="absolute left-0 mt-2 w-80 bg-[#151b2e] border border-[#242c47] rounded-2xl shadow-2xl p-3 z-50 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#242c47]">
                    <span className="text-xs font-bold text-white">آخر الإشعارات</span>
                    <button
                      onClick={() => setNotifications([])}
                      className="text-[11px] text-slate-400 hover:text-slate-200"
                    >
                      مسح الكل
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-center text-xs text-slate-500 py-4">لا توجد إشعارات جديدة</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-2.5 rounded-xl bg-[#0f1422] border border-[#242c47] text-xs">
                          <div className="flex items-center justify-between font-bold text-white">
                            <span>{n.title}</span>
                            <span className="text-[10px] text-slate-400">{n.time}</span>
                          </div>
                          <p className="text-slate-300 text-[11px] mt-1">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Lang Toggle */}
            <button
              onClick={toggleLang}
              className="px-3 py-1.5 rounded-xl bg-[#151b2e] border border-[#242c47] text-xs font-bold text-slate-300 hover:text-white"
            >
              {i18n.language === "ar" ? "English" : "عربي"}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 mt-14 md:mt-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
