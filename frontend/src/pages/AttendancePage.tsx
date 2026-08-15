import { useEffect, useState } from "react";
import { checkIn, checkOut, getOnShift, getTodayAttendance } from "../api/attendance";
import Spinner from "../components/Spinner";
import Toast from "../components/Toast";

const shiftLabel: Record<string, string> = {
  morning: "صباحي",
  evening: "مسائي",
  night: "ليلي",
};

const AttendancePage = () => {
  const [data, setData] = useState<any>(null);
  const [today, setToday] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [shift, setShift] = useState("morning");

  const load = async () => {
    setLoading(true);
    try {
      const [on, t] = await Promise.all([getOnShift(), getTodayAttendance()]);
      setData(on);
      setToday(t.records || []);
    } catch {
      setData({ onShift: [], morning: [], evening: [], night: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, []);

  const handleIn = async () => {
    try {
      await checkIn(shift);
      setToast("تم تسجيل الحضور");
      load();
    } catch (e: any) {
      setToast(e.response?.data?.message || "خطأ");
    }
  };

  const handleOut = async () => {
    try {
      await checkOut(shift);
      setToast("تم تسجيل الانصراف");
      load();
    } catch (e: any) {
      setToast(e.response?.data?.message || "خطأ");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="text-white">
      {toast && <Toast message={toast} type="info" onClose={() => setToast("")} />}

      <h1 className="text-2xl font-bold mb-2">الحضور والشفتات</h1>
      <p className="text-gray-500 mb-6 text-sm">مين موجود دلوقتي في الشيفت</p>

      {/* أزرار الموظف */}
      <div className="bg-[#14141f] border border-[#1f1f2e] rounded-2xl p-4 mb-6">
        <p className="text-sm text-gray-400 mb-3">تسجيل حضورك / انصرافك</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {(["morning", "evening", "night"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setShift(s)}
              className={`px-4 py-2 rounded-full text-sm ${
                shift === s ? "bg-[#e94560]" : "bg-[#1a1a2e] text-gray-400"
              }`}
            >
              {shiftLabel[s]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={handleIn} className="flex-1 py-2.5 rounded-xl bg-emerald-600 font-semibold">
            حضور
          </button>
          <button onClick={handleOut} className="flex-1 py-2.5 rounded-xl bg-gray-600 font-semibold">
            انصراف
          </button>
        </div>
      </div>

      {/* على الشفت الآن */}
      <h2 className="font-bold mb-3">الآن على الشفت ({data?.onShift?.length || 0})</h2>
      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        {(["morning", "evening", "night"] as const).map((s) => (
          <div key={s} className="bg-[#14141f] border border-[#1f1f2e] rounded-2xl p-4">
            <div className="text-[#e94560] font-bold mb-2">{shiftLabel[s]}</div>
            {(data?.[s] || []).length === 0 ? (
              <p className="text-gray-600 text-sm">لا أحد</p>
            ) : (
              data[s].map((r: any) => (
                <div key={r._id} className="text-sm py-1 border-b border-[#1f1f2e] last:border-0">
                  {r.user?.name || "—"}{" "}
                  <span className="text-gray-500">({r.user?.role})</span>
                </div>
              ))
            )}
          </div>
        ))}
      </div>

      <h2 className="font-bold mb-3">سجل اليوم</h2>
      {today.length === 0 ? (
        <p className="text-gray-600">لا يوجد سجل بعد</p>
      ) : (
        today.map((r) => (
          <div
            key={r._id}
            className="bg-[#14141f] rounded-xl p-3 mb-2 flex justify-between items-center text-sm"
          >
            <div>
              <span className="font-semibold">{r.user?.name}</span>
              <span className="text-gray-500 mr-2"> — {shiftLabel[r.shift]}</span>
            </div>
            <div className="text-gray-400 text-xs">
              {r.checkIn ? new Date(r.checkIn).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "—"}
              {" → "}
              {r.checkOut ? new Date(r.checkOut).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "لم ينصرف"}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AttendancePage;
