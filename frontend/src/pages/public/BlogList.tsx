import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { MarketingNav, MarketingFooter, NAVY, TEAL, MINT_SOFT, PAGE_BG } from "./MarketingChrome";
import { blogPublic } from "@/lib/blogApi";

const fmt = (d: string) => d ? new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "";

function Cover({ src, alt }: { src?: string; alt: string }) {
  if (src) return <img src={src} alt={alt} className="w-full h-full object-cover" loading="lazy" />;
  return <div className="w-full h-full flex items-center justify-center text-white/90 text-2xl font-black" style={{ background: `linear-gradient(135deg, ${TEAL}, ${NAVY})` }}>ShuleCloud</div>;
}

export default function BlogList() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "";
  const tag = params.get("tag") || "";
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const { data: hl } = useQuery({ queryKey: ["blog_hl"], queryFn: blogPublic.highlights });
  const { data: cats = [] } = useQuery({ queryKey: ["blog_pub_cats"], queryFn: blogPublic.categories });
  const { data, isLoading } = useQuery({ queryKey: ["blog_pub_list", category, tag, q, page], queryFn: () => blogPublic.list({ category, tag, q, page }) });

  const hero = hl?.featured?.[0];
  const setCat = (c: string) => { setParams(c ? { category: c } : {}); setPage(1); };
  const pill = (on: boolean) => on ? { background: NAVY, color: "#fff" } : { background: "#fff", color: "#475569", border: "1px solid #e6eef3" };

  return (
    <div className="min-h-screen font-sans" style={{ background: PAGE_BG, color: NAVY }}>
      <MarketingNav />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-14 pb-8">
        <h1 className="text-4xl md:text-5xl font-black mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>The ShuleCloud Blog</h1>
        <p className="text-slate-600 max-w-2xl">Insights, strategies and updates for forward-thinking Kenyan schools navigating the digital landscape.</p>
      </section>

      <div className="max-w-7xl mx-auto px-6 pb-16">
        {/* Filter bar card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-center gap-2 mb-8">
          <button onClick={() => setCat("")} className="text-sm font-bold px-4 py-2 rounded-full" style={pill(!category)}>All Posts</button>
          {cats.map((c: any) => (
            <button key={c._id} onClick={() => setCat(c.name)} className="text-sm font-bold px-4 py-2 rounded-full" style={pill(category === c.name)}>{c.name}</button>
          ))}
          <div className="relative ml-auto min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search articles…" className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#158066]" />
          </div>
        </div>

        {isLoading ? (
          <p className="text-center text-slate-400 py-20">Loading…</p>
        ) : (data?.items || []).length === 0 && !hero ? (
          <p className="text-center text-slate-400 py-20">No articles found{category ? ` in ${category}` : ""}.</p>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Featured (spans 2) */}
            {hero && !q && !category && (
              <Link to={`/blogs/${hero.slug}`} className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden grid md:grid-cols-2 group">
                <div className="aspect-[4/3] md:aspect-auto"><Cover src={hero.featuredImage} alt={hero.title} /></div>
                <div className="p-6 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full" style={{ background: MINT_SOFT, color: TEAL }}>Featured</span>
                    <span className="text-xs text-slate-400">{fmt(hero.publishAt || hero.createdAt)}</span>
                  </div>
                  <h2 className="text-2xl font-black mb-2 group-hover:underline" style={{ color: NAVY, fontFamily: "'Poppins', sans-serif" }}>{hero.title}</h2>
                  <p className="text-sm text-slate-500 line-clamp-3 mb-4">{hero.excerpt || hero.shortDescription}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold" style={{ color: TEAL }}>Read More <ArrowRight className="w-4 h-4" /></span>
                </div>
              </Link>
            )}

            {(data?.items || []).map((p: any) => (
              <Link key={p._id} to={`/blogs/${p.slug}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden group">
                <div className="aspect-[16/10]"><Cover src={p.featuredImage} alt={p.title} /></div>
                <div className="p-5">
                  <p className="text-xs text-slate-400 mb-1.5">{fmt(p.publishAt || p.createdAt)}</p>
                  <h3 className="text-lg font-black mb-1.5 group-hover:underline" style={{ color: NAVY }}>{p.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-3">{p.excerpt || p.shortDescription}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold" style={{ color: TEAL }}>Read More <ArrowRight className="w-4 h-4" /></span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button onClick={() => setPage(Math.max(1, page - 1))} className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
            {Array.from({ length: data.pages }).slice(0, 5).map((_, i) => (
              <button key={i} onClick={() => setPage(i + 1)} className="w-9 h-9 rounded-lg text-sm font-bold" style={page === i + 1 ? { background: NAVY, color: "#fff" } : { background: "#fff", border: "1px solid #e6eef3", color: "#475569" }}>{i + 1}</button>
            ))}
            <button onClick={() => setPage(Math.min(data.pages, page + 1))} className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      <MarketingFooter />
    </div>
  );
}
