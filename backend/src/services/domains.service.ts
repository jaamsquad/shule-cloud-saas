import { ObjectId } from 'mongodb';
import { getMetaDb, getTenantDb } from '../lib/mongodb';
import { createCustomHostname, getCustomHostname, deleteCustomHostname, isCloudflareConfigured, cfConfig } from './cloudflare.service';
import { sendEmail, sendWhatsApp } from './communications.service';
import { DnsRecord, VerificationStatus, SslStatus, DomainAuditLog } from '../types/tenant';

const SAAS_ROOT = (process.env.SAAS_ROOT_DOMAIN || 'myschoolmis.com').toLowerCase();

// ─── Validation ─────────────────────────────────────────────────────────────────
const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

export function normalizeDomain(input: string): string {
    return String(input || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '');
}

export function validateDomain(input: string): string {
    const d = normalizeDomain(input);
    if (!DOMAIN_RE.test(d)) throw new Error('Enter a valid domain, e.g. portal.yourschool.ac.ke');
    if (d === SAAS_ROOT || d.endsWith('.' + SAAS_ROOT)) {
        throw new Error('That is the platform domain. Add only a domain you own.');
    }
    return d;
}

// ─── Cloudflare status mapping ──────────────────────────────────────────────────
const mapVerification = (s?: string): VerificationStatus => {
    const v = (s || '').toLowerCase();
    if (v === 'active') return 'active';
    if (v.includes('fail') || v.includes('blocked') || v.includes('moved')) return 'failed';
    return 'pending';
};
const mapSsl = (s?: string): SslStatus => {
    const v = (s || '').toLowerCase();
    if (v === 'active') return 'active';
    if (v.includes('issuance')) return 'pending_issuance';
    if (v.includes('validation')) return 'pending_validation';
    if (v.includes('fail') || v.includes('error')) return 'failed';
    return 'pending_validation';
};

const cnameTarget = () => cfConfig().target || `cname.${SAAS_ROOT}`;

const baseDnsRecords = (domain: string): DnsRecord[] => ([
    { type: 'CNAME', host: domain, target: cnameTarget(), purpose: 'Domain connection', status: 'pending' },
]);

// ─── Audit ──────────────────────────────────────────────────────────────────────
async function audit(log: Omit<DomainAuditLog, '_id' | 'createdAt'>) {
    try { await getMetaDb().collection('domain_audit_logs').insertOne({ ...log, createdAt: new Date() }); } catch { /* ignore */ }
}

// ─── Notifications (email + whatsapp + in-app), best-effort ──────────────────────
const MESSAGES: Record<string, { title: string; body: (d: string) => string }> = {
    domain_added: { title: 'Custom domain added', body: d => `Your custom domain ${d} was added. Complete the DNS setup to activate it.` },
    domain_verified: { title: 'Domain verified', body: d => `Your custom domain ${d} has been verified and is connecting.` },
    ssl_activated: { title: 'SSL active', body: d => `An SSL certificate for ${d} is now active. Your portal is live and secure.` },
    domain_removed: { title: 'Custom domain removed', body: d => `Your custom domain ${d} has been removed.` },
    verification_failed: { title: 'Domain verification failed', body: d => `We could not verify ${d}. Please re-check your DNS records.` },
};

async function notify(tenant: any, action: keyof typeof MESSAGES, domain: string) {
    const tpl = MESSAGES[action];
    if (!tpl) return;
    const title = tpl.title;
    const body = tpl.body(domain);
    const tdbName = tenant.databaseName;
    try {
        if (tdbName) {
            const tdb = getTenantDb(tdbName);
            // In-app notification
            await tdb.collection('notifications').insertOne({ type: 'domain', title, message: body, audience: 'Admins', read: false, createdAt: new Date() }).catch(() => {});
            // Email + WhatsApp to the school contact (best-effort; ignores if not configured)
            const email = tenant.email || tenant.contactEmail;
            const phone = tenant.phone || tenant.contactPhone;
            if (email) await sendEmail(tdb, { to: [email], subject: title, message: body }).catch(() => {});
            if (phone) await sendWhatsApp(tdb, { to: [phone], message: `${title}: ${body}`, schoolId: String(tenant._id) }).catch(() => {});
        }
    } catch { /* notifications are best-effort */ }
}

// ─── Public API ───────────────────────────────────────────────────────────────
const getTenant = async (tenantId: string) => {
    const t = await getMetaDb().collection('Tenant').findOne({ _id: new ObjectId(tenantId) });
    if (!t) throw new Error('Tenant not found');
    return t;
};

export interface DomainStatus {
    customDomain: string | null;
    verificationStatus: VerificationStatus;
    sslStatus: SslStatus;
    dnsRecords: DnsRecord[];
    domainConnectedAt: Date | null;
    cloudflareConfigured: boolean;
    cnameTarget: string;
}

export const getDomainStatus = async (tenantId: string): Promise<DomainStatus> => {
    const t = await getTenant(tenantId);
    return {
        customDomain: t.customDomain || null,
        verificationStatus: t.verificationStatus || 'none',
        sslStatus: t.sslStatus || 'none',
        dnsRecords: t.dnsRecords || (t.customDomain ? baseDnsRecords(t.customDomain) : []),
        domainConnectedAt: t.domainConnectedAt || null,
        cloudflareConfigured: isCloudflareConfigured(),
        cnameTarget: cnameTarget(),
    };
};

export const addDomain = async (tenantId: string, rawDomain: string, ctx: { user?: string; ip?: string }) => {
    const domain = validateDomain(rawDomain);
    const metaDb = getMetaDb();

    // One domain → one tenant only.
    const taken = await metaDb.collection('Tenant').findOne({ customDomain: domain });
    if (taken && String(taken._id) !== String(tenantId)) {
        throw new Error('This domain is already connected to another school.');
    }
    const tenant = await getTenant(tenantId);

    let cloudflareHostnameId: string | null = null;
    let verificationStatus: VerificationStatus = 'pending';
    let sslStatus: SslStatus = 'pending_validation';
    const dnsRecords = baseDnsRecords(domain);

    if (isCloudflareConfigured()) {
        const ch = await createCustomHostname(domain);   // throws on failure (after retries)
        cloudflareHostnameId = ch.id;
        verificationStatus = mapVerification(ch.status);
        sslStatus = mapSsl(ch.ssl?.status);
        const ov = ch.ownership_verification;
        if (ov?.name) dnsRecords.push({ type: 'TXT', host: ov.name, target: ov.value, purpose: 'Ownership verification', status: 'pending' });
        const ssltxt = ch.ssl?.validation_records?.[0] || (ch.ssl?.txt_name ? { txt_name: ch.ssl.txt_name, txt_value: ch.ssl.txt_value } : null);
        if (ssltxt?.txt_name) dnsRecords.push({ type: 'TXT', host: ssltxt.txt_name, target: ssltxt.txt_value || '', purpose: 'SSL validation', status: 'pending' });
    }

    await metaDb.collection('Tenant').updateOne(
        { _id: tenant._id },
        { $set: { customDomain: domain, cloudflareHostnameId, verificationStatus, sslStatus, dnsRecords, domainConnectedAt: null, updatedAt: new Date() } },
    );
    await audit({ tenantId, schoolName: tenant.name || tenant.schoolName, user: ctx.user, action: 'domain_added', domain, ip: ctx.ip });
    notify(tenant, 'domain_added', domain);
    return getDomainStatus(tenantId);
};

export const removeDomain = async (tenantId: string, ctx: { user?: string; ip?: string }) => {
    const tenant = await getTenant(tenantId);
    const domain = tenant.customDomain;
    if (tenant.cloudflareHostnameId && isCloudflareConfigured()) {
        await deleteCustomHostname(tenant.cloudflareHostnameId).catch(() => { /* tolerate already-deleted */ });
    }
    await getMetaDb().collection('Tenant').updateOne(
        { _id: tenant._id },
        { $set: { customDomain: null, cloudflareHostnameId: null, verificationStatus: 'none', sslStatus: 'none', dnsRecords: [], domainConnectedAt: null, updatedAt: new Date() } },
    );
    if (domain) {
        await audit({ tenantId, schoolName: tenant.name || tenant.schoolName, user: ctx.user, action: 'domain_removed', domain, ip: ctx.ip });
        notify(tenant, 'domain_removed', domain);
    }
    return getDomainStatus(tenantId);
};

export const recheckDomain = async (tenantId: string, ctx: { user?: string; ip?: string }) => {
    const tenant = await getTenant(tenantId);
    if (!tenant.customDomain) throw new Error('No custom domain to re-check.');

    await audit({ tenantId, schoolName: tenant.name || tenant.schoolName, user: ctx.user, action: 'recheck', domain: tenant.customDomain, ip: ctx.ip });

    if (tenant.cloudflareHostnameId && isCloudflareConfigured()) {
        const ch = await getCustomHostname(tenant.cloudflareHostnameId);
        const verificationStatus = mapVerification(ch.status);
        const sslStatus = mapSsl(ch.ssl?.status);

        // Notify on positive transitions / failures.
        if (verificationStatus === 'active' && tenant.verificationStatus !== 'active') { notify(tenant, 'domain_verified', tenant.customDomain); audit({ tenantId, user: ctx.user, action: 'domain_verified', domain: tenant.customDomain, ip: ctx.ip }); }
        if (sslStatus === 'active' && tenant.sslStatus !== 'active') { notify(tenant, 'ssl_activated', tenant.customDomain); audit({ tenantId, user: ctx.user, action: 'ssl_activated', domain: tenant.customDomain, ip: ctx.ip }); }
        if (verificationStatus === 'failed' && tenant.verificationStatus !== 'failed') { notify(tenant, 'verification_failed', tenant.customDomain); audit({ tenantId, user: ctx.user, action: 'verification_failed', domain: tenant.customDomain, ip: ctx.ip }); }

        const connected = verificationStatus === 'active' && sslStatus === 'active';
        await getMetaDb().collection('Tenant').updateOne(
            { _id: tenant._id },
            { $set: { verificationStatus, sslStatus, domainConnectedAt: connected ? (tenant.domainConnectedAt || new Date()) : tenant.domainConnectedAt || null, updatedAt: new Date() } },
        );
    }
    return getDomainStatus(tenantId);
};

export const dnsInstructions = async (tenantId: string) => {
    const status = await getDomainStatus(tenantId);
    const records = status.dnsRecords.length ? status.dnsRecords : (status.customDomain ? baseDnsRecords(status.customDomain) : []);
    return {
        domain: status.customDomain,
        cnameTarget: status.cnameTarget,
        records,
        steps: [
            'Log in to your domain registrar or DNS provider.',
            `Add the records below for ${status.customDomain || 'your domain'}.`,
            'Save the changes — DNS can take a few minutes to propagate.',
            'Return here and click "Re-check" to verify and activate SSL.',
        ],
    };
};

export const getDomainHistory = async (tenantId: string) => {
    return getMetaDb().collection('domain_audit_logs').find({ tenantId }).sort({ createdAt: -1 }).limit(50).toArray();
};
