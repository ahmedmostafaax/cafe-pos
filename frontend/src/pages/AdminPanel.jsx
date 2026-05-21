import { useEffect, useState } from "react";
import { useApp } from "../hooks/useApp";
import Toggle from "../components/Toggle";
import { getAssetUrl } from "../components/LazyImage";
import OrderHistoryList from "../components/OrderHistoryList";
import DashboardPanel from "./DashboardPanel";
import SystemSettingsPanel from "./SystemSettingsPanel";
import CommissionReportPanel from "./CommissionReportPanel";
import socket from "../lib/socket";
import { API_BASE } from "../lib/api";
import { fmtMonthInput } from "../lib/format";
import { uploadMenuImage } from "../lib/uploads";
import {
  ROLE_LABELS,
  normalizeEmployeeCommissions,
} from "../lib/constants";
import {
  getNowTimestamp,
  sanitizeOptionGroups,
} from "../model/orderOptionUtils";
import { normalizeOrders } from "../model/orderDataModel";

const ORDER_HISTORY_FILTERS = [
  { key: "all", label: "全部订单" },
  { key: "current", label: "当前订单", params: { status: "active" } },
  { key: "preparing", label: "仅制作中", params: { statusExact: "preparing" } },
  { key: "unpaid", label: "待付款", params: { statusExact: "unpaid" } },
  { key: "archived", label: "已完成", params: { statusExact: "archived" } },
];

function OrderHistoryPanel() {
  const { openTables, users, user, showToast } = useApp();
  const [month, setMonth] = useState(() => fmtMonthInput());
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [orders, setOrdersLocal] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => { setPage(0); }, [month, filter, pageSize]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setError("");
      try {
        const params = new URLSearchParams({ month, limit: String(pageSize), offset: String(page * pageSize) });
        const activeFilter = ORDER_HISTORY_FILTERS.find((item) => item.key === filter);
        Object.entries(activeFilter?.params || {}).forEach(([key, value]) => params.set(key, value));
        const response = await fetch(`${API_BASE}/api/orders?${params.toString()}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "订单加载失败");
        setOrdersLocal(normalizeOrders(Array.isArray(data) ? data : [], { tables: openTables, users, user }));
      } catch (err) {
        if (err.name !== "AbortError") { setError(err.message || "订单加载失败"); setOrdersLocal([]); }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [filter, month, openTables, page, pageSize, reloadKey, user, users]);

  const hasNext = orders.length >= pageSize;

  return (
    <>
      <div className="ast">历史订单</div>
      <div className="orders-toolbar">
        <label className="orders-field">
          <span>月份</span>
          <input className="fi" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </label>
        <label className="orders-field">
          <span>状态</span>
          <select className="cs" value={filter} onChange={(event) => setFilter(event.target.value)}>
            {ORDER_HISTORY_FILTERS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </label>
        <label className="orders-field small">
          <span>每页</span>
          <select className="cs" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
            {[25, 50, 100, 200].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <button className="actb orders-refresh" onClick={() => { setPage(0); setReloadKey((key) => key + 1); }}>刷新</button>
      </div>
      <div className="orders-pagebar">
        <div>{month} · 第 {page + 1} 页 · 当前载入 {orders.length} 单</div>
        <div className="orders-page-actions">
          <button className="actb" disabled={page === 0 || loading} onClick={() => setPage((prev) => Math.max(0, prev - 1))}>上一页</button>
          <button className="actb" disabled={!hasNext || loading} onClick={() => setPage((prev) => prev + 1)}>下一页</button>
        </div>
      </div>
      {error && <div className="dash-empty slim">{error}</div>}
      {!error && loading && <div className="dash-empty slim">订单加载中...</div>}
      {!error && !loading && (
        <OrderHistoryList
          orders={orders}
          onOrderDeleted={(id) => setOrdersLocal((prev) => prev.filter((order) => order.id !== id))}
          onOrderUpdated={(nextOrder) => setOrdersLocal((prev) => prev.map((order) => order.id === nextOrder.id ? nextOrder : order))}
        />
      )}
      {!error && !loading && !orders.length && (
        <button className="actb orders-refresh" onClick={() => { showToast("已刷新订单明细"); setReloadKey((key) => key + 1); }}>重新加载</button>
      )}
    </>
  );
}

export default function AdminPanel() {
  const { menu, cats, users, orders, showToast, settings, saveSettings, confirmDanger } = useApp();
  const [nav, setNav] = useState("dashboard");
  const [editItem, setEditItem] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [newCat, setNewCat] = useState("");
  const [menuCategoryFilter, setMenuCategoryFilter] = useState("all");
  const emptyCommissionRates = { frontPercent: 0, kitchenPercent: 0, barPercent: 0 };
  const blankItem = () => ({ id: getNowTimestamp(), name: "", station: "kitchen", category: cats[0] || "", price: 0, desc: "", recipe: "", available: true, options: [], imageUrl: "", isSignature: false });
  const blankUser = () => ({ id: getNowTimestamp(), name: "", username: "", password: "", roles: [], commissionRates: { ...emptyCommissionRates } });
  const navItems = [{ k: "dashboard", l: "数据看板" }, { k: "orders", l: "订单明细" }, { k: "commissions", l: "提成报表" }, { k: "menu", l: "菜单维护" }, { k: "cats", l: "分类管理" }, { k: "users", l: "员工与权限" }, { k: "settings", l: "系统设置" }];

  useEffect(() => {
    if (menuCategoryFilter !== "all" && !cats.includes(menuCategoryFilter)) setMenuCategoryFilter("all");
  }, [cats, menuCategoryFilter]);

  const addCat = () => {
    const value = newCat.trim();
    if (!value) return;
    if (cats.includes(value)) { showToast(`分类「${value}」已存在`, "err"); return; }
    socket.emit("save_categories", [...cats, value]);
    setNewCat(""); showToast(`已添加分类「${value}」`);
  };
  const deleteCat = async (value) => {
    const ok = await confirmDanger(`确认删除分类「${value}」吗？此操作不可恢复。`);
    if (!ok) return;
    socket.emit("save_categories", cats.filter((item) => item !== value));
    setEditItem((prev) => prev?.category === value ? { ...prev, category: cats.find((item) => item !== value) || "" } : prev);
    showToast(`已删除分类「${value}」`);
  };
  const patchEditItem = (updater) => setEditItem((prev) => prev ? (typeof updater === "function" ? updater(prev) : updater) : prev);
  const updateOptionGroup = (groupIndex, updater) => patchEditItem((prev) => ({ ...prev, options: prev.options.map((group, index) => index === groupIndex ? { ...group, ...updater } : group) }));
  const updateChoice = (groupIndex, choiceIndex, updater) => patchEditItem((prev) => ({
    ...prev,
    options: prev.options.map((group, index) => index !== groupIndex ? group : {
      ...group,
      choices: group.choices.map((choice, innerIndex) => innerIndex === choiceIndex ? { ...choice, ...updater } : choice),
    }),
  }));
  const saveMenuItem = () => {
    const payload = { ...editItem, name: editItem.name.trim(), category: editItem.category.trim(), price: Number(editItem.price) || 0, options: sanitizeOptionGroups(editItem.options), imageUrl: editItem.imageUrl || "", isSignature: !!editItem.isSignature };
    if (!payload.name) { showToast("请填写菜品名称", "err"); return; }
    if (!payload.category) { showToast("请先创建或选择分类", "err"); return; }
    socket.emit("save_menu_item", payload);
    setEditItem(null); showToast("菜品已保存 ✓");
  };
  const getUserCommissionRates = (userId) => ({
    ...emptyCommissionRates,
    ...(normalizeEmployeeCommissions(settings.employeeCommissions)[String(userId)] || {}),
  });
  const editExistingUser = (item) => setEditUser({ ...item, roles: [...item.roles], commissionRates: getUserCommissionRates(item.id) });
  const patchEditUser = (updater) => setEditUser((prev) => prev ? (typeof updater === "function" ? updater(prev) : updater) : prev);
  const updateEditUserCommission = (field, value) => patchEditUser((prev) => ({
    ...prev,
    commissionRates: { ...(prev.commissionRates || emptyCommissionRates), [field]: value },
  }));
  const toggleEditUserRole = (role) => patchEditUser((prev) => {
    const hasRole = prev.roles.includes(role);
    return { ...prev, roles: hasRole ? prev.roles.filter((item) => item !== role) : [...prev.roles, role] };
  });
  const saveUser = () => {
    if (!editUser) return;
    const userId = String(editUser.id);
    const rawRates = editUser.commissionRates || emptyCommissionRates;
    const allowedRates = {
      frontPercent: editUser.roles.includes("front") ? rawRates.frontPercent : 0,
      kitchenPercent: editUser.roles.includes("kitchen") ? rawRates.kitchenPercent : 0,
      barPercent: editUser.roles.includes("bar") ? rawRates.barPercent : 0,
    };
    const nextCommissions = { ...normalizeEmployeeCommissions(settings.employeeCommissions) };
    const normalizedRates = normalizeEmployeeCommissions({ [userId]: allowedRates })[userId];
    if (normalizedRates) nextCommissions[userId] = normalizedRates;
    else delete nextCommissions[userId];
    const { commissionRates, ...userPayload } = editUser;
    socket.emit("save_user", userPayload);
    saveSettings({ ...settings, employeeCommissions: nextCommissions });
    setEditUser(null); showToast("用户已保存 ✓");
  };
  const deleteUser = async (item) => {
    const ok = await confirmDanger(`确认删除用户「${item.name || item.username}」吗？此操作不可恢复。`);
    if (!ok) return;
    socket.emit("delete_user", { id: item.id });
    const nextCommissions = { ...normalizeEmployeeCommissions(settings.employeeCommissions) };
    delete nextCommissions[String(item.id)];
    saveSettings({ ...settings, employeeCommissions: nextCommissions });
    showToast("已删除用户");
  };
  const sortedMenuItems = [...menu].sort((a, b) => (Number(!!b.isSignature) - Number(!!a.isSignature)) || (Number(a.sort || 0) - Number(b.sort || 0)));
  const filteredMenuItems = menuCategoryFilter === "all" ? sortedMenuItems : sortedMenuItems.filter((item) => item.category === menuCategoryFilter);

  return (
    <div className="al">
      <div className="asb">
        <div className="asb-hd">后台管理</div>
        {navItems.map((item) => (
          <div key={item.k} className={`ani${nav === item.k ? " a" : ""}`} onClick={() => setNav(item.k)}>{item.l}</div>
        ))}
      </div>
      <div className="am">
        {nav === "dashboard" && <DashboardPanel refreshKey={orders.length} />}
        {nav === "menu" && (
          <>
            <div className="admin-panel-head">
              <div className="ast">菜单 · 配方管理</div>
              <label className="orders-field menu-category-filter">
                <span>前台分类</span>
                <select className="cs" value={menuCategoryFilter} onChange={(event) => setMenuCategoryFilter(event.target.value)}>
                  <option value="all">全部分类</option>
                  {cats.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </label>
            </div>
            <button className="addb" onClick={() => setEditItem(blankItem())}>+ 新增菜品</button>
            <table className="dtb">
              <thead><tr><th style={{ width: 56 }}>图</th><th>菜品名称</th><th>前台分类</th><th>制作站</th><th>价格</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>
                {!filteredMenuItems.length && (
                  <tr><td colSpan={7} className="empty">该分类暂无菜品</td></tr>
                )}
                {filteredMenuItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.imageUrl
                        ? <img src={getAssetUrl(item.imageUrl)} alt="" className="menu-thumb" />
                        : <div className="menu-thumb placeholder">—</div>}
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      <div>{item.isSignature ? "★ " : ""}{item.name}</div>
                      {item.options?.length > 0 && <div className="menu-sku-meta">{item.options.length} 个选项组</div>}
                    </td>
                    <td><span className="badge bg">{item.category || "—"}</span></td>
                    <td><span className={`badge ${item.station === "kitchen" ? "bk" : "bb"}`}>{item.station === "kitchen" ? "后厨" : "吧台"}</span></td>
                    <td><span style={{ color: "var(--acc)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>¥{item.price}</span></td>
                    <td><span style={{ fontSize: "12px", color: item.available ? "var(--green)" : "var(--red)", fontWeight: 600 }}>{item.available ? "供应中" : "已沽清"}</span></td>
                    <td>
                      <button className="actb" onClick={() => setEditItem({ ...item, options: item.options?.map((g) => ({ ...g, choices: g.choices?.map((c) => ({ ...c })) || [] })) || [] })}>编辑</button>
                      <button className="actb del" onClick={async () => {
                        const ok = await confirmDanger(`确认删除菜品「${item.name}」吗？此操作不可恢复。`);
                        if (!ok) return;
                        socket.emit("delete_menu_item", { id: item.id });
                        showToast("已删除菜品");
                      }}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {nav === "cats" && (
          <>
            <div className="ast">分类管理</div>
            <div style={{ fontSize: "12px", color: "var(--td)", marginBottom: "14px", lineHeight: "1.8" }}>
              分类显示为前台菜单的分类栏，便于快速检索。制作站和 SKU 规格在菜品中单独配置。
            </div>
            <div className="cat-list">
              {!cats.length && <div className="empty" style={{ padding: "20px" }}>暂无分类</div>}
              {cats.map((cat) => (
                <div key={cat} className="cat-item">
                  <div className="cat-name">{cat}</div>
                  <div className="cat-count">{menu.filter((item) => item.category === cat).length} 个菜品</div>
                  <button className="actb del" onClick={() => deleteCat(cat)}>删除</button>
                </div>
              ))}
            </div>
            <div className="cat-add">
              <input className="cat-add-in" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="输入新分类名称，如「披萨」" onKeyDown={(e) => e.key === "Enter" && addCat()} />
              <button className="cat-add-btn" onClick={addCat}>+ 添加</button>
            </div>
          </>
        )}
        {nav === "users" && (
          <>
            <div className="ast">用户 · 权限管理</div>
            <button className="addb" onClick={() => setEditUser(blankUser())}>+ 新增用户</button>
            <table className="dtb">
              <thead><tr><th>姓名</th><th>账号</th><th>权限</th><th>操作</th></tr></thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td style={{ fontSize: "13px" }}>{item.username}</td>
                    <td>
                      {item.roles.map((role) => (
                        <span key={role} className={`badge ${role === "kitchen" ? "bk" : role === "bar" ? "bb" : role === "front" ? "bf" : "ba"}`}>{role}</span>
                      ))}
                    </td>
                    <td>
                      <button className="actb" onClick={() => editExistingUser(item)}>编辑</button>
                      <button className="actb del" onClick={() => deleteUser(item)}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {nav === "orders" && (
          <OrderHistoryPanel />
        )}
        {nav === "commissions" && <CommissionReportPanel mode="admin" />}
        {nav === "settings" && <SystemSettingsPanel />}
      </div>

      {/* 菜品编辑弹窗 */}
      {editItem && (
        <div className="mo">
          <div className="mb">
            <div className="mh">
              <div className="mht">{editItem.name ? "编辑菜品" : "新增菜品"}</div>
              <button className="mcl" onClick={() => setEditItem(null)}>✕</button>
            </div>
            <div className="mbody">
              <div className="form-grid" style={{ gap: "10px" }}>
                <div className="fg2 fg-full"><label className="fl" style={{ marginBottom: 5 }}>菜品名称</label><input className="fi" value={editItem.name} onChange={(e) => patchEditItem({ ...editItem, name: e.target.value })} placeholder="输入菜品名称" /></div>
                <div className="fg2"><label className="fl" style={{ marginBottom: 5 }}>前台分类</label><select className="cs" value={editItem.category} onChange={(e) => patchEditItem({ ...editItem, category: e.target.value })}>{cats.map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                <div className="fg2"><label className="fl" style={{ marginBottom: 5 }}>制作站</label><select className="cs" value={editItem.station} onChange={(e) => patchEditItem({ ...editItem, station: e.target.value })}><option value="kitchen">后厨</option><option value="bar">吧台</option></select></div>
                <div className="fg2"><label className="fl" style={{ marginBottom: 5 }}>价格（元）</label><input className="fi" type="number" value={editItem.price} onChange={(e) => patchEditItem({ ...editItem, price: parseFloat(e.target.value) || 0 })} /></div>
                <div className="fg2"><label className="fl" style={{ marginBottom: 5 }}>简介</label><input className="fi" value={editItem.desc} onChange={(e) => patchEditItem({ ...editItem, desc: e.target.value })} placeholder="简短描述" /></div>
                <div className="fg2 fg-full">
                  <label className="fl" style={{ marginBottom: 5 }}>菜品图片</label>
                  <div className="menu-image-editor">
                    {editItem.imageUrl && (
                      <div className="menu-image-preview"><img src={getAssetUrl(editItem.imageUrl)} alt="菜品" /></div>
                    )}
                    <div className="menu-image-actions">
                      <label className="actb">
                        {editItem.imageUrl ? "更换图片" : "上传图片"}
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                          const file = e.target.files?.[0]; e.target.value = "";
                          if (!file) return;
                          try {
                            const url = await uploadMenuImage(file);
                            patchEditItem((prev) => ({ ...prev, imageUrl: url }));
                            showToast("图片已上传");
                          } catch (err) { showToast(err.message || "上传失败", "err"); }
                        }} />
                      </label>
                      {editItem.imageUrl && (
                        <button className="actb del" onClick={() => patchEditItem((prev) => ({ ...prev, imageUrl: "" }))}>移除图片</button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="fg2"><label className="fl" style={{ marginBottom: 5 }}>招牌菜</label>
                  <div className="tglw"><Toggle on={!!editItem.isSignature} onChange={(value) => patchEditItem((prev) => ({ ...prev, isSignature: value }))} /><span className="tgl-label">{editItem.isSignature ? "★ 招牌（置顶展示）" : "普通菜品"}</span></div>
                </div>
                <div className="fg2 fg-full"><label className="fl" style={{ marginBottom: 5 }}>配方 / 制作说明</label><textarea className="fta" value={editItem.recipe} onChange={(e) => patchEditItem({ ...editItem, recipe: e.target.value })} rows={4} /></div>
                <div className="fg2 fg-full">
                  <div className="sku-admin">
                    <div className="sku-admin-head">
                      <div><div className="sku-admin-title">SKU 选项组</div><div className="sku-admin-sub">支持单选 / 多选、必选控制，以及每个 choice 的加价设置</div></div>
                      <button className="actb" onClick={() => patchEditItem((prev) => ({ ...prev, options: [...prev.options, { label: "", type: "single", required: true, choices: [{ name: "", priceDelta: 0 }] }] }))}>+ 新增选项组</button>
                    </div>
                    {!editItem.options?.length && <div className="sku-admin-empty">暂无规格组。可用于杯型、温度、加料、口味等配置。</div>}
                    {editItem.options?.map((group, groupIndex) => (
                      <div key={`group-${groupIndex}`} className="sku-editor-card">
                        <div className="sku-editor-top">
                          <div className="sku-editor-index">组选项 {groupIndex + 1}</div>
                          <button className="actb del" onClick={async () => {
                            const ok = await confirmDanger(`确认删除选项组「${group.label || `组 ${groupIndex + 1}`}」吗？`);
                            if (!ok) return;
                            patchEditItem((prev) => ({ ...prev, options: prev.options.filter((_, index) => index !== groupIndex) }));
                          }}>删除选项组</button>
                        </div>
                        <div className="sku-editor-grid">
                          <div><label className="fl" style={{ marginBottom: 5 }}>组名</label><input className="fi" value={group.label} onChange={(e) => updateOptionGroup(groupIndex, { label: e.target.value })} placeholder="如：温度 / 杯型 / 加料" /></div>
                          <div><label className="fl" style={{ marginBottom: 5 }}>选择方式</label><select className="cs" value={group.type} onChange={(e) => updateOptionGroup(groupIndex, { type: e.target.value })}><option value="single">单选</option><option value="multi">多选</option></select></div>
                          <div className="sku-required"><label className="fl" style={{ marginBottom: 5 }}>是否必选</label><div className="tglw"><Toggle on={!!group.required} onChange={(value) => updateOptionGroup(groupIndex, { required: value })} /><span className="tgl-label">{group.required ? "必选" : "可选"}</span></div></div>
                        </div>
                        <div className="sku-choice-editor">
                          <div className="sku-choice-head"><span>Choice 条目</span><button className="actb" onClick={() => patchEditItem((prev) => ({ ...prev, options: prev.options.map((item, index) => index !== groupIndex ? item : { ...item, choices: [...item.choices, { name: "", priceDelta: 0 }] }) }))}>+ 新增 choice</button></div>
                          {group.choices.map((choice, choiceIndex) => (
                            <div key={`choice-${groupIndex}-${choiceIndex}`} className="sku-choice-row">
                              <input className="fi" value={choice.name} onChange={(e) => updateChoice(groupIndex, choiceIndex, { name: e.target.value })} placeholder="选项名称" />
                              <input className="fi" type="number" value={choice.priceDelta} onChange={(e) => updateChoice(groupIndex, choiceIndex, { priceDelta: parseFloat(e.target.value) || 0 })} placeholder="加价" />
                              <button className="actb del" onClick={async () => {
                                const ok = await confirmDanger(`确认删除选项「${choice.name || `choice ${choiceIndex + 1}`}」吗？`);
                                if (!ok) return;
                                patchEditItem((prev) => ({ ...prev, options: prev.options.map((item, index) => index !== groupIndex ? item : { ...item, choices: item.choices.filter((_, innerIndex) => innerIndex !== choiceIndex) }) }));
                              }}>删除</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="fg2 fg-full"><div className="tglw"><Toggle on={editItem.available} onChange={(value) => patchEditItem({ ...editItem, available: value })} /><span className="tgl-label">{editItem.available ? "供应中" : "已沽清"}</span></div></div>
              </div>
            </div>
            <div className="mfoot"><button className="bcn" onClick={() => setEditItem(null)}>取消</button><button className="bsv" onClick={saveMenuItem}>保存</button></div>
          </div>
        </div>
      )}

      {/* 用户编辑弹窗 */}
      {editUser && (
        <div className="mo">
          <div className="mb">
            <div className="mh">
              <div className="mht">{editUser.name ? "编辑用户" : "新增用户"}</div>
              <button className="mcl" onClick={() => setEditUser(null)}>✕</button>
            </div>
            <div className="mbody">
              <div className="form-grid" style={{ gap: "10px" }}>
                <div className="fg2"><label className="fl" style={{ marginBottom: 5 }}>姓名</label><input className="fi" value={editUser.name} onChange={(e) => patchEditUser({ ...editUser, name: e.target.value })} /></div>
                <div className="fg2"><label className="fl" style={{ marginBottom: 5 }}>账号</label><input className="fi" value={editUser.username} onChange={(e) => patchEditUser({ ...editUser, username: e.target.value })} /></div>
                <div className="fg2 fg-full"><label className="fl" style={{ marginBottom: 5 }}>密码</label><input className="fi" type="password" value={editUser.password} onChange={(e) => patchEditUser({ ...editUser, password: e.target.value })} placeholder="留空则不修改" /></div>
                <div className="fg2 fg-full">
                  <label className="fl" style={{ marginBottom: 8 }}>权限分配</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {["front", "kitchen", "bar", "admin"].map((role) => {
                      const hasRole = editUser.roles.includes(role);
                      return (
                        <button key={role} style={{ padding: "6px 14px", fontSize: "13px", background: hasRole ? "var(--acc)" : "var(--s2)", color: hasRole ? "#fff" : "var(--td)", border: `1.5px solid ${hasRole ? "var(--acc)" : "var(--b)"}`, cursor: "pointer", fontWeight: hasRole ? 700 : 400, transition: "all .15s", borderRadius: "6px" }}
                          onClick={() => toggleEditUserRole(role)}>
                          {ROLE_LABELS[role]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="fg2 fg-full">
                  <div className="sku-admin">
                    <div className="sku-admin-head">
                      <div>
                        <div className="sku-admin-title">员工提成百分比</div>
                        <div className="sku-admin-sub">按员工权限启用对应提成项，保存用户时同步到提成报表配置</div>
                      </div>
                    </div>
                    <div className="commission-settings-fields user-commission-fields">
                      <label className="settings-field">
                        <span>服务员 %</span>
                        <input className="fi" type="number" min="0" max="100" step="0.1" disabled={!editUser.roles.includes("front")} value={editUser.commissionRates?.frontPercent ?? 0} onChange={(e) => updateEditUserCommission("frontPercent", e.target.value)} />
                      </label>
                      <label className="settings-field">
                        <span>后厨 %</span>
                        <input className="fi" type="number" min="0" max="100" step="0.1" disabled={!editUser.roles.includes("kitchen")} value={editUser.commissionRates?.kitchenPercent ?? 0} onChange={(e) => updateEditUserCommission("kitchenPercent", e.target.value)} />
                      </label>
                      <label className="settings-field">
                        <span>吧台 %</span>
                        <input className="fi" type="number" min="0" max="100" step="0.1" disabled={!editUser.roles.includes("bar")} value={editUser.commissionRates?.barPercent ?? 0} onChange={(e) => updateEditUserCommission("barPercent", e.target.value)} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mfoot">
              <button className="bcn" onClick={() => setEditUser(null)}>取消</button>
              <button className="bsv" onClick={saveUser}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
