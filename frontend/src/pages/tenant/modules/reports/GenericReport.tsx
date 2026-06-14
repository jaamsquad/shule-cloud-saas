import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Printer, Search, Loader2, ArrowLeft, FileBarChart } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

type Col = { key: string; label: string; type?: "date" | "money" };
type Cfg = { title: string; collection: string; columns: Col[] };

// Registry of data-driven reports. Each maps to a tenant collection + columns.
export const REPORT_REGISTRY: Record<string, Cfg> = {
  "class-lists":        { title: "Class Lists", collection: "students", columns: [{ key: "registrationNo", label: "Reg No" }, { key: "studentName", label: "Name" }, { key: "studentClass", label: "Class" }, { key: "gender", label: "Gender" }, { key: "phone", label: "Contact" }] },
  "birthday-list":      { title: "Birthday List", collection: "students", columns: [{ key: "studentName", label: "Name" }, { key: "studentClass", label: "Class" }, { key: "dob", label: "Date of Birth", type: "date" }, { key: "gender", label: "Gender" }] },
  "promotions":         { title: "Promotions Report", collection: "student_enrollments", columns: [{ key: "studentName", label: "Student" }, { key: "className", label: "Class" }, { key: "streamName", label: "Stream" }, { key: "academicYear", label: "Year" }, { key: "status", label: "Status" }] },
  "staff-directory":    { title: "Staff Directory", collection: "staff", columns: [{ key: "employeeId", label: "ID" }, { key: "name", label: "Name" }, { key: "designation", label: "Role" }, { key: "email", label: "Email" }, { key: "phone", label: "Phone" }] },
  "staff-by-dept":      { title: "Staff by Department", collection: "staff", columns: [{ key: "name", label: "Name" }, { key: "department", label: "Department" }, { key: "designation", label: "Role" }, { key: "phone", label: "Phone" }] },
  "contracts-expiry":   { title: "Contracts Expiry", collection: "staff", columns: [{ key: "name", label: "Name" }, { key: "designation", label: "Role" }, { key: "contractEnd", label: "Contract End", type: "date" }] },
  "leave-report":       { title: "Leave Report", collection: "leave_requests", columns: [{ key: "staffName", label: "Staff" }, { key: "type", label: "Type" }, { key: "startDate", label: "From", type: "date" }, { key: "endDate", label: "To", type: "date" }, { key: "status", label: "Status" }] },
  "salary-slips":       { title: "Salary Summary", collection: "salary_payments", columns: [{ key: "staffName", label: "Staff" }, { key: "month", label: "Month" }, { key: "gross", label: "Gross", type: "money" }, { key: "net", label: "Net", type: "money" }, { key: "status", label: "Status" }] },
  "stock-levels":       { title: "Stock Levels", collection: "pos_products", columns: [{ key: "name", label: "Product" }, { key: "sku", label: "SKU" }, { key: "price", label: "Price", type: "money" }, { key: "stock", label: "Stock" }, { key: "categoryName", label: "Category" }] },
  "low-stock":          { title: "Low-Stock Alerts", collection: "pos_products", columns: [{ key: "name", label: "Product" }, { key: "sku", label: "SKU" }, { key: "stock", label: "Stock" }] },
  "asset-register":     { title: "Asset Register", collection: "assets", columns: [{ key: "name", label: "Asset" }, { key: "category", label: "Category" }, { key: "value", label: "Value", type: "money" }, { key: "location", label: "Location" }] },
  "book-catalog":       { title: "Book Catalog", collection: "library_books", columns: [{ key: "title", label: "Title" }, { key: "author", label: "Author" }, { key: "isbn", label: "ISBN" }, { key: "copies", label: "Copies" }] },
  "issued-books":       { title: "Issued Books", collection: "library_issues", columns: [{ key: "bookTitle", label: "Book" }, { key: "memberName", label: "Member" }, { key: "issueDate", label: "Issued", type: "date" }, { key: "dueDate", label: "Due", type: "date" }] },
  "overdue-books":      { title: "Overdue Books", collection: "library_issues", columns: [{ key: "bookTitle", label: "Book" }, { key: "memberName", label: "Member" }, { key: "dueDate", label: "Due", type: "date" }] },
  "clinic-visits":      { title: "Clinic Visits", collection: "student_medical", columns: [{ key: "studentName", label: "Student" }, { key: "condition", label: "Condition" }, { key: "date", label: "Date", type: "date" }, { key: "treatment", label: "Treatment" }] },
  "immunization":       { title: "Immunization Report", collection: "student_medical", columns: [{ key: "studentName", label: "Student" }, { key: "vaccine", label: "Vaccine" }, { key: "date", label: "Date", type: "date" }] },
  "incident-log":       { title: "Discipline Incident Log", collection: "student_discipline", columns: [{ key: "studentName", label: "Student" }, { key: "incident", label: "Incident" }, { key: "date", label: "Date", type: "date" }, { key: "action", label: "Action" }] },
  "sms-logs":           { title: "SMS Logs", collection: "sms_logs", columns: [{ key: "to", label: "Recipient" }, { key: "message", label: "Message" }, { key: "status", label: "Status" }, { key: "createdAt", label: "Sent", type: "date" }] },
  "email-logs":         { title: "Email Logs", collection: "email_logs", columns: [{ key: "to", label: "Recipient" }, { key: "subject", label: "Subject" }, { key: "status", label: "Status" }, { key: "createdAt", label: "Sent", type: "date" }] },
  "announcements":      { title: "Announcements", collection: "announcements", columns: [{ key: "title", label: "Title" }, { key: "audience", label: "Audience" }, { key: "createdAt", label: "Date", type: "date" }] },
  "outstanding-balances": { title: "Outstanding Balances", collection: "invoices", columns: [{ key: "studentName", label: "Student" }, { key: "invoice_no", label: "Invoice" }, { key: "total_due", label: "Due", type: "money" }, { key: "status", label: "Status" }] },
  "audit-trail":        { title: "Audit Trail", collection: "audit_logs", columns: [{ key: "action", label: "Action" }, { key: "collection", label: "Entity" }, { key: "userId", label: "User" }, { key: "createdAt", label: "When", type: "date" }] },
  "login-history":      { title: "Login History", collection: "login_logs", columns: [{ key: "userName", label: "User" }, { key: "role", label: "Role" }, { key: "ip", label: "IP" }, { key: "createdAt", label: "When", type: "date" }] },
};

const fmtDate = (v: any) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : (/^\d+(\.\d+)?$/.test(String(v)) ? parseFloat(String(v)) : NaN);
  let d: Date;
  if (!isNaN(n) && n > 20000 && n < 90000) d = new Date(Math.round((n - 25569) * 86400 * 1000));
  else d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
const fmtMoney = (v: any) => `KSh ${(parseFloat(v) || 0).toLocaleString()}`;
const cell = (row: any, c: Col) => { const v = row[c.key]; return c.type === "date" ? fmtDate(v) : c.type === "money" ? fmtMoney(v) : (v ?? "—"); };

export default function GenericReport() {
  const { key = "" } = useParams();
  const cfg = REPORT_REGISTRY[key];
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["generic_report", cfg?.collection],
    queryFn: async () => { const r = await api.get(`/${cfg!.collection}`); return Array.isArray(r.data) ? r.data : []; },
    enabled: !!cfg,
  });
  const { data: schoolRaw } = useQuery({ queryKey: ["theme_settings"], queryFn: async () => (await api.get("/theme_settings")).data });
  const school = Array.isArray(schoolRaw) ? schoolRaw[0] : (schoolRaw || {});
  const schoolName = school?.name || school?.instituteName || "School";
  const schoolLogo = school?.logo || school?.schoolLogo || "";

  if (!cfg) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-slate-400">
      <FileBarChart className="w-12 h-12" /><p className="font-bold">This report isn't configured yet.</p>
      <Link to="/reports" className="text-[#2563EB] font-black text-sm">← Back to Reports Center</Link>
    </div>
  );

  const filtered = rows.filter((r: any) => !search || cfg.columns.some(c => String(r[c.key] ?? "").toLowerCase().includes(search.toLowerCase())));

  const print = () => {
    const head = cfg.columns.map(c => `<th style="background:#2563EB;color:#fff;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase">${c.label}</th>`).join("");
    const body = filtered.map((r: any, i: number) => `<tr style="background:${i % 2 ? "#F8FAFC" : "#fff"}">${cfg.columns.map(c => `<td style="padding:9px 12px;border-bottom:1px solid #E2E8F0;font-size:11px">${cell(r, c)}</td>`).join("")}</tr>`).join("");
    const html = `<!DOCTYPE html><html><head><title>${cfg.title}</title><style>@page{size:A4 landscape;margin:14mm}body{font-family:Inter,Arial,sans-serif;color:#0F172A}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}.h{text-align:center;border-bottom:3px solid #2563EB;padding-bottom:12px;margin-bottom:18px}table{width:100%;border-collapse:collapse}</style></head><body><div class="h">${schoolLogo ? `<img src="${schoolLogo}" style="height:50px;margin-bottom:6px"/>` : ""}<h1 style="margin:0;font-size:22px;text-transform:uppercase">${schoolName}</h1><div style="color:#2563EB;font-weight:600;margin-top:4px">${cfg.title}</div></div><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table><p style="margin-top:24px;font-size:10px;color:#94A3B8;text-align:right">${filtered.length} records · Printed ${new Date().toLocaleDateString()}</p></body></html>`;
    const w = window.open("", "_blank", "width=1200,height=900");
    if (!w) { toast.error("Allow pop-ups to print"); return; }
    w.document.write(html); w.document.close(); w.focus(); w.onload = () => w.print();
  };

  return (
    <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <Link to="/reports" className="inline-flex items-center gap-1.5 text-xs font-black text-slate-400 hover:text-[#2563EB] uppercase tracking-widest mb-2"><ArrowLeft className="w-3.5 h-3.5" /> Reports Center</Link>
            <h1 className="text-2xl font-black text-slate-900">{cfg.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-[#2563EB]" />
            </div>
            <button onClick={print} disabled={!filtered.length} className="h-10 px-5 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-md"><Printer className="w-4 h-4" /> Print / Export</button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wide">{cfg.columns.map(c => <th key={c.key} className="text-left px-5 py-3 font-black">{c.label}</th>)}</tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={cfg.columns.length} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB] mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={cfg.columns.length} className="py-12 text-center text-slate-400 font-bold text-xs uppercase">No records found</td></tr>
              ) : filtered.map((r: any, i: number) => (
                <tr key={r._id || i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  {cfg.columns.map(c => <td key={c.key} className={`px-5 py-3 ${c.key === cfg.columns[0].key ? "font-bold text-slate-700" : "text-slate-500"}`}>{cell(r, c)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 font-bold mt-3">{filtered.length} records</p>
      </div>
    </div>
  );
}
