import api from "@/lib/api";

export const tsc = {
    stats: () => api.get("/tsc/stats").then(r => r.data),
    teachers: () => api.get("/tsc/teachers").then(r => r.data),
    teacher: (id: string) => api.get(`/tsc/teachers/${id}`).then(r => r.data),
    updateTeacher: (id: string, body: any) => api.patch(`/tsc/teachers/${id}`, body).then(r => r.data),
    workload: (id: string) => api.get(`/tsc/teachers/${id}/workload`).then(r => r.data),
    leaveBalances: (id: string) => api.get(`/tsc/leave-balances/${id}`).then(r => r.data),
    settings: () => api.get("/tsc/settings").then(r => r.data),
    setSettings: (body: any) => api.patch("/tsc/settings", body).then(r => r.data),
    leaveRequests: (status?: string) => api.get("/tsc/leave-requests", { params: status ? { status } : {} }).then(r => r.data),
    pendingLeaveCount: () => api.get("/tsc/leave-requests/pending-count").then(r => r.data),
    reviewLeave: (id: string, status: string, note?: string) => api.patch(`/tsc/leave-requests/${id}`, { status, note }).then(r => r.data),
    report: (kind: string, type?: string) => api.get(`/tsc/reports/${kind}${type ? `?type=${type}` : ""}`).then(r => r.data),
    alerts: () => api.get("/tsc/alerts").then(r => r.data),
    // Linked collections
    list: (col: string, staffId?: string) => api.get(`/${col}${staffId ? `?staffId=${staffId}` : ""}`).then(r => r.data),
    add: (col: string, body: any) => api.post(`/${col}`, body).then(r => r.data),
    update: (col: string, id: string, body: any) => api.patch(`/${col}/${id}`, body).then(r => r.data),
    remove: (col: string, id: string) => api.delete(`/${col}/${id}`).then(r => r.data),
};

export function toCSV(headers: string[], rows: any[][]): string {
    const esc = (v: any) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    return [headers.join(","), ...rows.map(r => r.map(esc).join(","))].join("\n");
}
export function download(content: string | Blob, filename: string, mime = "text/csv;charset=utf-8;") {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
