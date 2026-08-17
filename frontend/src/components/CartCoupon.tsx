import { useState } from "react";
import { validateCoupon } from "../api/extras";

type Props = {
  total: number;
  discount: number;
  onDiscount: (n: number, msg: string) => void;
};

const CartCoupon = ({ total, discount, onDiscount }: Props) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const apply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setErr("");
    try {
      const r = await validateCoupon(code.trim(), total);
      onDiscount(r.discount, r.message || `خصم ${r.discount} ج`);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "كوبون غير صالح");
      onDiscount(0, "");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <input
          className="carolina-input flex-1"
          placeholder="كود الخصم"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button type="button" onClick={apply} disabled={loading} className="carolina-btn !min-h-[48px] !px-4 text-sm shrink-0">
          {loading ? "..." : "تطبيق"}
        </button>
      </div>
      {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
      {discount > 0 && (
        <p className="text-sm text-emerald-700 font-semibold mt-2">خصم {discount} ج.م — الإجمالي بعد الخصم {Math.max(0, total - discount)} ج</p>
      )}
    </div>
  );
};

export default CartCoupon;
