import { useEffect } from "react";

const Toast = ({
  message,
  type = "info",
  onClose,
}: {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
}) => {
  useEffect(() => {
    const t = setTimeout(onClose, 2800);
    return () => clearTimeout(t);
  }, [onClose]);

  const cls =
    type === "success"
      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
      : type === "error"
      ? "bg-red-50 border-red-100 text-red-800"
      : "bg-[#fffcf8] border-[#e6dcd0] text-[#2c241c]";

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl border shadow-lg text-sm font-medium max-w-[90vw] ${cls}`}
      style={{ top: "calc(1rem + var(--safe-t))" }}
      role="status"
    >
      {message}
    </div>
  );
};
export default Toast;
