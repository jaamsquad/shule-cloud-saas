import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import site from "./site.json";
import {
  escapeXml, absUrl, pageEntries, blogEntries, buildSitemapFiles, sitemapProblems, renderHead, withHead,
  htmlFileFor, verificationTokens, isPrivatePath, lastmodOf, siteJsonLd, HEAD_START, HEAD_END,
} from "../../scripts/seo-lib.mjs";
import { seoForPath, applySeo, isIndexableHost, type SeoInput } from "./seo";

const SITE = "https://shulecloud.com";
const NOW = new Date("2026-10-10T12:00:00Z");
const routesSrc = readFileSync(path.resolve(__dirname, "../App.tsx"), "utf8");
const robots = readFileSync(path.resolve(__dirname, "../../public/robots.txt"), "utf8");
const headers = readFileSync(path.resolve(__dirname, "../../public/_headers"), "utf8");

describe("site.json public pages", () => {
  it("are routes that really exist in App.tsx", () => {
    for (const p of site.pages) expect(routesSrc).toContain(`path="${p.path}"`);
  });
  it("have unique paths, titles and descriptions", () => {
    for (const k of ["path", "title", "description"] as const) {
      const v = site.pages.map(p => p[k]);
      expect(new Set(v).size).toBe(v.length);
    }
  });
  it("lists no private page in the sitemap", () => {
    for (const p of site.pages.filter(p => p.sitemap)) expect(isPrivatePath(p.path)).toBe(false);
  });
  it("uses the https canonical host", () => {
    expect(site.siteUrl).toBe(SITE);
  });
});

describe("sitemap", () => {
  const posts = [
    { slug: "fees-made-easy", status: "published", visibility: "public", updatedAt: "2026-09-01T08:00:00Z" },
    { slug: "draft-post", status: "draft" },
    { slug: "members-only", status: "published", visibility: "private" },
    { slug: "hidden", status: "published", robots: "noindex, follow" },
    { slug: "future", status: "scheduled", publishAt: "2027-01-01T00:00:00Z" },
    { slug: "syndicated", status: "published", canonicalUrl: "https://example.org/original" },
    { slug: "moved", status: "published", canonicalUrl: "https://shulecloud.com/blogs/fees-made-easy" },
    { slug: "no-date", status: "published" },
    { slug: "../../etc", status: "published" },
  ];

  it("keeps only live, public, indexable posts and never invents lastmod", () => {
    const e = blogEntries(posts, SITE, NOW);
    const locs = e.map(x => x.loc);
    expect(locs).toContain(`${SITE}/blogs/fees-made-easy`);
    expect(locs).toContain(`${SITE}/blogs/no-date`);
    for (const bad of ["draft-post", "members-only", "hidden", "future", "syndicated", "etc"]) expect(locs.join(" ")).not.toContain(bad);
    expect(e.find(x => x.loc.endsWith("/fees-made-easy"))?.lastmod).toBe("2026-09-01T08:00:00.000Z");
    expect(e.find(x => x.loc.endsWith("/no-date"))?.lastmod).toBeNull();
  });

  it("builds valid, de-duplicated XML with absolute https URLs", () => {
    const entries = [...pageEntries(site), ...blogEntries(posts, SITE, NOW)];
    const [file, ...rest] = buildSitemapFiles(entries, SITE);
    expect(rest).toHaveLength(0);
    expect(file.name).toBe("sitemap.xml");
    expect(file.xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(file.xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemapProblems(file.xml, SITE)).toEqual([]);
    expect(file.xml.match(/<loc>https:\/\/shulecloud.com\/blogs\/fees-made-easy<\/loc>/g)).toHaveLength(1); // "moved" deduped onto it
    expect(file.xml).toContain(`<loc>${SITE}/</loc>`);
    expect(file.xml).toContain(`<loc>${SITE}/features</loc>`);
    expect(file.xml).not.toMatch(/changefreq|priority/);
    expect(file.xml).not.toMatch(/\/login|\/owner|\/dashboard|\/register|\/status|\/application|\/lnk\//);
    const xmlDoc = new DOMParser().parseFromString(file.xml, "application/xml");
    expect(xmlDoc.getElementsByTagName("parsererror")).toHaveLength(0);
    expect(xmlDoc.documentElement.namespaceURI).toBe("http://www.sitemaps.org/schemas/sitemap/0.9");
  });

  it("only uses reliable static lastmod dates", () => {
    const e = pageEntries(site);
    expect(e.find(x => x.loc === `${SITE}/terms`)?.lastmod).toBe("2026-02-28");
    expect(e.find(x => x.loc === `${SITE}/features`)?.lastmod).toBeNull();
    expect(lastmodOf("2030-01-01", NOW)).toBeNull();
    expect(lastmodOf("not a date", NOW)).toBeNull();
  });

  it("escapes XML", () => {
    expect(escapeXml(`a&b<c>"d'`)).toBe("a&amp;b&lt;c&gt;&quot;d&apos;");
    const [f] = buildSitemapFiles([{ loc: `${SITE}/blogs/a?x=1&y=2`, lastmod: null }, { loc: `${SITE}/a&b`, lastmod: null }], SITE);
    expect(f.xml).toContain("<loc>https://shulecloud.com/a&amp;b</loc>");
    expect(f.xml).not.toContain("?x=1"); // query URLs are not canonical pages
    expect(sitemapProblems(f.xml, SITE)).toEqual([]);
  });

  it("drops other hosts and http URLs", () => {
    const [f] = buildSitemapFiles([{ loc: "http://shulecloud.com/x" }, { loc: "https://egerton.shulecloud.com/" }, { loc: `${SITE}/ok` }], SITE);
    expect(f.count).toBe(1);
  });

  it("splits into a sitemap index beyond the limits", () => {
    const many = Array.from({ length: 7 }, (_, i) => ({ loc: `${SITE}/blogs/p${i}`, lastmod: null }));
    const files = buildSitemapFiles(many, SITE, { maxUrls: 3 });
    expect(files.map(f => f.name)).toEqual(["sitemap.xml", "sitemap-1.xml", "sitemap-2.xml", "sitemap-3.xml"]);
    expect(files[0].xml).toContain("<sitemapindex");
    expect(files[0].xml).toContain(`<loc>${SITE}/sitemap-2.xml</loc>`);
    for (const f of files) expect(sitemapProblems(f.xml, SITE)).toEqual([]);
    expect(files.slice(1).reduce((n, f) => n + f.count, 0)).toBe(7);
  });
});

describe("robots.txt and headers", () => {
  it("allows crawling, points to the sitemap and blocks private areas only", () => {
    expect(robots).toMatch(/^Sitemap: https:\/\/shulecloud\.com\/sitemap\.xml$/m);
    expect(robots).toMatch(/^User-agent: \*$/m);
    expect(robots).toMatch(/^Allow: \/$/m);
    expect(robots).not.toMatch(/^Disallow: \/\s*$/m);
    expect(robots).not.toMatch(/^Disallow: \/(assets|icons|.*\.(css|js|png))/m);
    for (const p of ["/login", "/owner", "/dashboard", "/lnk/"]) expect(robots).toContain(`Disallow: ${p}`);
    // named crawlers share the same group (a separate "Allow: /" group would bypass the rules)
    expect(robots.split(/\n\s*\n/).filter(g => /User-agent/.test(g))).toHaveLength(1);
  });
  it("serves XML/text types and noindexes school subdomains", () => {
    expect(headers).toMatch(/\/sitemap\.xml\n\s+Content-Type: application\/xml/);
    expect(headers).toMatch(/https:\/\/:sub\.shulecloud\.com\/\*\n\s+X-Robots-Tag: noindex/);
    expect(headers).not.toMatch(/^https:\/\/shulecloud\.com/m);
  });
});

describe("page heads", () => {
  const shell = `<html><head>\n  ${HEAD_START}\n  <title>x</title>\n  ${HEAD_END}\n</head><body><div id="root"></div></body></html>`;
  const features = site.pages.find(p => p.path === "/features")!;

  it("renders title, description, canonical, OG and breadcrumb per page", () => {
    const html = withHead(shell, renderHead(site, features));
    expect(html).toContain(`<title>${features.title}</title>`);
    expect(html).toContain(`<link rel="canonical" href="${SITE}/features" />`);
    expect(html).toContain(`<meta property="og:url" content="${SITE}/features" />`);
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html).toContain('<div id="root"></div>');
    expect(htmlFileFor("/features")).toBe("features.html");
  });
  it("gives the SPA fallback no canonical", () => {
    const html = withHead(shell, renderHead(site, site.pages[0], { canonical: false }));
    expect(html).not.toContain("canonical");
    expect(html).not.toContain("og:url");
  });
  it("marks noindex pages", () => {
    const status = site.pages.find(p => p.path === "/status")!;
    expect(renderHead(site, status)).toContain('<meta name="robots" content="noindex, follow" />');
  });
  it("adds verification meta only from env, with safe values", () => {
    expect(verificationTokens({})).toEqual({ google: null, bing: null });
    expect(verificationTokens({ GOOGLE_SITE_VERIFICATION: '"><script>' }).google).toBeNull();
    const t = verificationTokens({ GOOGLE_SITE_VERIFICATION: "abcDEF123_-xyz", VITE_BING_SITE_VERIFICATION: "0123456789ABCDEF" });
    const head = renderHead(site, features, { verification: t });
    expect(head).toContain('<meta name="google-site-verification" content="abcDEF123_-xyz" />');
    expect(head).toContain('<meta name="msvalidate.01" content="0123456789ABCDEF" />');
  });
  it("structured data uses only real site facts", () => {
    const ld = JSON.stringify(siteJsonLd(site));
    expect(ld).toContain('"Organization"');
    expect(ld).toContain('"WebSite"');
    expect(ld).toContain('"SoftwareApplication"');
    expect(ld).not.toMatch(/aggregateRating|review|offers|price|streetAddress|award/i);
  });
  it("absolute URLs are https on the canonical host without trailing slashes", () => {
    expect(absUrl(SITE, "/")).toBe(`${SITE}/`);
    expect(absUrl(SITE, "/about/")).toBe(`${SITE}/about`);
    expect(() => absUrl("http://shulecloud.com", "/")).toThrow();
  });
});

describe("runtime SEO (SeoManager)", () => {
  beforeEach(() => { document.head.innerHTML = ""; document.title = ""; });

  it("public pages get their own title, canonical and no robots block", () => {
    const s = seoForPath("/features/", true);
    expect(s).not.toBe("self");
    applySeo(s as SeoInput);
    expect(document.title).toBe(site.pages.find(p => p.path === "/features")!.title);
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(`${SITE}/features`);
    expect(document.querySelector('meta[name="robots"]')).toBeNull();
  });
  it("private routes and school hosts are noindex with no canonical", () => {
    for (const [p, host] of [["/dashboard", true], ["/owner/schools", true], ["/egerton/result/T1/1/2", true], ["/features", false], ["/", false]] as const) {
      document.head.innerHTML = '<link rel="canonical" href="https://shulecloud.com/x">';
      applySeo(seoForPath(p, host) as SeoInput);
      expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, nofollow");
      expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    }
  });
  it("blog posts manage their own metadata", () => {
    expect(seoForPath("/blogs/some-post", true)).toBe("self");
  });
  it("only the main host is indexable", () => {
    expect(isIndexableHost("shulecloud.com")).toBe(true);
    expect(isIndexableHost("egerton.shulecloud.com")).toBe(false);
    expect(isIndexableHost("students.egerton.shulecloud.com")).toBe(false);
    expect(isIndexableHost("owner.shulecloud.com")).toBe(false);
    expect(isIndexableHost("www.shulecloud.com")).toBe(false);
  });
});
