import { useState } from "react";
import {
  createCartItem,
  createDefaultSelections,
  formatSelectedOptions,
  sanitizeOptionGroups,
} from "../../model/orderOptionUtils";

export function OptionTags({ selectedOptions, className = "opt-tags", tagClassName = "opt-tag" }) {
  const tags = formatSelectedOptions(selectedOptions);
  if (!tags.length) return null;
  return (
    <div className={className}>
      {tags.map((tag) => (
        <span key={tag} className={tagClassName}>
          {tag}
        </span>
      ))}
    </div>
  );
}

export function OptionSelectorModal({
  item,
  onClose,
  onConfirm,
  theme = "dark",
  confirmLabel = "加入购物车",
  variant = "",
}) {
  const optionGroups = sanitizeOptionGroups(item?.options);
  const [selections, setSelections] = useState(() => createDefaultSelections(optionGroups));
  const [error, setError] = useState("");

  if (!item) return null;

  const previewItem = createCartItem(item, selections);

  const toggleChoice = (groupIndex, choiceIndex, type, required) => {
    setSelections((prev) => {
      const current = prev[groupIndex];
      if (type === "multi") {
        const currentList = Array.isArray(current) ? current : [];
        return {
          ...prev,
          [groupIndex]: currentList.includes(choiceIndex)
            ? currentList.filter((value) => value !== choiceIndex)
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
    for (let index = 0; index < optionGroups.length; index += 1) {
      const group = optionGroups[index];
      const value = selections[index];
      const picked = group.type === "multi" ? Array.isArray(value) && value.length > 0 : value !== null && value !== undefined;
      if (group.required && !picked) {
        setError(`请选择「${group.label}」`);
        return;
      }
    }
    onConfirm(createCartItem(item, selections));
  };

  return (
    <div className={`sku-overlay ${variant}`.trim()} onClick={onClose}>
      <div className={`sku-dialog ${theme} ${variant}`.trim()} onClick={(event) => event.stopPropagation()}>
        <div className="sku-head">
          <div>
            <div className="sku-kicker">规格选择</div>
            <div className="sku-title">{item.name}</div>
            <div className="sku-sub">
              基础价 ¥{Number(item.price || 0).toFixed(2)}
              {item.desc ? ` · ${item.desc}` : ""}
            </div>
          </div>
          <button className="sku-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="sku-body">
          {!optionGroups.length && <div className="sku-empty">该菜品暂无可选规格</div>}
          {optionGroups.map((group, groupIndex) => {
            const currentValue = selections[groupIndex];
            return (
              <div key={`${group.label}-${groupIndex}`} className="sku-group">
                <div className="sku-group-head">
                  <div className="sku-group-title">{group.label}</div>
                  <div className="sku-group-meta">
                    {group.type === "multi" ? "多选" : "单选"}
                    {group.required ? " · 必选" : " · 可选"}
                  </div>
                </div>
                <div className="sku-choice-list">
                  {group.choices.map((choice, choiceIndex) => {
                    const active =
                      group.type === "multi"
                        ? Array.isArray(currentValue) && currentValue.includes(choiceIndex)
                        : currentValue === choiceIndex;
                    return (
                      <button
                        key={`${choice.name}-${choiceIndex}`}
                        className={`sku-choice${active ? " a" : ""}`}
                        onClick={() => toggleChoice(groupIndex, choiceIndex, group.type, group.required)}
                      >
                        <span>{choice.name}</span>
                        <span className="sku-choice-price">
                          {choice.priceDelta ? `${choice.priceDelta > 0 ? "+" : ""}¥${Number(choice.priceDelta)}` : "¥0"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {previewItem.selectedOptions.length > 0 && (
            <OptionTags selectedOptions={previewItem.selectedOptions} className="sku-preview-tags" tagClassName="sku-preview-tag" />
          )}
          {error && <div className="sku-error">{error}</div>}
        </div>
        <div className="sku-foot">
          <div className="sku-total">
            <span>当前价格</span>
            <strong>¥{previewItem.price.toFixed(2)}</strong>
          </div>
          <button className="sku-submit" onClick={submit}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
