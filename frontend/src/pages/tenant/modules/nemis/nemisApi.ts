import api from "@/lib/api";

export interface FieldStatus { key: string; label: string; value: string; status: "ready" | "warning" | "missing"; severity: "required" | "recommended"; }
export interface StudentValidation {
    studentId: string; studentName: string; admissionNo: string; grade: string; class: string;
    fields: FieldStatus[]; missingRequired: string[]; missingRecommended: string[]; score: number; ready: boolean;
}

export const nemis = {
    stats: () => api.get("/nemis/stats").then(r => r.data),
    validate: (ids?: string[]) => api.get(`/nemis/validate${ids?.length ? `?ids=${ids.join(",")}` : ""}`).then(r => r.data),
    missing: () => api.get("/nemis/missing").then(r => r.data as StudentValidation[]),
    student: (id: string) => api.get(`/nemis/student/${id}`).then(r => r.data),
    updateStudent: (id: string, fields: Record<string, any>) => api.patch(`/nemis/student/${id}`, fields).then(r => r.data),
    export: (params = "") => api.get(`/nemis/export${params}`).then(r => r.data),
    importPreview: (rows: any[]) => api.post("/nemis/import/preview", { rows }).then(r => r.data),
    importApply: (updated: any[], fileName?: string) => api.post("/nemis/import/apply", { updated, fileName }).then(r => r.data),
    transfers: (q = "") => api.get(`/nemis/transfers${q}`).then(r => r.data),
    createTransfer: (body: any) => api.post("/nemis/transfers", body).then(r => r.data),
    updateTransfer: (id: string, body: any) => api.patch(`/nemis/transfers/${id}`, body).then(r => r.data),
    syncLog: (q = "") => api.get(`/nemis/sync-log${q}`).then(r => r.data),
    getSettings: () => api.get("/nemis/settings").then(r => r.data),
    setSettings: (body: any) => api.patch("/nemis/settings", body).then(r => r.data),
};

// Build CSV text from headers + rows, honouring a delimiter.
export function toCSV(headers: string[], rows: any[][], delim = ","): string {
    const esc = (v: any) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    return [headers.map(esc).join(delim), ...rows.map(r => r.map(esc).join(delim))].join("\n");
}
export function downloadFile(content: string | Blob, filename: string, mime = "text/csv;charset=utf-8;") {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
