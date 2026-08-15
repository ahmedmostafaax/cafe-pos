import api from "./axios";

export const getOffers = async (all = false) => {
  const { data } = await api.get(`/offers${all ? "?all=true" : ""}`);
  return data.data.offers;
};

export const createOffer = async (payload: any) => {
  const { data } = await api.post("/offers", payload);
  return data.data.offer;
};

export const updateOffer = async (id: string, payload: any) => {
  const { data } = await api.patch(`/offers/${id}`, payload);
  return data.data.offer;
};

export const deleteOffer = async (id: string) => {
  await api.delete(`/offers/${id}`);
};

export const getCoupons = async () => {
  const { data } = await api.get("/coupons");
  return data.data.coupons;
};

export const createCoupon = async (payload: any) => {
  const { data } = await api.post("/coupons", payload);
  return data.data.coupon;
};

export const deleteCoupon = async (id: string) => {
  await api.delete(`/coupons/${id}`);
};

export const validateCoupon = async (code: string, total: number) => {
  const { data } = await api.post("/coupons/validate", { code, total });
  return data.data;
};
