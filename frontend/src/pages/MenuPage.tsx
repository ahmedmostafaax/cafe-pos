import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getMenu,
  deleteMenuItem,
  toggleMenuAvailability,
  updateMenuItem,
} from "../api/menu";
import type { MenuItem } from "../types";
import Spinner from "../components/Spinner";
import Toast from "../components/Toast";

const MenuPage = () => {
  const { t, i18n } = useTranslation();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  const load = () => {
    setLoading(true);
    getMenu()
      .then(setMenu)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف المنتج؟")) return;
    await deleteMenuItem(id);
    setToast("تم الحذف");
    load();
  };

  const handleToggle = async (id: string) => {
    await toggleMenuAvailability(id);
    setToast("تم تغيير الحالة");
    load();
  };

  const startEdit = (item: MenuItem) => {
    setEditId(item._id);
    setEditPrice(String(item.price));
  };

  const savePrice = async (id: string) => {
    const price = Number(editPrice);
    if (isNaN(price) || price < 0) return alert("سعر غير صحيح");
    await updateMenuItem(id, { price });
    setEditId(null);
    setToast("تم تعديل السعر");
    load();
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ color: "#fff" }}>
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}

      <h1 style={{ marginBottom: 20 }}>إدارة المنيو</h1>
      <p style={{ color: "#666", marginBottom: 20 }}>
        تقدر تعدل الأسعار وتحذف وتخفي أي منتج
      </p>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1a1a2e" }}>
              <th style={th}>الاسم</th>
              <th style={th}>المحطة</th>
              <th style={th}>السعر</th>
              <th style={th}>الحالة</th>
              <th style={th}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {menu.map((item) => (
              <tr key={item._id} style={{ borderBottom: "1px solid #222" }}>
                <td style={td}>
                  {i18n.language === "ar" ? item.nameAr || item.name : item.nameEn || item.name}
                </td>
                <td style={td}>
                  <span style={{
                    background: item.station === "bar" ? "#1e3a5f" : "#3a1e1e",
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontSize: 12,
                  }}>
                    {item.station === "bar" ? "بار" : "مطبخ"}
                  </span>
                </td>
                <td style={td}>
                  {editId === item._id ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        style={{ width: 70, padding: 6, borderRadius: 6, border: "none" }}
                      />
                      <button onClick={() => savePrice(item._id)} style={smallBtn}>حفظ</button>
                      <button onClick={() => setEditId(null)} style={{ ...smallBtn, background: "#555" }}>إلغاء</button>
                    </div>
                  ) : (
                    <span style={{ fontWeight: 700 }}>{item.price} ج.م</span>
                  )}
                </td>
                <td style={td}>
                  <span style={{ color: item.available ? "#10b981" : "#ef4444" }}>
                    {item.available ? "متاح" : "مخفي"}
                  </span>
                </td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button onClick={() => startEdit(item)} style={smallBtn}>تعديل السعر</button>
                    <button onClick={() => handleToggle(item._id)} style={{ ...smallBtn, background: "#3b82f6" }}>
                      {item.available ? "إخفاء" : "إظهار"}
                    </button>
                    <button onClick={() => handleDelete(item._id)} style={{ ...smallBtn, background: "#ef4444" }}>
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {menu.length === 0 && (
        <p style={{ color: "#555", marginTop: 40, textAlign: "center" }}>
          مفيش منتجات. أضف من التصنيفات أولاً أو شغل الـ seed.
        </p>
      )}
    </div>
  );
};

const th: React.CSSProperties = { padding: 14, textAlign: "right", fontSize: 13, color: "#888" };
const td: React.CSSProperties = { padding: 14, fontSize: 14 };
const smallBtn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "none",
  background: "#e94560",
  color: "#fff",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
};

export default MenuPage;
