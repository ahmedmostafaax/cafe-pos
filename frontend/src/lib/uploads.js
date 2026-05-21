import { API_BASE } from "./api";

export const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error("图片读取失败"));
  reader.readAsDataURL(file);
});

export async function uploadMenuImage(file) {
  if (!file) throw new Error("未选择文件");
  if (file.size > 5 * 1024 * 1024) throw new Error("图片不能超过 5MB");
  const dataUrl = await readFileAsDataUrl(file);
  const response = await fetch(`${API_BASE}/api/uploads/menu-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name || "menu.jpg", dataUrl }),
  });
  const data = await response.json();
  if (!response.ok || !data?.ok) throw new Error(data?.message || "上传失败");
  return data.url;
}
