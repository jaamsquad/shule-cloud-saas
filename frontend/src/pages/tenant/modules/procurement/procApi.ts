import api from "@/lib/api";

export const proc = {
    stats: () => api.get("/procurement/stats").then(r => r.data),
    supplierPerformance: () => api.get("/procurement/supplier-performance").then(r => r.data),
    match: (b: any) => api.post("/procurement/match", b).then(r => r.data),
    invoices: () => api.get("/procurement_invoices").then(r => r.data),
    report: (kind: string) => api.get(`/procurement/reports/${kind}`).then(r => r.data),
    settings: () => api.get("/procurement/settings").then(r => r.data),
    setSettings: (b: any) => api.patch("/procurement/settings", b).then(r => r.data),
    list: (col: string) => api.get(`/${col}`).then(r => r.data),
};
export const ksh = (n: any) => `KSh ${(Number(n) || 0).toLocaleString()}`;
export function toCSV(headers: string[], rows: any[][]): string { const esc = (v: any) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }; return [headers.join(","), ...rows.map(r => r.map(esc).join(","))].join("\n"); }
export function download(content: string, filename: string, mime = "text/csv;charset=utf-8;") { const url = URL.createObjectURL(new Blob([content], { type: mime })); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
