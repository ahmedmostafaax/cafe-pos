import api from "./axios";
import type { Table, ApiResponse } from "../types";

export const getTables = async () => {
  const { data } = await api.get<ApiResponse<{ tables: Table[] }>>("/tables");
  return data.data.tables;
};

export const createTable = async (payload: Partial<Table>) => {
  const { data } = await api.post<ApiResponse<{ table: Table }>>("/tables", payload);
  return data.data.table;
};

export const updateTable = async (id: string, payload: Partial<Table>) => {
  const { data } = await api.patch<ApiResponse<{ table: Table }>>(`/tables/${id}`, payload);
  return data.data.table;
};

export const deleteTable = async (id: string) => {
  await api.delete(`/tables/${id}`);
};
