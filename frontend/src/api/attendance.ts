import api from "./axios";

export const checkIn = (shift = "morning") =>
  api.post("/attendance/check-in", { shift }).then((r) => r.data.data.record);

export const checkOut = (shift = "morning") =>
  api.post("/attendance/check-out", { shift }).then((r) => r.data.data.record);

export const getOnShift = () =>
  api.get("/attendance/on-shift").then((r) => r.data.data);

export const getTodayAttendance = () =>
  api.get("/attendance/today").then((r) => r.data.data);
