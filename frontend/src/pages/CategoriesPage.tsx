import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCategories, createCategory, deleteCategory } from "../api/menu";
import type { Category } from "../types";

const CategoriesPage = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");

  const load = () => getCategories().then(setCategories);
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!name) return;
    await createCategory({ name, nameAr, nameEn: name, sort: 0 });
    setName("");
    setNameAr("");
    load();
  };

  return (
    <div style={{ color: "#fff" }}>
      <h1>{t("categories")}</h1>
      <div style={{ marginBottom: 20, display: "flex", gap: 8 }}>
        <input placeholder="Name EN" value={name} onChange={(e) => setName(e.target.value)} style={input} />
        <input placeholder="Name AR" value={nameAr} onChange={(e) => setNameAr(e.target.value)} style={input} />
        <button onClick={handleAdd} style={btn}>{t("add")}</button>
      </div>
      {categories.map((c) => (
        <div key={c._id} style={{ background: "#1a1a2e", padding: 12, borderRadius: 8, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
          <span>{c.nameAr || c.name} / {c.nameEn || c.name}</span>
          <button onClick={() => deleteCategory(c._id).then(load)} style={{ ...btn, background: "#c0392b" }}>{t("delete")}</button>
        </div>
      ))}
    </div>
  );
};

const input: React.CSSProperties = { padding: 10, borderRadius: 8, border: "none" };
const btn: React.CSSProperties = { padding: "10px 16px", borderRadius: 8, border: "none", background: "#9c6b4a", color: "#fff", cursor: "pointer" };

export default CategoriesPage;
