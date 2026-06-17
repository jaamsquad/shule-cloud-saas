"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCloudflareConfigured = exports.cfConfig = void 0;
exports.createCustomHostname = createCustomHostname;
exports.getCustomHostname = getCustomHostname;
exports.deleteCustomHostname = deleteCustomHostname;
// ─── Cloudflare for SaaS — Custom Hostnames API client ─────────────────────────
// Credentials & zone come from environment variables (never hard-coded):
//   CLOUDFLARE_API_TOKEN   — API token with "SSL and Certificates: Edit" on the zone
//   CLOUDFLARE_ZONE_ID     — the SaaS zone id (e.g. myschoolmis.com)
//   CLOUDFLARE_SAAS_TARGET — CNAME target schools point their domain at
//                            (e.g. customers.myschoolmis.com or the zone apex)
const API_BASE = 'https://api.cloudflare.com/client/v4';
// Accepts either the CLOUDFLARE_* names or the shorter CF_* names (whichever is set).
const cfConfig = () => ({
    token: process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || '',
    zoneId: process.env.CLOUDFLARE_ZONE_ID || process.env.CF_ZONE_ID || '',
    target: process.env.CLOUDFLARE_SAAS_TARGET ||
        process.env.CLOUDFLARE_FALLBACK_ORIGIN ||
        process.env.CF_SAAS_TARGET ||
        (process.env.SAAS_ROOT_DOMAIN ? `cname.${String(process.env.SAAS_ROOT_DOMAIN).toLowerCase()}` : ''),
});
exports.cfConfig = cfConfig;
const isCloudflareConfigured = () => {
    const c = (0, exports.cfConfig)();
    return !!(c.token && c.zoneId);
};
exports.isCloudflareConfigured = isCloudflareConfigured;
class CloudflareError extends Error {
    constructor(message, status, retryable = false) {
        super(message);
        this.status = status;
        this.retryable = retryable;
        this.name = 'CloudflareError';
    }
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// fetch with retry + exponential backoff for transient (5xx / network / 429) failures.
async function cfFetch(path, init, attempt = 1) {
    const { token, zoneId } = (0, exports.cfConfig)();
    if (!token || !zoneId)
        throw new CloudflareError('Cloudflare is not configured. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID.');
    const MAX_ATTEMPTS = 3;
    try {
        const resp = await fetch(`${API_BASE}/zones/${zoneId}${path}`, {
            ...init,
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || data?.success === false) {
            const raw = data?.errors?.[0]?.message || `Cloudflare API error (HTTP ${resp.status})`;
            const code = data?.errors?.[0]?.code;
            // Translate Cloudflare's terse auth/permission errors into actionable text.
            let msg = raw;
            if (resp.status === 401 || resp.status === 403 || /authentication error/i.test(raw) || code === 9109 || code === 10000) {
                msg = 'Cloudflare rejected the API token. Ensure CF_API_TOKEN is valid and has "SSL and Certificates: Edit" + "Zone: Read" on the shulecloud.com zone, and that the Zone ID is correct.';
            }
            else if (/cloudflare for saas|custom hostname|not entitled|not enabled/i.test(raw)) {
                msg = 'Cloudflare for SaaS is not enabled on this zone. Enable it under SSL/TLS → Custom Hostnames and set a Fallback Origin.';
            }
            const retryable = resp.status >= 500 || resp.status === 429;
            if (retryable && attempt < MAX_ATTEMPTS) {
                await sleep(300 * 2 ** (attempt - 1));
                return cfFetch(path, init, attempt + 1);
            }
            throw new CloudflareError(msg, resp.status, retryable);
        }
        return data.result;
    }
    catch (e) {
        if (e instanceof CloudflareError)
            throw e;
        // Network-level error → retry
        if (attempt < MAX_ATTEMPTS) {
            await sleep(300 * 2 ** (attempt - 1));
            return cfFetch(path, init, attempt + 1);
        }
        throw new CloudflareError(e.message || 'Cloudflare request failed', undefined, true);
    }
}
async function createCustomHostname(hostname) {
    return cfFetch('/custom_hostnames', {
        method: 'POST',
        body: JSON.stringify({
            hostname,
            ssl: { method: 'txt', type: 'dv', settings: { min_tls_version: '1.2' } },
        }),
    });
}
async function getCustomHostname(id) {
    return cfFetch(`/custom_hostnames/${id}`, { method: 'GET' });
}
async function deleteCustomHostname(id) {
    await cfFetch(`/custom_hostnames/${id}`, { method: 'DELETE' });
}
