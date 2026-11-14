/**
 * Post-build SEO step. Runs automatically at the end of every `vite build` (the seoBuild plugin
 * in vite.config.ts), so the existing build command produces it; it can also be run on its own
 * against an existing dist/: `node scripts/generate-seo.mjs`.
 *
 *  1. dist/sitemap.xml — the public marketing pages in src/seo/site.json plus live, public,
 *     indexable blog posts (from the public blog API). Split into a sitemap index + parts if it
 *     ever exceeds the protocol limits.
 *  2. dist/<page>.html — a copy of the app shell per public page with that page's own title,
 *     description, canonical, Open Graph tags and JSON-LD in the HTML, so crawlers that don't run
 *     JavaScript still see the right metadata. The React app boots exactly as before.
 *  3. dist/index.html (the SPA fallback for every other route) gets the home page's title and
 *     description but no canonical, since it is also served for routes that aren't the home page.
 *
 * Env (all optional):
 *   SEO_SITE_URL                 canonical origin (default from site.json: https://shulecloud.com)
 *   SITEMAP_API_URL              API base for blog posts (default: $VITE_API_URL/api/v1 or https://api.shulecloud.com/api/v1)
 *   SITEMAP_BLOG=off             don't fetch blog posts
 *   GOOGLE_SITE_VERIFICATION     Search Console HTML-tag token  (VITE_ prefix also accepted)
 *   BING_SITE_VERIFICATION       Bing Webmaster msvalidate.01 token (VITE_ prefix also accepted)
 *
 * If the blog API can't be reached the build still succeeds with the static pages listed.
 */
import { readFile, writeFile, readdir, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  pageEntries, blogEntries, buildSitemapFiles, sitemapProblems, renderHead, withHead, htmlFileFor,
  verificationTokens, siteOrigin,
} from "./seo-lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function fetchBlogPosts(apiBase) {
  if (typeof fetch !== "function") throw new Error("fetch is not available in this Node version");
  const posts = [];
  for (let page = 1, pages = 1; page <= pages && page <= 400; page++) {
    const res = await fetch(`${apiBase}/blog/public/posts?limit=50&page=${page}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`blog API answered ${res.status}`);
    const body = await res.json();
    posts.push(...(Array.isArray(body.items) ? body.items : []));
    pages = Number(body.pages) || 1;
  }
  return posts;
}

export async function generateSeo({ root = ROOT, dist = path.join(ROOT, "dist"), env = process.env } = {}) {
  const site = JSON.parse(await readFile(path.join(root, "src/seo/site.json"), "utf8"));
  if (env.SEO_SITE_URL) site.siteUrl = siteOrigin(env.SEO_SITE_URL);
  const verification = verificationTokens(env);

  // 1 · sitemap
  const entries = pageEntries(site);
  if (String(env.SITEMAP_BLOG || "").toLowerCase() !== "off") {
    const apiBase = (env.SITEMAP_API_URL || `${env.VITE_API_URL || "https://api.shulecloud.com"}/api/v1`).replace(/\/+$/, "");
    try {
      const posts = await fetchBlogPosts(apiBase);
      const blog = blogEntries(posts, site.siteUrl);
      entries.push(...blog);
      console.log(`[seo] ${blog.length} blog post(s) from ${apiBase}`);
    } catch (e) {
      console.warn(`[seo] blog posts not added to the sitemap (${e.message}); listing the static pages only`);
    }
  }
  for (const f of await readdir(dist)) if (/^sitemap(-\d+)?\.xml$/.test(f)) await unlink(path.join(dist, f));
  const files = buildSitemapFiles(entries, site.siteUrl);
  for (const f of files) {
    const problems = sitemapProblems(f.xml, site.siteUrl);
    if (problems.length) throw new Error(`[seo] ${f.name} is invalid: ${problems.join("; ")}`);
    await writeFile(path.join(dist, f.name), f.xml);
  }
  console.log(`[seo] sitemap: ${files.map((f) => `${f.name}${f.count ? ` (${f.count} URLs)` : " (index)"}`).join(", ")}`);

  // 2 · per-page HTML, 3 · fallback index.html
  const shell = await readFile(path.join(dist, "index.html"), "utf8");
  const home = site.pages.find((p) => p.path === "/");
  for (const page of site.pages) {
    if (page.path === "/") continue;
    await writeFile(path.join(dist, htmlFileFor(page.path)), withHead(shell, renderHead(site, page, { canonical: true, verification })));
  }
  await writeFile(path.join(dist, "index.html"), withHead(shell, renderHead(site, home, { canonical: false, verification })));
  console.log(`[seo] page HTML: ${site.pages.filter((p) => p.path !== "/").map((p) => htmlFileFor(p.path)).join(", ")}`);
  if (verification.google || verification.bing) console.log(`[seo] verification meta: ${[verification.google && "Google", verification.bing && "Bing"].filter(Boolean).join(", ")}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateSeo().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
