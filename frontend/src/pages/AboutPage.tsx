import { useEffect, useState } from "react";
import api from "../api/axios";
import PublicHeader from "../components/PublicHeader";
import { Link } from "react-router-dom";

const AboutPage = () => {
  const [branches, setBranches] = useState<any[]>([]);
  const [name, setName] = useState("GODZ Café");

  useEffect(() => {
    api.get("/settings/public").then((r) => {
      setBranches(r.data.data.branches || []);
      setName(r.data.data.restaurantName || "GODZ Café");
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#f7f3ee] text-[#2c241c]">
      <PublicHeader title={name} subtitle="فروع ومواعيد" />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-[#9c6b4a] mb-6">فروعنا</h1>
        {branches.length === 0 ? (
          <div className="carolina-card p-6">
            <p className="font-bold">الفرع الرئيسي</p>
            <p className="text-sm text-[#7a6a5c] mt-1">9 ص — 12 م · تواصل معنا للعنوان</p>
          </div>
        ) : (
          branches.map((b, i) => (
            <div key={i} className="carolina-card p-5 mb-3">
              <div className="font-bold text-lg">{b.name}</div>
              <div className="text-sm text-[#7a6a5c] mt-1">{b.address}</div>
              <div className="text-sm mt-1">{b.hours}</div>
              <div className="text-sm mt-1">{b.phone}</div>
              {b.mapUrl && (
                <a href={b.mapUrl} target="_blank" rel="noreferrer" className="inline-block mt-3 text-[#9c6b4a] text-sm font-semibold">
                  فتح الخريطة ↗
                </a>
              )}
            </div>
          ))
        )}
        <Link to="/order" className="carolina-btn inline-flex mt-6">العودة للقائمة</Link>
      </div>
    </div>
  );
};
export default AboutPage;

