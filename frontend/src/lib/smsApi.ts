import api from "./api";

export const sms = {
  send: (body: { message: string; audiences?: string[]; to?: string[]; scheduledAt?: string | null }) =>
    api.post("/communications/sms/send", body).then(r => r.data),
  logs: () => api.get("/communications/sms/logs").then(r => r.data),
  getSettings: () => api.get("/communications/sms/settings").then(r => r.data),
  saveSettings: (body: any) => api.post("/communications/sms/settings", body).then(r => r.data),

  devices: () => api.get("/sms/devices").then(r => r.data),
  pair: (name?: string) => api.post("/sms/devices/pair", { name }).then(r => r.data),
  resetDevice: (id: string) => api.post(`/sms/devices/${id}/reset`).then(r => r.data),
  deleteDevice: (id: string) => api.delete(`/sms/devices/${id}`).then(r => r.data),
};
