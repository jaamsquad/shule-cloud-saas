/**
 * Helpers for documents that carry a QR code which anyone can scan to check they are genuine
 * (certificates, report cards): masking of names, signed verification tokens, and finding a
 * school from the name used in the public link (shulecloud.com/<school>/certificate/verify/…).
 */
import crypto from 'crypto';
import { Db } from 'mongodb';
import { getMetaDb, getTenantDb, subdomainToDbName } from './mongodb';

/** "Muzamil Ibrahim Mohamed" → "Muzamil ******* Mohamed". First and last names stay; middle names are starred. */
export function maskName(full: string): string {
    const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0].length <= 2 ? parts[0] : parts[0][0] + '*'.repeat(parts[0].length - 1);
    if (parts.length === 2) return `${parts[0]} ${parts[1]}`;
    return [parts[0], ...parts.slice(1, -1).map(p => '*'.repeat(p.length)), parts[parts.length - 1]].join(' ');
}
/** "BS115" → "**115" (keeps the last 3 characters). */
export const maskRef = (v: string) => { const s = String(v || ''); return s.length <= 3 ? s : '*'.repeat(s.length - 3) + s.slice(-3); };

// ── signed tokens (stateless proof that a report card was issued by the school) ──
const secret = () => process.env.DOC_VERIFY_SECRET || process.env.JWT_SECRET || 'shulecloud_doc_verify_secret';
const b64u = (b: Buffer) => b.toString('base64url');
export function signToken(payload: any): string {
    const body = b64u(Buffer.from(JSON.stringify(payload)));
    const sig = b64u(crypto.createHmac('sha256', secret()).update(body).digest()).slice(0, 22);
    return `${body}.${sig}`;
}
export function readToken<T = any>(token: string): T | null {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    const good = b64u(crypto.createHmac('sha256', secret()).update(body).digest()).slice(0, 22);
    if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
    try { return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T; } catch { return null; }
}

/** The school named in a public link → its meta record and its own database. */
export async function schoolFromSlug(slug: string): Promise<{ tenant: any; db: Db } | null> {
    const clean = String(slug || '').trim().toLowerCase();
    if (!/^[a-z0-9-]{2,60}$/.test(clean)) return null;
    const tenant: any = await getMetaDb().collection('Tenant').findOne({ subdomain: clean })
        || await getMetaDb().collection('Tenant').findOne({ subdomain: { $regex: `^\\s*${clean}\\s*$`, $options: 'i' } });
    if (!tenant) return null;
    return { tenant, db: getTenantDb(tenant.databaseName || subdomainToDbName(String(tenant.subdomain).toLowerCase())) };
}
export const schoolBrand = (t: any) => ({ name: t.instituteName || t.name || t.subdomain, logo: t.logo || t.schoolLogo || '', address: [t.address || t.location, t.city || t.county].filter(Boolean).join(', ') });

/** Base of the public link. Set PUBLIC_APP_URL (e.g. https://shulecloud.com) in production. */
export const publicAppUrl = () => (process.env.PUBLIC_APP_URL || 'https://shulecloud.com').replace(/\/$/, '');
