import api from "./axios";
import type { User, UserStats, ApiResponse } from "../types";

export const getUsers = async (params?: { role?: string; shift?: string; search?: string }) => {
  const query = new URLSearchParams();
  if (params?.role) query.append("role", params.role);
  if (params?.shift) query.append("shift", params.shift);
  if (params?.search) query.append("search", params.search);
  
  const queryString = query.toString() ? `?${query.toString()}` : "";
  const { data } = await api.get<ApiResponse<{ users: User[] }>>(`/users${queryString}`);
  return data.data.users;
};

export const getUserStats = async () => {
  const { data } = await api.get<ApiResponse<UserStats>>("/users/stats");
  return data.data;
};

export const getUser = async (id: string) => {
  const { data } = await api.get<ApiResponse<{ user: User }>>(`/users/${id}`);
  return data.data.user;
};

export const createUser = async (payload: Partial<User> & { password?: string }) => {
  const { data } = await api.post<ApiResponse<{ user: User }>>("/users", payload);
  return data.data.user;
};

export const updateUser = async (id: string, payload: Partial<User> & { password?: string }) => {
  const { data } = await api.patch<ApiResponse<{ user: User }>>(`/users/${id}`, payload);
  return data.data.user;
};

export const deleteUser = async (id: string) => {
  await api.delete(`/users/${id}`);
};

export const toggleUserStatus = async (id: string) => {
  const { data } = await api.patch<ApiResponse<{ user: User }>>(`/users/${id}/toggle`);
  return data.data.user;
};
