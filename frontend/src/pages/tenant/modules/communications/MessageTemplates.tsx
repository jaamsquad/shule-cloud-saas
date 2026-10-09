import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Home, ChevronRight, FileText, MessageSquare, Mail, Plus, Pencil, Trash2, Copy, Search, CalendarDays } from "lucide-react";
import api from "@/lib/api";
import { FCard, FButton, FField, FInput, inputCls, FModal, FEmpty, FLoading, FTabs, FBadge } from "@/components/fees/FeesUI";
import { useTemplates, MessageTemplate } from "@/components/comm/TemplatePicker";

// Communication → Templates: reusable SMS & email wording for staff and parents.
const PLACEHOLDERS: { key: string; hint: string }[] = [
    { key: "{name}", hint: "Recipient's name" },
    { key: "{school}", hint: "School name" },
    { key: "{title}", hint: "Meeting title" },
    { key: "{date}", hint: "Meeting date" },
    { key: "{time}", hint: "Meeting time" },
    { key: "{location}", hint: "Venue" },
    { key: "{link}", hint: "Online link" },
    { key: "{amount}", hint: "Fee balance" },
    { key: "{class}", hint: "Class" },
    { key: "{adm}", hint: "Admission no." },
];
const SMS_LEN = 160;
type Tab = "sms" | "email";
type Form = { _id?: string; channel: Tab; name: string; category: string; subject: string; body: string };

export function CommNav({ active }: { active: "meetings" | "templates" }) {
    const items = [
        { k: "meetings", to: "/communications/meetings", label: "Meetings", icon: CalendarDays },
        { k: "templates", to: "/communications/templates", label: "Templates", icon: FileText },
        { k: "sms", to: "/communications/sms", label: "Bulk SMS", icon: MessageSquare },
        { k: "email", to: "/communications/email", label: "Email", icon: Mail },
    ];
    return (
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {items.map(i => (
                <Link key={i.k} to={i.to} className={`h-8 px-3 rounded-lg text-[13px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${active === i.k ? "bg-[#5C67F2] text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"}`}>
                    <i.icon className="w-3.5 h-3.5" /> {i.label}
                </Link>
            ))}
        </div>
    );
}

export function CommShell({ title, subtitle, icon: Icon, actions, active, children }: { title: string; subtitle: string; icon: any; actions?: React.ReactNode; active: "meetings" | "templates"; children: React.ReactNode }) {
    return (
        <div className="flex-1 min-h-screen bg-[#F8FAFC] pb-16">
            <div className="bg-white/80 backdrop-blur border-b border-slate-100 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 pb-2 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                        <Home className="w-3.5 h-3.5 text-[#5C67F2]" /><ChevronRight className="w-3 h-3" />
                        <span>Communication</span><ChevronRight className="w-3 h-3" /><span className="text-slate-700">{title}</span>
                    </div>
                    <CommNav active={active} />
                </div>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#5C67F2]/10 text-[#5C67F2] flex items-center justify-center"><Icon className="w-5 h-5" /></div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
                            <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
                        </div>
                    </div>
                    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
                </div>
                {children}
            </div>
        </div>
    );
}

export default function MessageTemplates() {
    const qc = useQueryClient();
    const [tab, setTab] = useState<Tab>("sms");
    const [q, setQ] = useState("");
    const [form, setForm] = useState<Form | null>(null);
    const [saving, setSaving] = useState(false);
    const bodyRef = useRef<HTMLTextAreaElement>(null);
    const { data: all = [], isLoading } = useTemplates();

    const list = useMemo(() => all.filter(t => t.channel === tab && (!q || `${t.name} ${t.category} ${t.body} ${t.subject || ""}`.toLowerCase().includes(q.toLowerCase()))), [all, tab, q]);
    const groups = useMemo(() => list.reduce((m: Record<string, MessageTemplate[]>, t) => { (m[t.category || "General"] ||= []).push(t); return m; }, {}), [list]);
    const categories = useMemo(() => Array.from(new Set(all.map(t => t.category).filter(Boolean))), [all]);
    const refresh = () => qc.invalidateQueries({ queryKey: ["message_templates"] });

    const save = async () => {
        if (!form) return;
        setSaving(true);
        try {
            if (form._id) await api.put(`/communications/templates/${form._id}`, form); else await api.post("/communications/templates", form);
            toast.success(form._id ? "Template saved" : "Template created");
            setForm(null); refresh();
        } catch (e: any) { toast.error(e.response?.data?.message || "Could not save"); }
        finally { setSaving(false); }
    };
    const remove = async (t: MessageTemplate) => {
        if (!confirm(`Delete "${t.name}"?`)) return;
        try { await api.delete(`/communications/templates/${t._id}`); toast.success("Deleted"); refresh(); }
        catch (e: any) { toast.error(e.response?.data?.message || "Failed"); }
    };
    const insert = (ph: string) => {
        if (!form) return;
        const el = bodyRef.current;
        const at = el ? el.selectionStart : form.body.length;
        const body = form.body.slice(0, at) + ph + form.body.slice(el ? el.selectionEnd : at);
        setForm({ ...form, body });
        requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + ph.length, at + ph.length); });
    };

    return (
        <CommShell active="templates" title="Message Templates" icon={FileText}
            subtitle="Write it once, reuse it — for meeting notices, Bulk SMS and email to staff and parents."
            actions={<FButton icon={Plus} onClick={() => setForm({ channel: tab, name: "", category: "General", subject: "", body: "" })}>New {tab === "sms" ? "SMS" : "email"} template</FButton>}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <FTabs<Tab> value={tab} onChange={setTab} tabs={[
                    { value: "sms", label: "SMS", count: all.filter(t => t.channel === "sms").length },
                    { value: "email", label: "Email", count: all.filter(t => t.channel === "email").length },
                ]} />
                <div className="relative sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <FInput value={q} onChange={e => setQ(e.target.value)} placeholder="Search templates…" className="pl-9" />
                </div>
            </div>

            {isLoading ? <FLoading /> : !list.length ? (
                <FCard><FEmpty icon={FileText} title={q ? "No template matches" : `No ${tab === "sms" ? "SMS" : "email"} templates yet`} hint="Templates can hold placeholders like {name} and {date}." action={<FButton icon={Plus} onClick={() => setForm({ channel: tab, name: "", category: "General", subject: "", body: "" })}>Create one</FButton>} /></FCard>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groups).map(([cat, ts]) => (
                        <div key={cat}>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">{cat}</p>
                            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                {ts.map(t => (
                                    <div key={t._id} className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.05)] p-4 flex flex-col">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-bold text-slate-800">{t.name}</p>
                                            <FBadge tone={t.channel === "sms" ? "emerald" : "indigo"}>{t.channel === "sms" ? "SMS" : "Email"}</FBadge>
                                        </div>
                                        {t.subject && <p className="text-xs font-semibold text-slate-600 mt-2">Subject: {t.subject}</p>}
                                        <p className="text-xs text-slate-500 mt-1.5 whitespace-pre-line line-clamp-5 flex-1">{t.body}</p>
                                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                                            <span className="text-[11px] text-slate-400">{t.channel === "sms" ? `${t.body.length} chars · ` : ""}used {t.usageCount || 0}×</span>
                                            <div className="flex gap-1">
                                                <FButton size="sm" variant="ghost" icon={Copy} onClick={() => setForm({ channel: t.channel, name: `${t.name} (copy)`, category: t.category, subject: t.subject || "", body: t.body })} title="Duplicate" />
                                                <FButton size="sm" variant="ghost" icon={Pencil} onClick={() => setForm({ _id: t._id, channel: t.channel, name: t.name, category: t.category, subject: t.subject || "", body: t.body })} title="Edit" />
                                                <FButton size="sm" variant="ghost" icon={Trash2} onClick={() => remove(t)} title="Delete" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <FModal open={!!form} onClose={() => setForm(null)} width="max-w-2xl"
                title={form?._id ? "Edit template" : `New ${form?.channel === "sms" ? "SMS" : "email"} template`}
                subtitle="Placeholders are replaced for each person when a meeting notice is sent."
                footer={<><FButton variant="secondary" onClick={() => setForm(null)}>Cancel</FButton><FButton loading={saving} onClick={save}>Save template</FButton></>}>
                {form && (
                    <div className="space-y-4">
                        <div className="grid sm:grid-cols-3 gap-3">
                            <FField label="Type" required>
                                <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                                    {(["sms", "email"] as Tab[]).map(c => (
                                        <button key={c} type="button" disabled={!!form._id} onClick={() => setForm({ ...form, channel: c })}
                                            className={`flex-1 h-8 rounded-lg text-xs font-semibold ${form.channel === c ? "bg-white shadow-sm text-slate-900" : "text-slate-500"} disabled:cursor-not-allowed`}>{c === "sms" ? "SMS" : "Email"}</button>
                                    ))}
                                </div>
                            </FField>
                            <FField label="Name" required className="sm:col-span-2"><FInput value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. PTA meeting invitation" /></FField>
                            <FField label="Category" className="sm:col-span-3">
                                <FInput list="tpl-cats" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Meetings, Fees, Academics…" />
                                <datalist id="tpl-cats">{["Meetings", "Fees", "Academics", "Events", "General", ...categories].filter((v, i, a) => a.indexOf(v) === i).map(c => <option key={c} value={c} />)}</datalist>
                            </FField>
                            {form.channel === "email" && <FField label="Subject" required className="sm:col-span-3"><FInput value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Invitation: {title} — {date}" /></FField>}
                        </div>
                        <FField label="Message" required hint={form.channel === "sms" ? `${form.body.length} characters · ${Math.max(1, Math.ceil(form.body.length / SMS_LEN))} SMS (before names are filled in)` : undefined}>
                            <textarea ref={bodyRef} className={`${inputCls} h-auto py-2.5 font-[inherit]`} rows={form.channel === "sms" ? 5 : 10} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
                                placeholder={form.channel === "sms" ? "Dear {name}, …" : "Dear {name},\n\n…\n\nKind regards,\n{school}"} />
                        </FField>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Insert placeholder</p>
                            <div className="flex flex-wrap gap-1.5">
                                {PLACEHOLDERS.map(p => (
                                    <button key={p.key} type="button" onClick={() => insert(p.key)} title={p.hint}
                                        className="h-7 px-2.5 rounded-lg bg-indigo-50 text-[#5C67F2] text-xs font-mono font-semibold hover:bg-indigo-100">{p.key}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </FModal>
        </CommShell>
    );
}
