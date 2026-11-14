/**
 * Blog module — company news / articles for the public website.
 *
 * Admin endpoints (/api/v1/blog/admin/*) are Super-Owner only. Public endpoints
 * (/api/v1/blog/public/*) are open and serve published posts by SLUG, not id, so
 * articles live at shulecloud.com/blogs/:slug.
 *
 * Storage: platform meta DB (getDb) — a single company-wide blog.
 * Collections: blog_posts, blog_categories, blog_tags, blog_audit.
 */
import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDb } from '../lib/mongodb';

const router = Router();

// ─── Image uploads ───────────────────────────────────────────────────────────
const BLOG_UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'blog');
fs.mkdirSync(BLOG_UPLOAD_DIR, { recursive: true });

const imageStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, BLOG_UPLOAD_DIR),
    filename: (_req, file, cb) => {
        const ext = (path.extname(file.originalname) || '.png').toLowerCase().slice(0, 6);
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
});
const uploadImage = multer({
    storage: imageStorage,
    limits: { fileSize: 8 * 1024 * 1024 },   // 8MB
    fileFilter: (_req, file, cb) => {
        if (/^image\/(png|jpe?g|gif|webp|svg\+xml)$/.test(file.mimetype)) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    },
});
const oid = (s?: string) => { try { return s ? new ObjectId(s) : undefined; } catch { return undefined; } };

// ─── Auth: Super Owner only ──────────────────────────────────────────────────
const ownerClaims = (req: Request): any => {
    try {
        const auth = req.headers.authorization;
        if (!auth) return null;
        return jwt.verify(auth.split(' ')[1], process.env.OWNER_JWT_SECRET || 'owner_secret');
    } catch { return null; }
};
const requireSuperOwner = (req: Request, res: Response, next: Function) => {
    const claims = ownerClaims(req);
    const role = String(claims?.role || '').toLowerCase();
    if (!claims) return res.status(401).json({ message: 'Not authenticated' });
    if (role !== 'super_owner') return res.status(403).json({ message: 'Super Owner access only' });
    (req as any).owner = claims;
    next();
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const slugify = (s: string) => String(s).toLowerCase().trim()
    .replace(/['"]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'post';

const wordCount = (html: string) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
const readingTime = (html: string) => Math.max(1, Math.round(wordCount(html) / 200));

// Ensure the slug is unique (append -2, -3 … on collision).
const uniqueSlug = async (base: string, excludeId?: ObjectId) => {
    const col = getDb().collection('blog_posts');
    let slug = base, n = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const clash = await col.findOne({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
        if (!clash) return slug;
        n += 1; slug = `${base}-${n}`;
    }
};

const audit = async (req: Request, action: string, postId: any, before?: any, after?: any) => {
    try {
        await getDb().collection('blog_audit').insertOne({
            action, postId: postId ? String(postId) : null,
            user: (req as any).owner?.email || (req as any).owner?.name || 'owner',
            ip: req.ip || req.headers['x-forwarded-for'] || '',
            before: before || null, after: after || null, at: new Date(),
        });
    } catch { /* non-fatal */ }
};

// A post is "live" if published and (no schedule OR schedule time has passed).
const liveFilter = () => ({
    status: { $in: ['published', 'scheduled'] },
    deletedAt: { $exists: false },
    $or: [{ publishAt: { $exists: false } }, { publishAt: null }, { publishAt: { $lte: new Date() } }],
});

const sanitizePost = (b: any) => {
    const allowed = [
        'title', 'subtitle', 'slug', 'shortDescription', 'content', 'excerpt',
        'featuredImage', 'gallery', 'videos', 'attachments',
        'seoTitle', 'metaDescription', 'keywords', 'canonicalUrl', 'ogImage', 'robots',
        'category', 'tags', 'badges', 'visibility', 'status', 'publishAt',
        'pinned', 'featured', 'allowComments', 'allowSharing',
    ];
    const out: any = {};
    for (const k of allowed) if (b[k] !== undefined) out[k] = b[k];
    return out;
};

// ════════════════════════════════════════════════════════════════════════════
//  ADMIN  (Super Owner)
// ════════════════════════════════════════════════════════════════════════════

// Dashboard stats
router.get('/blog/admin/stats', requireSuperOwner, async (_req, res) => {
    try {
        const db = getDb();
        const posts = db.collection('blog_posts');
        const base = { deletedAt: { $exists: false } };
        const [total, published, draft, scheduled, archived, cats, tags, viewsAgg, top, perMonth] = await Promise.all([
            posts.countDocuments(base),
            posts.countDocuments({ ...base, status: 'published' }),
            posts.countDocuments({ ...base, status: 'draft' }),
            posts.countDocuments({ ...base, status: 'scheduled' }),
            posts.countDocuments({ ...base, status: 'archived' }),
            db.collection('blog_categories').countDocuments({}),
            db.collection('blog_tags').countDocuments({}),
            posts.aggregate([{ $match: base }, { $group: { _id: null, v: { $sum: { $ifNull: ['$views', 0] } } } }]).toArray(),
            posts.find(base).sort({ views: -1 }).limit(5).project({ title: 1, slug: 1, views: 1 }).toArray(),
            posts.aggregate([
                { $match: { ...base, status: 'published', publishAt: { $ne: null } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m', date: { $ifNull: ['$publishAt', '$createdAt'] } } }, n: { $sum: 1 } } },
                { $sort: { _id: 1 } }, { $limit: 12 },
            ]).toArray(),
        ]);
        res.json({
            totals: { total, published, draft, scheduled, archived, categories: cats, tags, views: viewsAgg[0]?.v || 0 },
            topArticles: top,
            publishedPerMonth: perMonth.map(m => ({ month: m._id, count: m.n })),
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// List posts (admin) with search + status filter
router.get('/blog/admin/posts', requireSuperOwner, async (req, res) => {
    try {
        const { q, status, category, tag } = req.query as any;
        const filter: any = { deletedAt: { $exists: false } };
        if (status && status !== 'all') filter.status = status;
        if (category) filter.category = category;
        if (tag) filter.tags = tag;
        if (q) filter.$or = [
            { title: { $regex: String(q), $options: 'i' } },
            { content: { $regex: String(q), $options: 'i' } },
            { excerpt: { $regex: String(q), $options: 'i' } },
        ];
        const rows = await getDb().collection('blog_posts').find(filter).sort({ updatedAt: -1 }).toArray();
        res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Single post (admin)
router.get('/blog/admin/posts/:id', requireSuperOwner, async (req, res) => {
    try {
        const row = await getDb().collection('blog_posts').findOne({ _id: oid(req.params.id) });
        if (!row) return res.status(404).json({ message: 'Not found' });
        res.json(row);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Create
router.post('/blog/admin/posts', requireSuperOwner, async (req, res) => {
    try {
        const body = sanitizePost(req.body);
        if (!body.title) return res.status(400).json({ message: 'Title is required' });
        const slug = await uniqueSlug(body.slug ? slugify(body.slug) : slugify(body.title));
        const now = new Date();
        const doc: any = {
            ...body, slug,
            status: body.status || 'draft',
            tags: body.tags || [], gallery: body.gallery || [], videos: body.videos || [], attachments: body.attachments || [], keywords: body.keywords || [], badges: body.badges || [],
            visibility: body.visibility || 'public',
            pinned: !!body.pinned, featured: !!body.featured,
            allowComments: body.allowComments !== false, allowSharing: body.allowSharing !== false,
            publishAt: body.publishAt ? new Date(body.publishAt) : (body.status === 'published' ? now : null),
            wordCount: wordCount(body.content || ''), readingTime: readingTime(body.content || ''),
            views: 0,
            author: (req as any).owner?.name || 'ShuleCloud',
            createdAt: now, updatedAt: now,
        };
        const r = await getDb().collection('blog_posts').insertOne(doc);
        await audit(req, 'create', r.insertedId, null, doc);
        res.status(201).json({ ...doc, _id: r.insertedId });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Update
router.put('/blog/admin/posts/:id', requireSuperOwner, async (req, res) => {
    try {
        const _id = oid(req.params.id);
        const col = getDb().collection('blog_posts');
        const before = await col.findOne({ _id });
        if (!before) return res.status(404).json({ message: 'Not found' });
        const body = sanitizePost(req.body);
        const set: any = { ...body, updatedAt: new Date() };
        if (body.slug) set.slug = await uniqueSlug(slugify(body.slug), _id);
        else if (body.title && !before.slug) set.slug = await uniqueSlug(slugify(body.title), _id);
        if (body.content !== undefined) { set.wordCount = wordCount(body.content); set.readingTime = readingTime(body.content); }
        if (body.publishAt !== undefined) set.publishAt = body.publishAt ? new Date(body.publishAt) : null;
        if (body.status === 'published' && !before.publishAt && !set.publishAt) set.publishAt = new Date();
        await col.updateOne({ _id }, { $set: set });
        await audit(req, 'update', _id, before, set);
        res.json({ ...before, ...set });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Quick status / pin / feature toggles
router.patch('/blog/admin/posts/:id', requireSuperOwner, async (req, res) => {
    try {
        const _id = oid(req.params.id);
        const allowed = ['status', 'pinned', 'featured', 'visibility', 'publishAt'];
        const set: any = { updatedAt: new Date() };
        for (const k of allowed) if (req.body[k] !== undefined) set[k] = k === 'publishAt' ? (req.body[k] ? new Date(req.body[k]) : null) : req.body[k];
        if (set.status === 'published' && set.publishAt === undefined) {
            const cur = await getDb().collection('blog_posts').findOne({ _id });
            if (cur && !cur.publishAt) set.publishAt = new Date();
        }
        await getDb().collection('blog_posts').updateOne({ _id }, { $set: set });
        await audit(req, 'patch', _id, null, set);
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Soft delete
router.delete('/blog/admin/posts/:id', requireSuperOwner, async (req, res) => {
    try {
        const _id = oid(req.params.id);
        await getDb().collection('blog_posts').updateOne({ _id }, { $set: { deletedAt: new Date() } });
        await audit(req, 'delete', _id);
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// ─── Categories ──────────────────────────────────────────────────────────────
router.get('/blog/admin/categories', requireSuperOwner, async (_req, res) => {
    res.json(await getDb().collection('blog_categories').find({}).sort({ name: 1 }).toArray());
});
router.post('/blog/admin/categories', requireSuperOwner, async (req, res) => {
    try {
        const { name, description, icon, color, parent } = req.body;
        if (!name) return res.status(400).json({ message: 'Name required' });
        const doc = { name, description: description || '', icon: icon || '', color: color || '#613ddf', parent: parent || null, slug: slugify(name), createdAt: new Date() };
        const r = await getDb().collection('blog_categories').insertOne(doc);
        res.status(201).json({ ...doc, _id: r.insertedId });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.put('/blog/admin/categories/:id', requireSuperOwner, async (req, res) => {
    try {
        const { name, description, icon, color, parent } = req.body;
        const set: any = { description, icon, color, parent };
        if (name) { set.name = name; set.slug = slugify(name); }
        await getDb().collection('blog_categories').updateOne({ _id: oid(req.params.id) }, { $set: set });
        res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.delete('/blog/admin/categories/:id', requireSuperOwner, async (req, res) => {
    await getDb().collection('blog_categories').deleteOne({ _id: oid(req.params.id) });
    res.json({ ok: true });
});

// ─── Tags ────────────────────────────────────────────────────────────────────
router.get('/blog/admin/tags', requireSuperOwner, async (_req, res) => {
    res.json(await getDb().collection('blog_tags').find({}).sort({ name: 1 }).toArray());
});
router.post('/blog/admin/tags', requireSuperOwner, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'Name required' });
        const slug = slugify(name);
        const existing = await getDb().collection('blog_tags').findOne({ slug });
        if (existing) return res.json(existing);
        const doc = { name, slug, createdAt: new Date() };
        const r = await getDb().collection('blog_tags').insertOne(doc);
        res.status(201).json({ ...doc, _id: r.insertedId });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});
router.delete('/blog/admin/tags/:id', requireSuperOwner, async (req, res) => {
    await getDb().collection('blog_tags').deleteOne({ _id: oid(req.params.id) });
    res.json({ ok: true });
});

// ─── Audit log ───────────────────────────────────────────────────────────────
router.get('/blog/admin/audit', requireSuperOwner, async (_req, res) => {
    res.json(await getDb().collection('blog_audit').find({}).sort({ at: -1 }).limit(200).toArray());
});

// ─── Image upload ────────────────────────────────────────────────────────────
// Returns an absolute URL so it works from both the owner portal and the public
// blog. PUBLIC_API_URL (e.g. https://api.shulecloud.com) is preferred; otherwise
// we derive the origin from the request.
router.post('/blog/admin/upload', requireSuperOwner, (req, res) => {
    uploadImage.single('file')(req, res, (err: any) => {
        if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
        const file = (req as any).file;
        if (!file) return res.status(400).json({ message: 'No file received' });
        const origin = process.env.PUBLIC_API_URL || `${req.protocol}://${req.headers['x-forwarded-host'] || req.headers.host}`;
        const url = `${origin.replace(/\/$/, '')}/uploads/blog/${file.filename}`;
        res.json({ url, filename: file.filename, size: file.size });
    });
});

// ════════════════════════════════════════════════════════════════════════════
//  PUBLIC
// ════════════════════════════════════════════════════════════════════════════

const publicProjection = { content: 0 } as any; // omit heavy body in list views

// List published posts (with pagination, category/tag filter, search)
router.get('/blog/public/posts', async (req, res) => {
    try {
        const { category, tag, q, page = '1', limit = '9' } = req.query as any;
        const filter: any = { ...liveFilter(), visibility: { $in: ['public', undefined as any] } };
        if (category) filter.category = category;
        if (tag) filter.tags = tag;
        if (q) filter.$and = [{ $or: [{ title: { $regex: String(q), $options: 'i' } }, { excerpt: { $regex: String(q), $options: 'i' } }, { shortDescription: { $regex: String(q), $options: 'i' } }] }];
        const lim = Math.min(50, parseInt(limit) || 9);
        const skip = (Math.max(1, parseInt(page) || 1) - 1) * lim;
        const col = getDb().collection('blog_posts');
        const [items, total] = await Promise.all([
            col.find(filter, { projection: publicProjection }).sort({ pinned: -1, publishAt: -1, createdAt: -1 }).skip(skip).limit(lim).toArray(),
            col.countDocuments(filter),
        ]);
        res.json({ items, total, page: parseInt(page) || 1, pages: Math.ceil(total / lim) });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// Featured / trending strips for the blog home
router.get('/blog/public/highlights', async (_req, res) => {
    try {
        const col = getDb().collection('blog_posts');
        const live = liveFilter();
        const [featured, latest, popular] = await Promise.all([
            col.find({ ...live, featured: true }, { projection: publicProjection }).sort({ publishAt: -1 }).limit(3).toArray(),
            col.find(live, { projection: publicProjection }).sort({ publishAt: -1, createdAt: -1 }).limit(5).toArray(),
            col.find(live, { projection: publicProjection }).sort({ views: -1 }).limit(5).toArray(),
        ]);
        res.json({ featured, latest, popular });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/blog/public/categories', async (_req, res) => {
    res.json(await getDb().collection('blog_categories').find({}).sort({ name: 1 }).toArray());
});

// Single post BY SLUG — increments views and returns related posts
router.get('/blog/public/posts/:slug', async (req, res) => {
    try {
        const col = getDb().collection('blog_posts');
        const post = await col.findOne({ slug: req.params.slug, ...liveFilter() });
        if (!post) return res.status(404).json({ message: 'Article not found' });
        col.updateOne({ _id: post._id }, { $inc: { views: 1 } }).catch(() => { });
        const related = await col.find({
            ...liveFilter(), _id: { $ne: post._id },
            $or: [{ category: post.category }, { tags: { $in: post.tags || [] } }],
        }, { projection: publicProjection }).sort({ publishAt: -1 }).limit(3).toArray();
        res.json({ post: { ...post, views: (post.views || 0) + 1 }, related });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

// RSS feed
router.get('/blog/public/rss.xml', async (req, res) => {
    try {
        const base = `${req.protocol}://${(req.headers['x-forwarded-host'] || req.headers.host)}`;
        const site = process.env.PUBLIC_SITE_URL || 'https://shulecloud.com';
        const items = await getDb().collection('blog_posts').find(liveFilter(), { projection: publicProjection }).sort({ publishAt: -1 }).limit(30).toArray();
        const xmlItems = items.map(p => `<item><title>${escapeXml(p.title)}</title><link>${site}/blogs/${p.slug}</link><guid>${site}/blogs/${p.slug}</guid><pubDate>${new Date(p.publishAt || p.createdAt).toUTCString()}</pubDate><description>${escapeXml(p.excerpt || p.shortDescription || '')}</description></item>`).join('');
        res.set('Content-Type', 'application/rss+xml').send(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>ShuleCloud Blog</title><link>${site}/blogs</link><description>News and articles from ShuleCloud</description>${xmlItems}</channel></rss>`);
        void base;
    } catch (e: any) { res.status(500).send(String(e.message)); }
});

// Sitemap for blog posts (the site's main sitemap is built with the frontend: shulecloud.com/sitemap.xml).
// Only live, public, indexable posts; a post whose canonical URL points elsewhere is left out;
// lastmod is the post's own updatedAt/publishAt — never the request time.
router.get('/blog/public/sitemap.xml', async (_req, res) => {
    try {
        const site = (process.env.PUBLIC_SITE_URL || 'https://shulecloud.com').replace(/\/+$/, '');
        const siteHost = (() => { try { return new URL(site).host; } catch { return ''; } })();
        const items = await getDb().collection('blog_posts')
            .find({ ...liveFilter(), visibility: { $in: ['public', undefined as any] } })
            .project({ slug: 1, updatedAt: 1, publishAt: 1, canonicalUrl: 1, robots: 1 }).toArray();
        const seen = new Set<string>();
        const urls: string[] = [];
        const add = (loc: string, mod?: any) => {
            if (seen.has(loc)) return;
            seen.add(loc);
            const d = mod ? new Date(mod) : null;
            const lastmod = d && !isNaN(d.getTime()) && d.getTime() <= Date.now() ? `<lastmod>${d.toISOString()}</lastmod>` : '';
            urls.push(`<url><loc>${escapeXml(loc)}</loc>${lastmod}</url>`);
        };
        add(`${site}/blogs`);
        for (const p of items) {
            if (!p.slug || /noindex/i.test(String(p.robots || ''))) continue;
            let loc = `${site}/blogs/${encodeURIComponent(p.slug)}`;
            if (p.canonicalUrl) {
                try { const c = new URL(String(p.canonicalUrl)); if (c.host !== siteHost || c.protocol !== 'https:') continue; loc = `${site}${c.pathname}`; } catch { continue; }
            }
            add(loc, p.updatedAt || p.publishAt);
        }
        res.set('Content-Type', 'application/xml; charset=utf-8').set('Cache-Control', 'public, max-age=3600')
            .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`);
    } catch (e: any) { res.status(500).send(String(e.message)); }
});

function escapeXml(s: string) { return String(s || '').replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string)); }

export default router;
