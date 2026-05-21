export const TAKEAWAY_TABLE_ID = "外卖";
export const TAKEAWAY_GUESTS = 1;

const toNumber = (value) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
};

export function sanitizeOptionGroups(groups = []) {
  return groups
    .map((group) => ({
      label: String(group?.label ?? "").trim(),
      type: group?.type === "multi" ? "multi" : "single",
      required: !!group?.required,
      choices: Array.isArray(group?.choices)
        ? group.choices
            .map((choice) => ({
              name: String(choice?.name ?? "").trim(),
              priceDelta: toNumber(choice?.priceDelta),
            }))
            .filter((choice) => choice.name)
        : [],
    }))
    .filter((group) => group.label && group.choices.length > 0);
}

export function hasItemOptions(item) {
  return sanitizeOptionGroups(item?.options).length > 0;
}

export function createDefaultSelections(groups = []) {
  return sanitizeOptionGroups(groups).reduce((acc, group, index) => {
    acc[index] = group.type === "multi" ? [] : group.required && group.choices[0] ? 0 : null;
    return acc;
  }, {});
}

export function buildSelectedOptions(groups = [], selections = {}) {
  return sanitizeOptionGroups(groups)
    .map((group, index) => {
      const value = selections[index];
      const picked =
        group.type === "multi"
          ? group.choices.filter((_, choiceIndex) => Array.isArray(value) && value.includes(choiceIndex))
          : value === null || value === undefined
            ? []
            : group.choices.filter((_, choiceIndex) => choiceIndex === value);
      if (!picked.length) return null;
      return { groupLabel: group.label, type: group.type, choices: picked };
    })
    .filter(Boolean);
}

export function formatSelectedOptions(selectedOptions = []) {
  return selectedOptions.flatMap((group) =>
    group.choices.map((choice) =>
      `${group.groupLabel}: ${choice.name}${choice.priceDelta ? ` ${choice.priceDelta > 0 ? "+" : ""}¥${choice.priceDelta}` : ""}`
    )
  );
}

export function getOptionsHash(selectedOptions = []) {
  if (!selectedOptions.length) return "default";
  return selectedOptions
    .map((group) => `${group.groupLabel}:${group.choices.map((choice) => `${choice.name}@${choice.priceDelta}`).join(",")}`)
    .join("|");
}

const normalizeNote = (value) => String(value ?? "").trim();

export function getCartKey(menuId, optionsHash = "default", note = "") {
  const cleanNote = normalizeNote(note);
  const notePart = cleanNote ? `::note:${encodeURIComponent(cleanNote)}` : "";
  return `${menuId}::${optionsHash || "default"}${notePart}`;
}

export function getCartItemKey(item, fallback = 0) {
  return item?.cartKey || item?.itemKey || getCartKey(item?.menuId ?? item?.id ?? `item-${fallback}`, item?.optionsHash || "default", item?.note);
}

export function createCartItem(menuItem, selections = {}, note = "") {
  const selectedOptions = buildSelectedOptions(menuItem?.options, selections);
  const optionDelta = selectedOptions.reduce(
    (sum, group) => sum + group.choices.reduce((groupSum, choice) => groupSum + toNumber(choice.priceDelta), 0),
    0
  );
  const optionsHash = getOptionsHash(selectedOptions);
  const price = +(toNumber(menuItem?.price) + optionDelta).toFixed(2);
  const cleanNote = normalizeNote(note);
  return {
    cartKey: getCartKey(menuItem?.id, optionsHash, cleanNote),
    menuId: menuItem?.id,
    name: menuItem?.name ?? "",
    station: menuItem?.station ?? "kitchen",
    category: menuItem?.category ?? "",
    basePrice: toNumber(menuItem?.price),
    optionDelta: +optionDelta.toFixed(2),
    price,
    qty: 1,
    done: false,
    optionsHash,
    selectedOptions,
    note: cleanNote,
  };
}

export function getNowTimestamp() {
  return Date.now();
}

export function generateOrderId() {
  return `ORD_${getNowTimestamp()}_${Math.random().toString(36).substring(2, 9)}`;
}
