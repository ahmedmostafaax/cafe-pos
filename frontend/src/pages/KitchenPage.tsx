import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getActiveOrders, updateOrderStatus } from "../api/orders";
import type { Order } from "../types";

const KitchenPage = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);

  const load = () => getActiveOrders().then(setOrders);
  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const kitchenOrders = orders.filter((o) =>
    o.items.some((i) => i.station === "kitchen")
  );

  return (
    <div style={{ color: "#fff" }}>
      <h1>{t("kitchen")}</h1>
      {kitchenOrders.map((o) => (
        <div key={o._id} style={{ background: "#1a1a2e", padding: 16, borderRadius: 12, marginBottom: 12 }}>
          <strong>{o.orderNumber}</strong> - Table {o.tableId}
          <ul>
            {o.items
              .filter((i) => i.station === "kitchen")
              .map((i, idx) => (
                <li key={idx}>{i.name} x{i.qty}</li>
              ))}
          </ul>
          <button onClick={() => updateOrderStatus(o._id, "ready").then(load)}>Ready</button>
        </div>
      ))}
    </div>
  );
};

export default KitchenPage;
