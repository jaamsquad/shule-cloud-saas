/**
 * Page metadata in the browser (title, description, canonical, robots, Open Graph, JSON-LD).
 *
 * The public pages' metadata lives in ./site.json — the same file the build uses for
 * sitemap.xml and the per-page HTML (scripts/generate-seo.mjs). <SeoManager /> applies it on
 * every client-side navigation; any other route (logins, dashboards, school portals, shared
 * documents, result/verification links) is marked noindex. Blog posts set their own via applySeo.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import site from "./site.json";
import { resolvePortal } from "@/lib/portal";

export interface SeoPage { path: string; title: string; description: string; robots?: string; breadcrumb?: string; sitemap?: boolean; lastmod?: string }
export const SITE_URL: string = site.siteUrl;
export const SITE_NAME: string = site.siteName;
export const PUBLIC_PAGES: SeoPage[] = site.pages;
const APP_TITLE = "ShuleCloud 360";
const NOINDEX = "noindex, nofollow";

export const absUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${p.length > 1 ? p.replace(/\/+$/, "") : "/"}`;
};
const normalizePath = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : "/");

/** Only the main marketing host is indexable (localhost too, so previews behave like production). */
export function isIndexableHost(hostname = window.location.hostname) {
  const h = hostname.split(":")[0].toLowerCase();
  if (h === new URL(SITE_URL).hostname) return true;
  return (h === "localhost" || h === "127.0.0.1") && resolvePortal(h).portal === "public";
}

export interface SeoInput {
  title?: string;
  description?: string;
  /** absolute URL or site path; null removes the canonical link */
  canonical?: string | null;
  /** e.g. "noindex, nofollow"; null removes the robots meta (= indexable) */
  robots?: string | null;
  image?: string;
  type?: "website" | "article";
  /** page-level JSON-LD; null removes it */
  jsonLd?: object | null;
}

function setMeta(attr: "name" | "property", key: string, value: string | null | undefined) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (value === null) { el?.remove(); return; }
  if (value === undefined) return;
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute("content", value);
}

export function applySeo(s: SeoInput) {
  if (s.title !== undefined) {
    document.title = s.title;
    setMeta("property", "og:title", s.title);
    setMeta("name", "twitter:title", s.title);
  }
  if (s.description !== undefined) {
    setMeta("name", "description", s.description);
    setMeta("property", "og:description", s.description);
    setMeta("name", "twitter:description", s.description);
  }
  if (s.canonical !== undefined) {
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (s.canonical === null) { link?.remove(); setMeta("property", "og:url", null); }
    else {
      const href = absUrl(s.canonical);
      if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
      link.href = href;
      setMeta("property", "og:url", href);
    }
  }
  if (s.robots !== undefined) setMeta("name", "robots", s.robots);
  if (s.image !== undefined) setMeta("property", "og:image", absUrl(s.image));
  if (s.type !== undefined) setMeta("property", "og:type", s.type);
  if (s.jsonLd !== undefined) {
    let el = document.getElementById("ld-page");
    if (s.jsonLd === null) el?.remove();
    else {
      if (!el) { el = document.createElement("script"); el.id = "ld-page"; el.setAttribute("type", "application/ld+json"); document.head.appendChild(el); }
      el.textContent = JSON.stringify(s.jsonLd).replace(/</g, "\\u003c");
    }
  }
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absUrl(it.path) })),
  };
}

/** What a route should carry. Exported for tests. */
export function seoForPath(pathname: string, indexableHost: boolean): SeoInput | "self" {
  const path = normalizePath(pathname);
  if (!indexableHost) return { robots: NOINDEX, canonical: null, jsonLd: null };
  const page = PUBLIC_PAGES.find(p => p.path === path);
  if (page) {
    return {
      title: page.title, description: page.description, canonical: page.path, robots: page.robots || null,
      image: site.image, type: "website",
      jsonLd: page.breadcrumb ? breadcrumbLd([{ name: "Home", path: "/" }, { name: page.breadcrumb, path: page.path }]) : null,
    };
  }
  if (/^\/blogs\/[^/]+$/.test(path)) return "self"; // BlogPost sets its own once the post loads
  return { title: APP_TITLE, robots: NOINDEX, canonical: null, jsonLd: null };
}

/** Mount once inside the router (before <Routes>, so pages that set their own title still win). */
export function SeoManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    const s = seoForPath(pathname, isIndexableHost());
    if (s === "self") applySeo({ canonical: null, robots: null, jsonLd: null, type: "article" });
    else applySeo(s);
  }, [pathname]);
  return null;
}
