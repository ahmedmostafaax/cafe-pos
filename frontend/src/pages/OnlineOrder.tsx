import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPublicMenu, createPublicOrder } from "../api/public";
import { getCategories } from "../api/menu";
import { getOffers } from "../api/offers";
import { useCustomerAuth } from "../contexts/CustomerAuthContext";
import type { MenuItem, OrderItem, Category } from "../types";
import Spinner from "../components/Spinner";
import Toast from "../components/Toast";

const OnlineOrder = () => {
  const navigate = useNavigate();
  const { customer, logout } = useCustomerAuth();

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [activeCat, setActiveCat] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [slide, setSlide] = useState(0);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "instapay" | "wallet">("cash");

  useEffect(() => {
    Promise.all([
      getPublicMenu(),
      getCategories(),
      getOffers().catch(() => []),
    ])
      .then(([m, c, o]) => {
        setMenu((m || []).filter((x) => x.available));
        setCategories(c || []);
        setOffers(o || []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (offers.length < 2) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % offers.length), 4500);
    return () => clearInterval(t);
  }, [offers.length]);

  useEffect(() => {
    if (customer?.phone) setPhone(customer.phone);
  }, [customer]);

  const getName = (item: MenuItem) => item.nameAr || item.name;
  const popular = [...menu].slice(0, 6);

  const filtered =
    activeCat === "all"
      ? menu
      : menu.filter((m) => {
          const id = typeof m.category === "string" ? m.category : (m.category as any)?._id;
          return id === activeCat;
        });

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const ex = prev.find((c) => c.menuId === item._id);
      if (ex) {
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
  };

  const changeQty = (id: string, d: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.menuId === id ? { ...c, qty: c.qty + d } : c))
        .filter((c) => c.qty > 0)
    );
  };

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const goCheckout = () => {
    if (!customer) {
      navigate("/customer-login");
      return;
    }
    setShowCart(false);
    setShowCheckout(true);
  };

  const submit = async () => {
    if (!customer) {
      navigate("/customer-login");
      return;
    }
    if (!phone.trim() || !address.trim()) {
      setToast("الموبايل والعنوان مطلوبين للتوصيل");
      return;
    }
    if (!cart.length) return;

    setSubmitting(true);
    try {
      const order = await createPublicOrder({
        tableId: "ONLINE",
        items: cart,
        totalPrice: total,
        dineIn: false,
        payMethod,
        paymentStatus: payMethod === "cash" ? "unpaid" : "pending_transfer",
        notes: `ONLINE | العميل: ${customer.name} | ${customer.email} | موبايل: ${phone} | عنوان: ${address} | ${notes}`,
      });
      setCart([]);
      setShowCheckout(false);
      navigate(`/track/${order.publicToken}`);
    } catch {
      setToast("حصل خطأ، حاول تاني");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a1410]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1410] text-[#f5f0e8]">
      {toast && (
        <Toast message={toast} type="success" onClose={() => setToast("")} />
      )}

      {/* Top bar app-like */}
      <header className="sticky top-0 z-30 bg-[#1a1410]/95 backdrop-blur border-b border-[#3d2e24] px-4 h-14 flex items-center justify-between">
        <div className="font-black tracking-widest text-lg text-[#e8c39e]">GODZ</div>
        <div className="flex items-center gap-2 text-sm">
          {customer ? (
            <>
              <span className="text-[#c4a882] hidden sm:inline">{customer.name}</span>
              <button onClick={logout} className="text-[#e94560] font-semibold">
                خروج
              </button>
            </>
          ) : (
            <>
              <Link to="/customer-login" className="px-3 py-1.5 rounded-full border border-[#3d2e24] text-[#c4a882]">
                دخول
              </Link>
              <Link to="/customer-register" className="px-3 py-1.5 rounded-full bg-[#e94560] font-bold text-white">
                سجّل
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Starbucks-like */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2c211c] via-[#1a1410] to-[#3d2317] px-5 py-16 md:py-24 text-center">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,#e94560,transparent_50%)]" />
        <div className="relative max-w-2xl mx-auto">
          <p className="text-[#e8c39e] text-sm tracking-widest mb-3">CAFE & RESTAURANT</p>
          <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">
            يومك يستاهل
            <span className="block text-[#e94560]">قعدة مظبوطة</span>
          </h1>
          <p className="text-[#a89080] text-base md:text-lg mb-8 max-w-md mx-auto">
            اطلب أونلاين من GODZ — مشاوي، قهوة، حلويات، وتوصيل لحد باب البيت
          </p>
          {!customer ? (
            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                to="/customer-register"
                className="px-8 py-3.5 rounded-full bg-[#e94560] hover:bg-[#c23a51] text-white font-bold transition"
              >
                ابدأ الطلب — سجّل الآن
              </Link>
              <a
                href="#menu"
                className="px-8 py-3.5 rounded-full border border-[#e8c39e]/40 text-[#e8c39e] font-semibold"
              >
                شوف المنيو
              </a>
            </div>
          ) : (
            <a
              href="#menu"
              className="inline-block px-8 py-3.5 rounded-full bg-[#e94560] hover:bg-[#c23a51] text-white font-bold"
            >
              اطلب دلوقتي
            </a>
          )}
        </div>
      </section>

      {/* Offers slider */}
      {offers.length > 0 && (
        <section className="px-4 pt-10 max-w-5xl mx-auto">
          <h2 className="text-xl font-bold mb-4 text-[#e8c39e]">عروض الفترة</h2>
          <div className="overflow-hidden rounded-3xl border border-[#3d2e24]">
            <div
              className="flex transition-transform duration-500"
              style={{ transform: `translateX(${slide * 100}%)` }}
            >
              {offers.map((o) => (
                <div
                  key={o._id}
                  className="min-w-full bg-gradient-to-l from-[#e94560] to-[#8b2942] p-8 md:p-12 text-center"
                >
                  <div className="text-2xl md:text-3xl font-black text-white">
                    {o.titleAr || o.title}
                  </div>
                  {o.discountPercent > 0 && (
                    <div className="text-5xl font-black text-white my-3">
                      {o.discountPercent}%
                    </div>
                  )}
                  <p className="text-white/85 text-sm md:text-base">
                    {o.descriptionAr || o.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {offers.length > 1 && (
            <div className="flex justify-center gap-2 mt-3">
              {offers.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === slide ? "w-6 bg-[#e94560]" : "w-2 bg-[#3d2e24]"
                  }`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Popular */}
      <section className="px-4 pt-10 max-w-5xl mx-auto">
        <h2 className="text-xl font-bold mb-4 text-[#e8c39e]">الأكثر طلباً</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {popular.map((item) => (
            <button
              key={item._id}
              onClick={() => addToCart(item)}
              className="min-w-[150px] bg-[#241c18] border border-[#3d2e24] rounded-2xl overflow-hidden text-right hover:border-[#e94560]/50 transition"
            >
              <div className="h-20 flex items-center justify-center text-4xl bg-[#2c211c]">
                {item.station === "bar" ? "🥤" : "🍽️"}
              </div>
              <div className="p-3">
                <div className="font-bold text-sm text-[#f5f0e8]">{getName(item)}</div>
                <div className="text-[#e94560] font-bold mt-1">{item.price} ج.م</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Menu */}
      <section id="menu" className="px-4 pt-10 pb-32 max-w-5xl mx-auto">
        <h2 className="text-xl font-bold mb-4 text-[#e8c39e]">المنيو</h2>
        <div className="flex gap-2 overflow-x-auto mb-5">
          <button
            onClick={() => setActiveCat("all")}
            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap border transition ${
              activeCat === "all"
                ? "bg-[#e94560] border-[#e94560] text-white"
                : "border-[#3d2e24] text-[#a89080]"
            }`}
          >
            الكل
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              onClick={() => setActiveCat(c._id)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap border transition ${
                activeCat === c._id
                  ? "bg-[#e94560] border-[#e94560] text-white"
                  : "border-[#3d2e24] text-[#a89080]"
              }`}
            >
              {c.nameAr || c.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((item) => (
            <button
              key={item._id}
              onClick={() => addToCart(item)}
              className="bg-[#241c18] border border-[#3d2e24] rounded-2xl overflow-hidden text-right hover:border-[#e94560]/40 hover:shadow-lg hover:shadow-[#e94560]/5 transition group"
            >
              <div className="h-24 flex items-center justify-center text-4xl bg-[#2c211c] group-hover:scale-105 transition">
                {item.station === "bar" ? "🥤" : "🍽️"}
              </div>
              <div className="p-3">
                <div className="font-bold text-sm leading-snug">{getName(item)}</div>
                {(item.descAr || item.desc) && (
                  <div className="text-[11px] text-[#7a6a5c] mt-1 line-clamp-2">
                    {item.descAr || item.desc}
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[#e94560] font-bold">{item.price} ج.م</span>
                  <span className="w-8 h-8 rounded-full bg-[#e94560] text-white flex items-center justify-center font-bold text-lg">
                    +
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#3d2e24] py-8 text-center text-[#7a6a5c] text-sm">
        <div className="font-black text-[#e8c39e] tracking-widest mb-1">GODZ</div>
        <div>Cafe & Restaurant</div>
        <div className="mt-2">© {new Date().getFullYear()}</div>
      </footer>

      {/* Cart bar */}
      {cartCount > 0 && !showCart && !showCheckout && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-5 left-4 right-4 z-40 bg-[#e94560] hover:bg-[#c23a51] text-white font-bold py-4 rounded-2xl shadow-xl shadow-[#e94560]/25"
        >
          السلة ({cartCount}) — {total} ج.م
        </button>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end"
          onClick={() => setShowCart(false)}
        >
          <div
            className="w-full max-h-[80vh] overflow-y-auto bg-[#241c18] border-t border-[#3d2e24] rounded-t-3xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-[#e8c39e]">سلتك</h3>
              <button onClick={() => setShowCart(false)} className="text-[#a89080] text-xl">
                ✕
              </button>
            </div>
            {cart.map((c) => (
              <div
                key={c.menuId}
                className="flex justify-between items-center py-3 border-b border-[#3d2e24]"
              >
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-[#e94560] text-sm">{c.price} ج.م</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => changeQty(c.menuId, -1)}
                    className="w-8 h-8 rounded-full border border-[#3d2e24]"
                  >
                    −
                  </button>
                  <span>{c.qty}</span>
                  <button
                    onClick={() => changeQty(c.menuId, 1)}
                    className="w-8 h-8 rounded-full border border-[#3d2e24]"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-between font-bold text-lg my-4">
              <span>الإجمالي</span>
              <span className="text-[#e94560]">{total} ج.م</span>
            </div>
            <button
              onClick={goCheckout}
              className="w-full py-3.5 bg-[#e94560] rounded-2xl font-bold text-white"
            >
              {customer ? "إتمام الطلب والدفع" : "سجّل دخول لإتمام الطلب"}
            </button>
            <button
              onClick={() => setShowCart(false)}
              className="w-full py-3 mt-2 border border-[#3d2e24] rounded-2xl text-[#a89080]"
            >
              كمل تسوق
            </button>
          </div>
        </div>
      )}

      {/* Checkout + payment */}
      {showCheckout && customer && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end">
          <div className="w-full max-h-[92vh] overflow-y-auto bg-[#241c18] border-t border-[#3d2e24] rounded-t-3xl p-5">
            <h3 className="font-bold text-lg text-[#e8c39e] mb-1">إتمام الطلب</h3>
            <p className="text-sm text-[#a89080] mb-4">
              مرحباً {customer.name} — اختر الدفع وأكّد
            </p>

            <input
              placeholder="الموبايل *"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full mb-3 px-4 py-3 rounded-xl bg-[#1a1410] border border-[#3d2e24] outline-none focus:border-[#e94560]"
            />
            <input
              placeholder="العنوان بالتفصيل *"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full mb-3 px-4 py-3 rounded-xl bg-[#1a1410] border border-[#3d2e24] outline-none focus:border-[#e94560]"
            />
            <textarea
              placeholder="ملاحظات للطلب"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full mb-3 px-4 py-3 rounded-xl bg-[#1a1410] border border-[#3d2e24] outline-none min-h-[70px]"
            />

            <p className="text-sm text-[#c4a882] mb-2">طريقة الدفع</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(
                [
                  ["cash", "كاش عند الاستلام"],
                  ["instapay", "إنستاباي"],
                  ["wallet", "محفظة"],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayMethod(m)}
                  className={`py-3 rounded-xl text-xs font-bold border transition ${
                    payMethod === m
                      ? "bg-[#e94560] border-[#e94560] text-white"
                      : "border-[#3d2e24] text-[#a89080]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {payMethod !== "cash" && (
              <div className="mb-4 p-3 rounded-xl bg-[#2c211c] border border-[#3d2e24] text-xs text-[#c4a882]">
                بعد تأكيد الطلب حوّل على رقم إنستاباي/المحفظة اللي هيظهر مع المتابعة، والمدير هيأكد الاستلام.
                (ربط كاشير باي الحقيقي بعد الرفع على السيرفر)
              </div>
            )}

            <div className="flex justify-between font-bold my-4 text-lg">
              <span>الإجمالي</span>
              <span className="text-[#e94560]">{total} ج.م</span>
            </div>

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full py-3.5 bg-[#e94560] rounded-2xl font-bold text-white disabled:opacity-60"
            >
              {submitting ? "جاري إرسال الطلب..." : "تأكيد الطلب"}
            </button>
            <button
              onClick={() => setShowCheckout(false)}
              className="w-full py-3 mt-2 border border-[#3d2e24] rounded-2xl text-[#a89080]"
            >
              رجوع
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineOrder;
