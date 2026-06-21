import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Eye, Star, Pin, Plus, Search, Trash2, Pencil, ArrowLeft, Save,
  Tag as TagIcon, FolderTree, LayoutDashboard, Loader2, CheckCircle2, Globe,
  Upload, X as XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { blogAdmin } from "@/lib/blogApi";
import { RichEditor } from "./RichEditor";

const PURPLE = "#613ddf";
const STATUSES = ["draft", "published", "scheduled", "archived"] as const;
const BADGES = ["Featured", "Trending", "Editor's Pick", "Breaking News", "Announcement", "Tutorial", "Release Notes", "Product Update", "Success Story"];

const statusColor: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700", draft: "bg-slate-100 text-slate-600",
  scheduled: "bg-amber-100 text-amber-700", archived: "bg-rose-100 text-rose-600",
};

export default function OwnerBlog() {
  const [view, setView] = useState<"dashboard" | "posts" | "taxonomy">("dashboard");
  const [editing, setEditing] = useState<string | "new" | null>(null);

  if (editing) return <PostEditor id={editing} onBack={() => setEditing(null)} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {([["dashboard", LayoutDashboard], ["posts", FileText], ["taxonomy", FolderTree]] as const).map(([v, Icon]) => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-2 rounded-lg text-sm font-bold capitalize flex items-center gap-2 ${view === v ? "bg-white shadow-sm text-slate-800" : "text-slate-500"}`}>
              <Icon className="w-4 h-4" /> {v}
            </button>
          ))}
        </div>
        <button onClick={() => setEditing("new")} className="h-10 px-5 rounded-xl text-white font-bold text-sm flex items-center gap-2" style={{ background: PURPLE }}>
          <Plus className="w-4 h-4" /> New Article
        </button>
      </div>

      {view === "dashboard" && <Dashboard onOpen={id => setEditing(id)} />}
      {view === "posts" && <PostList onEdit={id => setEditing(id)} />}
      {view === "taxonomy" && <Taxonomy />}
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
function Dashboard({ onOpen }: { onOpen: (id: string) => void }) {
  const { data, isLoading } = useQuery({ queryKey: ["blog_stats"], queryFn: blogAdmin.stats });
  if (isLoading) return <Center />;
  const t = data?.totals || {};
  const cards = [
    { label: "Total Articles", value: t.total ?? 0, icon: FileText },
    { label: "Published", value: t.published ?? 0, icon: Globe },
    { label: "Drafts", value: t.draft ?? 0, icon: Pencil },
    { label: "Scheduled", value: t.scheduled ?? 0, icon: Star },
    { label: "Total Views", value: t.views ?? 0, icon: Eye },
    { label: "Categories", value: t.categories ?? 0, icon: FolderTree },
    { label: "Tags", value: t.tags ?? 0, icon: TagIcon },
    { label: "Archived", value: t.archived ?? 0, icon: Trash2 },
  ];
  const maxMonth = Math.max(1, ...(data?.publishedPerMonth || []).map((m: any) => m.count));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-100 p-4">
            <c.icon className="w-5 h-5 mb-2" style={{ color: PURPLE }} />
            <p className="text-2xl font-black text-slate-800">{c.value}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-black text-slate-700 mb-4">Published per month</h3>
          <div className="flex items-end gap-2 h-40">
            {(data?.publishedPerMonth || []).length === 0 ? <p className="text-sm text-slate-400">No published articles yet.</p> :
              (data.publishedPerMonth).map((m: any) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t" style={{ height: `${(m.count / maxMonth) * 100}%`, background: PURPLE, minHeight: 4 }} />
                  <span className="text-[9px] text-slate-400">{m.month.slice(5)}</span>
                </div>
              ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="font-black text-slate-700 mb-4">Top performing articles</h3>
          {(data?.topArticles || []).length === 0 ? <p className="text-sm text-slate-400">No views yet.</p> : (
            <div className="space-y-2">
              {data.topArticles.map((a: any) => (
                <button key={a._id} onClick={() => onOpen(a._id)} className="w-full flex items-center justify-between py-2 border-b border-slate-50 text-left">
                  <span className="text-sm font-bold text-slate-700 truncate">{a.title}</span>
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {a.views || 0}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Post list ───────────────────────────────────────────────────────────────
function PostList({ onEdit }: { onEdit: (id: string) => void }) {
  const qc = useQueryClient();
  const [q, setQ] = useState(""); const [status, setStatus] = useState("all");
  const { data: posts = [], isLoading } = useQuery({ queryKey: ["blog_posts", q, status], queryFn: () => blogAdmin.list({ q, status }) });

  const del = useMutation({ mutationFn: (id: string) => blogAdmin.remove(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["blog_posts"] }); toast.success("Article deleted"); } });
  const toggle = useMutation({ mutationFn: ({ id, body }: any) => blogAdmin.patch(id, body), onSuccess: () => { qc.invalidateQueries({ queryKey: ["blog_posts"] }); } });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search articles…" className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold capitalize">
          <option value="all">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? <Center /> : posts.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center text-slate-400 text-xs font-bold uppercase">No articles yet</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {posts.map((p: any) => (
            <div key={p._id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-800 truncate">{p.title}</p>
                  {p.featured && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />}
                  {p.pinned && <Pin className="w-3.5 h-3.5 text-purple-500" />}
                </div>
                <p className="text-xs text-slate-400 truncate">/{p.slug} · {p.views || 0} views · {p.readingTime || 1} min read</p>
              </div>
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-full capitalize ${statusColor[p.status] || "bg-slate-100"}`}>{p.status}</span>
              <button title="Toggle feature" onClick={() => toggle.mutate({ id: p._id, body: { featured: !p.featured } })} className="p-2 text-slate-400 hover:text-amber-500"><Star className="w-4 h-4" /></button>
              <button title="Toggle pin" onClick={() => toggle.mutate({ id: p._id, body: { pinned: !p.pinned } })} className="p-2 text-slate-400 hover:text-purple-500"><Pin className="w-4 h-4" /></button>
              <button onClick={() => onEdit(p._id)} className="p-2 text-slate-400 hover:text-slate-700"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => confirm("Delete this article?") && del.mutate(p._id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Editor ──────────────────────────────────────────────────────────────────
const blank = {
  title: "", subtitle: "", slug: "", shortDescription: "", excerpt: "", content: "",
  featuredImage: "", category: "", tags: [] as string[], badges: [] as string[],
  status: "draft", visibility: "public", publishAt: "", pinned: false, featured: false,
  allowComments: true, allowSharing: true,
  seoTitle: "", metaDescription: "", keywords: [] as string[], canonicalUrl: "", ogImage: "", robots: "index,follow",
};

function PostEditor({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const isNew = id === "new";
  const [form, setForm] = useState<any>(blank);
  const [tab, setTab] = useState<"content" | "seo" | "settings">("content");
  const [savedId, setSavedId] = useState<string | null>(isNew ? null : id);
  const dirty = useRef(false);

  const { data: existing } = useQuery({ queryKey: ["blog_post", id], queryFn: () => blogAdmin.get(id), enabled: !isNew });
  const { data: categories = [] } = useQuery({ queryKey: ["blog_categories"], queryFn: blogAdmin.categories });
  const { data: allTags = [] } = useQuery({ queryKey: ["blog_tags"], queryFn: blogAdmin.tags });

  useEffect(() => {
    if (existing) setForm({ ...blank, ...existing, tags: existing.tags || [], badges: existing.badges || [], keywords: existing.keywords || [], publishAt: existing.publishAt ? new Date(existing.publishAt).toISOString().slice(0, 16) : "" });
  }, [existing]);

  const set = (k: string, v: any) => { dirty.current = true; setForm((f: any) => ({ ...f, [k]: v })); };

  // Shared image upload — used by the featured-image picker and the rich editor.
  const upload = async (file: File) => {
    try { const { url } = await blogAdmin.upload(file); return url; }
    catch (e: any) { toast.error(e?.response?.data?.message || "Image upload failed"); throw e; }
  };

  const save = useMutation({
    mutationFn: async (silent?: boolean) => {
      const payload = { ...form, publishAt: form.publishAt || null };
      if (savedId) return blogAdmin.update(savedId, payload);
      const created = await blogAdmin.create(payload);
      setSavedId(created._id);
      return created;
    },
    onSuccess: (_res, silent) => {
      dirty.current = false;
      qc.invalidateQueries({ queryKey: ["blog_posts"] });
      if (!silent) toast.success("Saved");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Save failed"),
  });

  // Auto-save every 8s when there are unsaved changes and a title exists.
  useEffect(() => {
    const t = setInterval(() => { if (dirty.current && form.title) save.mutate(true as any); }, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const toggleTag = (name: string) => set("tags", form.tags.includes(name) ? form.tags.filter((t: string) => t !== name) : [...form.tags, name]);
  const toggleBadge = (b: string) => set("badges", form.badges.includes(b) ? form.badges.filter((x: string) => x !== b) : [...form.badges, b]);

  const publish = () => { set("status", "published"); setTimeout(() => save.mutate(false as any), 50); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-slate-500"><ArrowLeft className="w-4 h-4" /> Back to articles</button>
        <div className="flex items-center gap-2">
          {save.isPending && <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</span>}
          <button onClick={() => save.mutate(false as any)} className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 flex items-center gap-2"><Save className="w-4 h-4" /> Save draft</button>
          <button onClick={publish} className="h-10 px-5 rounded-xl text-white text-sm font-bold flex items-center gap-2" style={{ background: PURPLE }}><CheckCircle2 className="w-4 h-4" /> Publish</button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {(["content", "seo", "settings"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-bold capitalize border-b-2 ${tab === t ? "text-slate-800" : "border-transparent text-slate-400"}`} style={tab === t ? { borderColor: PURPLE } : {}}>{t}</button>
        ))}
      </div>

      {tab === "content" && (
        <div className="space-y-4">
          <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Article title" className="w-full text-2xl font-black px-4 py-3 border border-slate-200 rounded-xl focus:outline-none" />
          <input value={form.subtitle} onChange={e => set("subtitle", e.target.value)} placeholder="Subtitle (optional)" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none" />
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Slug (URL)"><div className="flex items-center"><span className="text-xs text-slate-400 mr-1">/blogs/</span><input value={form.slug} onChange={e => set("slug", e.target.value)} placeholder="auto from title" className="flex-1 h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none" /></div></Field>
            <Field label="Featured image"><ImageUpload value={form.featuredImage} onChange={v => set("featuredImage", v)} upload={upload} /></Field>
          </div>
          <Field label="Short description"><textarea value={form.shortDescription} onChange={e => set("shortDescription", e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none" /></Field>
          <Field label="Content">
            <RichEditor value={form.content} onChange={v => set("content", v)} onUploadImage={upload} />
          </Field>
          <Field label="Excerpt (shown in listings)"><textarea value={form.excerpt} onChange={e => set("excerpt", e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none" /></Field>
        </div>
      )}

      {tab === "seo" && (
        <div className="space-y-3 max-w-2xl">
          <Field label="SEO title"><input value={form.seoTitle} onChange={e => set("seoTitle", e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none" /></Field>
          <Field label="Meta description"><textarea value={form.metaDescription} onChange={e => set("metaDescription", e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none" /></Field>
          <Field label="Keywords (comma separated)"><input value={(form.keywords || []).join(", ")} onChange={e => set("keywords", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none" /></Field>
          <Field label="Canonical URL"><input value={form.canonicalUrl} onChange={e => set("canonicalUrl", e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none" /></Field>
          <Field label="Open Graph image (social share)"><ImageUpload value={form.ogImage} onChange={v => set("ogImage", v)} upload={upload} /></Field>
          <Field label="Robots"><input value={form.robots} onChange={e => set("robots", e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none" /></Field>
        </div>
      )}

      {tab === "settings" && (
        <div className="grid sm:grid-cols-2 gap-4 max-w-3xl">
          <Field label="Status"><select value={form.status} onChange={e => set("status", e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm capitalize">{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></Field>
          <Field label="Visibility"><select value={form.visibility} onChange={e => set("visibility", e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm capitalize">{["public", "logged-in", "premium", "hidden"].map(s => <option key={s} value={s}>{s}</option>)}</select></Field>
          <Field label="Schedule / publish at"><input type="datetime-local" value={form.publishAt} onChange={e => set("publishAt", e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm" /></Field>
          <Field label="Category">
            <select value={form.category} onChange={e => set("category", e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm">
              <option value="">— none —</option>
              {categories.map((c: any) => <option key={c._id} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Tags">
              <div className="flex flex-wrap gap-2">
                {allTags.length === 0 && <span className="text-xs text-slate-400">No tags yet — add them under Taxonomy.</span>}
                {allTags.map((t: any) => (
                  <button key={t._id} onClick={() => toggleTag(t.name)} className={`text-xs font-bold px-3 py-1.5 rounded-full border ${form.tags.includes(t.name) ? "text-white" : "text-slate-500 border-slate-200"}`} style={form.tags.includes(t.name) ? { background: PURPLE, borderColor: PURPLE } : {}}>{t.name}</button>
                ))}
              </div>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Badges">
              <div className="flex flex-wrap gap-2">
                {BADGES.map(b => (
                  <button key={b} onClick={() => toggleBadge(b)} className={`text-xs font-bold px-3 py-1.5 rounded-full border ${form.badges.includes(b) ? "text-white" : "text-slate-500 border-slate-200"}`} style={form.badges.includes(b) ? { background: PURPLE, borderColor: PURPLE } : {}}>{b}</button>
                ))}
              </div>
            </Field>
          </div>
          <Toggle label="Pin to homepage" v={form.pinned} on={() => set("pinned", !form.pinned)} />
          <Toggle label="Featured article" v={form.featured} on={() => set("featured", !form.featured)} />
          <Toggle label="Allow comments" v={form.allowComments} on={() => set("allowComments", !form.allowComments)} />
          <Toggle label="Allow sharing" v={form.allowSharing} on={() => set("allowSharing", !form.allowSharing)} />
        </div>
      )}
    </div>
  );
}

// ─── Taxonomy (categories + tags) ────────────────────────────────────────────
function Taxonomy() {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ["blog_categories"], queryFn: blogAdmin.categories });
  const { data: tags = [] } = useQuery({ queryKey: ["blog_tags"], queryFn: blogAdmin.tags });
  const [cat, setCat] = useState({ name: "", description: "", color: "#613ddf" });
  const [tag, setTag] = useState("");

  const addCat = useMutation({ mutationFn: () => blogAdmin.createCategory(cat), onSuccess: () => { qc.invalidateQueries({ queryKey: ["blog_categories"] }); setCat({ name: "", description: "", color: "#613ddf" }); toast.success("Category added"); } });
  const delCat = useMutation({ mutationFn: (id: string) => blogAdmin.deleteCategory(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["blog_categories"] }) });
  const addTag = useMutation({ mutationFn: () => blogAdmin.createTag(tag), onSuccess: () => { qc.invalidateQueries({ queryKey: ["blog_tags"] }); setTag(""); } });
  const delTag = useMutation({ mutationFn: (id: string) => blogAdmin.deleteTag(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["blog_tags"] }) });

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="font-black text-slate-700 mb-3 flex items-center gap-2"><FolderTree className="w-4 h-4" /> Categories</h3>
        <div className="space-y-2 mb-4">
          {categories.map((c: any) => (
            <div key={c._id} className="flex items-center gap-2 py-2 border-b border-slate-50">
              <span className="w-3 h-3 rounded-full" style={{ background: c.color }} />
              <span className="text-sm font-bold text-slate-700 flex-1">{c.name}</span>
              <button onClick={() => delCat.mutate(c._id)} className="text-slate-300 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {categories.length === 0 && <p className="text-xs text-slate-400">No categories yet.</p>}
        </div>
        <div className="flex gap-2">
          <input value={cat.name} onChange={e => setCat({ ...cat, name: e.target.value })} placeholder="New category" className="flex-1 h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none" />
          <input type="color" value={cat.color} onChange={e => setCat({ ...cat, color: e.target.value })} className="h-10 w-12 border border-slate-200 rounded-xl" />
          <button onClick={() => cat.name && addCat.mutate()} className="h-10 px-4 rounded-xl text-white font-bold text-sm" style={{ background: PURPLE }}>Add</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="font-black text-slate-700 mb-3 flex items-center gap-2"><TagIcon className="w-4 h-4" /> Tags</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((t: any) => (
            <span key={t._id} className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1.5">
              {t.name}
              <button onClick={() => delTag.mutate(t._id)} className="text-slate-400 hover:text-rose-600">×</button>
            </span>
          ))}
          {tags.length === 0 && <p className="text-xs text-slate-400">No tags yet.</p>}
        </div>
        <div className="flex gap-2">
          <input value={tag} onChange={e => setTag(e.target.value)} onKeyDown={e => e.key === "Enter" && tag && addTag.mutate()} placeholder="New tag" className="flex-1 h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none" />
          <button onClick={() => tag && addTag.mutate()} className="h-10 px-4 rounded-xl text-white font-bold text-sm" style={{ background: PURPLE }}>Add</button>
        </div>
      </div>
    </div>
  );
}

// ─── small bits ──────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-xs font-black text-slate-500 uppercase tracking-wide mb-1.5">{label}</span>{children}</label>;
}
function Toggle({ label, v, on }: { label: string; v: boolean; on: () => void }) {
  return (
    <button onClick={on} className="flex items-center justify-between h-10 px-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600">
      {label}
      <span className={`w-9 h-5 rounded-full relative transition-colors ${v ? "bg-[#613ddf]" : "bg-slate-200"}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${v ? "left-4" : "left-0.5"}`} />
      </span>
    </button>
  );
}
function Center() { return <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-[#613ddf]" /></div>; }

// Image upload field — pick/drop a file (uploaded to the server) with a preview;
// the resolved URL is also editable for pasting an existing link.
function ImageUpload({ value, onChange, upload }: { value: string; onChange: (url: string) => void; upload: (f: File) => Promise<string> }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try { onChange(await upload(file)); } catch { /* toast handled upstream */ } finally { setBusy(false); }
  };
  return (
    <div>
      {value ? (
        <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 mb-2">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button onClick={() => onChange("")} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center"><XIcon className="w-3.5 h-3.5" /></button>
        </div>
      ) : (
        <button onClick={() => ref.current?.click()} onDrop={e => { e.preventDefault(); pick(Array.from(e.dataTransfer.files).find(f => f.type.startsWith("image/"))); }} onDragOver={e => e.preventDefault()}
          className="w-full h-32 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-[#613ddf] mb-2">
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Upload className="w-5 h-5 mb-1" /><span className="text-xs font-bold">Click or drop an image</span></>}
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" hidden onChange={e => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder="…or paste an image URL" className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs focus:outline-none" />
    </div>
  );
}
