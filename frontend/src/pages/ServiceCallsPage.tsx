import { useEffect, useState } from "react";
import { getServiceCalls, updateServiceCall } from "../api/serviceCalls";
import { soundManager } from "../utils/beep";
import { io } from "socket.io-client";
import type { ServiceCall } from "../types";
import Spinner from "../components/Spinner";
import Toast from "../components/Toast";

const callLabels: Record<string, { ar: string; icon: string; color: string }> = {
  bill: { ar: "طلب الحساب والكاشير", icon: "💵", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  help: { ar: "طلب حضور النادل", icon: "🙋‍♂️", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  water: { ar: "طلب مياه", icon: "💧", color: "bg-sky-500/20 text-sky-300 border-sky-500/30" },
  napkins: { ar: "طلب مناديل", icon: "🧻", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  other: { ar: "مساعدة أخرى", icon: "🔔", color: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
};

const ServiceCallsPage = () => {
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundActive, setSoundActive] = useState(soundManager.isEnabled());
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "acknowledged">("all");

  const loadCalls = async () => {
    try {
      const data = await getServiceCalls();
      setCalls(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalls();
    const interval = setInterval(loadCalls, 10000);

    // Socket.io real-time listener
    const socket = io(import.meta.env.VITE_API_BASE?.replace("/api", "") || "http://localhost:3001", {
      transports: ["websocket", "polling"],
    });

    socket.emit("join_manager");

    socket.on("service_call", () => {
      soundManager.playServiceCallSound();
      loadCalls();
    });

    socket.on("staff_call", () => {
      soundManager.playServiceCallSound();
      loadCalls();
    });

    socket.on("service_call_updated", () => {
      loadCalls();
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  const handleUpdate = async (id: string, status: "acknowledged" | "resolved") => {
    try {
      await updateServiceCall(id, status);
      setToast(status === "acknowledged" ? "تم استلام النداء" : "تم إنهاء وتلبية النداء");
      loadCalls();
    } catch {
      setToast("تعذر تحديث النداء");
    }
  };

  const toggleSound = () => {
    const next = soundManager.toggle();
    setSoundActive(next);
    setToast(next ? "تم تفعيل التنبيه الصوتي 🔔" : "تم كتم الصوت 🔕");
  };

  const filtered = calls.filter((c) => filter === "all" || c.status === filter);

  if (loading) return <Spinner />;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-bounce">🔔</span>
            <h1 className="text-2xl md:text-3xl font-bold text-[#2c241c] tracking-wide">
              نداءات الطاولات والزبائن الحية
            </h1>
          </div>
          <p className="text-[#7a6a5c] text-sm mt-1">
            مراقبة وتلبية طلبات المساعدة وطلب الحساب من طاولات الـ QR بشكل فوري.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
              soundActive
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : "bg-[#efe6db] text-[#7a6a5c] border-[#e2d3c2]"
            }`}
          >
            <span>{soundActive ? "🔔 التنبيه الصوتي: مفعّل" : "🔕 التنبيه الصوتي: مكتوم"}</span>
          </button>

          <button onClick={loadCalls} className="btn-secondary text-xs">
            🔄 تحديث
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e2d3c2] pb-3">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            filter === "all" ? "bg-[#9c6b4a] text-white" : "bg-white text-[#7a6a5c] hover:text-[#2c241c]"
          }`}
        >
          الكل ({calls.length})
        </button>
        <button
          onClick={() => setFilter("open")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            filter === "open" ? "bg-amber-500 text-slate-900 font-extrabold" : "bg-white text-[#7a6a5c] hover:text-[#2c241c]"
          }`}
        >
          ● نداءات جديدة في الانتظار ({calls.filter((c) => c.status === "open").length})
        </button>
        <button
          onClick={() => setFilter("acknowledged")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            filter === "acknowledged" ? "bg-sky-500 text-slate-900 font-extrabold" : "bg-white text-[#7a6a5c] hover:text-[#2c241c]"
          }`}
        >
          ● جاري التلبية ({calls.filter((c) => c.status === "acknowledged").length})
        </button>
      </div>

      {/* Grid of Calls */}
      {filtered.length === 0 ? (
        <div className="card-luxury py-20 text-center space-y-3">
          <div className="text-4xl">✨</div>
          <h3 className="text-lg font-bold text-[#2c241c]">لا توجد نداءات طاولات حالياً</h3>
          <p className="text-[#7a6a5c] text-xs">كل طلبات الزبائن تمت تلبيتها بنجاح!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((call) => {
            const info = callLabels[call.type] || callLabels.other;
            const elapsedMins = Math.floor((Date.now() - new Date(call.createdAt).getTime()) / 60000);
            const isOpen = call.status === "open";

            return (
              <div
                key={call._id}
                className={`card-luxury p-5 relative overflow-hidden transition-all ${
                  isOpen
                    ? "border-amber-500/50 shadow-lg shadow-amber-500/10"
                    : "border-sky-500/30"
                }`}
              >
                {isOpen && (
                  <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 animate-pulse" />
                )}

                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#fffcf8] border border-[#e2d3c2] grid place-items-center text-2xl">
                      {info.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-[#2c241c]">طاولة {call.tableId}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${info.color}`}>
                          {info.ar}
                        </span>
                      </div>
                      <p className="text-xs text-[#7a6a5c] mt-0.5">
                        منذ {elapsedMins === 0 ? "لحظات" : `${elapsedMins} دقيقة`}
                      </p>
                    </div>
                  </div>
                </div>

                {call.note && (
                  <div className="p-3 rounded-xl bg-[#fffcf8] border border-[#e2d3c2] text-xs text-[#5c4a3e] mb-4">
                    <span className="text-slate-500 font-semibold">ملاحظة الزبون: </span>
                    {call.note}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#e2d3c2]">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className={`w-2.5 h-2.5 rounded-full ${isOpen ? "bg-amber-400 animate-ping" : "bg-sky-400"}`} />
                    <span className={isOpen ? "text-amber-300 font-bold" : "text-sky-300 font-bold"}>
                      {isOpen ? "في الانتظار" : "قيد الاستلام"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOpen && (
                      <button
                        onClick={() => handleUpdate(call._id, "acknowledged")}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30"
                      >
                        استلام
                      </button>
                    )}
                    <button
                      onClick={() => handleUpdate(call._id, "resolved")}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-[#2c241c] hover:bg-emerald-500"
                    >
                      ✓ تم الحل
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ServiceCallsPage;

