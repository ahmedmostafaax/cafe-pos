import api from "./axios";

export const getSession = (tableNo: string) =>
  api.get(`/table-sessions/${tableNo}`).then((r) => r.data.data.session);

export const openSession = (tableNo: string) =>
  api.post(`/table-sessions/${tableNo}/open`).then((r) => r.data.data.session);

export const joinSession = (tableNo: string, name: string) =>
  api.post(`/table-sessions/${tableNo}/join`, { name }).then((r) => r.data.data);

export const addSessionItem = (tableNo: string, body: any) =>
  api.post(`/table-sessions/${tableNo}/items`, body).then((r) => r.data.data.session);

export const submitSession = (tableNo: string) =>
  api.post(`/table-sessions/${tableNo}/submit`).then((r) => r.data.data);

export const setupSplit = (tableNo: string, mode = "equal") =>
  api.post(`/table-sessions/${tableNo}/split`, { mode }).then((r) => r.data.data);

export const payShare = (tableNo: string, guestId: string, payMethod = "cash") =>
  api.post(`/table-sessions/${tableNo}/pay-share`, { guestId, payMethod }).then((r) => r.data.data);

export const callStaff = (tableNo: string, type: string, note = "") =>
  api.post(`/staff-calls`, { tableNo, type, note }).then((r) => r.data.data.call);
