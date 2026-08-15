import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getActiveOrders, getAllOrders } from "../api/orders";
import { getTables } from "../api/tables";
import type { Order, Table } from "../types";
import { io } from "socket.io-client";
import Toast from "../components/Toast";
import Spinner from "../components/Spinner";

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const load = async () => {
    try {
      const [active, all, tb] = await Promise.all([
        getActiveOrders(),
        getAllOrders(),
        getTables(),
      ]);
      setActiveOrders(active);
      setAllOrders(all);
      setTables(tb);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");

    const socket = io(
      import.meta.env.VITE_API_BASE?.replace("/api", "") || "http://localhost:3001"
    );
    socket.emit("join_manager");

    socket.on("notification", (data: any) => {
      setToast({ msg: data.message, type: "info" });
      try { audioRef.current?.play(); } catch {}
      load();
    });

    socket.on("order_created", () => load());
    socket.on("order_updated", () => load());

    const interval = setInterval(load, 6000);
    return () => {
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  // طلبات النهاردة
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOrders = allOrders.filter((o) => {
    const d = new Date(o.createdAt);
    return d >= today && o.status !== "cancelled";
  });

  const todayRevenue = todayOrders
    .filter((o) => o.paymentStatus === "paid" || o.status === "archived" || o.status === "served")
    .reduce((s, o) => s + (o.totalPrice || 0), 0);

  const activeRevenue = activeOrders.reduce((s, o) => s + (o.totalPrice || 0), 0);

  // أكتر أصناف
  const itemCount: Record<string, number> = {};
  todayOrders.forEach((o) => {
    o.items?.forEach((i) => {
      itemCount[i.name] = (itemCount[i.name] || 0) + i.qty;
    });
  });
  const topItems = Object.entries(itemCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const getTableOrders = (tableNo: string) =>
    activeOrders.filter(
      (o) => o.tableId === String(tableNo) && !["archived", "cancelled", "served"].includes(o.status)
    );

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 100 }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div style={{ color: "#fff" }}>
      {toast && (
        <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}

      <h1 style={{ marginBottom: 8 }}>⚡ GODZ</h1>
      <p style={{ color: "#666", marginBottom: 28 }}>لوحة تحكم المدير</p>

      {/* Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>طلبات اليوم</div>
          <div style={styles.statValue}>{todayOrders.length}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>إيرادات اليوم</div>
          <div style={{ ...styles.statValue, color: "#10b981" }}>
            {todayRevenue.toLocaleString()} ج.م
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>طلبات نشطة الآن</div>
          <div style={{ ...styles.statValue, color: "#e94560" }}>{activeOrders.length}</div>
          <div style={{ color: "#888", fontSize: 13 }}>{activeRevenue} ج.م مفتوحة</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>الأكثر طلباً اليوم</div>
          {topItems.length === 0 ? (
            <div style={{ color: "#555", marginTop: 8 }}>لا يوجد بعد</div>
          ) : (
            topItems.map(([name, qty]) => (
              <div key={name} style={styles.topRow}>
                <span>{name}</span>
                <span style={{ color: "#e94560", fontWeight: 700 }}>{qty}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Live Tables */}
      <h2 style={{ margin: "36px 0 16px" }}>الطاولات الآن</h2>
      <div style={styles.tablesGrid}>
        {tables.map((tb) => {
          const tOrders = getTableOrders(tb.tableNo);
          const isOccupied = tOrders.length > 0;
          const total = tOrders.reduce((s, o) => s + o.totalPrice, 0);

          return (
            <div
              key={tb._id}
              onClick={() => navigate(`/table-view/${tb.tableNo}`)}
              style={{
                ...styles.tableCard,
                borderColor: isOccupied ? "#e94560" : "#2a2a3e",
                background: isOccupied ? "#1f1018" : "#1a1a2e",
              }}
            >
              <div style={{ fontSize: 26 }}>{isOccupied ? "🔴" : "🟢"}</div>
              <div style={{ fontWeight: 700, fontSize: 17, marginTop: 6 }}>
                ترابيزة {tb.tableNo}
              </div>
              <div style={{ color: "#888", fontSize: 13, marginTop: 4 }}>
                {isOccupied ? `${tOrders.length} طلب` : "فاضية"}
              </div>
              {isOccupied && (
                <div style={{ marginTop: 8, color: "#e94560", fontWeight: 700 }}>
                  {total} ج.م
                </div>
              )}
            </div>
          );
        })}
        {tables.length === 0 && (
          <p style={{ color: "#555" }}>أضف طاولات من صفحة الطاولات</p>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 14,
  },
  statCard: {
    background: "#1a1a2e",
    borderRadius: 16,
    padding: 18,
    border: "1px solid #2a2a3e",
  },
  statLabel: { color: "#777", fontSize: 13, marginBottom: 6 },
  statValue: { fontSize: 28, fontWeight: 800 },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 6,
    fontSize: 14,
  },
  tablesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
    gap: 12,
  },
  tableCard: {
    borderRadius: 16,
    padding: 18,
    textAlign: "center",
    cursor: "pointer",
    border: "2px solid #2a2a3e",
  },
};

export default Dashboard;
