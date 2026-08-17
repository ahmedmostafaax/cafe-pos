import { useEffect, useState } from "react";
import api from "../api/axios";
import Spinner from "../components/Spinner";
import Toast from "../components/Toast";

const CashPage = () => {
  const [session, setSession] = useState<any>(null);
  const [float, setFloat] = useState("0");
  const [closing, setClosing] = useState("");
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const load = () =>
    api
      .get("/cash/current")
      .then((r) => setSession(r.data.data.session))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const open = async () => {
    try {
      await api.post("/cash/open", { openingFloat: Number(float) });
      setToast("تم فتح الوردية");
      setReport(null);
      load();
    } catch (e: any) {
      setToast(e.response?.data?.message || "فشل");
    }
  };

  const close = async () => {
    try {
      const { data } = await api.post("/cash/close", { closingCash: Number(closing) });
      setReport(data.data.report);
      setToast("تم إغلاق الوردية");
      load();
    } catch (e: any) {
      setToast(e.response?.data?.message || "فشل");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="text-[#2c241c] max-w-lg">
      {toast && <Toast message={toast} type="info" onClose={() => setToast("")} />}
      <h1 className="text-2xl font-bold text-[#9c6b4a] mb-1">درج النقدية</h1>
      <p className="text-sm text-[#7a6a5c] mb-5">فتح / إغلاق الوردية وتقرير الفرق</p>

      {session ? (
        <div className="carolina-card p-5">
          <div className="text-emerald-700 font-bold mb-2">وردية مفتوحة</div>
          <div className="text-sm space-y-1 text-[#7a6a5c]">
            <div>فتح: {session.openedBy?.name || "—"}</div>
            <div>رصيد الافتتاح: <b className="text-[#2c241c]">{session.openingFloat} ج</b></div>
            <div>من: {new Date(session.openedAt).toLocaleString("ar-EG")}</div>
          </div>
          <input
            type="number"
            inputMode="decimal"
            placeholder="عدّ النقدية الآن (إغلاق)"
            value={closing}
            onChange={(e) => setClosing(e.target.value)}
            className="carolina-input mt-4"
          />
          <button type="button" onClick={close} className="carolina-btn w-full mt-3">
            إغلاق الوردية + تقرير
          </button>
        </div>
      ) : (
        <div className="carolina-card p-5">
          <div className="text-[#7a6a5c] mb-3">لا توجد وردية مفتوحة</div>
          <input
            type="number"
            inputMode="decimal"
            placeholder="رصيد الافتتاح"
            value={float}
            onChange={(e) => setFloat(e.target.value)}
            className="carolina-input"
          />
          <button type="button" onClick={open} className="carolina-btn w-full mt-3">
            فتح وردية
          </button>
        </div>
      )}

      {report && (
        <div className="carolina-card p-5 mt-4">
          <h2 className="font-bold text-[#9c6b4a] mb-3">تقرير الإغلاق</h2>
          <div className="text-sm space-y-2">
            <div className="flex justify-between"><span>افتتاح</span><b>{report.openingFloat} ج</b></div>
            <div className="flex justify-between"><span>مبيعات كاش</span><b>{report.cashSales} ج</b></div>
            <div className="flex justify-between"><span>مبيعات إلكتروني</span><b>{report.electronicSales} ج</b></div>
            <div className="flex justify-between"><span>إجمالي المبيعات</span><b>{report.totalSales} ج</b></div>
            <div className="flex justify-between"><span>المتوقع في الدرج</span><b>{report.expectedCash} ج</b></div>
            <div className="flex justify-between"><span>العدّ الفعلي</span><b>{report.closingCash} ج</b></div>
            <div className={`flex justify-between font-bold pt-2 border-t border-[#e6dcd0] ${report.variance === 0 ? "text-emerald-700" : "text-red-600"}`}>
              <span>الفرق</span><span>{report.variance} ج</span>
            </div>
            <div className="text-xs text-[#7a6a5c]">طلبات مدفوعة: {report.ordersCount}</div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CashPage;
