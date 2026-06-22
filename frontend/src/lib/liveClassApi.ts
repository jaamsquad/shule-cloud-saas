import api from "./api";

export type LiveClass = {
  _id: string;
  title: string; description?: string;
  subjectId?: string; subjectName?: string;
  unitId?: string; unitName?: string;
  teacherId?: string; teacherName?: string;
  startAt: string; endAt?: string; durationMinutes?: number;
  provider: "jitsi" | "bigbluebutton";
  meetingId: string; password?: string;
  recordingEnabled?: boolean; waitingRoom?: boolean; autoMute?: boolean; attendanceEnabled?: boolean;
  audience?: string; classId?: string;
  status: "scheduled" | "live" | "ended" | "cancelled";
  joinOpensAt?: string;
};

export const liveClass = {
  list: (params?: { subject?: string; teacher?: string; status?: string; from?: string; to?: string }) =>
    api.get("/live-classes", { params }).then(r => r.data as LiveClass[]),
  get: (id: string) => api.get(`/live-classes/${id}`).then(r => r.data as LiveClass),
  create: (body: any) => api.post("/live-classes", body).then(r => r.data),
  update: (id: string, body: any) => api.put(`/live-classes/${id}`, body).then(r => r.data),
  remove: (id: string) => api.delete(`/live-classes/${id}`).then(r => r.data),
  duplicate: (id: string) => api.post(`/live-classes/${id}/duplicate`).then(r => r.data),

  start: (id: string) => api.post(`/live-classes/${id}/start`).then(r => r.data),
  join: (id: string, body: any) => api.post(`/live-classes/${id}/join`, body).then(r => r.data),
  leave: (id: string, body: any) => api.post(`/live-classes/${id}/leave`, body).then(r => r.data),
  end: (id: string) => api.post(`/live-classes/${id}/end`).then(r => r.data),

  attendance: (id: string) => api.get(`/live-classes/${id}/attendance`).then(r => r.data),
  recordings: (id: string) => api.get(`/live-classes/${id}/recordings`).then(r => r.data),
  addRecording: (id: string, body: { url: string; name?: string }) => api.post(`/live-classes/${id}/recordings`, body).then(r => r.data),
  deleteRecording: (recId: string) => api.delete(`/live-classes/recordings/${recId}`).then(r => r.data),

  stats: () => api.get("/live-classes/stats/overview").then(r => r.data),

  // Ad-hoc "Quick Meet" room on the shared platform JaaS account (no 5-min limit).
  quickMeet: (body: { meetingId?: string; displayName?: string; role?: "moderator" | "attendee"; avatar?: string }) =>
    api.post("/live-classes/quick-meet", body).then(r => r.data),

  getSettings: () => api.get("/live-classes/settings").then(r => r.data),
  saveSettings: (body: any) => api.put("/live-classes/settings", body).then(r => r.data),
  testConnection: (body: any) => api.post("/live-classes/provider/test-connection", body).then(r => r.data),
};
