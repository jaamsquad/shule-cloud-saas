import { useState, useEffect, useRef } from "react";
import {
    Shield, Plus, Trash2, Save, Loader2, Check, ChevronDown, ChevronRight,
    X, Pencil, AlertCircle, ChevronLeft
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

// ── Permission module groups ────────────────────────────────────────────────
const MODULE_GROUPS = [
    {
        label: "School Management", modules: [
            { key: "dashboard",   label: "Dashboard" },
            { key: "students",    label: "Manage Students" },
            { key: "employees",   label: "Manage Employees" },
            { key: "classes",     label: "Manage Classes" },
            { key: "subjects",    label: "Subjects & Curriculum" },
            { key: "admissions",  label: "Admissions" },
        ]
    },
    {
        label: "Academics", modules: [
            { key: "academics_content", label: "Academic Content" },
            { key: "exams",             label: "Exams & Marks" },
            { key: "attendance",        label: "Attendance" },
            { key: "homework",          label: "Homework" },
            { key: "timetable",         label: "Timetable" },
            { key: "behaviour",         label: "Behaviour & Skills" },
            { key: "question_paper",    label: "Question Papers" },
            { key: "certificates",      label: "Certificates" },
        ]
    },
    {
        label: "Finance", modules: [
            { key: "fees",     label: "Fees Collection" },
            { key: "accounts", label: "Accounts & Chart" },
            { key: "salary",   label: "Salary Management" },
        ]
    },
    {
        label: "Communication & Learning", modules: [
            { key: "communications", label: "Announcements & SMS" },
            { key: "live_class",     label: "Live Class / Meeting" },
        ]
    },
    {
        label: "Operations", modules: [
            { key: "library",   label: "Library" },
            { key: "hostel",    label: "Hostel" },
            { key: "transport", label: "Transport" },
            { key: "pos",       label: "Point of Sale" },
        ]
    },
    {
        label: "Reports & Administration", modules: [
            { key: "reports",      label: "Reports" },
            { key: "integrations", label: "Integrations" },
            { key: "settings",     label: "General Settings" },
            { key: "roles",        label: "Roles & Permissions" },
        ]
    },
];

const ALL_MODULE_KEYS = MODULE_GROUPS.flatMap(g => g.modules.map(m => m.key));

// ── Seed system roles (fallback if DB empty) ─────────────────────────────────
const SEED_ROLES = [
    { name: "School Admin", key: "school_admin", color: "#5C67F2", isSystem: true },
    { name: "Teacher",      key: "teacher",      color: "#10B981", isSystem: true },
    { name: "Accountant",   key: "accountant",   color: "#F59E0B", isSystem: true },
    { name: "Principal",    key: "principal",    color: "#8B5CF6", isSystem: true },
];

const DEFAULT_PERMS: Record<string, string[]> = {
    school_admin: ALL_MODULE_KEYS,
    teacher:      ["dashboard","students","classes","subjects","academics_content","exams","attendance","homework","timetable","behaviour","question_paper","live_class","communications"],
    accountant:   ["dashboard","fees","accounts","salary","reports"],
    principal:    ["dashboard","students","employees","classes","subjects","academics_content","exams","attendance","fees","communications","reports","timetable","homework","behaviour","certificates"],
};

const ROLE_COLORS = ["#5C67F2","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#14B8A6","#F97316","#6366F1","#84CC16"];

// ── Helpers ──────────────────────────────────────────────────────────────────
function slugify(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export default function RolesPermissions() {
    const qc = useQueryClient();

    // Roles
    const { data: dbRoles = [], isLoading: loadingRoles } = useQuery<any[]>({
        queryKey: ["roles_list"],
        queryFn: async () => (await api.get("/roles")).data || [],
    });

    // Permissions matrix
    const { data: savedPerms } = useQuery<any>({
        queryKey: ["role_permissions"],
        queryFn: async () => {
            const r = await api.get("/role_permissions");
            return Array.isArray(r.data) ? r.data[0] : null;
        },
    });

    const [permsId, setPermsId] = useState<string | null>(null);
    const [matrix, setMatrix] = useState<Record<string, string[]>>({});
    const [isDirty, setIsDirty] = useState(false);
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    // Add-role modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [newRoleName, setNewRoleName] = useState("");
    const [newRoleColor, setNewRoleColor] = useState(ROLE_COLORS[0]);
    const [newRoleDesc, setNewRoleDesc] = useState("");
    const [addingRole, setAddingRole] = useState(false);

    // Edit-role inline
    const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
    const [editRoleName, setEditRoleName] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    // Merge DB roles with seed roles so we always show something
    const roles = dbRoles.length > 0
        ? dbRoles
        : SEED_ROLES.map(r => ({ _id: r.key, ...r }));

    // Load saved permissions into state
    useEffect(() => {
        if (!savedPerms) return;
        if (savedPerms._id) setPermsId(savedPerms._id);
        if (savedPerms.permissions) {
            setMatrix(prev => {
                const next = { ...prev };
                Object.entries(savedPerms.permissions as Record<string, string[]>).forEach(([k, v]) => {
                    next[k] = v;
                });
                return next;
            });
        }
    }, [savedPerms]);

    // Populate default perms for new roles not yet in DB
    useEffect(() => {
        if (roles.length === 0) return;
        setMatrix(prev => {
            const next = { ...prev };
            roles.forEach((r: any) => {
                const key = r.key || r._id;
                if (!next[key]) next[key] = DEFAULT_PERMS[key] || ["dashboard"];
            });
            return next;
        });
    }, [dbRoles]);

    // ── Save mutations ────────────────────────────────────────────────────────
    const saveMut = useMutation({
        mutationFn: (p: any) => permsId
            ? api.patch(`/role_permissions/${permsId}`, p)
            : api.post("/role_permissions", p),
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ["role_permissions"] });
            if (!permsId) setPermsId(res.data?.id || res.data?._id);
            toast.success("Permissions saved successfully");
            setIsDirty(false);
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to save"),
    });

    const addRoleMut = useMutation({
        mutationFn: (role: any) => api.post("/roles", role),
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ["roles_list"] });
            const newKey = res.data?.key || slugify(newRoleName);
            setMatrix(prev => ({ ...prev, [newKey]: ["dashboard"] }));
            toast.success(`Role "${newRoleName}" created`);
            setShowAddModal(false);
            setNewRoleName(""); setNewRoleColor(ROLE_COLORS[0]); setNewRoleDesc("");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to create role"),
    });

    const deleteRoleMut = useMutation({
        mutationFn: (id: string) => api.delete(`/roles/${id}`),
        onSuccess: (_, id) => {
            qc.invalidateQueries({ queryKey: ["roles_list"] });
            toast.success("Role deleted");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Failed to delete"),
    });

    const updateRoleMut = useMutation({
        mutationFn: ({ id, data }: any) => api.patch(`/roles/${id}`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["roles_list"] });
            setEditingRoleId(null);
            toast.success("Role updated");
        },
    });

    // ── Matrix helpers ────────────────────────────────────────────────────────
    const togglePerm = (roleKey: string, modKey: string) => {
        setMatrix(prev => {
            const cur = prev[roleKey] || [];
            const next = cur.includes(modKey) ? cur.filter(k => k !== modKey) : [...cur, modKey];
            return { ...prev, [roleKey]: next };
        });
        setIsDirty(true);
    };

    const toggleGroupAll = (roleKey: string, groupModules: string[], allChecked: boolean) => {
        setMatrix(prev => {
            const cur = prev[roleKey] || [];
            let next: string[];
            if (allChecked) {
                next = cur.filter(k => !groupModules.includes(k));
            } else {
                next = [...new Set([...cur, ...groupModules])];
            }
            return { ...prev, [roleKey]: next };
        });
        setIsDirty(true);
    };

    const toggleColAll = (roleKey: string) => {
        setMatrix(prev => {
            const cur = prev[roleKey] || [];
            const next = cur.length === ALL_MODULE_KEYS.length ? ["dashboard"] : [...ALL_MODULE_KEYS];
            return { ...prev, [roleKey]: next };
        });
        setIsDirty(true);
    };

    const groupStatus = (roleKey: string, groupModules: string[]) => {
        const cur = matrix[roleKey] || [];
        const count = groupModules.filter(k => cur.includes(k)).length;
        if (count === 0) return "none";
        if (count === groupModules.length) return "all";
        return "some";
    };

    const handleAddRole = () => {
        if (!newRoleName.trim()) { toast.error("Role name is required"); return; }
        addRoleMut.mutate({
            name: newRoleName.trim(),
            key: slugify(newRoleName.trim()),
            color: newRoleColor,
            description: newRoleDesc.trim(),
            isSystem: false,
            createdAt: new Date().toISOString(),
        });
    };

    return (
        <div className="flex-1 bg-[#F8FAFC] min-h-screen font-sans">

            {/* ── Sticky header ───────────────────────────────────────────── */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-[#5C67F2]" />
                    <div>
                        <h1 className="text-base font-black text-gray-900">Roles & Permissions</h1>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            {roles.length} role{roles.length !== 1 ? "s" : ""} · matrix view
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#5C67F2] hover:bg-[#4a54c4] text-white text-sm font-bold rounded-lg shadow-sm transition-all">
                        <Plus className="w-4 h-4" /> Add Role
                    </button>
                    <button
                        onClick={() => saveMut.mutate({ permissions: matrix })}
                        disabled={saveMut.isPending || !isDirty}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                            isDirty
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }`}>
                        {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isDirty ? "Save Changes" : "Saved"}
                    </button>
                </div>
            </div>

            {/* ── Matrix Table ─────────────────────────────────────────────── */}
            <div className="p-6">
                {loadingRoles ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-[#5C67F2]" />
                    </div>
                ) : (
                    <div className="relative">
                        {/* Left scroll arrow */}
                        <button
                            onClick={() => { scrollRef.current && (scrollRef.current.scrollLeft -= 240); }}
                            className="absolute left-[248px] top-1/2 -translate-y-1/2 z-30 w-7 h-7 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center text-gray-500 hover:text-[#5C67F2] hover:border-[#5C67F2] transition-all hover:shadow-lg"
                            title="Scroll left">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {/* Right scroll arrow */}
                        <button
                            onClick={() => { scrollRef.current && (scrollRef.current.scrollLeft += 240); }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 z-30 w-7 h-7 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center text-gray-500 hover:text-[#5C67F2] hover:border-[#5C67F2] transition-all hover:shadow-lg"
                            title="Scroll right">
                            <ChevronRight className="w-4 h-4" />
                        </button>

                        {/* Scrollable table wrapper */}
                        <div
                            ref={scrollRef}
                            className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white scroll-smooth"
                            style={{ scrollbarWidth: "thin", scrollbarColor: "#5C67F2 #f1f5f9" }}>
                        <table className="border-collapse" style={{ minWidth: `${Math.max(700, 256 + roles.length * 150 + 56)}px` }}>
                            <thead>
                                <tr className="border-b border-gray-200">
                                    {/* Permission column — sticky */}
                                    <th className="w-64 min-w-[256px] px-4 py-3 text-left bg-gray-50 rounded-tl-xl sticky left-0 z-10 border-r border-gray-200 shadow-[2px_0_4px_rgba(0,0,0,0.04)]">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Permission</span>
                                    </th>

                                    {/* Role header cells */}
                                    {roles.map((role: any) => {
                                        const key = role.key || role._id;
                                        const allCount = (matrix[key] || []).length;
                                        const isEditing = editingRoleId === role._id;
                                        return (
                                            <th key={role._id} className="min-w-[140px] px-3 py-3 border-l border-gray-100 bg-gray-50 group"
                                                style={{ borderTop: `3px solid ${role.color || "#5C67F2"}` }}>
                                                <div className="flex flex-col items-center gap-1">
                                                    {isEditing ? (
                                                        <div className="flex items-center gap-1">
                                                            <input autoFocus value={editRoleName} onChange={e => setEditRoleName(e.target.value)}
                                                                onKeyDown={e => {
                                                                    if (e.key === "Enter") updateRoleMut.mutate({ id: role._id, data: { name: editRoleName, key: slugify(editRoleName) } });
                                                                    if (e.key === "Escape") setEditingRoleId(null);
                                                                }}
                                                                className="text-xs font-bold text-center border border-[#5C67F2] rounded px-2 py-0.5 w-24 focus:outline-none" />
                                                            <button onClick={() => updateRoleMut.mutate({ id: role._id, data: { name: editRoleName, key: slugify(editRoleName) } })}
                                                                className="text-emerald-600 hover:text-emerald-700"><Check className="w-3.5 h-3.5" /></button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs font-black text-gray-800">{role.name}</span>
                                                            {!role.isSystem && (
                                                                <button onClick={() => { setEditingRoleId(role._id); setEditRoleName(role.name); }}
                                                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#5C67F2] transition-all">
                                                                    <Pencil className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    {/* All-toggle + delete */}
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => toggleColAll(key)}
                                                            className="text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded border transition-all"
                                                            style={{ color: role.color || "#5C67F2", borderColor: `${role.color || "#5C67F2"}40`, backgroundColor: `${role.color || "#5C67F2"}10` }}>
                                                            {allCount === ALL_MODULE_KEYS.length ? "None" : "All"}
                                                        </button>
                                                        {!role.isSystem && (
                                                            <button onClick={() => { if (confirm(`Delete role "${role.name}"?`)) deleteRoleMut.mutate(role._id); }}
                                                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all">
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <span className="text-[9px] text-gray-400 font-bold">{allCount}/{ALL_MODULE_KEYS.length}</span>
                                                </div>
                                            </th>
                                        );
                                    })}

                                    {/* Add role column */}
                                    <th className="w-14 border-l border-gray-100 bg-gray-50 rounded-tr-xl">
                                        <button onClick={() => setShowAddModal(true)}
                                            className="w-full h-full flex items-center justify-center py-4 text-gray-300 hover:text-[#5C67F2] hover:bg-[#5C67F2]/5 transition-all">
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {MODULE_GROUPS.map((group) => {
                                    const isCollapsed = collapsed[group.label];
                                    const groupKeys = group.modules.map(m => m.key);
                                    return (
                                        <>
                                            {/* Group header row */}
                                            <tr key={`group-${group.label}`} className="bg-gray-50 border-y border-gray-100">
                                                <td className="w-64 min-w-[256px] px-4 py-2 sticky left-0 bg-gray-50 z-10 border-r border-gray-200 shadow-[2px_0_4px_rgba(0,0,0,0.04)]">
                                                    <button
                                                        onClick={() => setCollapsed(prev => ({ ...prev, [group.label]: !prev[group.label] }))}
                                                        className="flex items-center gap-2 text-xs font-black text-gray-600 hover:text-[#5C67F2] transition-colors">
                                                        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                        {group.label}
                                                        <span className="text-[9px] font-bold text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">{group.modules.length}</span>
                                                    </button>
                                                </td>
                                                {roles.map((role: any) => {
                                                    const key = role.key || role._id;
                                                    const status = groupStatus(key, groupKeys);
                                                    return (
                                                        <td key={role._id} className="px-3 py-2 border-l border-gray-100 text-center">
                                                            <button
                                                                onClick={() => toggleGroupAll(key, groupKeys, status === "all")}
                                                                className={`w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-all ${
                                                                    status === "all"
                                                                        ? "border-transparent"
                                                                        : status === "some"
                                                                        ? "border-gray-300"
                                                                        : "border-gray-200 bg-transparent"
                                                                }`}
                                                                style={status === "all" ? { backgroundColor: role.color || "#5C67F2", borderColor: role.color || "#5C67F2" } : {}}>
                                                                {status === "all" && <Check className="w-3 h-3 text-white" />}
                                                                {status === "some" && <span className="w-2 h-0.5 bg-gray-400 rounded-full" />}
                                                            </button>
                                                        </td>
                                                    );
                                                })}
                                                <td className="border-l border-gray-100" />
                                            </tr>

                                            {/* Module rows */}
                                            {!isCollapsed && group.modules.map((mod, modIdx) => (
                                                <tr key={mod.key} className={`border-b border-gray-50 hover:bg-[#5C67F2]/2 transition-colors group/row ${modIdx % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                                                    <td className={`w-64 min-w-[256px] px-4 py-2.5 sticky left-0 z-10 border-r border-gray-200 shadow-[2px_0_4px_rgba(0,0,0,0.04)] ${modIdx % 2 === 0 ? "bg-white" : "bg-gray-50/30"} group-hover/row:bg-[#5C67F2]/5`}>
                                                        <span className="text-xs text-gray-600 font-medium pl-5">{mod.label}</span>
                                                    </td>
                                                    {roles.map((role: any) => {
                                                        const key = role.key || role._id;
                                                        const checked = (matrix[key] || []).includes(mod.key);
                                                        return (
                                                            <td key={role._id} className="px-3 py-2.5 border-l border-gray-100 text-center">
                                                                <button
                                                                    onClick={() => togglePerm(key, mod.key)}
                                                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-all ${
                                                                        checked ? "border-transparent" : "border-gray-200 hover:border-gray-400 bg-transparent"
                                                                    }`}
                                                                    style={checked ? { backgroundColor: role.color || "#5C67F2", borderColor: role.color || "#5C67F2" } : {}}>
                                                                    {checked && <Check className="w-3 h-3 text-white" />}
                                                                </button>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="border-l border-gray-100" />
                                                </tr>
                                            ))}
                                        </>
                                    );
                                })}
                            </tbody>
                        </table>
                        </div>
                    </div>
                )}

                {/* Scroll hint — shows when roles exceed visible width */}
                {roles.length > 4 && (
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400 font-bold pl-1">
                        <ChevronLeft className="w-3 h-3" />
                        <span>Scroll horizontally to see all {roles.length} roles</span>
                        <ChevronRight className="w-3 h-3" />
                    </div>
                )}

                {/* Info */}
                <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 font-medium">
                        Permissions control which sidebar modules each role can see. Changes take effect on next login.
                        <strong> School Admin</strong> always has full access. Click <strong>Save Changes</strong> after editing.
                    </p>
                </div>
            </div>

            {/* ── Add Role Modal ──────────────────────────────────────────── */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-7 relative">
                        <button onClick={() => setShowAddModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: newRoleColor }}>
                                <Shield className="w-4 h-4 text-white" />
                            </div>
                            <h2 className="text-lg font-black text-gray-900">Create New Role</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1.5">Role Name *</label>
                                <input
                                    autoFocus
                                    value={newRoleName}
                                    onChange={e => setNewRoleName(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleAddRole()}
                                    placeholder="e.g. Head Teacher, Lab Technician"
                                    className="w-full h-11 px-4 border border-gray-200 rounded-lg focus:outline-none focus:border-[#5C67F2] text-sm font-medium text-gray-700"
                                />
                                {newRoleName && (
                                    <p className="text-[10px] text-gray-400 mt-1 font-mono">Key: {slugify(newRoleName)}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1.5">Description (optional)</label>
                                <input value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)}
                                    placeholder="e.g. Manages lab resources and student experiments"
                                    className="w-full h-11 px-4 border border-gray-200 rounded-lg focus:outline-none focus:border-[#5C67F2] text-sm font-medium text-gray-700" />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-2">Role Color</label>
                                <div className="flex gap-2 flex-wrap">
                                    {ROLE_COLORS.map(c => (
                                        <button key={c} onClick={() => setNewRoleColor(c)}
                                            className={`w-8 h-8 rounded-full border-4 transition-all ${newRoleColor === c ? "border-gray-800 scale-110" : "border-transparent hover:scale-105"}`}
                                            style={{ backgroundColor: c }} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-7">
                            <button onClick={() => setShowAddModal(false)}
                                className="flex-1 h-11 border border-gray-200 text-gray-600 font-bold text-sm rounded-lg hover:bg-gray-50 transition-all">
                                Cancel
                            </button>
                            <button onClick={handleAddRole} disabled={addRoleMut.isPending || !newRoleName.trim()}
                                className="flex-1 h-11 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-bold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                                {addRoleMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Create Role
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
