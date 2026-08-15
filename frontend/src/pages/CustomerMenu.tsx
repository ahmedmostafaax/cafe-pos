import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPublicMenu, createPublicOrder } from "../api/public";
import { getCategories } from "../api/menu";
import type { MenuItem, OrderItem, Category } from "../types";
import Spinner from "../components/Spinner";
import Toast from "../components/Toast";

const CustomerMenu = () => {
  const { tableNo } = useParams<{ tableNo: string }>();
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [activeCat, setActiveCat] = useState("all");
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<{ token: string; number: string } | null>(null);

  useEffect(() => {
    Promise.all([getPublicMenu(), getCategories()])
      .then(([menuData, cats]) => {
        setMenu(menuData.filter((m) => m.available));
        setCategories(cats);
      })
      .finally(() => setLoading(false));
  }, []);

  const getName = (item: MenuItem) =>
    i18n.language === "ar" ? item.nameAr || item.name : item.nameEn || item.name;

  const getCatName = (cat: Category) =>
    i18n.language === "ar" ? cat.nameAr || cat.name : cat.nameEn || cat.name;

  const filtered =
    activeCat === "all"
      ? menu
      : menu.filter((m) => {
          const id = typeof m.category === "string" ? m.category : m.category?._id;
          return id === activeCat;
        });

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const exists = prev.find((c) => c.menuId === item._id);
      if (exists) {
        return prev.map((c) =>
          c.menuId === item._id ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [
        ...prev,
        {
          menuId: item._id,
          name: getName(item),
          station: item.station,
          price: item.price,
          qty: 1,
          status: "pending",
        },
      ];
    });
    setToast(`تم إضافة ${getName(item)}`);
    setShowCart(true);
  };

  const changeQty = (menuId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.menuId === menuId ? { ...c, qty: c.qty + delta } : c))
        .filter((c) => c.qty > 0)
    );
  };

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const submit = async () => {
    if (!cart.length || !tableNo) return;
    setSubmitting(true);
    try {
      const order = await createPublicOrder({
        tableId: tableNo,
        items: cart,
        totalPrice: total,
        guests: 1,
        dineIn: true,
        notes,
      });
      setOrderSuccess({ token: order.publicToken!, number: order.orderNumber });
      setCart([]);
      setNotes("");
      setShowCart(false);
    } catch {
      setToast("حصل خطأ، حاول مرة تانية");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={s.center}>
        <Spinner />
        <p style={{ color: "#888", marginTop: 16 }}>جاري تحميل المنيو...</p>
      </div>
    );
  }

  // بعد نجاح الطلب
  if (orderSuccess) {
    return (
      <div style={s.successPage}>
        <div style={{ fontSize: 64 }}>✅</div>
        <h1 style={{ margin: "16px 0 8px" }}>تم استلام طلبك</h1>
        <p style={{ color: "#aaa" }}>رقم الطلب: <strong style={{ color: "#e94560" }}>{orderSuccess.number}</strong></p>
        <p style={{ color: "#666", marginTop: 8 }}>ترابيزة {tableNo}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 32, width: "100%", maxWidth: 320 }}>
          <button
            style={s.primaryBtn}
            onClick={() => navigate(`/track/${orderSuccess.token}`)}
          >
            متابعة الطلب
          </button>
          <button
            style={s.secondaryBtn}
            onClick={() => setOrderSuccess(null)}
          >
            اطلب حاجة تانية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {toast && <Toast message={toast} type="success" onClose={() => setToast(null)} />}

      {/* Header */}
      <header style={s.header}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>⚡ GODZ</div>
          <div style={{ color: "#e94560", fontSize: 13, marginTop: 2 }}>
            ترابيزة {tableNo}
          </div>
        </div>
        <button style={s.cartBtn} onClick={() => setShowCart(true)}>
          🛒
          {cartCount > 0 && <span style={s.badge}>{cartCount}</span>}
        </button>
      </header>

      {/* Categories */}
      <div style={s.cats}>
        <button
          style={{ ...s.catBtn, ...(activeCat === "all" ? s.catActive : {}) }}
          onClick={() => setActiveCat("all")}
        >
          الكل
        </button>
        {categories.map((c) => (
          <button
            key={c._id}
            style={{ ...s.catBtn, ...(activeCat === c._id ? s.catActive : {}) }}
            onClick={() => setActiveCat(c._id)}
          >
            {getCatName(c)}
          </button>
        ))}
      </div>

      {/* Menu */}
      <div style={s.grid}>
        {filtered.map((item) => (
          <div key={item._id} style={s.card} onClick={() => addToCart(item)}>
            <div style={s.cardImg}>{item.station === "bar" ? "🥤" : "🍽️"}</div>
            <div style={s.cardBody}>
              <div style={s.cardTitle}>{getName(item)}</div>
              {(item.descAr || item.desc) && (
                <div style={s.cardDesc}>
                  {i18n.language === "ar" ? item.descAr || item.desc : item.descEn || item.desc}
                </div>
              )}
              <div style={s.cardFooter}>
                <span style={s.price}>{item.price} ج.م</span>
                <span style={s.plus}>+</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ textAlign: "center", color: "#555", marginTop: 40 }}>
          مفيش أصناف في التصنيف ده
        </p>
      )}

      {/* Floating cart button */}
      {cartCount > 0 && !showCart && (
        <button style={s.floatingCart} onClick={() => setShowCart(true)}>
          عرض السلة ({cartCount}) — {total} ج.م
        </button>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div style={s.overlay} onClick={() => setShowCart(false)}>
          <div style={s.drawer} onClick={(e) => e.stopPropagation()}>
            <div style={s.drawerHead}>
              <h3 style={{ margin: 0 }}>سلتك</h3>
              <button onClick={() => setShowCart(false)} style={s.close}>✕</button>
            </div>

            {cart.length === 0 ? (
              <p style={{ color: "#666", textAlign: "center", padding: 30 }}>السلة فارغة</p>
            ) : (
              <>
                {cart.map((c) => (
                  <div key={c.menuId} style={s.cartRow}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{c.name}</div>
                      <div style={{ color: "#e94560", fontSize: 13 }}>{c.price} ج.م</div>
                    </div>
                    <div style={s.qty}>
                      <button onClick={() => changeQty(c.menuId, -1)} style={s.qtyBtn}>−</button>
                      <span style={{ minWidth: 24, textAlign: "center" }}>{c.qty}</span>
                      <button onClick={() => changeQty(c.menuId, 1)} style={s.qtyBtn}>+</button>
                    </div>
                  </div>
                ))}

                <textarea
                  placeholder="ملاحظات (اختياري)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={s.notes}
                />

                <div style={s.totalRow}>
                  <span>الإجمالي</span>
                  <span style={{ color: "#e94560", fontSize: 20, fontWeight: 800 }}>{total} ج.م</span>
                </div>

                <button style={s.submit} onClick={submit} disabled={submitting}>
                  {submitting ? "جاري إرسال الطلب..." : "تأكيد الطلب"}
                </button>

                <button
                  style={{ ...s.secondaryBtn, marginTop: 10 }}
                  onClick={() => setShowCart(false)}
                >
                  كمل تسوق
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#0b0b12", color: "#fff", paddingBottom: 100 },
  center: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  successPage: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0b0b12", color: "#fff", padding: 24, textAlign: "center" },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 16px 10px", position: "sticky", top: 0, zIndex: 20,
    background: "linear-gradient(180deg, #12121c 0%, #0b0b12 100%)",
  },
  cartBtn: {
    background: "#1a1a2e", border: "1px solid #2a2a3e", borderRadius: 12,
    padding: "10px 14px", fontSize: 20, cursor: "pointer", position: "relative", color: "#fff",
  },
  badge: {
    position: "absolute", top: -6, right: -6, background: "#e94560", color: "#fff",
    borderRadius: "50%", width: 20, height: 20, fontSize: 11, display: "flex",
    alignItems: "center", justifyContent: "center", fontWeight: 700,
  },
  cats: { display: "flex", gap: 8, padding: "10px 16px", overflowX: "auto" },
  catBtn: {
    padding: "8px 16px", borderRadius: 20, border: "1px solid #2a2a3e",
    background: "transparent", color: "#888", whiteSpace: "nowrap", cursor: "pointer", fontSize: 13,
  },
  catActive: { background: "#e94560", borderColor: "#e94560", color: "#fff" },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))",
    gap: 12, padding: "8px 16px",
  },
  card: { background: "#14141f", borderRadius: 16, overflow: "hidden", cursor: "pointer" },
  cardImg: { height: 70, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, background: "#1a1a2a" },
  cardBody: { padding: 12 },
  cardTitle: { fontWeight: 700, fontSize: 14, marginBottom: 4 },
  cardDesc: { fontSize: 11, color: "#666", marginBottom: 8, lineHeight: 1.3 },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  price: { color: "#e94560", fontWeight: 700 },
  plus: {
    background: "#e94560", width: 26, height: 26, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16,
  },
  floatingCart: {
    position: "fixed", bottom: 20, left: 16, right: 16, background: "#e94560",
    color: "#fff", border: "none", borderRadius: 14, padding: 16, fontWeight: 700,
    fontSize: 15, cursor: "pointer", zIndex: 30, boxShadow: "0 8px 30px rgba(233,69,96,0.4)",
  },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 50, display: "flex", alignItems: "flex-end" },
  drawer: {
    background: "#14141f", width: "100%", maxHeight: "80vh", borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 20, overflowY: "auto",
  },
  drawerHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  close: { background: "transparent", border: "none", color: "#888", fontSize: 20, cursor: "pointer" },
  cartRow: { display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #1f1f2e" },
  qty: { display: "flex", alignItems: "center", gap: 10 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: "50%", border: "1px solid #333",
    background: "transparent", color: "#fff", fontSize: 16, cursor: "pointer",
  },
  notes: {
    width: "100%", marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid #2a2a3e",
    background: "#0b0b12", color: "#fff", resize: "none", minHeight: 60,
  },
  totalRow: { display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0", fontWeight: 700, fontSize: 17 },
  submit: {
    width: "100%", padding: 15, background: "#e94560", color: "#fff", border: "none",
    borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: "pointer",
  },
  primaryBtn: {
    width: "100%", padding: 15, background: "#e94560", color: "#fff", border: "none",
    borderRadius: 14, fontWeight: 700, fontSize: 15, cursor: "pointer",
  },
  secondaryBtn: {
    width: "100%", padding: 14, background: "transparent", color: "#aaa", border: "1px solid #333",
    borderRadius: 14, fontWeight: 600, fontSize: 14, cursor: "pointer",
  },
};

export default CustomerMenu;
