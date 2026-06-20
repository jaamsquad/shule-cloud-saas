import api from "@/lib/api";

export const LEVELS = [
    { code: "EE", label: "Exceeding Expectation", color: "#10B981" },
    { code: "ME", label: "Meeting Expectation", color: "#1D4ED8" },
    { code: "AE", label: "Approaching Expectation", color: "#F59E0B" },
    { code: "BE", label: "Below Expectation", color: "#EF4444" },
];
export const levelColor = (c: string) => LEVELS.find(l => l.code === c)?.color || "#94A3B8";

export const cbc = {
    stats: () => api.get("/cbc/stats").then(r => r.data),
    seed: () => api.post("/cbc/seed").then(r => r.data),
    progress: (id: string) => api.get(`/cbc/progress/${id}`).then(r => r.data),
    reportCard: (id: string, term?: string, year?: string) => api.get(`/cbc/report-card/${id}`, { params: { term, year } }).then(r => r.data),
    settings: () => api.get("/cbc/settings").then(r => r.data),
    setSettings: (b: any) => api.patch("/cbc/settings", b).then(r => r.data),
    report: (kind: string) => api.get(`/cbc/reports/${kind}`).then(r => r.data),
    bulkAssess: (activityId: string, records: any[]) => api.post("/cbc/assessments/bulk", { activityId, records }).then(r => r.data),
    list: (col: string, q = "") => api.get(`/${col}${q}`).then(r => r.data),
    add: (col: string, b: any) => api.post(`/${col}`, b).then(r => r.data),
    update: (col: string, id: string, b: any) => api.patch(`/${col}/${id}`, b).then(r => r.data),
    remove: (col: string, id: string) => api.delete(`/${col}/${id}`).then(r => r.data),
    students: () => api.get("/students").then(r => Array.isArray(r.data) ? r.data : []),
};

export function toCSV(headers: string[], rows: any[][]): string {
    const esc = (v: any) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    return [headers.join(","), ...rows.map(r => r.map(esc).join(","))].join("\n");
}
export function download(content: string, filename: string, mime = "text/csv;charset=utf-8;") {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
