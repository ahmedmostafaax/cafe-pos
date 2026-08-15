import api from "./axios";
import type { Order, ApiResponse } from "../types";

export const getActiveOrders = async () => {
  const { data } = await api.get<ApiResponse<{ orders: Order[] }>>("/orders/active");
  return data.data.orders;
};

export const getAllOrders = async () => {
  const { data } = await api.get<ApiResponse<{ orders: Order[] }>>("/orders");
  return data.data.orders;
};

export const createOrder = async (payload: Partial<Order>) => {
  const { data } = await api.post<ApiResponse<{ order: Order }>>("/orders", payload);
  return data.data.order;
};

export const updateOrderStatus = async (id: string, status: string) => {
  const { data } = await api.patch<ApiResponse<{ order: Order }>>(`/orders/${id}/status`, {
    status,
  });
  return data.data.order;
};

export const updateOrder = async (id: string, payload: Partial<Order>) => {
  const { data } = await api.patch<ApiResponse<{ order: Order }>>(`/orders/${id}`, payload);
  return data.data.order;
};
