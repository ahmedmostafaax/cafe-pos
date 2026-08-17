import { useEffect, useState } from "react";
import api from "../api/axios";
import Spinner from "../components/Spinner";
import Toast from "../components/Toast";

const MenuPage = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [image, setImage] = useState("");
  const [price, setPrice] = useState("");
  const [prep, setPrep] = useState("10");

  const load = () =>
    api.get("/menu").then((r) => setItems(r.data.data.menu || r.data.data.items || [])).finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const save = async (id: string) => {
    await api.patch(`/menu/${id}`, {
      image: image || undefined,
      price: price !== "" ? Number(price) : undefined,
      prepMinutes: Number(prep) || 10,
    });
    setEditId(null);
    setToast("تم التحديث");
    load();
  };

  const toggleSold = async (id: string, soldOut: boolean) => {
    await api.patch(`/menu/${id}/sold-out`, { soldOut: !soldOut });
    setToast(!soldOut ? "تم تعليم نفد" : "عاد متاحاً");
    load();
  };

  if (loading) return <Spinner />;

  return (
    <div className="text-[#2c241c]">
      {toast && <Toast message={toast} type="info" onClose={() => setToast("")} />}
      <h1 className="text-2xl font-bold text-[#9c6b4a] mb-4">القائمة · صور · نفد</h1>
      <div className="space-y-3">
        {items.map((it) => (
          <div key={it._id} className="carolina-card p-3 flex flex-wrap gap-3 items-center">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#efe6db] shrink-0">
              {it.image ? <img src={it.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">☕</div>}
            </div>
            <div className="flex-1 min-w-[140px]">
              <div className="font-bold">{it.nameAr || it.name}</div>
              <div className="text-xs text-[#7a6a5c]">{it.price} ج · {it.prepMinutes || 10} د · {it.station}</div>
              {it.soldOut && <span className="text-xs text-red-600 font-bold">نفد</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => { setEditId(it._id); setImage(it.image || ""); setPrice(String(it.price)); setPrep(String(it.prepMinutes || 10)); }} className="px-3 py-2 rounded-xl bg-[#efe6db] text-xs font-bold">تعديل</button>
              <button type="button" onClick={() => toggleSold(it._id, !!it.soldOut)} className="px-3 py-2 rounded-xl bg-[#9c6b4a] text-white text-xs font-bold">
                {it.soldOut ? "إتاحة" : "نفد"}
              </button>
            </div>
            {editId === it._id && (
              <div className="w-full grid sm:grid-cols-3 gap-2 pt-2 border-t border-[#e6dcd0]">
                <input className="carolina-input" placeholder="رابط الصورة" value={image} onChange={(e) => setImage(e.target.value)} />
                <input className="carolina-input" placeholder="السعر" value={price} onChange={(e) => setPrice(e.target.value)} />
                <input className="carolina-input" placeholder="دقائق التحضير" value={prep} onChange={(e) => setPrep(e.target.value)} />
                <button type="button" onClick={() => save(it._id)} className="carolina-btn text-sm">حفظ</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
export default MenuPage;
