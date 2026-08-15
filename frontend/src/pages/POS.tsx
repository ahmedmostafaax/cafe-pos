import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getMenu } from "../api/menu";
import { createOrder } from "../api/orders";
import type { MenuItem, OrderItem } from "../types";

const POS = () => {
  const { t, i18n } = useTranslation();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [tableId, setTableId] = useState("1");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMenu()
      .then(setMenu)
      .finally(() => setLoading(false));
  }, []);

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
          name: i18n.language === "ar" ? item.nameAr || item.name : item.nameEn || item.name,
          station: item.station,
          price: item.price,
          qty: 1,
          status: "pending",
        },
      ];
    });
  };

  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const submitOrder = async () => {
    if (!cart.length) return;
    try {
      await createOrder({
        tableId,
        items: cart,
        totalPrice: total,
        status: "active",
        guests: 1,
        dineIn: true,
      });
      setCart([]);
      alert(t("success"));
    } catch {
      alert(t("error"));
    }
  };

  if (loading) return <p style={{ color: "#fff" }}>{t("loading")}</p>;

  return (
    <div style={{ color: "#fff" }}>
      <h1>{t("pos")}</h1>
      <div style={{ marginBottom: 16 }}>
        <label>Table: </label>
        <input
          value={tableId}
          onChange={(e) => setTableId(e.target.value)}
          style={{ padding: 8, borderRadius: 6, border: "none" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {menu
            .filter((m) => m.available)
            .map((item) => (
              <div
                key={item._id}
                onClick={() => addToCart(item)}
                style={{
                  background: "#1a1a2e",
                  padding: 16,
                  borderRadius: 12,
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <div style={{ fontWeight: "bold" }}>
                  {i18n.language === "ar" ? item.nameAr || item.name : item.nameEn || item.name}
                </div>
                <div style={{ color: "#e94560", marginTop: 8 }}>{item.price} EGP</div>
              </div>
            ))}
        </div>

        <div style={{ background: "#1a1a2e", padding: 20, borderRadius: 12 }}>
          <h3>{t("newOrder")}</h3>
          {cart.map((item, idx) => (
            <div key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>
                {item.name} x{item.qty}
              </span>
              <span>{item.price * item.qty}</span>
            </div>
          ))}
          <hr style={{ borderColor: "#333" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", marginTop: 12 }}>
            <span>{t("total")}</span>
            <span>{total} EGP</span>
          </div>
          <button
            onClick={submitOrder}
            style={{
              width: "100%",
              marginTop: 16,
              padding: 12,
              background: "#e94560",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {t("newOrder")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default POS;
