import { io } from "socket.io-client";
import { API_BASE, SOCKET_URL } from "./api";

const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  timeout: 10000,
});

// 打印连接状态，方便你在浏览器控制台 Debug
socket.on("connect", () => {
  console.log("✅ 已成功连接到Cafe POS POS 后端:", socket.id);
});

socket.on("connect_error", (error) => {
  console.error("❌ 连接后端失败，请检查虚拟机是否开启或 Wi-Fi 是否一致:", error);
});

const CURRENT_ORIGIN = typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "";
if (CURRENT_ORIGIN && CURRENT_ORIGIN !== API_BASE) {
  console.info("ℹ️ 当前页面与后端地址不同，已切换到后端:", API_BASE);
}

export { API_BASE, SOCKET_URL };
export default socket;
