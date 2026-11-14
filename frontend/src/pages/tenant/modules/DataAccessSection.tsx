import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Check } from "lucide-react";

/**
 * Data Access Control editor — embedded in the employee add/edit form.
 * Lets the admin restrict which students & staff this user can see system-wide.
 * The value is stored on staff.dataAccess and enforced server-side.
 */
export interface DataAccess {
    studentScope?: "all" | "classes" | "streams" | "students" | "none";
    classIds?: string[];
    streamIds?: string[];
    studentIds?: string[];
    staffScope?: "all" | "direct" | "tree" | "departments" | "roles" | "staff" | "none";
    departments?: string[];
    roles?: string[];
    staffIds?: string[];
}

const STUDENT_SCOPES = [
    { v: "all", l: "All Students" },
    { v: "classes", l: "Selected Classes" },
    { v: "streams", l: "Selected Streams" },
    { v: "students", l: "Selected Students" },
    { v: "none", l: "No Students" },
];
const STAFF_SCOPES = [
    { v: "all", l: "All Staff" },
    { v: "direct", l: "Staff Reporting To Me (direct)" },
    { v: "tree", l: "Entire Reporting Tree" },
    { v: "departments", l: "Selected Departments" },
    { v: "roles", l: "Selected Roles" },
    { v: "staff", l: "Selected Employees" },
    { v: "none", l: "No Staff" },
];

export default function DataAccessSection({ value, onChange }: { value: DataAccess; onChange: (v: DataAccess) => void }) {
    const v = value || {};
    const set = (patch: Partial<DataAccess>) => onChange({ ...v, ...patch });

    const { data: classes = [] } = useQuery({ queryKey: ["da_classes"], queryFn: async () => { try { return (await api.get("/classes")).data || []; } catch { return []; } } });
    const { data: streams = [] } = useQuery({ queryKey: ["da_streams"], queryFn: async () => { try { return (await api.get("/streams")).data || []; } catch { return []; } } });
    const { data: students = [] } = useQuery({ queryKey: ["da_students"], queryFn: async () => { try { return (await api.get("/students")).data || []; } catch { return []; } }, enabled: v.studentScope === "students" });
    const { data: staff = [] } = useQuery({ queryKey: ["da_staff"], queryFn: async () => { try { return (await api.get("/staff")).data || []; } catch { return []; } }, enabled: v.staffScope === "staff" });
    const { data: departments = [] } = useQuery({ queryKey: ["da_departments"], queryFn: async () => { try { return (await api.get("/departments")).data || []; } catch { return []; } } });

    const classOpts = classes.map((c: any) => ({ id: String(c._id), label: c.name || c.levelName || c.className || "Class" }));
    const streamOpts = streams.map((s: any) => ({ id: String(s._id), label: s.name || s.streamName || "Stream" }));
    const studentOpts = students.map((s: any) => ({ id: String(s._id), label: s.studentName || `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Student" }));
    const staffOpts = staff.map((s: any) => ({ id: String(s._id), label: s.employeeName || s.name || "Staff" }));
    const deptOpts = departments.map((d: any) => ({ id: d.name, label: d.name }));
    const roleOpts = Array.from(new Set(staff.map((s: any) => s.designation).filter(Boolean))).map((r: any) => ({ id: r, label: r }));

    return (
        <div className="space-y-6">
            {/* Student Access */}
            <div>
                <h4 className="text-sm font-black text-slate-700 mb-2">Student Access</h4>
                <p className="text-[11px] text-slate-400 mb-2">Controls which students this user sees everywhere (lists, attendance, fees, reports, search).</p>
                <select value={v.studentScope || "all"} onChange={e => set({ studentScope: e.target.value as any })}
                    className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]">
                    {STUDENT_SCOPES.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
                {v.studentScope === "classes" && <Multi label="Classes" options={classOpts} selected={v.classIds || []} onToggle={ids => set({ classIds: ids })} />}
                {v.studentScope === "streams" && <Multi label="Streams" options={streamOpts} selected={v.streamIds || []} onToggle={ids => set({ streamIds: ids })} />}
                {v.studentScope === "students" && <Multi label="Students" options={studentOpts} selected={v.studentIds || []} onToggle={ids => set({ studentIds: ids })} searchable />}
            </div>

            {/* Staff Access */}
            <div>
                <h4 className="text-sm font-black text-slate-700 mb-2">Staff Access</h4>
                <p className="text-[11px] text-slate-400 mb-2">Controls which staff this user can manage. "Reporting To Me" uses the Reports To field automatically.</p>
                <select value={v.staffScope || "all"} onChange={e => set({ staffScope: e.target.value as any })}
                    className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#5C67F2]">
                    {STAFF_SCOPES.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
                {v.staffScope === "departments" && <Multi label="Departments" options={deptOpts} selected={v.departments || []} onToggle={ids => set({ departments: ids })} />}
                {v.staffScope === "roles" && <Multi label="Roles" options={roleOpts} selected={v.roles || []} onToggle={ids => set({ roles: ids })} />}
                {v.staffScope === "staff" && <Multi label="Employees" options={staffOpts} selected={v.staffIds || []} onToggle={ids => set({ staffIds: ids })} searchable />}
            </div>
        </div>
    );
}

function Multi({ label, options, selected, onToggle, searchable }: { label: string; options: { id: string; label: string }[]; selected: string[]; onToggle: (ids: string[]) => void; searchable?: boolean }) {
    const toggle = (id: string) => onToggle(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
    return (
        <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wide">{label}</span>
                <span className="text-[11px] text-slate-400">{selected.length} selected</span>
            </div>
            <div className="max-h-44 overflow-y-auto border border-slate-100 rounded-xl p-2 bg-slate-50/40 flex flex-wrap gap-1.5">
                {options.length === 0 && <span className="text-xs text-slate-400 px-2 py-1">No options</span>}
                {options.map(o => (
                    <button type="button" key={o.id} onClick={() => toggle(o.id)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${selected.includes(o.id) ? "bg-[#5C67F2] text-white border-[#5C67F2]" : "bg-white text-slate-600 border-slate-200 hover:border-[#5C67F2]"}`}>
                        {selected.includes(o.id) && <Check className="w-3 h-3 inline-block align-[-2px] mr-1" />}{o.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
