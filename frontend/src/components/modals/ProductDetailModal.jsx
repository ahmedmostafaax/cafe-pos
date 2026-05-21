import { useState } from "react";
import {
  createCartItem,
  createDefaultSelections,
  sanitizeOptionGroups,
} from "../../model/orderOptionUtils";
import { OptionTags } from "./OptionSelectorModal";
import { API_BASE } from "../../lib/api";

const getAssetUrl = (value) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  return `${API_BASE}${value.startsWith("/") ? value : `/${value}`}`;
};

export function ProductDetailModal({ item, onClose, onConfirm }) {
  const optionGroups = sanitizeOptionGroups(item?.options);
  const [selections, setSelections] = useState(() => createDefaultSelections(optionGroups));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  if (!item) return null;

  const previewItem = createCartItem(item, selections);
  const stationLabel = item.station === "kitchen" ? "后厨出品" : "吧台出品";
  const productLabel = item.isSignature ? `★ 招牌 · ${stationLabel}` : stationLabel;
  const imageSrc = getAssetUrl(item.imageUrl);

  const toggleChoice = (groupIndex, choiceIndex, type, required) => {
    setSelections((prev) => {
      const current = prev[groupIndex];
      if (type === "multi") {
        const currentList = Array.isArray(current) ? current : [];
        return {
          ...prev,
          [groupIndex]: currentList.includes(choiceIndex)
            ? currentList.filter((v) => v !== choiceIndex)
            : [...currentList, choiceIndex].sort((a, b) => a - b),
        };
      }
      return {
        ...prev,
        [groupIndex]: current === choiceIndex && !required ? null : choiceIndex,
      };
    });
    setError("");
  };

  const submit = () => {
    for (let i = 0; i < optionGroups.length; i += 1) {
      const group = optionGroups[i];
      const value = selections[i];
      const picked =
        group.type === "multi"
          ? Array.isArray(value) && value.length > 0
          : value !== null && value !== undefined;
      if (group.required && !picked) {
        setError(`请选择「${group.label}」`);
        return;
      }
    }
    onConfirm(createCartItem(item, selections, note));
  };

  return (
    <div className="pd-overlay" onClick={onClose}>
      <div className="pd-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="pd-head">
          <div>
            <div className="pd-station">{productLabel}</div>
            <div className="pd-title">{item.name}</div>
            {item.desc && <div className="pd-desc">{item.desc}</div>}
          </div>
          <button className="pd-close" onClick={onClose}>✕</button>
        </div>

        <div className="pd-body">
          {imageSrc && (
            <div className="pd-image-wrap">
              <img className="pd-image" src={imageSrc} alt={item.name} />
            </div>
          )}

          <div className="pd-price-row">
            <div className="pd-price-label">价格</div>
            <div className="pd-price">¥{Number(item.price || 0).toFixed(2)}</div>
          </div>

          {optionGroups.length > 0 && (
            <div className="pd-options">
              <div className="pd-options-title">规格选择</div>
              {optionGroups.map((group, groupIndex) => {
                const currentValue = selections[groupIndex];
                return (
                  <div key={`${group.label}-${groupIndex}`} className="pd-group">
                    <div className="pd-group-head">
                      <div className="pd-group-title">{group.label}</div>
                      <div className="pd-group-meta">
                        {group.type === "multi" ? "多选" : "单选"}
                        {group.required ? " · 必选" : " · 可选"}
                      </div>
                    </div>
                    <div className="pd-choice-list">
                      {group.choices.map((choice, choiceIndex) => {
                        const active =
                          group.type === "multi"
                            ? Array.isArray(currentValue) && currentValue.includes(choiceIndex)
                            : currentValue === choiceIndex;
                        return (
                          <button
                            key={`${choice.name}-${choiceIndex}`}
                            className={`pd-choice${active ? " a" : ""}`}
                            onClick={() => toggleChoice(groupIndex, choiceIndex, group.type, group.required)}
                          >
                            <span>{choice.name}</span>
                            <span className="pd-choice-price">
                              {choice.priceDelta
                                ? `${choice.priceDelta > 0 ? "+" : ""}¥${Number(choice.priceDelta)}`
                                : "¥0"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {previewItem.selectedOptions.length > 0 && (
                <OptionTags
                  selectedOptions={previewItem.selectedOptions}
                  className="pd-preview-tags"
                  tagClassName="pd-preview-tag"
                />
              )}
            </div>
          )}

          <div className="pd-note">
            <label className="pd-note-label" htmlFor={`pd-note-${item.id}`}>单品备注</label>
            <textarea
              id={`pd-note-${item.id}`}
              className="pd-note-input"
              value={note}
              maxLength={80}
              rows={3}
              onChange={(event) => setNote(event.target.value)}
              placeholder="少冰、不要葱、需要加热..."
            />
          </div>

          {error && <div className="pd-error">{error}</div>}
        </div>

        <div className="pd-foot">
          <div className="pd-total">
            <span>当前价格</span>
            <strong>¥{previewItem.price.toFixed(2)}</strong>
          </div>
          <button className="pd-submit" onClick={submit}>加入购物车</button>
        </div>
      </div>
    </div>
  );
}
