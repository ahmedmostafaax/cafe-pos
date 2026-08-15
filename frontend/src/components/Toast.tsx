import { useEffect } from "react";

interface Props {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
}

const Toast = ({ message, type = "info", onClose }: Props) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg =
    type === "success"
      ? "bg-emerald-500"
      : type === "error"
      ? "bg-red-500"
      : "bg-blue-500";

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] ${bg} text-white px-5 py-3 rounded-xl shadow-lg text-sm font-semibold max-w-[90vw]`}
    >
      {message}
    </div>
  );
};

export default Toast;
