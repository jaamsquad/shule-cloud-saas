import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useModuleCrud } from "@/contexts/PermissionsContext";

export type Field = {
    key: string;
    label: string;
    type?: "text" | "number" | "date" | "select" | "textarea" | "studentSelect";
    options?: string[];
    placeholder?: string;
    required?: boolean;
    // For studentSelect: also fill these form keys from the chosen student.
    fillClassKey?: string;   // e.g. "studentClass"
    fillIdKey?: string;      // e.g. "studentId"
};

export type Column = { key: string; label: string; render?: (row: any) => React.ReactNode };

/**
 * Generic Excel-like list + "Add" modal backed by a REST collection.
 * `endpoint` is the base path, e.g. "/sports" → GET /sports, POST /sports,
 * DELETE /sports/:id.
 */
export default function CrudListPage({
    title, subtitle, icon, endpoint, queryKey, fields, columns, addLabel = "Add New", moduleKey,
}: {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    endpoint: string;
    queryKey: string;
    fields: Field[];
    columns: Column[];
    addLabel?: string;
    moduleKey?: string;   // gates create/delete buttons by the user's CRUD matrix
}) {
    const qc = useQueryClient();
    const moduleCrud = useModuleCrud(moduleKey || "__none__");
    const canCreate = !moduleKey || moduleCrud.canCreate;
    const canDelete = !moduleKey || moduleCrud.canDelete;
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<Record<string, any>>({});

    const { data: rows = [], isLoading } = useQuery({
        queryKey: [queryKey],
        queryFn: async () => {
            try { const r = await api.get(endpoint); return Array.isArray(r.data) ? r.data : (r.data?.data ?? []); }
            catch { return []; }
        },
    });

    // Load real students only when a studentSelect field is present.
    const needsStudents = fields.some((f) => f.type === "studentSelect");
    const { data: students = [] } = useQuery({
        queryKey: ["crud_students"],
        enabled: needsStudents,
        queryFn: async () => { try { const r = await api.get("/students"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });
    const pickStudent = (f: Field, id: string) => {
        const s = students.find((x: any) => x._id === id);
        if (!s) { setForm((p) => ({ ...p, [f.key]: "" })); return; }
        const name = s.studentName || `${s.firstName || ""} ${s.lastName || ""}`.trim();
        setForm((p) => ({
            ...p,
            [f.key]: name,
            ...(f.fillClassKey ? { [f.fillClassKey]: s.studentClass || s.currentClass || "" } : {}),
            ...(f.fillIdKey ? { [f.fillIdKey]: s._id } : {}),
        }));
    };

    const create = useMutation({
        mutationFn: async () => api.post(endpoint, form),
        onSuccess: () => { toast.success("Saved"); setOpen(false); setForm({}); qc.invalidateQueries({ queryKey: [queryKey] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to save"),
    });

    const remove = useMutation({
        mutationFn: async (id: string) => api.delete(`${endpoint}/${id}`),
        onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: [queryKey] }); },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to delete"),
    });

    const submit = () => {
        for (const f of fields) if (f.required && !form[f.key]) { toast.error(`${f.label} is required`); return; }
        create.mutate();
    };

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                        {icon && <div className="w-12 h-12 rounded-2xl bg-[#5C67F2] flex items-center justify-center text-white">{icon}</div>}
                        <div>
                            <h1 className="text-xl font-black text-slate-800">{title}</h1>
                            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
                        </div>
                    </div>
                    {canCreate && (
                        <button onClick={() => setOpen(true)} className="h-10 px-4 bg-[#5C67F2] text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#4a54c4]">
                            <Plus className="w-4 h-4" /> {addLabel}
                        </button>
                    )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    {columns.map((col) => <th key={col.key} className="py-3 px-4">{col.label}</th>)}
                                    <th className="py-3 px-4 w-12" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoading ? (
                                    <tr><td colSpan={columns.length + 1} className="py-16 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
                                ) : rows.length === 0 ? (
                                    <tr><td colSpan={columns.length + 1} className="py-16 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">No records yet</td></tr>
                                ) : rows.map((row: any) => (
                                    <tr key={row._id} className="hover:bg-slate-50/50">
                                        {columns.map((col) => (
                                            <td key={col.key} className="py-3 px-4 text-slate-700 font-medium">
                                                {col.render ? col.render(row) : (row[col.key] ?? "—")}
                                            </td>
                                        ))}
                                        <td className="py-3 px-4">
                                            {canDelete && (
                                                <button onClick={() => remove.mutate(row._id)} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-black text-slate-800">{addLabel}</h2>
                            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-3">
                            {fields.map((f) => (
                                <div key={f.key}>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">{f.label}{f.required && " *"}</label>
                                    {f.type === "studentSelect" ? (
                                        <select value={(students.find((s: any) => (s.studentName || `${s.firstName || ""} ${s.lastName || ""}`.trim()) === form[f.key]) || {})._id || ""}
                                            onChange={(e) => pickStudent(f, e.target.value)}
                                            className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]">
                                            <option value="">Select student…</option>
                                            {students.map((s: any) => {
                                                const name = s.studentName || `${s.firstName || ""} ${s.lastName || ""}`.trim();
                                                const adm = s.registrationNo || s.admNo || "";
                                                return <option key={s._id} value={s._id}>{name}{adm ? ` (${adm})` : ""}</option>;
                                            })}
                                        </select>
                                    ) : f.type === "select" ? (
                                        <select value={form[f.key] ?? ""} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                                            className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]">
                                            <option value="">Select…</option>
                                            {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    ) : f.type === "textarea" ? (
                                        <textarea value={form[f.key] ?? ""} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2] min-h-[72px]" />
                                    ) : (
                                        <input type={f.type || "text"} value={form[f.key] ?? ""} onChange={(e) => setForm((p) => ({ ...p, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value }))} placeholder={f.placeholder}
                                            className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]" />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setOpen(false)} className="flex-1 h-10 border border-slate-200 rounded-xl text-slate-600 font-bold text-sm">Cancel</button>
                            <button onClick={submit} disabled={create.isPending} className="flex-1 h-10 bg-[#5C67F2] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                                {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
