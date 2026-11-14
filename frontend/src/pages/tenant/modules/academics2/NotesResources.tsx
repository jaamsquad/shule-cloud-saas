import { useMemo, useState } from "react";
import {
    ArrowDownWideNarrow, ArrowLeft, ArrowRight, ArrowUpRight, Bell, BookMarked, BookOpen,
    BookOpenCheck, Check, ChevronDown, ClipboardCheck, Download, ExternalLink,
    Eye, File, FileDown, FileText, GraduationCap, Home,
    Loader2, Menu, MessageCircle, NotebookTabs, Pencil, Play, Search,
    SlidersHorizontal, Sparkles, Trash2, Video, X, Link2, Users,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { API_ORIGIN } from "@/lib/config";
import FileViewer from "@/portals/FileViewer";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";

const TYPES = [
    { key: "Notes", icon: FileText, tone: "blue" },
    { key: "Worksheet", icon: File, tone: "violet" },
    { key: "Video", icon: Video, tone: "rose" },
    { key: "External Link", icon: Link2, tone: "emerald" },
    { key: "Document", icon: FileDown, tone: "amber" },
    { key: "Lesson Page", icon: BookOpen, tone: "indigo" },
    { key: "Other", icon: ExternalLink, tone: "slate" },
];

const NAV_ITEMS = [
    { label: "Online Library", path: "/academics/resources", icon: BookOpen },
];

const TONE_CLASS: Record<string, { text: string; bg: string; soft: string }> = {
    blue: { text: "text-blue-700", bg: "bg-blue-600", soft: "bg-blue-50" },
    violet: { text: "text-violet-700", bg: "bg-violet-600", soft: "bg-violet-50" },
    rose: { text: "text-rose-700", bg: "bg-rose-600", soft: "bg-rose-50" },
    emerald: { text: "text-emerald-700", bg: "bg-emerald-600", soft: "bg-emerald-50" },
    amber: { text: "text-amber-700", bg: "bg-amber-500", soft: "bg-amber-50" },
    indigo: { text: "text-indigo-700", bg: "bg-indigo-600", soft: "bg-indigo-50" },
    slate: { text: "text-slate-700", bg: "bg-slate-600", soft: "bg-slate-100" },
};

const getVideoEmbedUrl = (url: string) => {
    if (!url) return "";
    const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/i);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
    const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
    return url;
};

function SidebarContent({
    collapsed,
    schoolName,
    schoolLogo,
    schoolId,
    currentPath,
    onNavigate,
    onBack,
}: {
    collapsed?: boolean;
    schoolName: string;
    schoolLogo?: string;
    schoolId?: string;
    currentPath: string;
    onNavigate: (path: string) => void;
    onBack: () => void;
}) {
    return (
        <div className="flex h-full flex-col text-white">
            <div className={`flex items-center gap-3 px-5 py-7 ${collapsed ? "justify-center px-2" : ""}`}>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sky-300 ring-1 ring-white/10">
                    {schoolLogo ? <img src={schoolLogo} alt="School logo" className="h-full w-full rounded-2xl object-contain p-1" /> : <GraduationCap className="h-7 w-7" />}
                </div>
                {!collapsed && <div className="min-w-0">
                    <p className="text-lg font-extrabold tracking-tight">Shule<span className="text-sky-300">Cloud</span></p>
                    <p className="mt-0.5 text-[11px] font-medium tracking-wide text-blue-100/75">Learn · Manage · Grow</p>
                </div>}
            </div>

            <button onClick={onBack} title={collapsed ? "Back to dashboard" : undefined}
                className={`mx-3 mb-5 flex items-center gap-3 rounded-xl border border-white/15 px-3.5 py-3 text-left text-sm font-semibold text-blue-100 transition hover:bg-white/10 hover:text-white ${collapsed ? "justify-center px-0" : ""}`}>
                <ArrowLeft className="h-[19px] w-[19px] shrink-0" />
                {!collapsed && <span>Back to dashboard</span>}
            </button>

            {!collapsed && <p className="px-6 pb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-blue-200/55">Learning space</p>}
            <nav className="space-y-1 px-3" aria-label="Learning library navigation">
                {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
                    const active = path === currentPath;
                    return <button key={path} title={collapsed ? label : undefined} onClick={() => onNavigate(path)}
                        className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold transition-all ${collapsed ? "justify-center px-0" : ""} ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-950/25" : "text-blue-100/80 hover:bg-white/10 hover:text-white"}`}>
                        <Icon className={`h-[19px] w-[19px] shrink-0 ${active ? "text-white" : "text-blue-200/85 group-hover:text-white"}`} />
                        {!collapsed && <span>{label}</span>}
                        {!collapsed && active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sky-300" />}
                    </button>;
                })}
            </nav>

            <div className="mt-auto p-3">
                {!collapsed ? <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3.5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10">
                            {schoolLogo ? <img src={schoolLogo} alt="" className="h-full w-full object-contain p-1" /> : <Home className="h-5 w-5 text-sky-200" />}
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-white">{schoolName}</p>
                            <p className="mt-0.5 truncate text-[10px] text-blue-100/60">{schoolId ? `School ID: ${schoolId}` : "School workspace"}</p>
                        </div>
                    </div>
                </div> : <div className="flex justify-center rounded-xl p-2" title={schoolName}><Home className="h-5 w-5 text-blue-200" /></div>}
                {!collapsed && <p className="px-2 pt-4 text-[10px] text-blue-100/45">© ShuleCloud · Education for all</p>}
            </div>
        </div>
    );
}

export default function NotesResources() {
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [classFilter, setClassFilter] = useState("ALL");
    const [subjectFilter, setSubjectFilter] = useState("ALL");
    const [sortBy, setSortBy] = useState("newest");
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [videoOpen, setVideoOpen] = useState<{ src: string; title: string } | null>(null);
    const [viewing, setViewing] = useState<{ src: string; name?: string; title?: string } | null>(null);
    const [preview, setPreview] = useState<any | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const navigate = useNavigate();
    const qc = useQueryClient();
    const currentUser = useCurrentUser();

    const { data: resources = [], isLoading } = useQuery({
        queryKey: ["academic_resources"],
        queryFn: async () => { const r = await api.get("/academic_resources"); return Array.isArray(r.data) ? r.data : []; },
    });
    const { data: subjects = [] } = useQuery({
        queryKey: ["subjects"],
        queryFn: async () => { const r = await api.get("/subjects"); return Array.isArray(r.data) ? r.data : []; },
    });
    const { data: classes = [] } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => { const r = await api.get("/classes"); return Array.isArray(r.data) ? r.data : []; },
    });
    const { data: profileData } = useQuery({
        queryKey: ["tenant_profile_global"],
        queryFn: async () => { const r = await api.get("/auth/tenant/profile"); return Array.isArray(r.data) ? r.data[0] : r.data; },
    });
    const { data: globalResources = [] } = useQuery({
        queryKey: ["global_resources"],
        queryFn: async () => { const r = await api.get("/global-resources"); return Array.isArray(r.data) ? r.data : []; },
    });
    const delMut = useMutation({
        mutationFn: (id: string) => api.delete(`/academic_resources/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["academic_resources"] }); toast.success("Resource removed"); setConfirmDelete(null); },
    });

    const schoolName = profileData?.name || "Your School";
    const schoolLogo = profileData?.logo || "";
    const schoolId = profileData?.shulecloudId || "";
    const currentPath = window.location.pathname === "/lms/lessons" ? "/academics/resources" : window.location.pathname;
    const initials = (currentUser?.name || "School Admin").split(/\s+/).map((part: string) => part[0]).slice(0, 2).join("").toUpperCase();
    const getTypeConfig = (type: string) => TYPES.find(t => t.key === type) || TYPES[TYPES.length - 1];
    const isViewable = (src?: string, name?: string) => /\.(pdf|png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(name || src || "") || /^data:(application\/pdf|image\/)/i.test(src || "");
    const resolveGlobalFileUrl = (path: string) => /^https?:\/\//i.test(path) ? path : `${API_ORIGIN.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
    const getLabel = (item: any, fields: string[]) => {
        if (typeof item === "string") return item;
        return fields.map(field => item?.[field]).find(Boolean) || "";
    };

    const classOptions = useMemo(() => Array.from(new Set([
        ...classes.map((item: any) => getLabel(item, ["name", "className", "title"])),
        ...resources.map((item: any) => item.className),
    ].filter(Boolean))), [classes, resources]);
    const subjectOptions = useMemo(() => Array.from(new Set([
        ...subjects.map((item: any) => getLabel(item, ["name", "subjectName", "title"])),
        ...resources.map((item: any) => item.subjectName),
    ].filter(Boolean))), [subjects, resources]);
    const filtered = useMemo(() => {
        const list = resources.filter((item: any) => {
            const term = search.trim().toLowerCase();
            const matchSearch = !term || [item.title, item.subjectName, item.className, item.description].some(value => (value || "").toLowerCase().includes(term));
            const matchType = typeFilter === "ALL" || item.type === typeFilter;
            const matchClass = classFilter === "ALL" || item.className === classFilter;
            const matchSubject = subjectFilter === "ALL" || item.subjectName === subjectFilter;
            return matchSearch && matchType && matchClass && matchSubject;
        });
        return list.sort((a: any, b: any) => {
            if (sortBy === "oldest") return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
            if (sortBy === "title") return (a.title || "").localeCompare(b.title || "");
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
    }, [resources, search, typeFilter, classFilter, subjectFilter, sortBy]);

    const navigateFromSidebar = (path: string) => {
        setMobileMenuOpen(false);
        navigate(path);
    };
    const goBack = () => {
        const historyIndex = window.history.state?.idx;
        if (typeof historyIndex === "number" && historyIndex > 0) navigate(-1);
        else navigate("/dashboard");
    };
    const typeCount = (key: string) => resources.filter((item: any) => item.type === key).length;
    const resetFilters = () => { setTypeFilter("ALL"); setClassFilter("ALL"); setSubjectFilter("ALL"); setSearch(""); };

    return (
        <div className="flex min-h-full bg-[#f4f7fc] text-slate-900">
            {mobileMenuOpen && <button data-app-chrome aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden" onClick={() => setMobileMenuOpen(false)} />}
            <aside data-app-chrome className={`fixed inset-y-0 left-0 z-50 w-[270px] bg-[#102b5b] shadow-2xl transition-transform duration-300 lg:hidden ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="absolute right-3 top-3">
                    <button onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-blue-100 hover:bg-white/10"><X className="h-5 w-5" /></button>
                </div>
                <SidebarContent schoolName={schoolName} schoolLogo={schoolLogo} schoolId={schoolId} currentPath={currentPath} onNavigate={navigateFromSidebar} onBack={goBack} />
            </aside>

            <div data-app-chrome className={`hidden shrink-0 bg-[#102b5b] transition-[width] duration-300 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col ${sidebarCollapsed ? "lg:w-[82px]" : "lg:w-[260px]"}`}>
                <SidebarContent collapsed={sidebarCollapsed} schoolName={schoolName} schoolLogo={schoolLogo} schoolId={schoolId} currentPath={currentPath} onNavigate={navigateFromSidebar} onBack={goBack} />
            </div>

            <div className="min-w-0 flex-1">
                <header data-app-chrome className="sticky top-0 z-30 flex h-[68px] items-center gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
                    <button onClick={() => { if (window.innerWidth >= 1024) setSidebarCollapsed(value => !value); else setMobileMenuOpen(true); }} aria-label="Toggle navigation"
                        className="rounded-xl p-2 text-[#16376e] transition hover:bg-blue-50"><Menu className="h-5 w-5" /></button>
                    <button onClick={goBack} className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-bold text-[#16376e] transition hover:bg-blue-50 sm:px-3"><ArrowLeft className="h-4 w-4" /><span>Back</span></button>
                    <div className="hidden items-center gap-2 text-sm text-slate-400 sm:flex"><span>Academics</span><span>/</span><span className="font-bold text-slate-800">Online Library</span></div>
                    <div className="ml-auto flex items-center gap-3 sm:gap-5">
                        <button className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-50" aria-label="Notifications"><Bell className="h-5 w-5" /><span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" /></button>
                        <div className="hidden h-8 w-px bg-slate-200 sm:block" />
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-extrabold text-blue-800">{initials}</div>
                            <div className="hidden sm:block">
                                <p className="max-w-[180px] truncate text-xs font-bold text-slate-800">{currentUser?.name || "School Admin"}</p>
                                <p className="text-[10px] capitalize text-slate-400">{currentUser?.role?.replace(/_/g, " ") || "School administrator"}</p>
                            </div>
                            <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
                        </div>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-slate-500 sm:hidden"><Home className="h-4 w-4 text-blue-700" /><span>Academics</span><span>/</span><span className="font-semibold text-slate-800">Library</span></div>
                        <div className="hidden sm:block"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Teaching resources</p><p className="mt-1 text-sm text-slate-500">Find, organize and share class materials.</p></div>
                        <button onClick={() => navigate("/academics/resources/new")} className="ml-auto inline-flex h-11 items-center gap-2 rounded-xl bg-[#102b5b] px-4 text-xs font-bold uppercase tracking-wide text-white shadow-lg shadow-blue-950/10 transition hover:bg-blue-800 sm:px-5">
                            <span className="text-lg leading-none">+</span><span>Create lesson page</span>
                        </button>
                    </div>

                    <section className="relative isolate mb-6 overflow-hidden rounded-[26px] bg-gradient-to-r from-[#e8f0ff] via-[#f4f7ff] to-[#dcecff] px-5 py-7 shadow-sm ring-1 ring-blue-100 sm:px-8 sm:py-8 lg:min-h-[238px] lg:px-10">
                        <div className="absolute -right-16 -top-24 -z-10 h-72 w-72 rounded-full bg-blue-300/30 blur-3xl" />
                        <div className="absolute right-[28%] top-10 -z-10 h-36 w-36 rounded-full bg-white/60 blur-2xl" />
                        <div className="relative z-10 max-w-[690px] lg:py-1">
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-800 ring-1 ring-blue-100"><BookOpenCheck className="h-3.5 w-3.5" /> Your teaching library</div>
                            <h1 className="max-w-xl text-3xl font-extrabold leading-[1.08] tracking-tight text-[#102b5b] sm:text-4xl lg:text-[42px]">Notes &amp; Resources</h1>
                            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">All your lesson pages, worksheets, videos and class materials in one easy place.</p>
                            <div className="mt-5 flex max-w-[690px] flex-col gap-2 rounded-2xl bg-white p-2 shadow-lg shadow-blue-900/10 ring-1 ring-blue-100 sm:flex-row sm:items-center">
                                <div className="flex min-w-0 flex-1 items-center gap-3 px-3"><Search className="h-5 w-5 shrink-0 text-[#16376e]" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search notes, subjects or topics..." className="h-10 min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" /></div>
                                <button onClick={() => document.getElementById("resource-catalog")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="h-10 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white transition hover:bg-blue-700">Search library</button>
                            </div>
                        </div>
                        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-3 hidden h-full w-[38%] items-end justify-center overflow-hidden lg:flex">
                            <div className="relative mb-[-14px] h-[205px] w-[330px]">
                                <div className="absolute bottom-[15px] right-5 h-[52px] w-[270px] -rotate-2 rounded-lg border-b-[8px] border-[#b65d35] bg-gradient-to-r from-[#f4c7a1] via-[#e89b69] to-[#b85835] shadow-xl"><div className="absolute inset-y-1 left-4 w-2 rounded bg-white/35" /></div>
                                <div className="absolute bottom-[66px] right-0 h-[52px] w-[290px] rotate-[2deg] rounded-lg border-b-[8px] border-[#19427a] bg-gradient-to-r from-[#2979ba] via-[#185c9d] to-[#123e75] shadow-xl"><div className="absolute inset-y-1 right-5 w-2 rounded bg-white/25" /></div>
                                <div className="absolute bottom-[116px] right-8 h-[50px] w-[250px] -rotate-[3deg] rounded-lg border-b-[8px] border-[#e2b743] bg-gradient-to-r from-[#fff0b3] via-[#f5d978] to-[#d8aa36] shadow-xl"><div className="absolute inset-y-1 left-5 w-2 rounded bg-white/55" /></div>
                                <div className="absolute bottom-[163px] right-12 flex h-[55px] w-[220px] rotate-[1deg] items-center justify-center rounded-t-xl rounded-b-md border-b-[7px] border-[#0d2a56] bg-gradient-to-r from-[#1e4c91] to-[#3478c0] shadow-xl"><BookOpen className="h-8 w-8 text-white/90" /></div>
                                <div className="absolute bottom-0 right-[-5px] h-8 w-[320px] rounded-[50%] bg-blue-900/15 blur-md" />
                            </div>
                        </div>
                    </section>

                    {globalResources.length > 0 && <section className="mb-6 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-5">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><GraduationCap className="h-5 w-5" /></span><div><h2 className="text-sm font-extrabold text-[#102b5b] sm:text-base">ShuleCloud Library</h2><p className="mt-0.5 text-[11px] text-slate-500">Curated resources shared with every school</p></div></div>
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold text-blue-700">{globalResources.length} shared</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {globalResources.map((resource: any) => {
                                const type = getTypeConfig(resource.type);
                                const palette = TONE_CLASS[type.tone];
                                const Icon = type.icon;
                                const fileUrl = resource.fileUrl ? resolveGlobalFileUrl(resource.fileUrl) : "";
                                return <article key={resource._id} className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-blue-200 hover:shadow-md">
                                    <div className={`relative flex h-16 items-center justify-center ${palette.soft}`}><Icon className={`h-6 w-6 ${palette.text}`} /><span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-600">{resource.type || "Resource"}</span></div>
                                    <div className="p-3.5"><h3 className="truncate text-sm font-bold text-[#102b5b]">{resource.title || "Untitled resource"}</h3><p className="mt-1 truncate text-[10px] font-semibold uppercase text-slate-400">{resource.subjectName || "All subjects"}{resource.className ? ` · ${resource.className}` : " · All grades"}</p>{resource.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{resource.description}</p>}
                                        <div className="mt-3 flex flex-wrap gap-2">{fileUrl && (isViewable(fileUrl, resource.fileName) ? <button onClick={() => setViewing({ src: fileUrl, name: resource.fileName, title: resource.title })} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-50 px-3 text-[10px] font-bold uppercase text-blue-700 hover:bg-blue-100"><Eye className="h-3.5 w-3.5" />Preview file</button> : <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-50 px-3 text-[10px] font-bold uppercase text-blue-700 hover:bg-blue-100"><Download className="h-3.5 w-3.5" />Open file</a>)}{!fileUrl && resource.url && <a href={resource.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-50 px-3 text-[10px] font-bold uppercase text-blue-700 hover:bg-blue-100"><ExternalLink className="h-3.5 w-3.5" />Open link</a>}{resource.videoUrl && <button onClick={() => setVideoOpen({ src: getVideoEmbedUrl(resource.videoUrl), title: resource.title })} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-50 px-3 text-[10px] font-bold uppercase text-blue-700 hover:bg-blue-100"><Video className="h-3.5 w-3.5" />Watch</button>}</div>
                                    </div>
                                </article>;
                            })}
                        </div>
                    </section>}

                    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_270px]">
                        <section id="resource-catalog" className="min-w-0 scroll-mt-24">
                            <div className="mb-4 flex items-end justify-between gap-3">
                                <div><h2 className="text-xl font-extrabold tracking-tight text-[#102b5b] sm:text-2xl">Explore resources</h2><p className="mt-1 text-xs text-slate-500 sm:text-sm">Browse the latest content shared with your school.</p></div>
                                <div className="hidden items-center gap-1.5 text-xs font-semibold text-blue-700 sm:flex"><BookMarked className="h-4 w-4" /> {resources.length} total</div>
                            </div>

                            <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
                                    <button onClick={() => setTypeFilter("ALL")} className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-bold transition ${typeFilter === "ALL" ? "bg-[#102b5b] text-white shadow-md" : "border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"}`}>All <span className="ml-1 opacity-70">({resources.length})</span></button>
                                    {TYPES.map(({ key, icon: Icon, tone }) => <button key={key} onClick={() => setTypeFilter(key)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-bold transition ${typeFilter === key ? `${TONE_CLASS[tone].soft} ${TONE_CLASS[tone].text} ring-1 ring-current` : "border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"}`}><Icon className="h-3.5 w-3.5" />{key}<span className="opacity-60">({typeCount(key)})</span></button>)}
                                </div>
                                <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center">
                                    <div className="flex items-center gap-2 text-slate-400"><SlidersHorizontal className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-wider">Filter by</span></div>
                                    <select value={classFilter} onChange={event => setClassFilter(event.target.value)} className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 sm:w-40">
                                        <option value="ALL">All classes</option>{classOptions.map(name => <option key={name} value={name}>{name}</option>)}
                                    </select>
                                    <select value={subjectFilter} onChange={event => setSubjectFilter(event.target.value)} className="h-10 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 sm:w-48">
                                        <option value="ALL">All subjects</option>{subjectOptions.map(name => <option key={name} value={name}>{name}</option>)}
                                    </select>
                                    <div className="flex items-center gap-2 sm:ml-auto"><ArrowDownWideNarrow className="h-4 w-4 text-slate-400" /><select value={sortBy} onChange={event => setSortBy(event.target.value)} className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 sm:w-36 sm:flex-none"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option></select></div>
                                    <span className="self-end pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:self-auto sm:pb-0">{filtered.length} shown</span>
                                </div>
                            </div>

                            {isLoading ? <div className="flex min-h-56 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-blue-600" />Loading your library...</div> : filtered.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Search className="h-6 w-6" /></div><h3 className="text-base font-bold text-slate-800">No resources found</h3><p className="mt-1 max-w-sm text-sm text-slate-500">Try changing your search or filters, or add a new lesson resource.</p><button onClick={resetFilters} className="mt-4 text-sm font-bold text-blue-700 hover:text-blue-900">Clear filters</button></div> : (
                                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                                    {filtered.map((res: any, index: number) => {
                                        const tc = getTypeConfig(res.type);
                                        const palette = TONE_CLASS[tc.tone];
                                        const Icon = tc.icon;
                                        const description = res.description || res.introduction || res.lessonNotes || "Open this resource to review its notes and teaching materials.";
                                        return <article key={res._id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/5">
                                            <div className={`relative flex h-[116px] items-center justify-center overflow-hidden ${palette.soft}`}>
                                                <div className={`absolute -right-5 -top-8 h-32 w-32 rounded-full opacity-60 ${palette.bg}`} style={{ filter: "blur(35px)" }} />
                                                <div className={`relative flex h-16 w-16 items-center justify-center rounded-[20px] bg-white shadow-md ring-1 ring-slate-200/60 ${palette.text}`}><Icon className="h-8 w-8" strokeWidth={1.8} /></div>
                                                <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-slate-600 shadow-sm">{res.type || "Resource"}</span>
                                                <span className="absolute bottom-3 left-3 text-[10px] font-semibold text-slate-500">{index + 1 < 10 ? `0${index + 1}` : index + 1} · Learning material</span>
                                            </div>
                                            <div className="flex min-h-[206px] flex-col p-4 sm:p-5">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0"><h3 className="truncate text-base font-extrabold text-[#102b5b]">{res.title || "Untitled resource"}</h3><p className="mt-1 truncate text-[11px] font-bold uppercase tracking-wide text-slate-400">{[res.className, res.subjectName].filter(Boolean).join(" · ") || "All classes · All subjects"}</p></div>
                                                    {res.isPublic === false && <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">STAFF ONLY</span>}
                                                </div>
                                                <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-slate-600">{description}</p>
                                                <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                                                    <button onClick={() => setPreview(res)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-50"><Eye className="h-4 w-4" /> Preview</button>
                                                    <div className="flex items-center gap-1.5">
                                                        {res.fileData && <a href={res.fileData} target="_blank" rel="noopener noreferrer" download={res.fileName} title="Download resource" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700"><Download className="h-4 w-4" /></a>}
                                                        <button onClick={() => navigate(`/academics/resources/${res._id}/edit`)} title="Edit resource" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition hover:bg-amber-50 hover:text-amber-600"><Pencil className="h-4 w-4" /></button>
                                                        {confirmDelete === res._id ? <><button onClick={() => delMut.mutate(res._id)} title="Confirm delete" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-rose-600 text-white"><Check className="h-4 w-4" /></button><button onClick={() => setConfirmDelete(null)} title="Cancel delete" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><X className="h-4 w-4" /></button></> : <button onClick={() => setConfirmDelete(res._id)} title="Delete resource" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}
                                                    </div>
                                                </div>
                                            </div>
                                        </article>;
                                    })}
                                </div>
                            )}
                        </section>

                        <aside className="space-y-4 xl:pt-[1px]">
                            <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                                <div className="flex items-center gap-2 border-b border-slate-100 pb-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Sparkles className="h-4 w-4" /></span><h2 className="text-sm font-extrabold text-[#102b5b]">Quick access</h2></div>
                                <div className="mt-2 space-y-1">
                                    {[
                                        { label: "Lesson plans", path: "/academics/lesson-plans", icon: NotebookTabs, color: "text-blue-600" },
                                        { label: "Assignments", path: "/academics/assignments", icon: ClipboardCheck, color: "text-indigo-600" },
                                        { label: "School notices", path: "/communications/announcements", icon: Bell, color: "text-amber-600" },
                                        { label: "Manage subjects", path: "/academics/subjects", icon: GraduationCap, color: "text-emerald-600" },
                                    ].map(({ label, path, icon: Icon, color }) => <button key={path} onClick={() => navigate(path)} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-blue-50"><Icon className={`h-4 w-4 ${color}`} />{label}<ArrowUpRight className="ml-auto h-3.5 w-3.5 text-slate-300" /></button>)}
                                </div>
                            </section>
                            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#123b78] via-[#155ac0] to-[#2c83ef] p-5 text-white shadow-lg shadow-blue-900/15">
                                <div className="absolute -bottom-12 -right-10 h-36 w-36 rounded-full bg-sky-200/20 blur-2xl" />
                                <div className="relative"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20"><GraduationCap className="h-7 w-7" /></div><p className="text-lg font-extrabold leading-tight">Create a lesson<br />worth sharing</p><p className="mt-2 text-xs leading-5 text-blue-100">Build a clear page with notes, objectives, links and activities.</p><button onClick={() => navigate("/academics/resources/new")} className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 text-xs font-extrabold text-blue-800 transition hover:bg-blue-50">Create lesson page <ArrowRight className="h-3.5 w-3.5" /></button></div>
                            </section>
                            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-700" /><p className="text-xs font-bold text-slate-700">Shared with your school</p></div>
                                <p className="mt-1 text-[11px] leading-5 text-slate-500">Materials marked as shared are ready for your teachers and learners to use.</p>
                            </section>
                        </aside>
                    </div>

                    <footer className="mt-8 flex flex-col gap-2 border-t border-slate-200 py-5 text-[11px] text-slate-400 sm:flex-row sm:items-center sm:justify-between"><span>ShuleCloud Learning Library</span><span className="flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> Need help? Contact your school administrator.</span></footer>
                </main>
            </div>

            {preview && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) setPreview(null); }}>
                <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                    <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 p-5 backdrop-blur sm:p-6"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700">Resource preview</p><h2 className="mt-1 truncate text-xl font-extrabold text-[#102b5b]">{preview.title}</h2><p className="mt-1 text-xs text-slate-500">{[preview.type, preview.subjectName, preview.className].filter(Boolean).join(" · ")}</p></div><button onClick={() => setPreview(null)} aria-label="Close preview" className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"><X className="h-5 w-5" /></button></div>
                    <div className="space-y-4 p-5 sm:p-6">{preview.introduction && <div><h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Introduction</h3><p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{preview.introduction}</p></div>}{preview.description && <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{preview.description}</p>}{preview.objectives && <div className="rounded-xl bg-blue-50 p-4"><h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-blue-800">Learning objectives</h3><p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{preview.objectives}</p></div>}{preview.lessonNotes && <div><h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Lesson notes</h3><p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{preview.lessonNotes}</p></div>}{preview.assignment && <div className="rounded-xl bg-amber-50 p-4"><h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-800">Assignment</h3><p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{preview.assignment}</p></div>}
                        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">{preview.fileData && (isViewable(preview.fileData, preview.fileName) ? <button onClick={() => setViewing({ src: preview.fileData, name: preview.fileName, title: preview.title })} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700"><Eye className="h-4 w-4" />Preview file</button> : <a href={preview.fileData} target="_blank" rel="noopener noreferrer" download={preview.fileName} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700"><Download className="h-4 w-4" />{preview.fileName ? "Open / download file" : "Open file"}</a>)}{preview.url && <a href={preview.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200 px-4 text-xs font-bold text-blue-700 hover:bg-blue-50"><ExternalLink className="h-4 w-4" />Open resource</a>}{preview.videoUrl && <button onClick={() => { setVideoOpen({ src: getVideoEmbedUrl(preview.videoUrl), title: preview.title }); setPreview(null); }} className="inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200 px-4 text-xs font-bold text-blue-700 hover:bg-blue-50"><Play className="h-4 w-4" />Watch video</button>}</div>
                    </div>
                </div>
            </div>}

            <FileViewer open={!!viewing} src={viewing?.src} name={viewing?.name} title={viewing?.title} onClose={() => setViewing(null)} />
            {videoOpen && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-3 sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) setVideoOpen(null); }}><div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{videoOpen.title}</p><p className="text-[10px] text-slate-400">Lesson video</p></div><button onClick={() => setVideoOpen(null)} aria-label="Close video" className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:text-slate-900"><X className="h-4 w-4" /></button></div><div className="aspect-video bg-black"><iframe title={videoOpen.title} src={videoOpen.src} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ border: 0 }} /></div></div></div>}
        </div>
    );
}
