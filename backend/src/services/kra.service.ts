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
 *
 * NOTE on KRA's Sandbox: sbx.kra.go.ke does NOT hold real taxpayer records — it only recognises the
 * sample IDs/PINs KRA publishes in the API docs (e.g. ID 41789723, PIN P318295670X). A real person's
 * ID or PIN, even though genuine, will come back "Invalid ID" / "Invalid PIN" in Sandbox — that is
 * expected KRA behaviour, not a bug here. Real lookups need the school's app approved for Production
 * (Settings → Integrations → KRA PIN Checker → Environment: production) with a Production app's keys.
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

/** A failure at a specific stage, carrying KRA's own code/message so the cause is never guessed at. */
export class KraError extends Error {
    stage: 'auth' | 'lookup';
    httpStatus: number;        // status to answer the school's browser with
    kraCode?: string;
    constructor(stage: 'auth' | 'lookup', httpStatus: number, message: string, kraCode?: string) {
        super(message); this.stage = stage; this.httpStatus = httpStatus; this.kraCode = kraCode;
    }
}

// One cached token per (env + key) — KRA tokens last ~3600s; we refresh a little early.
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function kraAccessToken(cfg: KraConfig): Promise<string> {
    const cacheKey = `${cfg.env}:${cfg.consumerKey}`;
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 15_000) return cached.token;
    const cred = Buffer.from(`${cfg.consumerKey}:${cfg.consumerSecret}`).toString('base64');
    const r = await fetch(`${BASE[cfg.env]}/v1/token/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${cred}` } });
    const body: any = await r.json().catch(() => ({}));
    if (!r.ok || !body.access_token) {
        console.error(`[KRA] token generation failed (${cfg.env}):`, r.status, body);
        throw new KraError('auth', 401, body.errorMessage || `KRA rejected these credentials for the ${cfg.env} environment (HTTP ${r.status}). Check the Consumer Key/Secret in Settings → Integrations → KRA PIN Checker, and that this app was created for ${cfg.env === 'production' ? 'Production' : 'Sandbox'}.`, body.errorCode);
    }
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
    if (!r.ok || !body.TaxpayerPIN) {
        console.error(`[KRA] PIN Checker by ID failed (${cfg.env}, type ${taxpayerType}):`, r.status, body);
        const code = body.errorCode || body.ErrorCode;
        const base = body.errorMessage || body.ErrorMessage || 'No taxpayer was found for that ID.';
        const hint = cfg.env === 'sandbox' ? ' KRA’s Sandbox only recognises its own sample IDs (e.g. 41789723) — a real ID will not be found there. Switch to Production once your app is approved, to look up real people.' : (taxpayerType !== 'KE' ? '' : ' If this is not a Kenyan resident’s ID, the Taxpayer Type may need to be NKE, NKENR or COMP instead of KE.');
        throw new KraError('lookup', 404, `${base}.${hint}`, code);
    }
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
    if (!r.ok || body.Status !== 'OK' || !data) {
        console.error(`[KRA] PIN Checker by PIN failed (${cfg.env}):`, r.status, body);
        const hint = cfg.env === 'sandbox' ? ' KRA’s Sandbox only recognises its own sample PINs (e.g. P318295670X) — a real PIN will not be found there. Switch to Production once your app is approved, to look up real people.' : '';
        const base = body.Message || 'Invalid PIN — that KRA PIN was not found.';
        throw new KraError('lookup', 404, `${base}.${hint}`, body.ResponseCode);
    }
    return { pin: String(data.KRAPIN), name: String(data.Name || ''), type: String(data.TypeOfTaxpayer || ''), status: String(data.StatusOfPIN || '') };
}

/** A KRA PIN → the taxpayer's KRA tax station (e.g. "West of Nairobi"). Best-effort — callers may
 *  ignore a failure here rather than fail the whole lookup, since it's supplementary information. */
export async function kraStation(cfg: KraConfig, pin: string): Promise<string> {
    const token = await kraAccessToken(cfg);
    const r = await fetch(`${BASE[cfg.env]}/dtd/checker/v1/station`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kraPin: pin.toUpperCase() }),
    });
    const body: any = await r.json().catch(() => ({}));
    const data = body.STATIONDATA;
    if (!r.ok || body.Status !== 'OK' || !data?.stationName) {
        console.error(`[KRA] Know Tax Station failed (${cfg.env}):`, r.status, body);
        throw new KraError('lookup', 404, body.Message || body.ErrorMessage || 'Could not find a tax station for that PIN.', body.ResponseCode || body.ErrorCode);
    }
    return String(data.stationName);
}

/** A KRA PIN looks like A123456789Z / P123456789Z — anything else is treated as a National ID. */
export const looksLikePin = (v: string) => /^[AP]\d{9}[A-Z]$/i.test(v.trim());
