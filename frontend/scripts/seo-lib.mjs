/**
 * SEO building blocks shared by the build step (scripts/generate-seo.mjs), its tests
 * (src/seo/seo.test.ts) and the dist checker (scripts/check-seo.mjs).
 *
 * Public pages come from src/seo/site.json — the single list of indexable marketing pages.
 * Blog posts come from the public blog API. Nothing private (school, student, parent, staff,
 * exam, finance data, logins, dashboards) is ever listed: only the pages in site.json and
 * published, public, indexable blog posts.
 */

export const SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9";
/** Sitemap protocol limits per file. */
export const MAX_URLS = 50000;
export const MAX_BYTES = 50 * 1024 * 1024;

const XML_ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
export const escapeXml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => XML_ESC[c]);
export const escapeAttr = escapeXml;

/** The canonical site origin, e.g. "https://shulecloud.com" (https only, no trailing slash). */
export function siteOrigin(siteUrl) {
  const u = new URL(siteUrl);
  if (u.protocol !== "https:") throw new Error(`Site URL must be https: ${siteUrl}`);
  return u.origin;
}

/** Absolute canonical URL for a site path: "/" stays "/", others have no trailing slash. */
export function absUrl(siteUrl, path) {
  const origin = siteOrigin(siteUrl);
  let p = String(path || "/").trim();
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  let safe = p;
  try { safe = encodeURI(decodeURI(p)); } catch { safe = encodeURI(p); }
  return `${origin}${p === "/" ? "/" : safe}`;
}

/** True when `url` is an https URL on the site's own host (what the main sitemap may list). */
export function isOnSite(url, siteUrl) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.host === new URL(siteUrl).host && !u.search && !u.hash;
  } catch {
    return false;
  }
}

/** A W3C datetime for <lastmod>, or null when the value isn't a real, non-future date. */
export function lastmodOf(value, now = new Date()) {
  if (!value) return null;
  const s = String(value);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : new Date(s);
  if (isNaN(d.getTime()) || d.getTime() > now.getTime() + 60_000 || d.getUTCFullYear() < 2000) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : d.toISOString();
}

/** Sitemap entries for the marketing pages flagged `sitemap: true` in site.json. */
export function pageEntries(site) {
  return site.pages
    .filter((p) => p.sitemap === true && !/noindex/i.test(p.robots || ""))
    .map((p) => ({ loc: absUrl(site.siteUrl, p.path), lastmod: lastmodOf(p.lastmod) }));
}

const SLUG = /^[a-z0-9][a-z0-9-_]*$/i;
/**
 * Sitemap entries for blog posts. Only live, public, indexable posts; a post whose canonical URL
 * is another page of this site is listed under that URL, one pointing to another site is left out.
 * lastmod = the post's own updatedAt (or publishAt) — never the build time.
 */
export function blogEntries(posts, siteUrl, now = new Date()) {
  const out = [];
  for (const p of posts || []) {
    if (!p || typeof p.slug !== "string" || !SLUG.test(p.slug)) continue;
    if (p.deletedAt) continue;
    if (p.status && !["published", "scheduled"].includes(p.status)) continue;
    if (p.visibility && p.visibility !== "public") continue;
    if (/noindex/i.test(String(p.robots || ""))) continue;
    if (p.publishAt && new Date(p.publishAt).getTime() > now.getTime()) continue;
    let loc = absUrl(siteUrl, `/blogs/${p.slug}`);
    if (p.canonicalUrl && String(p.canonicalUrl).trim()) {
      const c = String(p.canonicalUrl).trim();
      if (!isOnSite(c, siteUrl)) continue; // canonical lives elsewhere — not ours to list
      loc = absUrl(siteUrl, new URL(c).pathname);
    }
    out.push({ loc, lastmod: lastmodOf(p.updatedAt || p.publishAt, now) });
  }
  return out;
}

/** Drop duplicate URLs (first wins) and anything not https on the site host. */
export function cleanEntries(entries, siteUrl) {
  const seen = new Set();
  const out = [];
  for (const e of entries) {
    if (!e?.loc || !isOnSite(e.loc, siteUrl) || seen.has(e.loc)) continue;
    seen.add(e.loc);
    out.push(e);
  }
  return out;
}

const urlXml = (e) => `  <url>\n    <loc>${escapeXml(e.loc)}</loc>\n${e.lastmod ? `    <lastmod>${escapeXml(e.lastmod)}</lastmod>\n` : ""}  </url>\n`;

export function buildUrlset(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="${SITEMAP_NS}">\n${entries.map(urlXml).join("")}</urlset>\n`;
}

export function buildSitemapIndex(locs) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="${SITEMAP_NS}">\n${locs
    .map((l) => `  <sitemap>\n    <loc>${escapeXml(l)}</loc>\n  </sitemap>\n`)
    .join("")}</sitemapindex>\n`;
}

/**
 * The sitemap file(s) to publish. Within the protocol limits: one `sitemap.xml` urlset.
 * Beyond them: `sitemap.xml` becomes a sitemap index of `sitemap-1.xml`, `sitemap-2.xml`, …
 */
export function buildSitemapFiles(entries, siteUrl, { maxUrls = MAX_URLS, maxBytes = MAX_BYTES } = {}) {
  const clean = cleanEntries(entries, siteUrl);
  const chunks = [];
  let cur = [];
  let bytes = Buffer.byteLength(buildUrlset([]));
  for (const e of clean) {
    const b = Buffer.byteLength(urlXml(e));
    if (cur.length && (cur.length >= maxUrls || bytes + b > maxBytes)) {
      chunks.push(cur);
      cur = [];
      bytes = Buffer.byteLength(buildUrlset([]));
    }
    cur.push(e);
    bytes += b;
  }
  chunks.push(cur);
  if (chunks.length === 1) return [{ name: "sitemap.xml", xml: buildUrlset(chunks[0]), count: chunks[0].length }];
  const parts = chunks.map((c, i) => ({ name: `sitemap-${i + 1}.xml`, xml: buildUrlset(c), count: c.length }));
  return [
    { name: "sitemap.xml", xml: buildSitemapIndex(parts.map((p) => absUrl(siteUrl, `/${p.name}`))), count: 0 },
    ...parts,
  ];
}

// ── Structured data (schema.org JSON-LD) — only facts already published on the site ──────────

export function siteJsonLd(site) {
  const origin = siteOrigin(site.siteUrl);
  const o = site.organization || {};
  const org = {
    "@type": "Organization",
    "@id": `${origin}/#organization`,
    name: site.siteName,
    url: `${origin}/`,
    logo: absUrl(site.siteUrl, site.logo),
  };
  if (o.email) org.email = o.email;
  if (o.telephone) org.telephone = o.telephone;
  if (o.locality || o.country) {
    org.address = { "@type": "PostalAddress", ...(o.locality && { addressLocality: o.locality }), ...(o.country && { addressCountry: o.country }) };
  }
  if (o.email || o.telephone) {
    org.contactPoint = [{ "@type": "ContactPoint", contactType: "customer support", ...(o.email && { email: o.email }), ...(o.telephone && { telephone: o.telephone }) }];
  }
  return {
    "@context": "https://schema.org",
    "@graph": [
      org,
      { "@type": "WebSite", "@id": `${origin}/#website`, name: site.siteName, url: `${origin}/`, publisher: { "@id": `${origin}/#organization` } },
      {
        "@type": "SoftwareApplication",
        "@id": `${origin}/#software`,
        name: site.siteName,
        url: `${origin}/`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: site.pages.find((p) => p.path === "/")?.description,
        publisher: { "@id": `${origin}/#organization` },
      },
    ],
  };
}

export function breadcrumbJsonLd(site, page) {
  if (!page.breadcrumb || page.path === "/") return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absUrl(site.siteUrl, "/") },
      { "@type": "ListItem", position: 2, name: page.breadcrumb, item: absUrl(site.siteUrl, page.path) },
    ],
  };
}

/** JSON for inside <script>: "<" escaped so content can never close the tag. */
export const jsonForScript = (v) => JSON.stringify(v).replace(/</g, "\\u003c");

/** Search-engine ownership tokens, from build env only (never hardcoded). */
export function verificationTokens(env = {}) {
  const ok = (v) => (v && /^[A-Za-z0-9_\-:.]{6,200}$/.test(String(v).trim()) ? String(v).trim() : null);
  return {
    google: ok(env.GOOGLE_SITE_VERIFICATION || env.VITE_GOOGLE_SITE_VERIFICATION),
    bing: ok(env.BING_SITE_VERIFICATION || env.VITE_BING_SITE_VERIFICATION),
  };
}

/**
 * The SEO <head> block for one page. `canonical: false` is used for the SPA fallback
 * (index.html), which is also served for routes that are not this page.
 */
export function renderHead(site, page, { canonical = true, verification = {} } = {}) {
  const url = absUrl(site.siteUrl, page.path);
  const image = absUrl(site.siteUrl, page.image || site.image);
  const lines = [
    `<title>${escapeXml(page.title)}</title>`,
    `<meta name="description" content="${escapeAttr(page.description)}" />`,
  ];
  if (canonical) lines.push(`<link rel="canonical" href="${escapeAttr(url)}" />`);
  if (canonical && page.robots) lines.push(`<meta name="robots" content="${escapeAttr(page.robots)}" />`);
  lines.push(
    `<meta property="og:site_name" content="${escapeAttr(site.siteName)}" />`,
    `<meta property="og:title" content="${escapeAttr(page.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(page.description)}" />`,
    `<meta property="og:type" content="website" />`,
  );
  if (canonical) lines.push(`<meta property="og:url" content="${escapeAttr(url)}" />`);
  lines.push(
    `<meta property="og:image" content="${escapeAttr(image)}" />`,
    `<meta property="og:locale" content="${escapeAttr(site.locale || "en")}" />`,
    `<meta name="twitter:card" content="summary" />`,
  );
  if (site.twitter) lines.push(`<meta name="twitter:site" content="${escapeAttr(site.twitter)}" />`);
  lines.push(
    `<meta name="twitter:title" content="${escapeAttr(page.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(page.description)}" />`,
  );
  if (verification.google) lines.push(`<meta name="google-site-verification" content="${escapeAttr(verification.google)}" />`);
  if (verification.bing) lines.push(`<meta name="msvalidate.01" content="${escapeAttr(verification.bing)}" />`);
  lines.push(`<script type="application/ld+json" id="ld-site">${jsonForScript(siteJsonLd(site))}</script>`);
  const crumbs = canonical ? breadcrumbJsonLd(site, page) : null;
  if (crumbs) lines.push(`<script type="application/ld+json" id="ld-page">${jsonForScript(crumbs)}</script>`);
  return lines.map((l) => `  ${l}`).join("\n");
}

export const HEAD_START = "<!-- seo:start -->";
export const HEAD_END = "<!-- seo:end -->";

/** Replace the marked SEO block of the built index.html with `head`. */
export function withHead(html, head) {
  const a = html.indexOf(HEAD_START);
  const b = html.indexOf(HEAD_END);
  if (a < 0 || b < a) throw new Error("index.html is missing the <!-- seo:start --> … <!-- seo:end --> block");
  return `${html.slice(0, a + HEAD_START.length)}\n${head}\n  ${html.slice(b)}`;
}

/** Output file for a page's pre-rendered HTML: "/features" → "features.html" ("/" → index.html). */
export function htmlFileFor(path) {
  if (path === "/") return "index.html";
  return `${path.replace(/^\/+|\/+$/g, "")}.html`;
}

/** Light structural check of a generated sitemap / sitemap index. Returns a list of problems. */
export function sitemapProblems(xml, siteUrl) {
  const problems = [];
  if (!xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) problems.push("missing XML declaration");
  if (/<html|<!doctype/i.test(xml)) problems.push("looks like HTML");
  const isIndex = xml.includes("<sitemapindex");
  if (!xml.includes(`xmlns="${SITEMAP_NS}"`)) problems.push("missing sitemap namespace");
  const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
  if (!isIndex && locs.length > MAX_URLS) problems.push("too many URLs");
  if (Buffer.byteLength(xml) > MAX_BYTES) problems.push("file too large");
  const seen = new Set();
  for (const l of locs) {
    if (!isOnSite(l, siteUrl)) problems.push(`not an https URL on the site: ${l}`);
    if (seen.has(l)) problems.push(`duplicate: ${l}`);
    seen.add(l);
  }
  if (/&(?!amp;|lt;|gt;|quot;|apos;)/.test(xml)) problems.push("unescaped &");
  return problems;
}

/** Paths that must never appear in a sitemap (private app areas). */
export const PRIVATE_PATTERNS = [
  /^\/login\b/, /^\/owner\b/, /^\/dashboard\b/, /^\/onboarding\b/, /^\/activate\b/, /^\/register\b/,
  /^\/application\b/, /^\/find-school\b/, /^\/lnk\//, /^\/reset-password\b/, /^\/status\b/,
  /\/certificate\/verify\//, /\/report\/verify\//, /^\/[^/]+\/result\//,
  /^\/(students|staff|parents?|fees|exams|finance|accounts|settings|reports|student-portal|staff-portal|parent-portal)\b/,
];
export const isPrivatePath = (path) => PRIVATE_PATTERNS.some((r) => r.test(path));
