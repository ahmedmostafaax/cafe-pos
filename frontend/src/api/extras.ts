import api from "./axios";
import Cookies from "js-cookie";

export async function validateCoupon(code: string, total: number) {
  const { data } = await api.post("/coupons/validate", { code, total });
  return data.data as { discount: number; finalTotal: number; message: string; code: string };
}

export async function getFavorites() {
  const token = Cookies.get("customer_token");
  if (!token) return [];
  const { data } = await api.get("/favorites", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data?.items || [];
}

export async function toggleFavorite(menuId: string) {
  const token = Cookies.get("customer_token");
  if (!token) throw new Error("login");
  const { data } = await api.post(
    "/favorites/toggle",
    { menuId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data.data?.favorited as boolean;
}
