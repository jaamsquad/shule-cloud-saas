/**
 * Checks a built dist/ before deploy: `npm run build && npm run seo:check`.
 * Fails (exit 1) if sitemap.xml / robots.txt / per-page HTML are missing or wrong.
 */
import { readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { sitemapProblems, isPrivatePath, htmlFileFor, absUrl, SITEMAP_NS } from "./seo-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const site = JSON.parse(await readFile(path.join(root, "src/seo/site.json"), "utf8"));
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

const sitemap = await readFile(path.join(dist, "sitemap.xml"), "utf8").catch(() => "");
ok(sitemap, "dist/sitemap.xml is missing");
ok(sitemap.includes(`xmlns="${SITEMAP_NS}"`), "sitemap.xml has no sitemap namespace");
fails.push(...sitemapProblems(sitemap, site.siteUrl).map((p) => `sitemap.xml: ${p}`));
const files = sitemap.includes("<sitemapindex") ? [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => new URL(m[1]).pathname.slice(1)) : [];
const urlsets = [sitemap];
for (const f of files) {
  const xml = await readFile(path.join(dist, f), "utf8").catch(() => "");
  ok(xml, `dist/${f} (listed in the sitemap index) is missing`);
  fails.push(...sitemapProblems(xml, site.siteUrl).map((p) => `${f}: ${p}`));
  urlsets.push(xml);
}
const locs = urlsets.flatMap((x) => [...x.matchAll(/<url>\s*<loc>([^<]*)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&")));
for (const l of locs) ok(!isPrivatePath(new URL(l).pathname), `private path in sitemap: ${l}`);
for (const p of site.pages.filter((p) => p.sitemap)) ok(locs.includes(absUrl(site.siteUrl, p.path)), `public page missing from sitemap: ${p.path}`);

const robots = await readFile(path.join(dist, "robots.txt"), "utf8").catch(() => "");
ok(robots.includes(`Sitemap: ${absUrl(site.siteUrl, "/sitemap.xml")}`), "robots.txt has no Sitemap line");
ok(!/^Disallow:\s*\/\s*$/m.test(robots), "robots.txt blocks the whole site");
ok(!/^Disallow:\s*\/(assets|icons)\b/m.test(robots), "robots.txt blocks static assets");

for (const p of site.pages) {
  const f = htmlFileFor(p.path);
  const html = await readFile(path.join(dist, f), "utf8").catch(() => "");
  ok(html.includes("<div id=\"root\"></div>"), `${f} is not the app shell`);
  if (p.path !== "/") {
    ok(html.includes(`<link rel="canonical" href="${absUrl(site.siteUrl, p.path)}" />`), `${f}: wrong or missing canonical`);
    ok((html.match(/<title>/g) || []).length === 1, `${f}: expected exactly one <title>`);
  } else ok(!html.includes('rel="canonical"'), "index.html (SPA fallback) must not carry a canonical");
}
await access(path.join(dist, "_headers")).catch(() => fails.push("dist/_headers is missing"));

if (fails.length) {
  console.error(`SEO check failed:\n - ${fails.join("\n - ")}`);
  process.exit(1);
}
console.log(`SEO check passed: ${locs.length} sitemap URLs, robots.txt and ${site.pages.length} page heads OK.`);
