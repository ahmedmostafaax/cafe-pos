import { useEffect, useState } from "react";
import api from "../api/axios";
import Toast from "../components/Toast";
import Spinner from "../components/Spinner";

const BusyModePage = () => {
  const [s, setS] = useState<any>(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () =>
    api.get("/settings").then((r) => setS(r.data.data.settings)).finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const save = async (patch: any) => {
    const { data } = await api.patch("/settings", patch);
    setS(data.data.settings);
    setToast("تم الحفظ");
  };

  if (loading || !s) return <Spinner />;

  return (
    <div className="text-[#2c241c] max-w-lg">
      {toast && <Toast message={toast} type="success" onClose={() => setToast("")} />}
      <h1 className="text-2xl font-bold text-[#9c6b4a] mb-1">وضع الزحمة</h1>
      <p className="text-sm text-[#7a6a5c] mb-5">وقت إضافي · إخفاء الأصناف البطيئة · إيقاف الأونلاين</p>

      <div className="carolina-card p-5 space-y-4">
        <label className="flex items-center justify-between gap-3">
          <span className="font-semibold">تفعيل وضع الزحمة</span>
          <input type="checkbox" checked={!!s.busyMode} onChange={(e) => save({ busyMode: e.target.checked })} className="w-5 h-5" />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span className="font-semibold">إيقاف الطلب الأونلاين</span>
          <input type="checkbox" checked={!!s.onlinePaused} onChange={(e) => save({ onlinePaused: e.target.checked })} className="w-5 h-5" />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span className="font-semibold">إخفاء الأصناف البطيئة</span>
          <input type="checkbox" checked={!!s.hideSlowItems} onChange={(e) => save({ hideSlowItems: e.target.checked })} className="w-5 h-5" />
        </label>
        <div>
          <label className="text-sm text-[#7a6a5c]">دقائق إضافية للـ ETA</label>
          <input
            type="number"
            className="carolina-input mt-1"
            value={s.busyEtaExtra ?? 10}
            onChange={(e) => setS({ ...s, busyEtaExtra: Number(e.target.value) })}
            onBlur={() => save({ busyEtaExtra: s.busyEtaExtra })}
          />
        </div>
        <div>
          <label className="text-sm text-[#7a6a5c]">حد التحضير «بطيء» (دقائق)</label>
          <input
            type="number"
            className="carolina-input mt-1"
            value={s.slowPrepMinutes ?? 12}
            onChange={(e) => setS({ ...s, slowPrepMinutes: Number(e.target.value) })}
            onBlur={() => save({ slowPrepMinutes: s.slowPrepMinutes })}
          />
        </div>
      </div>
    </div>
  );
};
export default BusyModePage;
