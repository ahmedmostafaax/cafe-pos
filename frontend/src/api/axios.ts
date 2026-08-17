import axios from "axios";
import Cookies from "js-cookie";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "http://localhost:3001/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginReq = error.config?.url?.includes("/auth/login") || error.config?.url?.includes("/customer/login");
    const isPublicPage =
      window.location.pathname.startsWith("/order") ||
      window.location.pathname.startsWith("/customer") ||
      window.location.pathname.startsWith("/track") ||
      window.location.pathname.startsWith("/table");

    if (error.response?.status === 401 && !isLoginReq && !isPublicPage) {
      Cookies.remove("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
