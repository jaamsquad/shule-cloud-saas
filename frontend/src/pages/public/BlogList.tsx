import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, ArrowRight, Clock } from "lucide-react";
import { MarketingNav, MarketingFooter, HeroBackdrop, PURPLE, NAVY } from "./MarketingChrome";
import { blogPublic } from "@/lib/blogApi";

const fmt = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

function Cover({ src, alt }: { src?: string; alt: string }) {
  if (src) return <img src={src} alt={alt} className="w-full h-full object-cover" loading="lazy" />;
  return <div className="w-full h-full flex items-center justify-center text-white/90 text-3xl font-black" style={{ background: `linear-gradient(135deg, ${PURPLE}, ${NAVY})` }}>ShuleCloud</div>;
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

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">
      <MarketingNav />

      {/* Hero / featured */}
      <section className="relative overflow-hidden text-white">
        <HeroBackdrop />
        <div className="max-w-5xl mx-auto px-6 py-16 relative">
          <p className="text-xs font-black uppercase tracking-widest text-white/70 mb-3">ShuleCloud Blog</p>
          <h1 className="text-4xl md:text-5xl font-black mb-4">News, guides &amp; ideas for Kenyan schools</h1>
          <p className="text-white/80 text-lg max-w-2xl">Product updates, CBC tips, fee-collection know-how and stories from schools running on ShuleCloud.</p>
          {hero && (
            <Link to={`/blogs/${hero.slug}`} className="mt-8 grid md:grid-cols-2 gap-6 items-center bg-white/10 backdrop-blur rounded-3xl p-4 hover:bg-white/15 transition-colors">
              <div className="rounded-2xl overflow-hidden aspect-[16/10]"><Cover src={hero.featuredImage} alt={hero.title} /></div>
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-white/70">Featured{hero.category ? ` · ${hero.category}` : ""}</span>
                <h2 className="text-2xl font-black mt-2 mb-2">{hero.title}</h2>
                <p className="text-white/75 line-clamp-3">{hero.excerpt || hero.shortDescription}</p>
                <span className="inline-flex items-center gap-1.5 mt-4 font-bold">Read article <ArrowRight className="w-4 h-4" /></span>
              </div>
            </Link>
          )}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-14">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-10">
          <button onClick={() => setCat("")} className={`text-sm font-bold px-4 py-2 rounded-full ${!category ? "text-white" : "bg-slate-100 text-slate-600"}`} style={!category ? { background: PURPLE } : {}}>All</button>
          {cats.map((c: any) => (
            <button key={c._id} onClick={() => setCat(c.name)} className={`text-sm font-bold px-4 py-2 rounded-full ${category === c.name ? "text-white" : "bg-slate-100 text-slate-600"}`} style={category === c.name ? { background: PURPLE } : {}}>{c.name}</button>
          ))}
          <div className="relative ml-auto min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search articles…" className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-full text-sm focus:outline-none" />
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <p className="text-center text-slate-400 py-20">Loading…</p>
        ) : (data?.items || []).length === 0 ? (
          <p className="text-center text-slate-400 py-20">No articles found{category ? ` in ${category}` : ""}.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {data.items.map((p: any) => (
              <Link key={p._id} to={`/blogs/${p.slug}`} className="group">
                <div className="rounded-2xl overflow-hidden aspect-[16/10] mb-4 ring-1 ring-slate-100"><Cover src={p.featuredImage} alt={p.title} /></div>
                {p.category && <span className="text-xs font-black uppercase tracking-widest" style={{ color: PURPLE }}>{p.category}</span>}
                <h3 className="text-lg font-black mt-1.5 mb-1.5 group-hover:underline" style={{ color: NAVY }}>{p.title}</h3>
                <p className="text-sm text-slate-500 line-clamp-2">{p.excerpt || p.shortDescription}</p>
                <p className="text-xs text-slate-400 mt-3 flex items-center gap-3"><span>{fmt(p.publishAt || p.createdAt)}</span><span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {p.readingTime || 1} min</span></p>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            {Array.from({ length: data.pages }).map((_, i) => (
              <button key={i} onClick={() => setPage(i + 1)} className={`w-9 h-9 rounded-lg text-sm font-bold ${page === i + 1 ? "text-white" : "bg-slate-100 text-slate-600"}`} style={page === i + 1 ? { background: PURPLE } : {}}>{i + 1}</button>
            ))}
          </div>
        )}
      </div>

      <MarketingFooter />
    </div>
  );
}
