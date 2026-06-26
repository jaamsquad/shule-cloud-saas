import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, ArrowRightLeft, Printer, GraduationCap, Users } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { isOrgUser } from "@/lib/orgContext";
import { printBranded } from "@/lib/printDoc";

// Student / Staff transfer between branches, with an auto-generated transfer letter.
export default function OrgTransfers() {
    const [tab, setTab] = useState<"student" | "staff">("student");
    const { data: branches = [] } = useQuery({
        queryKey: ["org_branches_transfer"], enabled: isOrgUser(),
        queryFn: async () => (await api.get("/org/branches")).data,
    });

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen p-6">
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 mb-5"><ArrowRightLeft className="w-6 h-6 text-[#5C67F2]" /> Transfers</h1>
            <div className="flex gap-2 mb-5">
                <button onClick={() => setTab("student")} className={`h-10 px-4 rounded-xl font-bold text-sm flex items-center gap-1.5 ${tab === "student" ? "bg-[#5C67F2] text-white" : "bg-white border border-slate-200 text-slate-600"}`}><GraduationCap className="w-4 h-4" /> Student</button>
                <button onClick={() => setTab("staff")} className={`h-10 px-4 rounded-xl font-bold text-sm flex items-center gap-1.5 ${tab === "staff" ? "bg-[#5C67F2] text-white" : "bg-white border border-slate-200 text-slate-600"}`}><Users className="w-4 h-4" /> Staff</button>
            </div>
            {tab === "student" ? <StudentTransfer branches={branches} /> : <StaffTransfer branches={branches} />}
        </div>
    );
}

function BranchPicker({ branches, value, onChange, label }: any) {
    return (
        <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#5C67F2]">
                <option value="">— Select branch —</option>
                {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
        </div>
    );
}

function letterHtml(rows: [string, string][]) {
    return `<table style="width:100%;border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="padding:6px 10px;color:#64748b;font-weight:700">${k}</td><td style="padding:6px 10px;font-weight:700">${v}</td></tr>`).join("")}</table>
        <p style="margin-top:24px;font-size:13px;color:#475569">This letter certifies the transfer recorded above. Academic history remains attached to the previous branch.</p>`;
}

function StudentTransfer({ branches }: any) {
    const [fromBranchId, setFrom] = useState("");
    const [toBranchId, setTo] = useState("");
    const [studentId, setStudentId] = useState("");
    const [q, setQ] = useState("");
    const [reason, setReason] = useState("");
    const [transferBalance, setTransferBalance] = useState(false);

    // Students of the source branch — fetched by temporarily scoping to it.
    const { data: students = [] } = useQuery({
        queryKey: ["transfer_students", fromBranchId],
        enabled: !!fromBranchId,
        queryFn: async () => {
            const b = branches.find((x: any) => x.id === fromBranchId);
            return (await api.get("/students", { headers: b ? { "x-tenant-subdomain": b.subdomain } : {} })).data || [];
        },
    });
    const matches = q.trim() ? students.filter((s: any) => (s.studentName || "").toLowerCase().includes(q.toLowerCase()) || String(s.registrationNo || s.admNo || "").toLowerCase().includes(q.toLowerCase())).slice(0, 8) : [];

    const run = useMutation({
        mutationFn: async () => (await api.post("/org/transfer/student", { studentId, fromBranchId, toBranchId, reason, transferBalance })).data,
        onSuccess: (d: any) => {
            toast.success(d.message);
            const L = d.letter;
            printBranded({ name: "Student Transfer Letter" } as any, "Student Transfer Letter", letterHtml([
                ["Student", L.student], ["Transferred From", L.from], ["Transferred To", L.to],
                ["Date", new Date(L.date).toLocaleDateString()], ["Reason", L.reason || "—"],
                ["Approved By", L.approvedBy], ...(L.carriedBalance ? [["Carried Balance", `KSh ${Number(L.carriedBalance).toLocaleString()}`] as [string, string]] : []),
            ]), "#5C67F2");
            setStudentId(""); setQ(""); setReason("");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Transfer failed"),
    });

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-2xl space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <BranchPicker branches={branches} value={fromBranchId} onChange={(v: string) => { setFrom(v); setStudentId(""); setQ(""); }} label="From Branch" />
                <BranchPicker branches={branches} value={toBranchId} onChange={setTo} label="To Branch" />
            </div>
            <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Student</label>
                {studentId ? (
                    <div className="flex items-center justify-between h-11 px-3 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-800">
                        {students.find((s: any) => s._id === studentId)?.studentName}
                        <button onClick={() => { setStudentId(""); setQ(""); }} className="text-emerald-600 text-xs">change</button>
                    </div>
                ) : (
                    <div className="relative">
                        <input value={q} onChange={e => setQ(e.target.value)} disabled={!fromBranchId} placeholder={fromBranchId ? "Search name or reg no…" : "Pick the source branch first"} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm disabled:bg-slate-50 focus:outline-none focus:border-[#5C67F2]" />
                        {matches.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                                {matches.map((s: any) => (
                                    <button key={s._id} onClick={() => setStudentId(s._id)} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex items-center justify-between">
                                        <span className="font-bold text-slate-700">{s.studentName}</span><span className="font-mono text-xs text-slate-400">{s.registrationNo || s.admNo}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Reason</label>
                <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for transfer" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" />
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <input type="checkbox" checked={transferBalance} onChange={e => setTransferBalance(e.target.checked)} /> Carry outstanding fee balance to the new branch
            </label>
            <button onClick={() => run.mutate()} disabled={run.isPending || !studentId || !toBranchId} className="h-11 px-5 rounded-xl bg-[#5C67F2] text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-50">
                {run.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} Transfer & Print Letter
            </button>
        </div>
    );
}

function StaffTransfer({ branches }: any) {
    const [fromBranchId, setFrom] = useState("");
    const [toBranchId, setTo] = useState("");
    const [staffId, setStaffId] = useState("");
    const [q, setQ] = useState("");
    const [position, setPosition] = useState("");
    const [reason, setReason] = useState("");

    const { data: staff = [] } = useQuery({
        queryKey: ["transfer_staff", fromBranchId],
        enabled: !!fromBranchId,
        queryFn: async () => {
            const b = branches.find((x: any) => x.id === fromBranchId);
            return (await api.get("/staff", { headers: b ? { "x-tenant-subdomain": b.subdomain } : {} })).data || [];
        },
    });
    const matches = q.trim() ? staff.filter((s: any) => (s.name || s.staffName || "").toLowerCase().includes(q.toLowerCase())).slice(0, 8) : [];

    const run = useMutation({
        mutationFn: async () => (await api.post("/org/transfer/staff", { staffId, fromBranchId, toBranchId, reason, position })).data,
        onSuccess: (d: any) => {
            toast.success(d.message);
            const L = d.letter;
            printBranded({ name: "Staff Transfer Letter" } as any, "Staff Transfer Letter", letterHtml([
                ["Staff", L.name], ["Previous Branch", L.from], ["New Branch", L.to],
                ["Position", L.position || "—"], ["Effective Date", new Date(L.effectiveDate).toLocaleDateString()],
                ["Reason", L.reason || "—"], ["Approved By", L.approvedBy],
            ]), "#5C67F2");
            setStaffId(""); setQ(""); setReason("");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Transfer failed"),
    });

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 max-w-2xl space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <BranchPicker branches={branches} value={fromBranchId} onChange={(v: string) => { setFrom(v); setStaffId(""); setQ(""); }} label="From Branch" />
                <BranchPicker branches={branches} value={toBranchId} onChange={setTo} label="To Branch" />
            </div>
            <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Staff Member</label>
                {staffId ? (
                    <div className="flex items-center justify-between h-11 px-3 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-800">
                        {staff.find((s: any) => s._id === staffId)?.name || staff.find((s: any) => s._id === staffId)?.staffName}
                        <button onClick={() => { setStaffId(""); setQ(""); }} className="text-emerald-600 text-xs">change</button>
                    </div>
                ) : (
                    <div className="relative">
                        <input value={q} onChange={e => setQ(e.target.value)} disabled={!fromBranchId} placeholder={fromBranchId ? "Search staff name…" : "Pick the source branch first"} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm disabled:bg-slate-50 focus:outline-none focus:border-[#5C67F2]" />
                        {matches.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                                {matches.map((s: any) => (
                                    <button key={s._id} onClick={() => setStaffId(s._id)} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm font-bold text-slate-700">{s.name || s.staffName} <span className="text-xs text-slate-400 font-normal">{s.position || s.role}</span></button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Position (new)</label>
                    <input value={position} onChange={e => setPosition(e.target.value)} placeholder="optional" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" />
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Reason</label>
                    <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason" className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#5C67F2]" />
                </div>
            </div>
            <button onClick={() => run.mutate()} disabled={run.isPending || !staffId || !toBranchId} className="h-11 px-5 rounded-xl bg-[#5C67F2] text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-50">
                {run.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} Transfer & Print Letter
            </button>
        </div>
    );
}
