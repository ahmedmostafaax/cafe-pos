import axios from "axios";
import Cookies from "js-cookie";

const base = import.meta.env.VITE_API_BASE || "http://localhost:3001/api";

const customerApi = axios.create({
  baseURL: base,
  headers: { "Content-Type": "application/json" },
});

customerApi.interceptors.request.use((config) => {
  const token = Cookies.get("customer_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getCaptcha = async () => {
  const { data } = await customerApi.get("/customer/captcha");
  return data.data as { captchaId: string; question: string };
};

export const customerRegister = async (body: {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  phone?: string;
  captchaId: string;
  captchaAnswer: string;
}) => {
  const { data } = await customerApi.post("/customer/register", body);
  return data;
};

export const customerLogin = async (body: {
  email: string;
  password: string;
  captchaId: string;
  captchaAnswer: string;
}) => {
  const { data } = await customerApi.post("/customer/login", body);
  return data;
};

export const customerMe = async () => {
  const { data } = await customerApi.get("/customer/me");
  return data.data.customer;
};
