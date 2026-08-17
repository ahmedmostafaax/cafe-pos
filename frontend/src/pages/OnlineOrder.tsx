import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPublicMenu, createPublicOrder } from "../api/public";
import type { MenuItem } from "../types";
import PublicHeader from "../components/PublicHeader";
import Spinner from "../components/Spinner";
import Toast from "../components/Toast";
import { useCustomerAuth } from "../contexts/CustomerAuthContext";

const HERO_IMG =
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1600&q=80";
const FEATURE_IMGS = [
  "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=800&q=80",
];

type CartLine = { menuId: string; name: string; price: number; qty: number; station?: string };

const OnlineOrder = () => {
  const navigate = useNavigate();
  const { customer, logout } = useCustomerAuth?.() || ({ customer: null, logout: () => {} } as any);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [toast, setToast] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cat, setCat] = useState("all");

  useEffect(() => {
    getPublicMenu()
      .then((m) => setMenu(Array.isArray(m) ? m : []))
      .catch(() => setMenu([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    menu.forEach((m: any) => {
      if (m.category?.nameAr) set.add(m.category.nameAr);
      else if (m.station) set.add(m.station === "bar" ? "مشروبات" : "مأكولات");
    });
    return ["all", ...Array.from(set)];
  }, [menu]);

  const filtered = menu.filter((m: any) => {
    if (cat === "all") return true;
    if (m.category?.nameAr) return m.category.nameAr === cat;
    return (m.station === "bar" ? "مشروبات" : "مأكولات") === cat;
  });

  const featured = menu.filter((m: any) => m.available !== false).slice(0, 3);

  const add = (item: any) => {
    setCart((prev) => {
      const i = prev.findIndex((x) => x.menuId === String(item._id));
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [
        ...prev,
        {
          menuId: String(item._id),
          name: item.nameAr || item.name,
          price: item.price,
          qty: 1,
          station: item.station,
        },
      ];
    });
    setToast("أُضيف إلى السلة");
  };

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const count = cart.reduce((s, c) => s + c.qty, 0);

  const goCheckout = () => {
    if (!customer) {
      navigate("/customer-login");
      return;
    }
    setShowCart(false);
    setShowCheckout(true);
  };

  const submit = async () => {
    if (!cart.length) return;
    setSubmitting(true);
    try {
      const order = await createPublicOrder({
        tableId: "ONLINE",
        items: cart.map((c) => ({
          menuId: c.menuId,
          name: c.name,
          price: c.price,
          qty: c.qty,
          station: c.station || "kitchen",
        })),
        totalPrice: total,
        guests: 1,
        dineIn: false,
        payMethod,
        notes: `العميل: ${customer?.name || ""} | ${customer?.email || ""} | موبايل: ${phone || customer?.phone || ""} | عنوان: ${address} | ${notes}`,
      });
      setCart([]);
      setShowCheckout(false);
      setToast("تم استلام طلبك");
      if ((order as any)?.publicToken) navigate(`/track/${(order as any).publicToken}`);
    } catch (e: any) {
      setToast(e?.response?.data?.message || "تعذر إرسال الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f3ee] text-[#2c241c]">
      {toast && <Toast message={toast} type="info" onClose={() => setToast("")} />}

      <PublicHeader
        cartCount={count}
        onCart={() => setShowCart(true)}
        rightSlot={
          customer ? (
            <div className="hidden sm:flex items-center gap-2 text-xs text-[#7a6a5c]">
              <span>أهلاً {customer.name}</span>
              <button type="button" onClick={logout} className="text-[#9c6b4a] font-semibold">خروج</button>
            </div>
          ) : (
            <div className="hidden sm:flex gap-2">
              <Link to="/customer-login" className="carolina-btn-outline text-xs !min-h-[38px]">دخول</Link>
              <Link to="/customer-register" className="carolina-btn text-xs !min-h-[38px] !px-3">حساب جديد</Link>
            </div>
          )
        }
      />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 py-10 md:py-16 grid md:grid-cols-2 gap-8 items-center">
          <div className="order-2 md:order-1">
            <p className="text-[#9c6b4a] text-sm font-semibold tracking-wide mb-2">GODZ Café</p>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight text-[#2c241c]">
              قهوة تُحضَّر بحب
              <span className="block text-[#9c6b4a] mt-1">وطلبات تصل بسهولة</span>
            </h1>
            <p className="mt-4 text-[#7a6a5c] text-sm md:text-base leading-relaxed max-w-md">
              اكتشف قائمتنا المختارة، أضف ما تشتهي إلى السلة، واطلب أونلاين بخطوات بسيطة — تجربة دافئة مثل رائحة الإسبريسو صباحاً.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#menu" className="carolina-btn">تصفّح القائمة</a>
              <a href="#featured" className="carolina-btn-outline">مختارات اليوم</a>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <div className="relative rounded-[2rem] overflow-hidden shadow-[0_24px_60px_rgba(44,36,28,0.15)] aspect-[4/3] md:aspect-square">
              <img src={HERO_IMG} alt="cafe" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2c241c]/40 to-transparent" />
              <div className="absolute bottom-4 right-4 left-4 bg-white/95 backdrop-blur rounded-2xl p-4 border border-[#e6dcd0]">
                <div className="text-xs text-[#9c6b4a] font-semibold">توصية الشيف</div>
                <div className="font-bold text-[#2c241c]">إسبريسو + كرواسون طازج</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section id="featured" className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="text-[#9c6b4a] text-xs font-semibold">مختارات</p>
            <h2 className="text-2xl font-bold text-[#2c241c]">الأكثر طلباً اليوم</h2>
          </div>
        </div>
        {loading ? (
          <Spinner />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(featured.length ? featured : menu.slice(0, 3)).map((item: any, idx) => (
              <article key={item._id} className="carolina-card">
                <div className="aspect-[16/10] overflow-hidden bg-[#efe6db]">
                  <img
                    src={item.image || FEATURE_IMGS[idx % FEATURE_IMGS.length]}
                    alt={item.nameAr || item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-[#2c241c]">{item.nameAr || item.name}</h3>
                  <p className="text-xs text-[#7a6a5c] mt-1 line-clamp-2">{item.description || "تحضير طازج يومياً"}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-bold text-[#9c6b4a]">{item.price} ج.م</span>
                    <button type="button" onClick={() => add(item)} className="carolina-btn !min-h-[40px] !px-4 text-xs">
                      أضف
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* MENU */}
      <section id="menu" className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-6">
          <p className="text-[#9c6b4a] text-xs font-semibold">القائمة الكاملة</p>
          <h2 className="text-2xl font-bold text-[#2c241c]">اختر على مهل</h2>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-3 mb-5 -mx-1 px-1">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition ${
                cat === c
                  ? "bg-[#9c6b4a] text-white border-[#9c6b4a]"
                  : "bg-white text-[#6f4a32] border-[#e6dcd0]"
              }`}
            >
              {c === "all" ? "الكل" : c}
            </button>
          ))}
        </div>

        {loading ? (
          <Spinner />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item: any) => (
              <article key={item._id} className="carolina-card flex flex-col">
                <div className="aspect-[5/3] bg-[#efe6db] overflow-hidden">
                  <img
                    src={
                      item.image ||
                      (item.station === "bar"
                        ? FEATURE_IMGS[0]
                        : FEATURE_IMGS[1])
                    }
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between gap-2">
                    <h3 className="font-bold text-[#2c241c]">{item.nameAr || item.name}</h3>
                    <span className="text-[#9c6b4a] font-bold whitespace-nowrap">{item.price} ج</span>
                  </div>
                  <p className="text-xs text-[#7a6a5c] mt-1 flex-1">{item.description || ""}</p>
                  <button type="button" onClick={() => add(item)} className="carolina-btn w-full mt-3 text-sm">
                    أضف إلى السلة
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ABOUT */}
      <section id="about" className="max-w-6xl mx-auto px-4 py-12">
        <div className="carolina-card p-8 md:p-10 text-center bg-gradient-to-br from-[#fffcf8] to-[#efe6db]">
          <h2 className="text-2xl font-bold text-[#2c241c]">أجواء الكافيه… أينما كنت</h2>
          <p className="mt-3 text-[#7a6a5c] max-w-xl mx-auto text-sm leading-relaxed">
            في GODZ نختار المكوّنات بعناية ونقدّم تجربة بسيطة: اطلب من البيت أو من الطاولة عبر QR، وتابع حالة طلبك لحظة بلحظة.
          </p>
        </div>
      </section>

      <footer className="border-t border-[#e6dcd0] bg-[#fffcf8] mt-6">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row justify-between gap-4 text-sm text-[#7a6a5c]">
          <div>
            <div className="font-bold text-[#2c241c]">GODZ Café</div>
            <div className="text-xs mt-1">طلب أونلاين · طاولات QR · ضيافة دافئة</div>
          </div>
          <div className="flex gap-4 text-xs">
            <Link to="/customer-login" className="hover:text-[#9c6b4a]">دخول العملاء</Link>
            <Link to="/login" className="hover:text-[#9c6b4a]">فريق العمل</Link>
          </div>
        </div>
      </footer>

      {/* CART SHEET */}
      {showCart && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-[#2c241c]/40" onClick={() => setShowCart(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 max-h-[88dvh] overflow-auto border border-[#e6dcd0]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">سلتك</h3>
              <button type="button" onClick={() => setShowCart(false)} className="text-[#7a6a5c] w-10 h-10">✕</button>
            </div>
            {cart.length === 0 ? (
              <p className="text-[#7a6a5c] text-sm py-8 text-center">السلة فارغة — اختر من القائمة</p>
            ) : (
              <>
                {cart.map((c) => (
                  <div key={c.menuId} className="flex justify-between py-3 border-b border-[#e6dcd0] text-sm">
                    <span>{c.name} × {c.qty}</span>
                    <span className="text-[#9c6b4a] font-bold">{c.price * c.qty} ج</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold mt-4 mb-4">
                  <span>الإجمالي</span>
                  <span className="text-[#9c6b4a]">{total} ج.م</span>
                </div>
                <button type="button" onClick={goCheckout} className="carolina-btn w-full">إتمام الطلب</button>
                <button type="button" onClick={() => setShowCart(false)} className="w-full mt-2 py-3 text-sm text-[#6f4a32] font-semibold">
                  متابعة التسوق
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* CHECKOUT */}
      {showCheckout && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-[#2c241c]/40" onClick={() => setShowCheckout(false)} />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 max-h-[90dvh] overflow-auto">
            <h3 className="font-bold text-lg mb-4">تأكيد الطلب</h3>
            <input className="carolina-input mb-3" placeholder="موبايل" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input className="carolina-input mb-3" placeholder="العنوان" value={address} onChange={(e) => setAddress(e.target.value)} />
            <textarea className="carolina-input mb-3 min-h-[80px]" placeholder="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="grid grid-cols-3 gap-2 mb-4">
              {["cash", "instapay", "wallet"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayMethod(m)}
                  className={`py-2.5 rounded-xl text-xs font-bold border ${
                    payMethod === m ? "bg-[#9c6b4a] text-white border-[#9c6b4a]" : "border-[#e6dcd0] text-[#6f4a32]"
                  }`}
                >
                  {m === "cash" ? "كاش" : m === "instapay" ? "إنستاباي" : "محفظة"}
                </button>
              ))}
            </div>
            <button type="button" disabled={submitting} onClick={submit} className="carolina-btn w-full disabled:opacity-60">
              {submitting ? "جاري الإرسال..." : `اطلب الآن · ${total} ج`}
            </button>
          </div>
        </div>
      )}

      {/* FAB موبايل */}
      {count > 0 && !showCart && !showCheckout && (
        <button
          type="button"
          onClick={() => setShowCart(true)}
          className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 carolina-btn shadow-xl px-6"
        >
          السلة · {count} · {total} ج
        </button>
      )}
    </div>
  );
};

export default OnlineOrder;
