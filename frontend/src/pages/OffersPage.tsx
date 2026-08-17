import { useEffect, useState } from "react";
import { getOffers, createOffer, deleteOffer, getCoupons, createCoupon, deleteCoupon } from "../api/offers";
import Spinner from "../components/Spinner";
import Toast from "../components/Toast";

const OffersPage = () => {
  const [offers, setOffers] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [desc, setDesc] = useState("");
  const [discount, setDiscount] = useState("");
  const [code, setCode] = useState("");
  const [cDiscount, setCDiscount] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [o, c] = await Promise.all([getOffers(true), getCoupons()]);
      setOffers(o);
      setCoupons(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addOffer = async () => {
    if (!title) return;
    await createOffer({
      title,
      titleAr: titleAr || title,
      description: desc,
      discountPercent: Number(discount) || 0,
      isActive: true,
    });
    setTitle(""); setTitleAr(""); setDesc(""); setDiscount("");
    setToast("تم إضافة العرض");
    load();
  };

  const addCoupon = async () => {
    if (!code) return;
    await createCoupon({
      code: code.toUpperCase(),
      discountPercent: Number(cDiscount) || 0,
      isActive: true,
    });
    setCode(""); setCDiscount("");
    setToast("تم إضافة الكوبون");
    load();
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ color: "#fff" }}>
      {toast && <Toast message={toast} type="success" onClose={() => setToast("")} />}
      <h1>العروض والكوبونات</h1>

      <h3 style={{ marginTop: 28, marginBottom: 12 }}>إضافة عرض</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <input placeholder="العنوان EN" value={title} onChange={(e) => setTitle(e.target.value)} style={inp} />
        <input placeholder="العنوان AR" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} style={inp} />
        <input placeholder="الوصف" value={desc} onChange={(e) => setDesc(e.target.value)} style={inp} />
        <input placeholder="خصم %" value={discount} onChange={(e) => setDiscount(e.target.value)} style={{ ...inp, width: 80 }} />
        <button onClick={addOffer} style={btn}>إضافة عرض</button>
      </div>

      {offers.map((o) => (
        <div key={o._id} style={row}>
          <div>
            <strong>{o.titleAr || o.title}</strong>
            {o.discountPercent > 0 && <span style={{ color: "#e94560", marginRight: 8 }}> -{o.discountPercent}%</span>}
            <div style={{ fontSize: 13, color: "#888" }}>{o.description}</div>
          </div>
          <button onClick={() => deleteOffer(o._id).then(load)} style={{ ...btn, background: "#ef4444" }}>حذف</button>
        </div>
      ))}

      <h3 style={{ marginTop: 36, marginBottom: 12 }}>إضافة كوبون</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input placeholder="كود الكوبون" value={code} onChange={(e) => setCode(e.target.value)} style={inp} />
        <input placeholder="خصم %" value={cDiscount} onChange={(e) => setCDiscount(e.target.value)} style={{ ...inp, width: 80 }} />
        <button onClick={addCoupon} style={btn}>إضافة كوبون</button>
      </div>

      {coupons.map((c) => (
        <div key={c._id} style={row}>
          <div>
            <strong style={{ letterSpacing: 1 }}>{c.code}</strong>
            <span style={{ color: "#e94560", marginRight: 8 }}> -{c.discountPercent}%</span>
          </div>
          <button onClick={() => deleteCoupon(c._id).then(load)} style={{ ...btn, background: "#ef4444" }}>حذف</button>
        </div>
      ))}
    </div>
  );
};

const inp: React.CSSProperties = { padding: 10, borderRadius: 8, border: "none", background: "#1a1a2e", color: "#fff" };
const btn: React.CSSProperties = { padding: "10px 14px", borderRadius: 8, border: "none", background: "#9c6b4a", color: "#fff", cursor: "pointer", fontWeight: 600 };
const row: React.CSSProperties = { background: "#1a1a2e", padding: 14, borderRadius: 10, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" };

export default OffersPage;
