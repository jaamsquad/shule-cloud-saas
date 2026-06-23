import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Paperclip, X, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { reqApi } from "@/lib/requestsApi";

const PURPLE = "#5C67F2";
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip";
const MAX_MB = 10;

export default function CreateRequest() {
    const navigate = useNavigate();
    const { data: categories = [] } = useQuery({ queryKey: ["req_categories"], queryFn: reqApi.categories });
    const [f, setF] = useState<any>({ category: "", title: "", description: "", quantity: "", priority: "Medium", estimatedCost: "", comments: "" });
    const [files, setFiles] = useState<{ name: string; url: string; type?: string }[]>([]);
    const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

    const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = Array.from(e.target.files || []);
        for (const file of picked) {
            if (file.size > MAX_MB * 1024 * 1024) { toast.error(`${file.name} exceeds ${MAX_MB}MB`); continue; }
            const url = await new Promise<string>(res => { const r = new FileReader(); r.onloadend = () => res(String(r.result || "")); r.readAsDataURL(file); });
            setFiles(prev => [...prev, { name: file.name, url, type: file.type }]);
        }
        e.target.value = "";
    };

    const submit = useMutation({
        mutationFn: (status?: string) => reqApi.create({ ...f, quantity: Number(f.quantity) || null, estimatedCost: Number(f.estimatedCost) || 0, attachments: files, status }),
        onSuccess: (_d, status) => { toast.success(status === "Draft" ? "Saved as draft" : "Request submitted"); navigate("/requests/mine"); },
        onError: (e: any) => toast.error(e?.response?.data?.message || "Could not submit"),
    });
    const canSubmit = f.category && f.title;

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-bold text-slate-500 mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
            <div className="max-w-3xl">
                <h1 className="text-2xl font-black text-slate-900 mb-1">Create Request</h1>
                <p className="text-sm text-slate-400 mb-6">It will be sent to your reporting officer for approval.</p>

                <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Category *">
                            <select value={f.category} onChange={e => set("category", e.target.value)} className="inp">
                                <option value="">Select category</option>
                                {categories.map((c: any) => <option key={c._id} value={c.name}>{c.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Priority">
                            <select value={f.priority} onChange={e => set("priority", e.target.value)} className="inp">
                                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                            </select>
                        </Field>
                    </div>
                    <Field label="Request Title *"><input value={f.title} onChange={e => set("title", e.target.value)} placeholder="e.g. 5 Laptops for the Computer Lab" className="inp" /></Field>
                    <Field label="Description"><textarea value={f.description} onChange={e => set("description", e.target.value)} rows={3} placeholder="Describe what you need and why" className="inp" /></Field>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Quantity"><input type="number" value={f.quantity} onChange={e => set("quantity", e.target.value)} className="inp" /></Field>
                        <Field label="Estimated Total Cost (KES)"><input type="number" value={f.estimatedCost} onChange={e => set("estimatedCost", e.target.value)} className="inp" /></Field>
                    </div>

                    <Field label="Attachments (PDF, Word, Excel, Images, ZIP)">
                        <label className="flex items-center gap-2 h-11 px-4 border border-dashed border-slate-300 rounded-lg text-sm font-bold text-slate-500 cursor-pointer hover:border-[#5C67F2]">
                            <Paperclip className="w-4 h-4" /> Add files
                            <input type="file" multiple accept={ACCEPT} onChange={onPick} className="hidden" />
                        </label>
                        {files.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                                {files.map((a, i) => (
                                    <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-xs">
                                        <span className="font-bold text-slate-600 truncate">{a.name}</span>
                                        <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-500"><X className="w-3.5 h-3.5" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Field>

                    <Field label="Comments / Supporting notes"><textarea value={f.comments} onChange={e => set("comments", e.target.value)} rows={2} className="inp" /></Field>

                    <div className="flex items-center gap-3 pt-2">
                        <button onClick={() => submit.mutate(undefined)} disabled={!canSubmit || submit.isPending}
                            className="h-11 px-6 rounded-xl text-white font-bold text-sm flex items-center gap-2 disabled:opacity-50" style={{ background: PURPLE }}>
                            {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Submit Request
                        </button>
                        <button onClick={() => submit.mutate("Draft")} disabled={!canSubmit || submit.isPending} className="h-11 px-5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm">Save Draft</button>
                        <button onClick={() => navigate(-1)} className="h-11 px-5 rounded-xl text-slate-400 font-bold text-sm">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <label className="block"><span className="block text-xs font-black text-slate-500 uppercase tracking-wide mb-1">{label}</span>{children}</label>;
}
