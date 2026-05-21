import { useEffect, useState } from "react";
import { useApp } from "../hooks/useApp";
import Toggle from "../components/Toggle";
import { getAssetUrl } from "../components/LazyImage";
import {
  DEFAULT_STATION_THRESHOLDS,
  normalizeStationThresholds,
  TABLE_IDS,
} from "../lib/constants";
import { uploadMenuImage } from "../lib/uploads";

export default function SystemSettingsPanel() {
  const { settings, saveSettings, showToast } = useApp();
  const [draft, setDraft] = useState(() => normalizeStationThresholds(settings.stationThresholds));
  const [tableIdsDraft, setTableIdsDraft] = useState(() => Array.isArray(settings.tableIds) ? settings.tableIds : []);
  const [newTableId, setNewTableId] = useState("");
  const [wechatPayQr, setWechatPayQr] = useState(settings.wechatPayQr || "");
  const [alipayQr, setAlipayQr] = useState(settings.alipayQr || "");
  const [customerSelfPay, setCustomerSelfPay] = useState(settings.customerSelfPay !== false);
  const [qrUploading, setQrUploading] = useState("");

  useEffect(() => {
    setDraft(normalizeStationThresholds(settings.stationThresholds));
    setTableIdsDraft(Array.isArray(settings.tableIds) ? settings.tableIds : []);
    setWechatPayQr(settings.wechatPayQr || "");
    setAlipayQr(settings.alipayQr || "");
    setCustomerSelfPay(settings.customerSelfPay !== false);
  }, [settings]);

  const addCustomTableId = () => {
    const next = String(newTableId || "").trim();
    if (!next) return;
    if (TABLE_IDS.includes(next)) { showToast(`「${next}」已是固定桌号`, "err"); return; }
    if (tableIdsDraft.includes(next)) { showToast("该桌号已存在", "err"); return; }
    if (["外卖", "堂食", "walkin"].includes(next)) { showToast("不能使用保留字", "err"); return; }
    setTableIdsDraft((prev) => [...prev, next]);
    setNewTableId("");
  };
  const removeCustomTableId = (id) => setTableIdsDraft((prev) => prev.filter((x) => x !== id));
  const moveCustomTableId = (id, delta) => setTableIdsDraft((prev) => {
    const index = prev.indexOf(id);
    if (index < 0) return prev;
    const target = Math.max(0, Math.min(prev.length - 1, index + delta));
    if (target === index) return prev;
    const next = [...prev];
    next.splice(index, 1); next.splice(target, 0, id);
    return next;
  });

  const uploadQr = async (file, which) => {
    if (!file) return;
    setQrUploading(which);
    try {
      const url = await uploadMenuImage(file);
      if (which === "wechat") setWechatPayQr(url);
      else setAlipayQr(url);
      showToast(`${which === "wechat" ? "微信" : "支付宝"}收款码已上传`);
    } catch (err) {
      showToast(err.message || "上传失败", "err");
    } finally {
      setQrUploading("");
    }
  };

  const updateDraft = (station, field, value) => {
    setDraft((prev) => ({
      ...prev,
      [station]: {
        ...prev[station],
        [field]: value,
      },
    }));
  };

  const save = () => {
    const normalized = normalizeStationThresholds(draft);
    saveSettings({
      ...settings,
      stationThresholds: normalized,
      tableIds: tableIdsDraft,
      wechatPayQr,
      alipayQr,
      customerSelfPay,
    });
    showToast("系统设置已保存 ✓");
  };

  const rows = [
    { key: "kitchen", title: "后厨出品", desc: "披萨、欧包、沙拉、甜品等制作队列", hint: "默认 5 / 15 分钟" },
    { key: "bar", title: "吧台出品", desc: "咖啡、鸡尾酒、饮品等制作队列", hint: "默认 3 / 10 分钟" },
  ];

  return (
    <div>
      <div className="ast">系统设置</div>
      <div className="settings-grid">
        {rows.map((row) => {
          const value = draft[row.key] || DEFAULT_STATION_THRESHOLDS[row.key];
          return (
            <div key={row.key} className="settings-card">
              <div className="settings-card-head">
                <div>
                  <div className="settings-title">{row.title}</div>
                  <div className="settings-sub">{row.desc}</div>
                </div>
                <div className="settings-hint">{row.hint}</div>
              </div>
              <div className="settings-fields">
                <label className="settings-field">
                  <span>新订单阈值（分钟内）</span>
                  <input className="fi" type="number" min="1" value={value.newMinutes} onChange={(e) => updateDraft(row.key, "newMinutes", e.target.value)} />
                </label>
                <label className="settings-field">
                  <span>久候阈值（分钟起）</span>
                  <input className="fi" type="number" min="2" value={value.urgentMinutes} onChange={(e) => updateDraft(row.key, "urgentMinutes", e.target.value)} />
                </label>
              </div>
              <div className="settings-preview">
                新订单 &lt; {value.newMinutes || DEFAULT_STATION_THRESHOLDS[row.key].newMinutes} 分钟 · 制作中 {value.newMinutes || DEFAULT_STATION_THRESHOLDS[row.key].newMinutes}-{value.urgentMinutes || DEFAULT_STATION_THRESHOLDS[row.key].urgentMinutes} 分钟 · 久候 ≥ {value.urgentMinutes || DEFAULT_STATION_THRESHOLDS[row.key].urgentMinutes} 分钟
              </div>
            </div>
          );
        })}
      </div>
      <div className="settings-section-title">自定义桌号（与固定 1-20 号桌并存）</div>
      <div className="settings-card">
        <div className="settings-sub" style={{ marginBottom: 10 }}>用于追加非数字桌号（如 A1、包间 1、VIP），固定桌号 1-20 不可修改。</div>
        <div className="table-ids-row" style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input className="fi" style={{ flex: 1 }} value={newTableId} onChange={(e) => setNewTableId(e.target.value)} placeholder="新桌号（如 A1、包间1）" />
          <button className="actb" onClick={addCustomTableId}>+ 添加</button>
        </div>
        {!tableIdsDraft.length && <div className="empty" style={{ padding: "16px 0", fontSize: 13 }}>暂无自定义桌号</div>}
        <div className="table-ids-list">
          {tableIdsDraft.map((id, index) => (
            <div key={id} className="table-id-row">
              <span className="table-id-label">{id}</span>
              <button className="actb" disabled={index === 0} onClick={() => moveCustomTableId(id, -1)}>↑</button>
              <button className="actb" disabled={index === tableIdsDraft.length - 1} onClick={() => moveCustomTableId(id, 1)}>↓</button>
              <button className="actb del" onClick={() => removeCustomTableId(id)}>删除</button>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-section-title">顾客自助付款（扫码端 + 平板代点）</div>
      <div className="settings-card">
        <div className="tglw" style={{ marginBottom: 12 }}>
          <Toggle on={customerSelfPay} onChange={setCustomerSelfPay} />
          <span className="tgl-label">{customerSelfPay ? "已开启 · 顾客扫码下单后可上报支付方式" : "已关闭 · 维持服务员代收"}</span>
        </div>
        <div className="settings-sub">开启后：顾客扫码下单后可主动选择支付方式（不显示二维码，仅上报）；平板代点页提交订单后会展示收款二维码。前台未支付列表会对已上报方式以主题色高亮。</div>
      </div>

      <div className="settings-section-title">收款二维码</div>
      <div className="settings-grid">
        {[
          { key: "wechat", label: "微信收款码", url: wechatPayQr, setter: setWechatPayQr },
          { key: "alipay", label: "支付宝收款码", url: alipayQr, setter: setAlipayQr },
        ].map((row) => (
          <div key={row.key} className="settings-card">
            <div className="settings-title">{row.label}</div>
            <div className="menu-image-editor" style={{ marginTop: 10 }}>
              {row.url && <div className="menu-image-preview"><img src={getAssetUrl(row.url)} alt={row.label} /></div>}
              <div className="menu-image-actions">
                <label className="actb">
                  {qrUploading === row.key ? "上传中..." : (row.url ? "更换" : "上传")}
                  <input type="file" accept="image/*" style={{ display: "none" }} disabled={qrUploading === row.key} onChange={(e) => {
                    const file = e.target.files?.[0]; e.target.value = "";
                    uploadQr(file, row.key);
                  }} />
                </label>
                {row.url && (
                  <button className="actb del" onClick={() => row.setter("")}>移除</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="bsv settings-save" onClick={save}>保存系统设置</button>
    </div>
  );
}
