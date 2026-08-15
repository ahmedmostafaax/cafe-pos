import api from "./axios";
import type { MenuItem, Category, ApiResponse } from "../types";

export const getCategories = async () => {
  const { data } = await api.get<ApiResponse<{ categories: Category[] }>>("/categories");
  return data.data.categories;
};

export const createCategory = async (payload: Partial<Category>) => {
  const { data } = await api.post<ApiResponse<{ category: Category }>>("/categories", payload);
  return data.data.category;
};

export const updateCategory = async (id: string, payload: Partial<Category>) => {
  const { data } = await api.patch<ApiResponse<{ category: Category }>>(`/categories/${id}`, payload);
  return data.data.category;
};

export const deleteCategory = async (id: string) => {
  await api.delete(`/categories/${id}`);
};

export const getMenu = async () => {
  const { data } = await api.get<ApiResponse<{ menu: MenuItem[] }>>("/menu");
  return data.data.menu;
};

export const createMenuItem = async (payload: Partial<MenuItem>) => {
  const { data } = await api.post<ApiResponse<{ item: MenuItem }>>("/menu", payload);
  return data.data.item;
};

export const updateMenuItem = async (id: string, payload: Partial<MenuItem>) => {
  const { data } = await api.patch<ApiResponse<{ item: MenuItem }>>(`/menu/${id}`, payload);
  return data.data.item;
};

export const deleteMenuItem = async (id: string) => {
  await api.delete(`/menu/${id}`);
};

export const toggleMenuAvailability = async (id: string) => {
  const { data } = await api.patch<ApiResponse<{ item: MenuItem }>>(`/menu/${id}/toggle`);
  return data.data.item;
};
