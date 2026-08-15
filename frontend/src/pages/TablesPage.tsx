import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getTables, createTable, deleteTable } from "../api/tables";
import type { Table } from "../types";

const TablesPage = () => {
  const { t } = useTranslation();
  const [tables, setTables] = useState<Table[]>([]);
  const [tableNo, setTableNo] = useState("");

  const load = () => getTables().then(setTables);
  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    if (!tableNo) return;
    await createTable({ tableNo, seats: 4 });
    setTableNo("");
    load();
  };

  const getCustomerLink = (no: string) => {
    return `${window.location.origin}/table/${no}`;
  };

  const copyLink = (no: string) => {
    const link = getCustomerLink(no);
    navigator.clipboard.writeText(link);
    alert("تم نسخ لينك الزبون:\n" + link);
  };

  return (
    <div style={{ color: "#fff" }}>
      <h1>{t("tables")}</h1>
      <p style={{ color: "#aaa", marginBottom: 20 }}>
        اضغط "نسخ لينك الزبون" عشان تاخد رابط الـ QR لكل ترابيزة
      </p>

      <div style={{ marginBottom: 20, display: "flex", gap: 8 }}>
        <input
          value={tableNo}
          onChange={(e) => setTableNo(e.target.value)}
          placeholder="رقم الترابيزة"
          style={{ padding: 10, borderRadius: 8, border: "none" }}
        />
        <button onClick={handleAdd} style={btn}>
          {t("add")}
        </button>
      </div>

      {tables.length === 0 && (
        <p style={{ color: "#aaa" }}>مفيش طاولات. أضف ترابيزة الأول.</p>
      )}

      {tables.map((tb) => (
        <div
          key={tb._id}
          style={{
            background: "#1a1a2e",
            padding: 16,
            borderRadius: 12,
            marginBottom: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <strong>ترابيزة {tb.tableNo}</strong>
            <div style={{ fontSize: 13, color: "#aaa" }}>
              {tb.seats} كراسي — {tb.status}
            </div>
            <div style={{ fontSize: 12, color: "#e94560", marginTop: 4 }}>
              {getCustomerLink(tb.tableNo)}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => copyLink(tb.tableNo)} style={btn}>
              نسخ لينك الزبون
            </button>
            <button
              onClick={() => deleteTable(tb._id).then(load)}
              style={{ ...btn, background: "#c0392b" }}
            >
              {t("delete")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

const btn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "#e94560",
  color: "#fff",
  cursor: "pointer",
  fontWeight: "bold",
};

export default TablesPage;
