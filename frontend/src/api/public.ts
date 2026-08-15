import api from "./axios";
import type { Order, MenuItem, ApiResponse } from "../types";

export const getPublicMenu = async () => {
  const { data } = await api.get<ApiResponse<{ menu: MenuItem[] }>>("/menu");
  return data.data.menu;
};

export const createPublicOrder = async (payload: any) => {
  const { data } = await api.post<ApiResponse<{ order: Order }>>("/orders/public", payload);
  return data.data.order;
};

export const getOrderByToken = async (token: string) => {
  const { data } = await api.get<ApiResponse<{ order: Order }>>(`/orders/track/${token}`);
  return data.data.order;
};

export const markTransfer = async (token: string, payMethod: string) => {
  const { data } = await api.patch<ApiResponse<{ order: Order }>>(`/orders/track/${token}/transfer`, {
    payMethod,
  });
  return data.data.order;
};

export const rateOrder = async (token: string, rating: number, ratingComment = "") => {
  const { data } = await api.post<ApiResponse<{ order: Order }>>(`/orders/track/${token}/rate`, {
    rating,
    ratingComment,
  });
  return data.data.order;
};
