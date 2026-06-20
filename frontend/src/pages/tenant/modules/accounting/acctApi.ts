import api from "@/lib/api";

export const acct = {
    stats: () => api.get("/accounting/stats").then(r => r.data),
    seed: () => api.post("/accounting/seed").then(r => r.data),
    ledger: (account?: string) => api.get("/accounting/ledger", { params: { account } }).then(r => r.data),
    trialBalance: () => api.get("/accounting/trial-balance").then(r => r.data),
    incomeStatement: () => api.get("/accounting/income-statement").then(r => r.data),
    balanceSheet: () => api.get("/accounting/balance-sheet").then(r => r.data),
    cashFlow: () => api.get("/accounting/cash-flow").then(r => r.data),
    receivables: () => api.get("/accounting/receivables").then(r => r.data),
    payables: () => api.get("/accounting/payables").then(r => r.data),
    settings: () => api.get("/accounting/settings").then(r => r.data),
    setSettings: (b: any) => api.patch("/accounting/settings", b).then(r => r.data),
    postJournal: (id: string) => api.post(`/accounting_journals/${id}/post`).then(r => r.data),
    list: (col: string) => api.get(`/${col}`).then(r => r.data),
    add: (col: string, b: any) => api.post(`/${col}`, b).then(r => r.data),
    update: (col: string, id: string, b: any) => api.patch(`/${col}/${id}`, b).then(r => r.data),
    remove: (col: string, id: string) => api.delete(`/${col}/${id}`).then(r => r.data),
};
export const ksh = (n: any) => `KSh ${Math.round(Number(n) || 0).toLocaleString()}`;
export function toCSV(headers: string[], rows: any[][]): string { const esc = (v: any) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }; return [headers.join(","), ...rows.map(r => r.map(esc).join(","))].join("\n"); }
export function download(content: string, filename: string) { const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8;" })); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export function printStatement(title: string, html: string, schoolName = "School") {
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>@page{margin:15mm}body{font-family:Arial;color:#1e293b}.h{text-align:center;border-bottom:3px solid #047857;padding-bottom:12px;margin-bottom:16px}h1{color:#047857;margin:4px}table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#047857;color:#fff;padding:8px;text-align:left;font-size:11px}td{padding:7px;border-bottom:1px solid #eee;font-size:12px}.tot{font-weight:900;border-top:2px solid #047857}</style></head><body><div class="h"><h1>${schoolName}</h1><div style="color:#047857;font-weight:600">${title}</div></div>${html}<script>onload=()=>print()</script></body></html>`);
    w.document.close();
}
