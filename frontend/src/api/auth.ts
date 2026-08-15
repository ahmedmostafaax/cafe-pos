import api from "./axios";
import type { LoginResponse, User } from "../types";

export const login = async (username: string, password: string) => {
  const { data } = await api.post<LoginResponse>("/auth/login", {
    username,
    password,
  });
  return data;
};

export const getMe = async () => {
  const { data } = await api.get<{ status: string; data: { user: User } }>("/auth/me");
  return data.data.user;
};
