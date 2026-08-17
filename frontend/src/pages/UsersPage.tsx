import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getUsers, createUser, updateUser, deleteUser, toggleUserStatus } from "../api/users";
import type { User, Role, ShiftType } from "../types";
import Spinner from "../components/Spinner";
import Toast from "../components/Toast";

const roleLabels: Record<Role, { ar: string; en: string; color: string }> = {
  admin: { ar: "مدير النظام", en: "Admin", color: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
  front: { ar: "كاشير / صالة", en: "Cashier", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  kitchen: { ar: "شيف المطبخ", en: "Kitchen Chef", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  bar: { ar: "باريستا البار", en: "Barista", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
};

const shiftLabels: Record<ShiftType, { ar: string; hours: string; color: string; icon: string }> = {
  morning: { ar: "الشيفت الصباحي", hours: "08:00 ص - 04:00 م", color: "bg-amber-500/15 text-amber-300 border-amber-500/30", icon: "☀️" },
  evening: { ar: "الشيفت المسائي", hours: "04:00 م - 12:00 ص", color: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30", icon: "🌆" },
  night: { ar: "الشيفت الليلي", hours: "12:00 ص - 08:00 ص", color: "bg-purple-500/15 text-purple-300 border-purple-500/30", icon: "🌙" },
  full_day: { ar: "يوم كامل / مرن", hours: "دوام كامل", color: "bg-slate-500/15 text-slate-300 border-slate-500/30", icon: "⏰" },
};

const UsersPage = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  
  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"list" | "shifts">("list");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    role: "front" as Role,
    shift: "morning" as ShiftType,
    phone: "",
    salary: 0,
    jobTitle: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
    } catch {
      setToast("تعذر تحميل قائمة الموظفين");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      username: "",
      password: "",
      role: "front",
      shift: "morning",
      phone: "",
      salary: 0,
      jobTitle: "",
      notes: "",
    });
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      password: "",
      role: user.role,
      shift: user.shift || "morning",
      phone: user.phone || "",
      salary: user.salary || 0,
      jobTitle: user.jobTitle || "",
      notes: user.notes || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username) {
      setToast("يرجى إدخال الاسم واسم المستخدم");
      return;
    }
    if (!editingUser && !formData.password) {
      setToast("يرجى إدخال كلمة المرور للموظف الجديد");
      return;
    }

    try {
      setSubmitting(true);
      if (editingUser) {
        await updateUser(editingUser._id, formData);
        setToast("تم تحديث بيانات الموظف بنجاح");
      } else {
        await createUser(formData);
        setToast("تمت إضافة الموظف الجديد بنجاح");
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setToast(err.response?.data?.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الموظف "${name}"؟`)) return;
    try {
      await deleteUser(id);
      setToast("تم حذف الموظف");
      loadData();
    } catch (err: any) {
      setToast(err.response?.data?.message || "تعذر الحذف");
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleUserStatus(id);
      loadData();
    } catch {
      setToast("تعذر تغيير حالة الموظف");
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.phone && u.phone.includes(search));
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesShift = shiftFilter === "all" || (u.shift || "morning") === shiftFilter;
    return matchesSearch && matchesRole && matchesShift;
  });

  // KPI Calculations
  const totalEmployees = users.length;
  const activeCount = users.filter((u) => u.isActive).length;
  const morningCount = users.filter((u) => (u.shift || "morning") === "morning" && u.isActive).length;
  const eveningCount = users.filter((u) => u.shift === "evening" && u.isActive).length;
  const nightCount = users.filter((u) => u.shift === "night" && u.isActive).length;

  if (loading) return <Spinner />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">👥</span>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-wide">إدارة الموظفين والورديات</h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            إضافة وتعديل بيانات طاقم العمل، توزيع الشيفتات، والتحكم في الصلاحيات.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#151b2e] border border-[#242c47] p-1 rounded-xl flex gap-1">
            <button
              onClick={() => setActiveTab("list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "list" ? "bg-[#e94560] text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              📋 قائمة الموظفين
            </button>
            <button
              onClick={() => setActiveTab("shifts")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "shifts" ? "bg-[#e94560] text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              ⏰ جدول الشيفتات
            </button>
          </div>

          <button onClick={openAddModal} className="btn-primary">
            <span>+</span> إضافة موظف جديد
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <div className="card-luxury p-4 flex flex-col justify-between border-l-4 border-l-[#6366f1]">
          <span className="text-xs text-slate-400">إجمالي الموظفين</span>
          <div className="text-2xl font-bold text-white mt-2">{totalEmployees}</div>
          <span className="text-[11px] text-emerald-400 mt-1">● {activeCount} حساب نشط</span>
        </div>

        <div className="card-luxury p-4 flex flex-col justify-between border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>الشيفت الصباحي</span>
            <span>☀️</span>
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2">{morningCount}</div>
          <span className="text-[11px] text-slate-400 mt-1">08:00 ص - 04:00 م</span>
        </div>

        <div className="card-luxury p-4 flex flex-col justify-between border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>الشيفت المسائي</span>
            <span>🌆</span>
          </div>
          <div className="text-2xl font-bold text-indigo-300 mt-2">{eveningCount}</div>
          <span className="text-[11px] text-slate-400 mt-1">04:00 م - 12:00 ص</span>
        </div>

        <div className="card-luxury p-4 flex flex-col justify-between border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>الشيفت الليلي</span>
            <span>🌙</span>
          </div>
          <div className="text-2xl font-bold text-purple-300 mt-2">{nightCount}</div>
          <span className="text-[11px] text-slate-400 mt-1">12:00 ص - 08:00 ص</span>
        </div>

        <div className="card-luxury p-4 flex flex-col justify-between border-l-4 border-l-emerald-500">
          <span className="text-xs text-slate-400">طاقم العمل المباشر</span>
          <div className="text-2xl font-bold text-emerald-400 mt-2">
            {users.filter((u) => u.role !== "admin").length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">كاشير ومطبخ وبار</span>
        </div>
      </div>

      {activeTab === "list" ? (
        <>
          {/* Filters Bar */}
          <div className="card-luxury p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="w-full md:w-80">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم، اسم المستخدم، أو الهاتف..."
                className="input-modern"
              />
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="input-modern w-auto text-sm"
              >
                <option value="all">كل الأدوار</option>
                <option value="admin">مدير (Admin)</option>
                <option value="front">كاشير (Cashier)</option>
                <option value="kitchen">مطبخ (Kitchen)</option>
                <option value="bar">بار (Barista)</option>
              </select>

              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="input-modern w-auto text-sm"
              >
                <option value="all">كل الورديات</option>
                <option value="morning">الصباحي (Morning)</option>
                <option value="evening">المسائي (Evening)</option>
                <option value="night">الليلي (Night)</option>
                <option value="full_day">يوم كامل (Full Day)</option>
              </select>
            </div>
          </div>

          {/* Employees Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.length === 0 ? (
              <div className="col-span-full card-luxury py-16 text-center text-slate-400">
                لا يوجد موظفين يطابقون خيارات البحث.
              </div>
            ) : (
              filteredUsers.map((u) => {
                const roleInfo = roleLabels[u.role] || roleLabels.front;
                const shiftInfo = shiftLabels[u.shift || "morning"] || shiftLabels.morning;

                return (
                  <div
                    key={u._id}
                    className={`card-luxury p-5 flex flex-col justify-between relative overflow-hidden transition-all hover:border-slate-500 ${
                      !u.isActive ? "opacity-60 bg-slate-900/60" : ""
                    }`}
                  >
                    <div>
                      {/* Top Info */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1e263d] to-[#0f1422] border border-[#242c47] grid place-items-center text-xl font-bold text-white shadow-inner">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white leading-tight">{u.name}</h3>
                            <p className="text-xs text-slate-400 mt-0.5">@{u.username}</p>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleInfo.color}`}
                        >
                          {roleInfo.ar}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="space-y-2 mt-4 text-xs">
                        {/* Shift Badge */}
                        <div className="flex items-center justify-between p-2 rounded-xl bg-[#0f1422] border border-[#242c47]">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <span>{shiftInfo.icon}</span> الوردية:
                          </span>
                          <span className={`font-semibold px-2 py-0.5 rounded-lg border text-[11px] ${shiftInfo.color}`}>
                            {shiftInfo.ar}
                          </span>
                        </div>

                        {u.phone && (
                          <div className="flex items-center justify-between text-slate-300 px-1">
                            <span className="text-slate-400">الهاتف:</span>
                            <span className="font-mono">{u.phone}</span>
                          </div>
                        )}

                        {u.salary ? (
                          <div className="flex items-center justify-between text-slate-300 px-1">
                            <span className="text-slate-400">الراتب:</span>
                            <span className="font-bold text-emerald-400">{u.salary} ج.م</span>
                          </div>
                        ) : null}

                        {u.jobTitle && (
                          <div className="flex items-center justify-between text-slate-300 px-1">
                            <span className="text-slate-400">المسمى:</span>
                            <span>{u.jobTitle}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 pt-4 border-t border-[#242c47] flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleToggleStatus(u._id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          u.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                            : "bg-slate-700/30 text-slate-400 border-slate-600 hover:bg-slate-700/50"
                        }`}
                      >
                        {u.isActive ? "نشط" : "معطل"}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1e263d] text-slate-200 hover:bg-[#28324f] border border-[#242c47]"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDelete(u._id, u.name)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* Shifts Schedule View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(["morning", "evening", "night"] as ShiftType[]).map((shiftKey) => {
            const shiftInfo = shiftLabels[shiftKey];
            const shiftStaff = users.filter((u) => (u.shift || "morning") === shiftKey);

            return (
              <div key={shiftKey} className="card-luxury p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#242c47] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{shiftInfo.icon}</span>
                    <div>
                      <h3 className="font-bold text-white text-lg">{shiftInfo.ar}</h3>
                      <p className="text-xs text-slate-400">{shiftInfo.hours}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#1e263d] text-xs font-bold text-white border border-[#242c47]">
                    {shiftStaff.length} موظف
                  </span>
                </div>

                <div className="space-y-2.5">
                  {shiftStaff.length === 0 ? (
                    <p className="text-center text-xs text-slate-500 py-6">لا يوجد موظفين في هذا الشيفت</p>
                  ) : (
                    shiftStaff.map((staff) => {
                      const roleInfo = roleLabels[staff.role] || roleLabels.front;
                      return (
                        <div
                          key={staff._id}
                          className="flex items-center justify-between p-3 rounded-xl bg-[#0f1422] border border-[#242c47]"
                        >
                          <div>
                            <div className="font-bold text-white text-sm">{staff.name}</div>
                            <div className="text-[11px] text-slate-400">{staff.phone || `@${staff.username}`}</div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleInfo.color}`}>
                            {roleInfo.ar}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-luxury w-full max-w-lg p-6 bg-[#151b2e] border-[#374167] shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#242c47] pb-4 mb-4">
              <h2 className="text-xl font-bold text-white">
                {editingUser ? "✏️ تعديل بيانات الموظف" : "➕ إضافة موظف جديد"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: أحمد محمود"
                  className="input-modern"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم المستخدم (Username) *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="ahmed1"
                    className="input-modern disabled:opacity-60 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {editingUser ? "كلمة المرور (اتركها فارغة للتخطي)" : "كلمة المرور *"}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? "********" : "6 أحرف على الأقل"}
                    className="input-modern"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">الدور / الصلاحية *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                    className="input-modern"
                  >
                    <option value="front">كاشير / صالة (Front / Cashier)</option>
                    <option value="kitchen">شيف مطبخ (Kitchen)</option>
                    <option value="bar">باريستا بار (Bar)</option>
                    <option value="admin">مدير نظام (Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">الوردية (الشيفت) *</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value as ShiftType })}
                    className="input-modern"
                  >
                    <option value="morning">☀️ صباحي (08:00 ص - 04:00 م)</option>
                    <option value="evening">🌆 مسائي (04:00 م - 12:00 ص)</option>
                    <option value="night">🌙 ليلي (12:00 ص - 08:00 ص)</option>
                    <option value="full_day">⏰ يوم كامل / مرن</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="01012345678"
                    className="input-modern font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">الراتب الشهري (ج.م)</label>
                  <input
                    type="number"
                    value={formData.salary || ""}
                    onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                    placeholder="4500"
                    className="input-modern"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">المسمى الوظيفي / ملاحظات</label>
                <input
                  type="text"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  placeholder="مثال: كاشير رئيسي - الفرع الأول"
                  className="input-modern"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#242c47]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? "جاري الحفظ..." : editingUser ? "حفظ التعديلات" : "إضافة الموظف"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
