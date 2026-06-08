import { CfCustomHostname } from '../types/tenant';

// ─── Cloudflare for SaaS — Custom Hostnames API client ─────────────────────────
// Credentials & zone come from environment variables (never hard-coded):
//   CLOUDFLARE_API_TOKEN   — API token with "SSL and Certificates: Edit" on the zone
//   CLOUDFLARE_ZONE_ID     — the SaaS zone id (e.g. myschoolmis.com)
//   CLOUDFLARE_SAAS_TARGET — CNAME target schools point their domain at
//                            (e.g. customers.myschoolmis.com or the zone apex)

const API_BASE = 'https://api.cloudflare.com/client/v4';

export const cfConfig = () => ({
    token: process.env.CLOUDFLARE_API_TOKEN || '',
    zoneId: process.env.CLOUDFLARE_ZONE_ID || '',
    target: process.env.CLOUDFLARE_SAAS_TARGET || process.env.CLOUDFLARE_FALLBACK_ORIGIN || '',
});

export const isCloudflareConfigured = (): boolean => {
    const c = cfConfig();
    return !!(c.token && c.zoneId);
};

class CloudflareError extends Error {
    constructor(message: string, public status?: number, public retryable = false) {
        super(message);
        this.name = 'CloudflareError';
    }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// fetch with retry + exponential backoff for transient (5xx / network / 429) failures.
async function cfFetch(path: string, init: RequestInit, attempt = 1): Promise<any> {
    const { token, zoneId } = cfConfig();
    if (!token || !zoneId) throw new CloudflareError('Cloudflare is not configured. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID.');

    const MAX_ATTEMPTS = 3;
    try {
        const resp = await fetch(`${API_BASE}/zones/${zoneId}${path}`, {
            ...init,
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
        });
        const data: any = await resp.json().catch(() => ({}));
        if (!resp.ok || data?.success === false) {
            const msg = data?.errors?.[0]?.message || `Cloudflare API error (HTTP ${resp.status})`;
            const retryable = resp.status >= 500 || resp.status === 429;
            if (retryable && attempt < MAX_ATTEMPTS) {
                await sleep(300 * 2 ** (attempt - 1));
                return cfFetch(path, init, attempt + 1);
            }
            throw new CloudflareError(msg, resp.status, retryable);
        }
        return data.result;
    } catch (e: any) {
        if (e instanceof CloudflareError) throw e;
        // Network-level error → retry
        if (attempt < MAX_ATTEMPTS) {
            await sleep(300 * 2 ** (attempt - 1));
            return cfFetch(path, init, attempt + 1);
        }
        throw new CloudflareError(e.message || 'Cloudflare request failed', undefined, true);
    }
}

export async function createCustomHostname(hostname: string): Promise<CfCustomHostname> {
    return cfFetch('/custom_hostnames', {
        method: 'POST',
        body: JSON.stringify({
            hostname,
            ssl: { method: 'txt', type: 'dv', settings: { min_tls_version: '1.2' } },
        }),
    });
}

export async function getCustomHostname(id: string): Promise<CfCustomHostname> {
    return cfFetch(`/custom_hostnames/${id}`, { method: 'GET' });
}

export async function deleteCustomHostname(id: string): Promise<void> {
    await cfFetch(`/custom_hostnames/${id}`, { method: 'DELETE' });
}
