export const getNoteText = (note) => String(note || "").trim();

export function ItemNote({ note, className = "item-note" }) {
  const text = getNoteText(note);
  if (!text) return null;
  return <div className={className}>备注：{text}</div>;
}

export function OrderNoteLine({ note }) {
  const text = getNoteText(note);
  if (!text) return null;
  return <div className="order-note-line">整单备注：{text}</div>;
}
