import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getActiveOrders, updateOrderStatus } from "../api/orders";
import type { Order } from "../types";

const OrdersPage = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);

  const load = () => getActiveOrders().then(setOrders);
  useEffect(() => { load(); }, []);

  return (
    <div style={{ color: "#fff" }}>
      <h1>{t("activeOrders")}</h1>
      {orders.map((o) => (
        <div key={o._id} style={{ background: "#1a1a2e", padding: 16, borderRadius: 12, marginBottom: 12 }}>
          <strong>{o.orderNumber}</strong> | Table: {o.tableId} | {o.totalPrice} EGP
          <div style={{ marginTop: 8 }}>
            Status: {o.status}
            <button
              onClick={() => updateOrderStatus(o._id, "preparing").then(load)}
              style={{ marginLeft: 10, padding: "4px 10px", cursor: "pointer" }}
            >
              Preparing
            </button>
            <button
              onClick={() => updateOrderStatus(o._id, "archived").then(load)}
              style={{ marginLeft: 6, padding: "4px 10px", cursor: "pointer" }}
            >
              Done
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrdersPage;
