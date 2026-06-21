import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock, ArrowLeft, Link2, Check } from "lucide-react";
import { MarketingNav, MarketingFooter, HeroBackdrop, PURPLE, NAVY } from "./MarketingChrome";
import { blogPublic } from "@/lib/blogApi";

const fmt = (d: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";

function Share({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";
  const enc = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links: [string, string][] = [
    ["WhatsApp", `https://wa.me/?text=${t}%20${enc}`],
    ["X", `https://twitter.com/intent/tweet?text=${t}&url=${enc}`],
    ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${enc}`],
    ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`],
    ["Telegram", `https://t.me/share/url?url=${enc}&text=${t}`],
    ["Email", `mailto:?subject=${t}&body=${enc}`],
  ];
  const copy = () => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-black uppercase tracking-wide text-slate-400 mr-1">Share</span>
      {links.map(([label, href]) => (
        <a key={label} href={href} target="_blank" rel="noreferrer" className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">{label}</a>
      ))}
      <button onClick={copy} className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center gap-1">
        {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Link2 className="w-3 h-3" /> Copy link</>}
      </button>
    </div>
  );
}

export default function BlogPost() {
  const { slug } = useParams();
  const [progress, setProgress] = useState(0);
  const { data, isLoading, isError } = useQuery({ queryKey: ["blog_post_pub", slug], queryFn: () => blogPublic.get(slug!), enabled: !!slug });

  // Reading progress bar
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [data]);

  // Basic SEO: set document title / meta description from the post.
  useEffect(() => {
    if (data?.post) {
      document.title = `${data.post.seoTitle || data.post.title} · ShuleCloud`;
      const m = document.querySelector('meta[name="description"]') || (() => { const el = document.createElement("meta"); el.setAttribute("name", "description"); document.head.appendChild(el); return el; })();
      m.setAttribute("content", data.post.metaDescription || data.post.excerpt || "");
    }
    return () => { document.title = "ShuleCloud"; };
  }, [data]);

  const post = data?.post;

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">
      {/* reading progress */}
      <div className="fixed top-0 left-0 h-1 z-[60]" style={{ width: `${progress}%`, background: PURPLE }} />
      <MarketingNav />

      {isLoading ? (
        <p className="text-center text-slate-400 py-32">Loading…</p>
      ) : isError || !post ? (
        <div className="text-center py-32">
          <p className="text-slate-500 mb-4">Sorry, we couldn't find that article.</p>
          <Link to="/blogs" className="font-bold" style={{ color: PURPLE }}>← Back to the blog</Link>
        </div>
      ) : (
        <>
          {/* Header */}
          <section className="relative overflow-hidden text-white">
            <HeroBackdrop />
            <div className="max-w-3xl mx-auto px-6 py-16 relative">
              <Link to="/blogs" className="inline-flex items-center gap-1.5 text-sm font-bold text-white/80 mb-6"><ArrowLeft className="w-4 h-4" /> All articles</Link>
              {post.category && <p className="text-xs font-black uppercase tracking-widest text-white/70 mb-3">{post.category}</p>}
              <h1 className="text-3xl md:text-5xl font-black leading-tight mb-4">{post.title}</h1>
              {post.subtitle && <p className="text-white/80 text-xl mb-5">{post.subtitle}</p>}
              <p className="text-white/70 text-sm flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>By {post.author || "ShuleCloud"}</span>
                <span>{fmt(post.publishAt || post.createdAt)}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {post.readingTime || 1} min read</span>
                <span>{post.views || 0} views</span>
              </p>
            </div>
          </section>

          {post.featuredImage && (
            <div className="max-w-4xl mx-auto px-6 -mt-10 relative">
              <img src={post.featuredImage} alt={post.title} className="w-full rounded-3xl shadow-xl ring-1 ring-slate-100" />
            </div>
          )}

          <article className="max-w-3xl mx-auto px-6 py-14">
            <div className="blog-content prose prose-slate prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: post.content || "" }} />

            {(post.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-10">
                {post.tags.map((t: string) => (
                  <Link key={t} to={`/blogs?tag=${encodeURIComponent(t)}`} className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">#{t}</Link>
                ))}
              </div>
            )}

            {post.allowSharing !== false && <div className="mt-8 pt-6 border-t border-slate-100"><Share title={post.title} /></div>}
          </article>

          {/* Related */}
          {(data.related || []).length > 0 && (
            <section className="bg-slate-50 py-16">
              <div className="max-w-5xl mx-auto px-6">
                <h2 className="text-2xl font-black mb-8" style={{ color: NAVY }}>Related articles</h2>
                <div className="grid md:grid-cols-3 gap-8">
                  {data.related.map((p: any) => (
                    <Link key={p._id} to={`/blogs/${p.slug}`} className="group">
                      {p.featuredImage && <div className="rounded-2xl overflow-hidden aspect-[16/10] mb-3 ring-1 ring-slate-100"><img src={p.featuredImage} alt={p.title} className="w-full h-full object-cover" loading="lazy" /></div>}
                      <h3 className="font-black group-hover:underline" style={{ color: NAVY }}>{p.title}</h3>
                      <p className="text-sm text-slate-500 line-clamp-2 mt-1">{p.excerpt || p.shortDescription}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <MarketingFooter />
    </div>
  );
}
