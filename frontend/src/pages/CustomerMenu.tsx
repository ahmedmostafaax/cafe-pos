import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPublicMenu, createPublicOrder } from "../api/public";
import { callStaff } from "../api/session";
import { createServiceCall } from "../api/serviceCalls";
import type { MenuItem } from "../types";
import Toast from "../components/Toast";
import PaymentGatewayModal from "../components/PaymentGatewayModal";

const fallbackImgs: Record<string, string> = {
  "مشويات": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80",
  "فطور": "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=600&q=80",
  "ساندوتشات": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
  "مشروبات ساخنة": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80",
  "مشروبات باردة": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
  "حلويات": "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80",
};

interface CartItem {
  menuId: string;
  name: string;
  price: number;
  qty: number;
  station: string;
}

const CustomerMenu = () => {
  const { tableNo } = useParams<{ tableNo: string }>();
  const navigate = useNavigate();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [toast, setToast] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");

  // Staff Call Modal
  const [showCallModal, setShowCallModal] = useState(false);
  const [callingStaff, setCallingStaff] = useState(false);

  // Gateway Modal
  const [showGateway, setShowGateway] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  useEffect(() => {
    getPublicMenu()
      .then((items) => setMenu(Array.isArray(items) ? items : []))
      .catch(() => setMenu([]))
      .finally(() => setLoading(false));
  }, []);

  // Categories extraction
  const categories = useMemo(() => {
    const set = new Set<string>();
    menu.forEach((item) => {
      const catName = typeof item.category === "object" ? item.category?.name || item.category?.nameAr : item.category;
      if (catName) set.add(catName);
    });
    return Array.from(set);
  }, [menu]);

  // Filtered Menu
  const filteredMenu = useMemo(() => {
    return menu.filter((item) => {
      const catName = typeof item.category === "object" ? item.category?.name || item.category?.nameAr : item.category;
      const matchesCat = activeCat === "all" || catName === activeCat;
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.nameAr && item.nameAr.includes(search)) ||
        (item.descAr && item.descAr.includes(search));
      return matchesCat && matchesSearch;
    });
  }, [menu, activeCat, search]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const exists = prev.find((c) => c.menuId === item._id);
      if (exists) {
        return prev.map((c) => (c.menuId === item._id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [
        ...prev,
        {
          menuId: item._id,
          name: item.nameAr || item.name,
          price: item.price,
          qty: 1,
          station: item.station || "kitchen",
        },
      ];
    });
    setToast(`تمت إضافة "${item.nameAr || item.name}" للطلب`);
  };

  const updateQty = (menuId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.menuId === menuId ? { ...c, qty: c.qty + delta } : c))
        .filter((c) => c.qty > 0)
    );
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);

  // Send Call to Staff
  const handleCallStaff = async (type: string, label: string) => {
    try {
      setCallingStaff(true);
      await callStaff(tableNo || "1", type, `نداء من طاولة ${tableNo}`);
      try {
        await createServiceCall({
          tableId: String(tableNo || "1"),
          type: type === "napkin" ? "napkins" : type === "help" || type === "other" ? "staff" : type,
          note: `نداء من طاولة ${tableNo}`,
        });
      } catch { /* mirrored on backend too */ }
      setShowCallModal(false);
      setToast(`🔔 تم إرسال "${label}" للكاشير والمدير بنجاح!`);
    } catch {
      setToast("تعذر إرسال النداء، يرجى إبلاغ الويتر مباشرة");
    } finally {
      setCallingStaff(false);
    }
  };

  // Submit Order - Cashier Pay option
  const handleOrderPayCashier = async () => {
    if (!cart.length) return;
    try {
      setSubmittingOrder(true);
      const res = await createPublicOrder({
        tableId: tableNo || "1",
        items: cart,
        guests: 1,
        dineIn: true,
        notes,
        payMethod: "cashier",
      });
      setCart([]);
      setShowCart(false);
      navigate(`/track/${res.publicToken}`);
    } catch (err: any) {
      setToast(err.response?.data?.message || "تعذر إرسال الطلب");
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Submit Order - Gateway Pay option
  const handleOrderPayGateway = async () => {
    if (!cart.length) return;
    try {
      setSubmittingOrder(true);
      const res = await createPublicOrder({
        tableId: tableNo || "1",
        items: cart,
        guests: 1,
        dineIn: true,
        notes,
        payMethod: "gateway_kashier",
      });
      setCreatedOrder(res);
      setShowGateway(true);
    } catch (err: any) {
      setToast(err.response?.data?.message || "تعذر إنشاء الطلب");
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f3ee] text-[#2c241c] pb-28">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      {/* Hero Café Header */}
      <header className="relative bg-gradient-to-b from-[#2b211c] via-[#241c18] to-[#1a1410] border-b border-[#e2d3c2] px-4 pt-6 pb-6 text-center">
        <div className="max-w-3xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#9c6b4a]/15 border border-[#9c6b4a]/40 text-[#e8c39e] text-xs font-bold">
            <span>☕ GODZ CAFÉ & RESTAURANT</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2c241c] tracking-wide">
            منيو الطلبات — طاولة {tableNo || "1"}
          </h1>
          <p className="text-xs sm:text-sm text-[#7a6a5c] max-w-md mx-auto">
            اختر أشهى المأكولات والمشروبات واطلبها فورياً من طاولتك مع خيارات الدفع الإلكتروني.
          </p>

          {/* Table Call Quick Button */}
          <div className="pt-2">
            <button
              onClick={() => setShowCallModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition-all shadow-md shadow-amber-500/10"
            >
              <span>🔔</span>
              <span>طلب النادل / طلب الحساب للطاولة</span>
            </button>
          </div>
        </div>
      </header>

      {/* Search & Categories Bar */}
      <div className="sticky top-0 z-30 bg-[#f7f3ee]/95 backdrop-blur-md border-b border-[#e2d3c2] p-3 shadow-lg">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 ابحث في المنيو (كفتة، شاي، برجر...)"
            className="input-modern py-2.5 text-sm"
          />

          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
            <button
              onClick={() => setActiveCat("all")}
              className={`px-4 py-2.5 min-h-[40px] rounded-full text-xs font-bold shrink-0 transition-all ${
                activeCat === "all"
                  ? "bg-[#9c6b4a] text-white shadow-md shadow-[#9c6b4a]/30"
                  : "bg-white text-[#5c4a3e] border border-[#e2d3c2] hover:border-slate-500"
              }`}
            >
              🌟 الكل ({menu.length})
            </button>

            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={`px-4 py-2.5 min-h-[40px] rounded-full text-xs font-bold shrink-0 transition-all ${
                  activeCat === c
                    ? "bg-[#9c6b4a] text-white shadow-md shadow-[#9c6b4a]/30"
                    : "bg-white text-[#5c4a3e] border border-[#e2d3c2] hover:border-slate-500"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <main className="max-w-4xl mx-auto p-4">
        {loading ? (
          <div className="py-20 text-center text-[#7a6a5c]">جاري تحميل قائمة المنيو...</div>
        ) : filteredMenu.length === 0 ? (
          <div className="card-luxury py-20 text-center text-[#7a6a5c]">لا توجد أصناف تطابق بحثك.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMenu.map((item) => {
              const catName = typeof item.category === "object" ? item.category?.name : item.category;
              const imgUrl = item.imageUrl || fallbackImgs[catName || ""] || fallbackImgs["مشروبات ساخنة"];
              const inCart = cart.find((c) => c.menuId === item._id);

              return (
                <div
                  key={item._id}
                  className="card-luxury overflow-hidden flex flex-col justify-between hover:border-[#9c6b4a]/50 transition-all group"
                >
                  <div className="relative h-40 overflow-hidden bg-[#fffcf8]">
                    <img
                      src={imgUrl}
                      alt={item.nameAr || item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#2b211c] via-transparent to-transparent" />
                    <span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-[#f7f3ee]/80 backdrop-blur text-[#2c241c] text-xs font-bold border border-[#e2d3c2]">
                      {item.price} ج.م
                    </span>
                  </div>

                  <div className="p-4 flex flex-col justify-between flex-1 space-y-3">
                    <div>
                      <h3 className="font-bold text-[#2c241c] text-base leading-snug">
                        {item.nameAr || item.name}
                      </h3>
                      {item.descAr && (
                        <p className="text-xs text-[#7a6a5c] mt-1 line-clamp-2 leading-relaxed">
                          {item.descAr}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-[#e2d3c2]">
                      <span className="text-[11px] text-[#7a6a5c]">
                        {item.station === "bar" ? "🥤 البار" : "👨‍🍳 المطبخ"}
                      </span>

                      {inCart ? (
                        <div className="flex items-center gap-2 bg-[#fffcf8] border border-[#e2d3c2] rounded-xl p-1">
                          <button
                            onClick={() => updateQty(item._id, -1)}
                            className="w-9 h-9 rounded-lg bg-[#efe6db] text-[#2c241c] font-bold grid place-items-center hover:bg-[#6f4a32] active:scale-95"
                          >
                            -
                          </button>
                          <span className="font-bold text-sm text-[#2c241c] px-1 font-mono">
                            {inCart.qty}
                          </span>
                          <button
                            onClick={() => updateQty(item._id, 1)}
                            className="w-9 h-9 rounded-lg bg-[#9c6b4a] text-white font-bold grid place-items-center hover:bg-[#6f4a32] active:scale-95"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="btn-primary text-xs py-2 px-3.5"
                        >
                          + أضف للطلب
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 inset-x-4 max-w-xl mx-auto z-40 pb-safe">
          <div className="card-luxury bg-gradient-to-r from-[#241c18] via-[#2b211c] to-[#241c18] border-[#9c6b4a]/40 p-4 shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#9c6b4a] text-white font-bold grid place-items-center shadow-lg">
                {totalCount}
              </div>
              <div>
                <div className="text-xs text-[#5c4a3e]">إجمالي الطلب:</div>
                <div className="text-lg font-bold text-[#2c241c] font-mono">{total} ج.م</div>
              </div>
            </div>

            <button
              onClick={() => setShowCart(true)}
              className="btn-primary text-sm py-2.5 px-5 shadow-lg shadow-[#9c6b4a]/40"
            >
              عرض السلة والدفع ←
            </button>
          </div>
        </div>
      )}

      {/* Cart Bottom Sheet Modal */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="card-luxury w-full max-w-lg bg-white border-[#e2d3c2] rounded-b-none sm:rounded-2xl p-5 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2d3c2] mb-3">
              <h2 className="text-lg font-bold text-[#2c241c] flex items-center gap-2">
                <span>🛍️</span> طلب طاولة {tableNo} ({cart.length} أصناف)
              </h2>
              <button
                onClick={() => setShowCart(false)}
                className="text-[#7a6a5c] hover:text-[#2c241c] text-xl"
              >
                ✕
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 py-2">
              {cart.map((item) => (
                <div
                  key={item.menuId}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#fffcf8] border border-[#e2d3c2]"
                >
                  <div>
                    <h4 className="font-bold text-[#2c241c] text-sm">{item.name}</h4>
                    <p className="text-xs text-emerald-400 font-mono mt-0.5">
                      {item.price} ج.م × {item.qty} = {item.price * item.qty} ج.م
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-white border border-[#e2d3c2] rounded-xl p-1">
                    <button
                      onClick={() => updateQty(item.menuId, -1)}
                      className="w-7 h-7 rounded-lg bg-[#efe6db] text-[#2c241c] font-bold grid place-items-center"
                    >
                      -
                    </button>
                    <span className="font-bold text-sm text-[#2c241c] px-1.5 font-mono">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.menuId, 1)}
                      className="w-7 h-7 rounded-lg bg-[#9c6b4a] text-white font-bold grid place-items-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="mt-3">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات خاصة على الطلب (بدون سكر، زيادة صوص...)"
                className="input-modern text-xs"
              />
            </div>

            {/* Total Summary */}
            <div className="mt-4 pt-3 border-t border-[#e2d3c2] space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#7a6a5c]">الإجمالي النهائي:</span>
                <span className="text-xl font-bold text-emerald-400 font-mono">{total} ج.م</span>
              </div>

              {/* Action Buttons: Cashier vs Gateway */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <button
                  onClick={handleOrderPayCashier}
                  disabled={submittingOrder}
                  className="btn-secondary py-3 text-xs font-bold justify-center"
                >
                  💵 الدفع عند الكاشير كاش
                </button>

                <button
                  onClick={handleOrderPayGateway}
                  disabled={submittingOrder}
                  className="btn-primary py-3 text-xs font-bold justify-center"
                >
                  ⚡ دفع فوري (بوابة كاشير)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="card-luxury w-full max-w-sm bg-white border-[#e2d3c2] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2d3c2] pb-3">
              <h3 className="font-bold text-[#2c241c] text-base flex items-center gap-2">
                <span>🔔</span> نداء إلى طاقم العمل (طاولة {tableNo})
              </h3>
              <button onClick={() => setShowCallModal(false)} className="text-[#7a6a5c] text-lg">
                ✕
              </button>
            </div>

            <p className="text-xs text-[#7a6a5c]">
              اختر نوع المساعدة وسيصل تنبيه صوتي فوري لشاشة المدير والكاشير:
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                disabled={callingStaff}
                onClick={() => handleCallStaff("bill", "طلب الحساب")}
                className="p-3.5 rounded-xl bg-[#fffcf8] border border-[#e2d3c2] hover:border-emerald-500 text-center transition-all group"
              >
                <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">💵</div>
                <div className="text-xs font-bold text-[#2c241c]">طلب الحساب</div>
              </button>

              <button
                disabled={callingStaff}
                onClick={() => handleCallStaff("help", "طلب النادل")}
                className="p-3.5 rounded-xl bg-[#fffcf8] border border-[#e2d3c2] hover:border-amber-500 text-center transition-all group"
              >
                <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🙋‍♂️</div>
                <div className="text-xs font-bold text-[#2c241c]">طلب النادل</div>
              </button>

              <button
                disabled={callingStaff}
                onClick={() => handleCallStaff("water", "طلب مياه")}
                className="p-3.5 rounded-xl bg-[#fffcf8] border border-[#e2d3c2] hover:border-sky-500 text-center transition-all group"
              >
                <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">💧</div>
                <div className="text-xs font-bold text-[#2c241c]">طلب مياه</div>
              </button>

              <button
                disabled={callingStaff}
                onClick={() => handleCallStaff("napkins", "طلب مناديل")}
                className="p-3.5 rounded-xl bg-[#fffcf8] border border-[#e2d3c2] hover:border-purple-500 text-center transition-all group"
              >
                <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🧻</div>
                <div className="text-xs font-bold text-[#2c241c]">طلب مناديل</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Gateway Modal */}
      {createdOrder && (
        <PaymentGatewayModal
          isOpen={showGateway}
          onClose={() => {
            setShowGateway(false);
            setCart([]);
            setShowCart(false);
            navigate(`/track/${createdOrder.publicToken}`);
          }}
          orderNumber={createdOrder.orderNumber}
          orderId={createdOrder._id}
          publicToken={createdOrder.publicToken}
          totalAmount={createdOrder.totalPrice}
          tableId={tableNo}
          onSuccess={() => {
            setCart([]);
            setShowCart(false);
            navigate(`/track/${createdOrder.publicToken}`);
          }}
        />
      )}
    </div>
  );
};

export default CustomerMenu;

