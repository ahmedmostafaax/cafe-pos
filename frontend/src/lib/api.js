const DEFAULT_BACKEND_PORT = "3001";
const DEFAULT_BACKEND_ORIGIN = `http://localhost:${DEFAULT_BACKEND_PORT}`;
const CONFIGURED_BACKEND_ORIGIN = import.meta.env.VITE_API_BASE?.replace(/\/$/, "");

function getCurrentBackendOrigin() {
  if (typeof window === "undefined") return "";

  const { protocol, hostname, port, origin } = window.location;
  if (!hostname || protocol === "file:") return "";
  if (port === DEFAULT_BACKEND_PORT) return origin.replace(/\/$/, "");
  if (!import.meta.env.DEV) return origin.replace(/\/$/, "");

  const host = hostname.includes(":") && !hostname.startsWith("[") ? `[${hostname}]` : hostname;
  return `${protocol}//${host}:${DEFAULT_BACKEND_PORT}`;
}

export const API_BASE = (
  CONFIGURED_BACKEND_ORIGIN
  || getCurrentBackendOrigin()
  || DEFAULT_BACKEND_ORIGIN
).replace(/\/$/, "");

export const SOCKET_URL = API_BASE;

export async function fetchJSON(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) throw new Error("后端返回了非 JSON 响应");
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || `请求失败 (${response.status})`);
  return data;
}
