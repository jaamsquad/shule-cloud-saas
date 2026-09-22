/**
 * KRA (Kenya Revenue Authority) PIN Checker — looks a taxpayer up by their National ID or by their
 * KRA PIN, so a school can pull an employee's real KRA PIN and name straight from KRA when registering
 * them, instead of typing it by hand.
 *
 *   PIN Checker by ID:  POST /checker/v1/pin        { TaxpayerType, TaxpayerID } → { TaxpayerPIN, TaxpayerName }
 *   PIN Checker by PIN: POST /checker/v1/pinbypin   { KRAPIN } → { PINDATA: { KRAPIN, TypeOfTaxpayer, Name, StatusOfPIN } }
 *
 * Both need a bearer token from KRA's OAuth endpoint (Consumer Key + Secret, Basic auth), which this
 * caches in memory until it is close to expiring.
 *
 * Credentials live in the tenant's `integration_settings` collection ({ integration: 'kra', env,
 * consumerKey, consumerSecret }), set on Settings → Integrations → KRA PIN Checker.
 */
import { Db } from 'mongodb';

const BASE: Record<'sandbox' | 'production', string> = {
    sandbox: 'https://sbx.kra.go.ke', production: 'https://api.kra.go.ke',
};

export interface KraConfig { env: 'sandbox' | 'production'; consumerKey: string; consumerSecret: string }

export async function resolveKraConfig(db: Db): Promise<KraConfig> {
    const s: any = await db.collection('integration_settings').findOne({ integration: 'kra' }).catch(() => null);
    return { env: s?.env === 'production' ? 'production' : 'sandbox', consumerKey: String(s?.consumerKey || '').trim(), consumerSecret: String(s?.consumerSecret || '').trim() };
}
export const isKraConfigured = (cfg: KraConfig) => !!(cfg.consumerKey && cfg.consumerSecret);

// One cached token per (env + key) — KRA tokens last ~3600s; we refresh a little early.
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function kraAccessToken(cfg: KraConfig): Promise<string> {
    const cacheKey = `${cfg.env}:${cfg.consumerKey}`;
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 15_000) return cached.token;
    const cred = Buffer.from(`${cfg.consumerKey}:${cfg.consumerSecret}`).toString('base64');
    const r = await fetch(`${BASE[cfg.env]}/v1/token/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${cred}` } });
    const body: any = await r.json().catch(() => ({}));
    if (!r.ok || !body.access_token) throw new Error(body.errorMessage || 'Could not authenticate with KRA — check the Consumer Key and Secret in Settings → Integrations.');
    const token = String(body.access_token);
    tokenCache.set(cacheKey, { token, expiresAt: Date.now() + (Number(body.expires_in) || 3600) * 1000 });
    return token;
}

export interface KraResult { pin: string; name: string; type: string; status: string }

/** A National ID (or similar) → the taxpayer's KRA PIN and registered name. */
export async function kraCheckById(cfg: KraConfig, taxpayerId: string, taxpayerType = 'KE'): Promise<KraResult> {
    const token = await kraAccessToken(cfg);
    const r = await fetch(`${BASE[cfg.env]}/checker/v1/pin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ TaxpayerType: taxpayerType, TaxpayerID: taxpayerId }),
    });
    const body: any = await r.json().catch(() => ({}));
    if (!r.ok || !body.TaxpayerPIN) throw new Error(body.errorMessage || body.ErrorMessage || 'No taxpayer was found for that ID.');
    return { pin: String(body.TaxpayerPIN), name: String(body.TaxpayerName || ''), type: '', status: '' };
}

/** A KRA PIN → its registered name, taxpayer type and whether it's still active. */
export async function kraCheckByPin(cfg: KraConfig, pin: string): Promise<KraResult> {
    const token = await kraAccessToken(cfg);
    const r = await fetch(`${BASE[cfg.env]}/checker/v1/pinbypin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ KRAPIN: pin.toUpperCase() }),
    });
    const body: any = await r.json().catch(() => ({}));
    const data = body.PINDATA;
    if (!r.ok || body.Status !== 'OK' || !data) throw new Error(body.Message || 'Invalid PIN — that KRA PIN was not found.');
    return { pin: String(data.KRAPIN), name: String(data.Name || ''), type: String(data.TypeOfTaxpayer || ''), status: String(data.StatusOfPIN || '') };
}

/** A KRA PIN looks like A123456789Z / P123456789Z — anything else is treated as a National ID. */
export const looksLikePin = (v: string) => /^[AP]\d{9}[A-Z]$/i.test(v.trim());
