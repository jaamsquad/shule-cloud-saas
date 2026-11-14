/**
 * Which email account a school's emails go out through (Owner → a school → Email sending).
 *
 *   auto      (default) the school's own email if it has set one up (Integrations → SMTP),
 *             otherwise ShuleCloud's email (Owner → Settings → Company email)
 *   platform  always ShuleCloud's email — sent in the school's name, replies go to the school
 *   custom    always the school's own email; nothing is sent until the school sets it up
 *
 * Stored on the school's Tenant record as `emailMode`.
 */
import { Db } from 'mongodb';
import { getMetaDb, subdomainToDbName } from './mongodb';

export type EmailMode = 'auto' | 'platform' | 'custom';
export const EMAIL_MODES: EmailMode[] = ['auto', 'platform', 'custom'];

export interface SmtpConfig { host: string; port: number; user: string; pass: string; fromAddress: string; fromName: string; replyTo?: string }
export interface EmailRoute { via: 'school' | 'platform' | 'env' | 'none'; mode: EmailMode; smtp: SmtpConfig | null; reason?: string }

let tenantCache: { at: number; byDb: Map<string, any> } | null = null;
/** The school (Tenant) a tenant database belongs to. */
export async function tenantForDb(db: Db): Promise<any | null> {
    const name = (db as any)?.databaseName;
    if (!name) return null;
    if (!tenantCache || Date.now() - tenantCache.at > 60_000) {
        const all: any[] = await getMetaDb().collection('Tenant').find({}, { projection: { name: 1, schoolName: 1, subdomain: 1, databaseName: 1, email: 1, contactEmail: 1, emailMode: 1 } }).toArray().catch(() => []);
        const byDb = new Map<string, any>();
        all.forEach(t => byDb.set(t.databaseName || subdomainToDbName(t.subdomain || String(t._id)), t));
        tenantCache = { at: Date.now(), byDb };
    }
    return tenantCache.byDb.get(name) || null;
}
export const forgetTenantEmailCache = () => { tenantCache = null; };

export async function platformSmtp(): Promise<SmtpConfig | null> {
    const s: any = await getMetaDb().collection('platform_email_settings').findOne({ key: 'smtp' }).catch(() => null);
    if (!s?.host || !s?.user || !s?.pass) return null;
    return { host: s.host, port: Number(s.port) || 587, user: s.user, pass: s.pass, fromAddress: s.fromAddress || s.user, fromName: s.fromName || 'ShuleCloud' };
}

export function schoolSmtp(settings: any): SmtpConfig | null {
    if (!settings || settings.emailEnabled === false) return null;
    if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) return null;
    return { host: settings.smtpHost, port: Number(settings.smtpPort) || 587, user: settings.smtpUser, pass: settings.smtpPass, fromAddress: settings.emailFromAddress || settings.smtpUser, fromName: settings.emailFromName || 'School' };
}

/** Pick the account for this school's next email. `settings` = the school's merged comm settings. */
export async function resolveEmailRoute(db: Db, settings: any): Promise<EmailRoute> {
    const tenant = await tenantForDb(db).catch(() => null);
    const mode: EmailMode = EMAIL_MODES.includes(tenant?.emailMode) ? tenant.emailMode : 'auto';
    const own = schoolSmtp(settings);
    const schoolName = tenant?.name || tenant?.schoolName || settings?.emailFromName || 'School';
    const schoolReply = settings?.emailFromAddress || tenant?.email || tenant?.contactEmail || undefined;
    const viaPlatform = async (): Promise<EmailRoute | null> => {
        const p = await platformSmtp();
        // sent in the school's name; replies go back to the school
        return p ? { via: 'platform', mode, smtp: { ...p, fromName: schoolName, replyTo: schoolReply } } : null;
    };
    if (mode === 'custom') {
        return own ? { via: 'school', mode, smtp: own } : { via: 'none', mode, smtp: null, reason: 'This school sends email from its own account, which is not set up yet. Add it under Integrations → SMTP.' };
    }
    if (mode === 'platform') {
        return (await viaPlatform()) || { via: 'none', mode, smtp: null, reason: "ShuleCloud's email is not set up yet. Contact ShuleCloud." };
    }
    if (own) return { via: 'school', mode, smtp: own };
    const p = await viaPlatform();
    if (p) return p;
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return { via: 'env', mode, smtp: { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 587, user: process.env.SMTP_USER, pass: process.env.SMTP_PASS, fromAddress: process.env.SMTP_USER, fromName: schoolName } };
    }
    return { via: 'none', mode, smtp: null, reason: 'Email is not configured. Set SMTP host, user and password under Integrations.' };
}
