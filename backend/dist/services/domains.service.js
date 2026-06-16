"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDomainHistory = exports.dnsInstructions = exports.recheckDomain = exports.removeDomain = exports.addDomain = exports.getDomainStatus = void 0;
exports.normalizeDomain = normalizeDomain;
exports.validateDomain = validateDomain;
const mongodb_1 = require("mongodb");
const mongodb_2 = require("../lib/mongodb");
const cloudflare_service_1 = require("./cloudflare.service");
const communications_service_1 = require("./communications.service");
const SAAS_ROOT = (process.env.SAAS_ROOT_DOMAIN || 'myschoolmis.com').toLowerCase();
// ─── Validation ─────────────────────────────────────────────────────────────────
const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;
function normalizeDomain(input) {
    return String(input || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '');
}
function validateDomain(input) {
    const d = normalizeDomain(input);
    if (!DOMAIN_RE.test(d))
        throw new Error('Enter a valid domain, e.g. portal.yourschool.ac.ke');
    if (d === SAAS_ROOT || d.endsWith('.' + SAAS_ROOT)) {
        throw new Error('That is the platform domain. Add only a domain you own.');
    }
    return d;
}
// ─── Cloudflare status mapping ──────────────────────────────────────────────────
const mapVerification = (s) => {
    const v = (s || '').toLowerCase();
    if (v === 'active')
        return 'active';
    if (v.includes('fail') || v.includes('blocked') || v.includes('moved'))
        return 'failed';
    return 'pending';
};
const mapSsl = (s) => {
    const v = (s || '').toLowerCase();
    if (v === 'active')
        return 'active';
    if (v.includes('issuance'))
        return 'pending_issuance';
    if (v.includes('validation'))
        return 'pending_validation';
    if (v.includes('fail') || v.includes('error'))
        return 'failed';
    return 'pending_validation';
};
const cnameTarget = () => (0, cloudflare_service_1.cfConfig)().target || `cname.${SAAS_ROOT}`;
const baseDnsRecords = (domain) => ([
    { type: 'CNAME', host: domain, target: cnameTarget(), purpose: 'Domain connection', status: 'pending' },
]);
// ─── Audit ──────────────────────────────────────────────────────────────────────
async function audit(log) {
    try {
        await (0, mongodb_2.getMetaDb)().collection('domain_audit_logs').insertOne({ ...log, createdAt: new Date() });
    }
    catch { /* ignore */ }
}
// ─── Notifications (email + whatsapp + in-app), best-effort ──────────────────────
const MESSAGES = {
    domain_added: { title: 'Custom domain added', body: d => `Your custom domain ${d} was added. Complete the DNS setup to activate it.` },
    domain_verified: { title: 'Domain verified', body: d => `Your custom domain ${d} has been verified and is connecting.` },
    ssl_activated: { title: 'SSL active', body: d => `An SSL certificate for ${d} is now active. Your portal is live and secure.` },
    domain_removed: { title: 'Custom domain removed', body: d => `Your custom domain ${d} has been removed.` },
    verification_failed: { title: 'Domain verification failed', body: d => `We could not verify ${d}. Please re-check your DNS records.` },
};
async function notify(tenant, action, domain) {
    const tpl = MESSAGES[action];
    if (!tpl)
        return;
    const title = tpl.title;
    const body = tpl.body(domain);
    const tdbName = tenant.databaseName;
    try {
        if (tdbName) {
            const tdb = (0, mongodb_2.getTenantDb)(tdbName);
            // In-app notification
            await tdb.collection('notifications').insertOne({ type: 'domain', title, message: body, audience: 'Admins', read: false, createdAt: new Date() }).catch(() => { });
            // Email + WhatsApp to the school contact (best-effort; ignores if not configured)
            const email = tenant.email || tenant.contactEmail;
            const phone = tenant.phone || tenant.contactPhone;
            if (email)
                await (0, communications_service_1.sendEmail)(tdb, { to: [email], subject: title, message: body }).catch(() => { });
            if (phone)
                await (0, communications_service_1.sendWhatsApp)(tdb, { to: [phone], message: `${title}: ${body}` }).catch(() => { });
        }
    }
    catch { /* notifications are best-effort */ }
}
// ─── Public API ───────────────────────────────────────────────────────────────
const getTenant = async (tenantId) => {
    const t = await (0, mongodb_2.getMetaDb)().collection('Tenant').findOne({ _id: new mongodb_1.ObjectId(tenantId) });
    if (!t)
        throw new Error('Tenant not found');
    return t;
};
const getDomainStatus = async (tenantId) => {
    const t = await getTenant(tenantId);
    return {
        customDomain: t.customDomain || null,
        verificationStatus: t.verificationStatus || 'none',
        sslStatus: t.sslStatus || 'none',
        dnsRecords: t.dnsRecords || (t.customDomain ? baseDnsRecords(t.customDomain) : []),
        domainConnectedAt: t.domainConnectedAt || null,
        cloudflareConfigured: (0, cloudflare_service_1.isCloudflareConfigured)(),
        cnameTarget: cnameTarget(),
    };
};
exports.getDomainStatus = getDomainStatus;
const addDomain = async (tenantId, rawDomain, ctx) => {
    const domain = validateDomain(rawDomain);
    const metaDb = (0, mongodb_2.getMetaDb)();
    // One domain → one tenant only.
    const taken = await metaDb.collection('Tenant').findOne({ customDomain: domain });
    if (taken && String(taken._id) !== String(tenantId)) {
        throw new Error('This domain is already connected to another school.');
    }
    const tenant = await getTenant(tenantId);
    let cloudflareHostnameId = null;
    let verificationStatus = 'pending';
    let sslStatus = 'pending_validation';
    const dnsRecords = baseDnsRecords(domain);
    if ((0, cloudflare_service_1.isCloudflareConfigured)()) {
        const ch = await (0, cloudflare_service_1.createCustomHostname)(domain); // throws on failure (after retries)
        cloudflareHostnameId = ch.id;
        verificationStatus = mapVerification(ch.status);
        sslStatus = mapSsl(ch.ssl?.status);
        const ov = ch.ownership_verification;
        if (ov?.name)
            dnsRecords.push({ type: 'TXT', host: ov.name, target: ov.value, purpose: 'Ownership verification', status: 'pending' });
        const ssltxt = ch.ssl?.validation_records?.[0] || (ch.ssl?.txt_name ? { txt_name: ch.ssl.txt_name, txt_value: ch.ssl.txt_value } : null);
        if (ssltxt?.txt_name)
            dnsRecords.push({ type: 'TXT', host: ssltxt.txt_name, target: ssltxt.txt_value || '', purpose: 'SSL validation', status: 'pending' });
    }
    await metaDb.collection('Tenant').updateOne({ _id: tenant._id }, { $set: { customDomain: domain, cloudflareHostnameId, verificationStatus, sslStatus, dnsRecords, domainConnectedAt: null, updatedAt: new Date() } });
    await audit({ tenantId, schoolName: tenant.name || tenant.schoolName, user: ctx.user, action: 'domain_added', domain, ip: ctx.ip });
    notify(tenant, 'domain_added', domain);
    return (0, exports.getDomainStatus)(tenantId);
};
exports.addDomain = addDomain;
const removeDomain = async (tenantId, ctx) => {
    const tenant = await getTenant(tenantId);
    const domain = tenant.customDomain;
    if (tenant.cloudflareHostnameId && (0, cloudflare_service_1.isCloudflareConfigured)()) {
        await (0, cloudflare_service_1.deleteCustomHostname)(tenant.cloudflareHostnameId).catch(() => { });
    }
    await (0, mongodb_2.getMetaDb)().collection('Tenant').updateOne({ _id: tenant._id }, { $set: { customDomain: null, cloudflareHostnameId: null, verificationStatus: 'none', sslStatus: 'none', dnsRecords: [], domainConnectedAt: null, updatedAt: new Date() } });
    if (domain) {
        await audit({ tenantId, schoolName: tenant.name || tenant.schoolName, user: ctx.user, action: 'domain_removed', domain, ip: ctx.ip });
        notify(tenant, 'domain_removed', domain);
    }
    return (0, exports.getDomainStatus)(tenantId);
};
exports.removeDomain = removeDomain;
const recheckDomain = async (tenantId, ctx) => {
    const tenant = await getTenant(tenantId);
    if (!tenant.customDomain)
        throw new Error('No custom domain to re-check.');
    await audit({ tenantId, schoolName: tenant.name || tenant.schoolName, user: ctx.user, action: 'recheck', domain: tenant.customDomain, ip: ctx.ip });
    if (tenant.cloudflareHostnameId && (0, cloudflare_service_1.isCloudflareConfigured)()) {
        const ch = await (0, cloudflare_service_1.getCustomHostname)(tenant.cloudflareHostnameId);
        const verificationStatus = mapVerification(ch.status);
        const sslStatus = mapSsl(ch.ssl?.status);
        // Notify on positive transitions / failures.
        if (verificationStatus === 'active' && tenant.verificationStatus !== 'active') {
            notify(tenant, 'domain_verified', tenant.customDomain);
            audit({ tenantId, user: ctx.user, action: 'domain_verified', domain: tenant.customDomain, ip: ctx.ip });
        }
        if (sslStatus === 'active' && tenant.sslStatus !== 'active') {
            notify(tenant, 'ssl_activated', tenant.customDomain);
            audit({ tenantId, user: ctx.user, action: 'ssl_activated', domain: tenant.customDomain, ip: ctx.ip });
        }
        if (verificationStatus === 'failed' && tenant.verificationStatus !== 'failed') {
            notify(tenant, 'verification_failed', tenant.customDomain);
            audit({ tenantId, user: ctx.user, action: 'verification_failed', domain: tenant.customDomain, ip: ctx.ip });
        }
        const connected = verificationStatus === 'active' && sslStatus === 'active';
        await (0, mongodb_2.getMetaDb)().collection('Tenant').updateOne({ _id: tenant._id }, { $set: { verificationStatus, sslStatus, domainConnectedAt: connected ? (tenant.domainConnectedAt || new Date()) : tenant.domainConnectedAt || null, updatedAt: new Date() } });
    }
    return (0, exports.getDomainStatus)(tenantId);
};
exports.recheckDomain = recheckDomain;
const dnsInstructions = async (tenantId) => {
    const status = await (0, exports.getDomainStatus)(tenantId);
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
exports.dnsInstructions = dnsInstructions;
const getDomainHistory = async (tenantId) => {
    return (0, mongodb_2.getMetaDb)().collection('domain_audit_logs').find({ tenantId }).sort({ createdAt: -1 }).limit(50).toArray();
};
exports.getDomainHistory = getDomainHistory;
