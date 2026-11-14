# SEO: sitemap, robots, page metadata

ShuleCloud's website is a React + Vite single-page app on Cloudflare Pages. The same
deployment serves `shulecloud.com` and every school subdomain (`egerton.shulecloud.com`, …).
Search engines should index only the public marketing site on `https://shulecloud.com`.

## How it works

| What | Where | Notes |
|---|---|---|
| List of public pages (title, description, sitemap flag) | `src/seo/site.json` | The single source of truth for the build and the browser. |
| `sitemap.xml` + per-page HTML heads | `scripts/generate-seo.mjs` (logic in `scripts/seo-lib.mjs`) | Runs automatically at the end of every `vite build` through the `shulecloud-seo` plugin in `vite.config.ts`. The build command is unchanged. |
| `robots.txt` | `public/robots.txt` | Copied to `dist/` by Vite. |
| Content types, cache and `X-Robots-Tag: noindex` for subdomains and `*.pages.dev` | `public/_headers` | Cloudflare Pages headers file. |
| Runtime title, description, canonical, robots and JSON-LD on client-side navigation | `src/seo/seo.ts` (`<SeoManager />` in `App.tsx`) | Every route not in `site.json` gets `noindex` (logins, dashboards, school portals, shared documents, result and verification links). |
| Blog post metadata | `src/pages/public/BlogPost.tsx` → `applySeo` | Respects the post's `canonicalUrl`, `robots` and `visibility`. |
| Blog sitemap on the API | `GET https://api.shulecloud.com/api/v1/blog/public/sitemap.xml` | Optional. The main sitemap already includes blog posts. |

### What goes into `sitemap.xml`

- The pages in `site.json` with `"sitemap": true`.
- Live blog posts that are public and indexable, fetched from `/api/v1/blog/public/posts` at build time.
  - Drafts and future-scheduled posts are left out.
  - Private posts and posts marked `noindex` are left out.
  - A post whose canonical URL is another site is left out.
- `<lastmod>` comes only from real dates:
  - a post's `updatedAt` or `publishAt`
  - a page's `lastmod` in `site.json` (Terms and Privacy carry the "Last Updated" date shown on the page).
- No `changefreq` or `priority`.
- Above 50,000 URLs or 50 MB, `sitemap.xml` becomes a sitemap index of `sitemap-1.xml`, `sitemap-2.xml`, and so on.
- If the API can't be reached during the build, the sitemap still builds with the static pages and the build log says so.
- New blog posts appear in `sitemap.xml` at the next deploy. Meanwhile the API's blog sitemap is always current, so you can submit it too.

### Each page's HTML

- `dist/features.html`, `dist/about.html` and the others are the app shell with that page's own `<title>`, description, canonical, Open Graph tags and JSON-LD.
- Cloudflare Pages serves `/features` from `features.html`, so crawlers that don't run JavaScript still see the right metadata.
- `dist/index.html` is also the fallback for every other route (`_redirects`). It carries the home page's title and description but deliberately no canonical.

### Schools

- No school has public, approved marketing pages today. A school's subdomain is its login and portal, so no school sitemap is generated.
- School subdomains are marked noindex by `_headers` and at runtime.
- School subdomains are never listed anywhere.

## Adding a new public page

1. Add the route in `src/App.tsx` as usual.
2. Add an entry to `src/seo/site.json`:
   ```json
   { "path": "/pricing", "title": "Pricing — ShuleCloud", "description": "…", "breadcrumb": "Pricing", "sitemap": true }
   ```
   - Use a unique title and description.
   - Add `"lastmod": "YYYY-MM-DD"` only if the page shows a real updated date.
   - Use `"robots": "noindex, follow"` with `"sitemap": false` for pages that should not be indexed.
3. Run `npm test` and `npm run build && npm run seo:check`.

## Commands

```sh
cd frontend
npm test                          # unit tests (src/seo/seo.test.ts covers sitemap, robots, heads, runtime)
npm run build                     # vite build + sitemap.xml + per-page HTML (same command Cloudflare runs)
npm run seo:check                 # validate dist/: sitemap, robots, canonicals, no private paths
npx vite preview                  # then: curl -i http://localhost:4173/sitemap.xml
```

Optional build environment variables, set in Cloudflare Pages → Settings → Environment variables:

| Variable | Purpose |
|---|---|
| `GOOGLE_SITE_VERIFICATION` | The `content` value of the Search Console HTML-tag method. Adds `<meta name="google-site-verification">`. |
| `BING_SITE_VERIFICATION` | The `content` value of Bing's `msvalidate.01` meta tag. |
| `SITEMAP_API_URL` | API base for blog posts. Defaults to `$VITE_API_URL/api/v1`, or `https://api.shulecloud.com/api/v1`. |
| `SITEMAP_BLOG=off` | Skip fetching blog posts. |
| `SEO_SITE_URL` | Canonical origin. Defaults to `https://shulecloud.com`. |

## After deploying, check

```sh
curl -sI https://shulecloud.com/sitemap.xml   # 200, content-type: application/xml
curl -s  https://shulecloud.com/sitemap.xml | head -5   # <?xml … <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
curl -s  https://shulecloud.com/robots.txt    # ends with: Sitemap: https://shulecloud.com/sitemap.xml
curl -s  https://shulecloud.com/features | grep canonical
curl -sI https://egerton.shulecloud.com/ | grep -i x-robots-tag   # noindex, nofollow
```

If `/sitemap.xml` ever returns HTML, the file is missing from the deployment (the SPA fallback answered). Check the build log for `[seo] sitemap:`.

## Search Console and Bing

Google Search Console:
1. Add a **Domain property** for `shulecloud.com`. Verify it with the DNS TXT record Google gives you, added in Cloudflare DNS. Alternatively, use a URL-prefix property for `https://shulecloud.com/` and the HTML tag method via `GOOGLE_SITE_VERIFICATION`.
2. Go to Sitemaps, submit `https://shulecloud.com/sitemap.xml`. Optionally also submit `https://api.shulecloud.com/api/v1/blog/public/sitemap.xml`, which only works in a Domain property.
3. Use URL Inspection on `https://shulecloud.com/` and `/features`, then Request indexing.

Bing Webmaster Tools:
1. Import the site from Search Console, or add `https://shulecloud.com/` and verify it with a DNS CNAME or with `BING_SITE_VERIFICATION`.
2. Go to Sitemaps, submit `https://shulecloud.com/sitemap.xml`.

Indexing is decided by the search engines; submitting a sitemap does not guarantee it.

## Recommended Cloudflare setting (not done in code)

If `www.shulecloud.com` serves the site, add a Cloudflare Redirect Rule: `www.shulecloud.com/*` → `https://shulecloud.com/${1}` (301). This keeps one canonical host. Until then, `www` is marked noindex by `_headers`.
