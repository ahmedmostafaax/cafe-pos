import { useEffect, useMemo, useState } from "react";
import { checkIn, checkOut, getOnShift, getTodayAttendance } from "../api/attendance";
import Spinner from "../components/Spinner";
import Toast from "../components/Toast";

const shifts = [
  { id: "morning", label: "الصباحي", time: "08:00 — 16:00", icon: "☀️" },
  { id: "evening", label: "المسائي", time: "16:00 — 00:00", icon: "🌆" },
  { id: "night", label: "الليلي", time: "00:00 — 08:00", icon: "🌙" },
] as const;
const shiftLabel = Object.fromEntries(shifts.map((shift) => [shift.id, shift.label]));
const time = (value?: string) => value ? new Date(value).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "—";

const AttendancePage = () => {
  const [data, setData] = useState<any>({ onShift: [], morning: [], evening: [], night: [] });
  const [today, setToday] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [shift, setShift] = useState<(typeof shifts)[number]["id"]>("morning");
  const [pending, setPending] = useState(false);

  const load = async (withLoader = false) => {
    if (withLoader) setLoading(true);
    try { const [on, records] = await Promise.all([getOnShift(), getTodayAttendance()]); setData(on); setToday(records.records || []); }
    catch { setToast("تعذر تحميل سجل الحضور حالياً"); }
    finally { if (withLoader) setLoading(false); }
  };
  useEffect(() => { load(true); const interval = setInterval(() => load(), 30000); return () => clearInterval(interval); }, []);

  const currentRecord = today.find((record) => record.shift === shift && record.checkIn && !record.checkOut);
  const attendanceRate = useMemo(() => today.length ? Math.round((data.onShift?.length || 0) / today.length * 100) : 0, [data, today]);
  const action = async (type: "in" | "out") => {
    setPending(true);
    try { await (type === "in" ? checkIn(shift) : checkOut(shift)); setToast(type === "in" ? "تم تسجيل حضورك بنجاح" : "تم تسجيل انصرافك، يوم موفق"); await load(); }
    catch (error: any) { setToast(error.response?.data?.message || "حصل خطأ، حاول مرة أخرى"); }
    finally { setPending(false); }
  };
  if (loading) return <Spinner />;

  return <div className="text-white max-w-6xl mx-auto pb-10">
    {toast && <Toast message={toast} type="info" onClose={() => setToast("")} />}
    <section className="rounded-3xl overflow-hidden border border-[#3d2e24] bg-gradient-to-l from-[#2b1916] via-[#1a1410] to-[#201813] p-6 md:p-9 mb-6 relative">
      <div className="absolute w-64 h-64 rounded-full bg-[#e94560]/10 -left-20 -top-24" />
      <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-5"><div><p className="text-[#e8c39e] text-xs tracking-[.2em] mb-3">TEAM OPERATIONS</p><h1 className="text-3xl md:text-4xl font-black">الحضور والشفتات</h1><p className="text-[#a89080] mt-2">تابع فريقك واعرف مين موجود في كل شيفت لحظياً.</p></div><div className="text-right"><span className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-300 px-3 py-2 rounded-full text-xs"><i className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/> تحديث تلقائي كل 30 ثانية</span></div></div>
    </section>
    <section className="grid sm:grid-cols-3 gap-3 mb-6">{[{ label: "الموجودون الآن", value: data.onShift?.length || 0, note: "موظف في العمل" }, { label: "سجلات اليوم", value: today.length, note: "تسجيل حضور" }, { label: "حضور نشط", value: `${attendanceRate}%`, note: "من سجلات اليوم" }].map((stat) => <article key={stat.label} className="bg-[#14141f] border border-[#2c2525] rounded-2xl p-5"><p className="text-[#a89080] text-xs">{stat.label}</p><strong className="block text-3xl mt-2 text-[#f5f0e8]">{stat.value}</strong><small className="text-[#6f6258]">{stat.note}</small></article>)}</section>
    <section className="grid lg:grid-cols-[1.1fr_.9fr] gap-6 mb-6"><article className="bg-[#14141f] border border-[#2c2525] rounded-3xl p-5 md:p-6"><div className="flex items-start justify-between mb-5"><div><p className="text-[#e8c39e] text-xs tracking-wider">MY SHIFT</p><h2 className="text-xl font-bold mt-1">سجّل دوامك</h2></div><span className="text-2xl">🕒</span></div><div className="grid sm:grid-cols-3 gap-2 mb-5">{shifts.map((item) => <button key={item.id} onClick={() => setShift(item.id)} className={`text-right rounded-2xl border p-4 transition ${shift === item.id ? "bg-[#e94560] border-[#e94560] shadow-lg shadow-[#e94560]/20" : "border-[#3d2e24] hover:border-[#8b5242] bg-[#1a1410]"}`}><span className="text-xl">{item.icon}</span><strong className="block text-sm mt-2">{item.label}</strong><small className={shift === item.id ? "text-white/75" : "text-[#806f62]"}>{item.time}</small></button>)}</div><div className="rounded-2xl bg-[#1a1410] p-4 flex flex-wrap gap-3 justify-between items-center"><div><p className="font-semibold text-sm">{shiftLabel[shift]}</p><p className="text-xs text-[#a89080]">{currentRecord ? `بدأت في ${time(currentRecord.checkIn)}` : "لم تسجل حضورك في هذا الشيفت"}</p></div>{currentRecord ? <button disabled={pending} onClick={() => action("out")} className="px-5 py-3 rounded-xl bg-white text-[#1a1410] font-bold text-sm disabled:opacity-50">{pending ? "..." : "تسجيل الانصراف"}</button> : <button disabled={pending} onClick={() => action("in")} className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm disabled:opacity-50">{pending ? "..." : "تسجيل الحضور"}</button>}</div></article>
      <article className="bg-[#14141f] border border-[#2c2525] rounded-3xl p-5 md:p-6"><p className="text-[#e8c39e] text-xs tracking-wider">LIVE TEAM</p><h2 className="text-xl font-bold mt-1 mb-5">الموجودون الآن <span className="text-[#e94560]">({data.onShift?.length || 0})</span></h2><div className="space-y-3 max-h-72 overflow-auto pr-1">{data.onShift?.length ? data.onShift.map((record: any) => <div key={record._id} className="flex items-center gap-3 bg-[#1a1410] rounded-2xl p-3"><div className="w-10 h-10 rounded-full bg-[#e94560]/15 text-[#f69baa] grid place-items-center font-bold">{record.user?.name?.slice(0, 1) || "؟"}</div><div className="flex-1"><strong className="block text-sm">{record.user?.name || "—"}</strong><small className="text-[#a89080]">{record.user?.role || "موظف"} · {shiftLabel[record.shift]}</small></div><span className="text-xs text-emerald-300">● حاضر</span></div>) : <div className="text-center py-12 text-[#6f6258] text-sm">لا يوجد موظفون في الشيفت حالياً</div>}</div></article></section>
    <section className="bg-[#14141f] border border-[#2c2525] rounded-3xl overflow-hidden"><div className="p-5 md:p-6 flex justify-between items-center border-b border-[#2c2525]"><div><p className="text-[#e8c39e] text-xs tracking-wider">TODAY’S LOG</p><h2 className="text-xl font-bold mt-1">سجل اليوم</h2></div><button onClick={() => load()} className="text-sm text-[#e8c39e] border border-[#4d392e] rounded-xl px-4 py-2">تحديث</button></div><div className="divide-y divide-[#2c2525]">{today.length ? today.map((record) => <div key={record._id} className="p-4 md:px-6 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#2b211c] text-[#e8c39e] grid place-items-center font-bold">{record.user?.name?.slice(0, 1) || "؟"}</div><div className="flex-1"><strong className="block text-sm">{record.user?.name || "—"}</strong><small className="text-[#8b7a6f]">{record.user?.role || "موظف"} · {shiftLabel[record.shift]}</small></div><div className="text-left text-xs"><span className="block text-[#d3c0ae]">{time(record.checkIn)} ← {time(record.checkOut)}</span><small className={record.checkOut ? "text-[#8b7a6f]" : "text-emerald-300"}>{record.checkOut ? "انتهى الشيفت" : "● في العمل"}</small></div></div>) : <div className="text-center py-16 text-[#6f6258]">لا يوجد حضور مسجل اليوم.</div>}</div></section>
  </div>;
};
export default AttendancePage;
