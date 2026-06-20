import api from "@/lib/api";

export const exp = {
    stats: () => api.get("/expense/stats").then(r => r.data),
    budgetControl: () => api.get("/expense/budget-control").then(r => r.data),
    approvals: () => api.get("/expense/approvals").then(r => r.data),
    approve: (id: string, decision: string, comment?: string) => api.post(`/expense/approvals/${id}`, { decision, comment }).then(r => r.data),
    report: (kind: string) => api.get(`/expense/reports/${kind}`).then(r => r.data),
    settings: () => api.get("/expense/settings").then(r => r.data),
    setSettings: (b: any) => api.patch("/expense/settings", b).then(r => r.data),
    alerts: () => api.get("/expense/alerts").then(r => r.data),
    seedCategories: () => api.post("/expense_categories/seed").then(r => r.data),
    // generic
    list: (col: string, q = "") => api.get(`/${col}${q}`).then(r => r.data),
    add: (col: string, b: any) => api.post(`/${col}`, b).then(r => r.data),
    update: (col: string, id: string, b: any) => api.patch(`/${col}/${id}`, b).then(r => r.data),
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
export const ksh = (n: any) => `KSh ${(Number(n) || 0).toLocaleString()}`;
