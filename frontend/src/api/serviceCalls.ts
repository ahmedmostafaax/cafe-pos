import api from "./axios";

export const createServiceCall = async (payload: { tableId: string; type: string; note?: string }) => {
  const { data } = await api.post("/service-calls", payload);
  return data.data.call;
};
export const getServiceCalls = async () => {
  const { data } = await api.get("/service-calls");
  return data.data.calls;
};
export const updateServiceCall = async (id: string, status: "acknowledged" | "resolved") => {
  const { data } = await api.patch(`/service-calls/${id}`, { status });
  return data.data.call;
};
