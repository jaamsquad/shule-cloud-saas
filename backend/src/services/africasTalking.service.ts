/**
 * Africa's Talking — SMS sending only (no inbound, callbacks or subscriptions).
 *
 * The school's admin sets username, API key, sender ID and environment on
 * Integrations → Africa's Talking; nothing here is hard-coded per school.
 *
 *   production  https://api.africastalking.com
 *   sandbox     https://api.sandbox.africastalking.com   (username is always "sandbox")
 *
 * Every request carries `apiKey` + `Accept: application/json`; `username` goes in the
 * body / query string. Two send endpoints, same response shape:
 *   POST /version1/messaging        form-encoded, `to` = comma-separated numbers   (single sends)
 *   POST /version1/messaging/bulk   JSON, `phoneNumbers` = array                   (several recipients)
 *
 * A 2xx only means Africa's Talking ACCEPTED the request. The truth is per recipient in
 * SMSMessageData.Recipients[] (statusCode / status / messageId / cost) — parsed below.
 */

export interface AtConfig { username: string; apiKey: string; senderId?: string; environment?: string }

export const AT_HOSTS = { production: 'https://api.africastalking.com', sandbox: 'https://api.sandbox.africastalking.com' };

export const isSandbox = (cfg: Pick<AtConfig, 'environment'>) => /sandbox/i.test(String(cfg?.environment || ''));
export const atBase = (cfg: AtConfig) => (isSandbox(cfg) ? AT_HOSTS.sandbox : AT_HOSTS.production);
// The sandbox app is always called "sandbox" — a different username can only ever fail there.
export const atUsername = (cfg: AtConfig) => (isSandbox(cfg) ? 'sandbox' : String(cfg.username || '').trim());

/**
 * What to do about a per-recipient statusCode:
 *   ok        accepted (100 Processed, 101 Sent, 102 Queued)
 *   permanent this recipient can't be sent to — mark failed, don't retry anywhere
 *   provider  the gateway/account can't send right now (balance, routing, outage) — try the next provider
 *   sender    the sender ID isn't registered — resend without it
 */
export type AtPolicy = 'ok' | 'permanent' | 'provider' | 'sender';
export const AT_STATUS: Record<number, { label: string; policy: AtPolicy; explain: string }> = {
    100: { label: 'Processed', policy: 'ok', explain: 'Accepted and being processed.' },
    101: { label: 'Sent', policy: 'ok', explain: 'Handed to the mobile network.' },
    102: { label: 'Queued', policy: 'ok', explain: 'Queued by Africa\'s Talking for sending.' },
    401: { label: 'RiskHold', policy: 'permanent', explain: 'Held for review by Africa\'s Talking. Contact their support.' },
    402: { label: 'InvalidSenderId', policy: 'sender', explain: 'The sender ID is not registered on your Africa\'s Talking account.' },
    403: { label: 'InvalidPhoneNumber', policy: 'permanent', explain: 'The phone number is not valid.' },
    404: { label: 'UnsupportedNumberType', policy: 'permanent', explain: 'This type of number is not supported.' },
    405: { label: 'InsufficientBalance', policy: 'provider', explain: 'Your Africa\'s Talking account has run out of credit. Top it up.' },
    406: { label: 'UserInBlacklist', policy: 'permanent', explain: 'This number has opted out of receiving SMS.' },
    407: { label: 'CouldNotRoute', policy: 'provider', explain: 'Africa\'s Talking could not route this message. Try again shortly.' },
    409: { label: 'DoNotDisturbRejection', policy: 'permanent', explain: 'The number is on a Do-Not-Disturb list.' },
    500: { label: 'InternalServerError', policy: 'provider', explain: 'Africa\'s Talking had an internal error.' },
    501: { label: 'GatewayError', policy: 'provider', explain: 'Africa\'s Talking gateway error.' },
};
const policyOf = (code: number | null): AtPolicy => (code != null && AT_STATUS[code]?.policy) || (code != null && code >= 500 ? 'provider' : 'permanent');

export interface AtRecipientResult {
    number: string;           // +2547…
    ok: boolean;
    statusCode: number | null;
    status: string;           // "Success" / "InvalidPhoneNumber" / …
    policy: AtPolicy;
    messageId?: string;
    cost?: string;            // "KES 0.8000"
    error?: string;           // plain-English reason when !ok
}
export interface AtSendResult {
    recipients: AtRecipientResult[];
    /** The whole request failed (bad key, gateway down, no network). Recipients are then empty. */
    requestError?: { message: string; provider: boolean; ambiguous?: boolean };
    senderIdDropped?: boolean;   // the sender ID was rejected, so the message went from Africa's Talking's default sender
}

// Plain-ASCII look-alikes for the punctuation Word / phones like to insert. One curly quote
// makes the whole message Unicode: 70 characters per part instead of 160, i.e. double the cost.
export const toGsmFriendly = (text: string) =>
    String(text || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/ /g, ' ');

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const TIMEOUT_MS = 20_000;
const CHUNK = 100;               // recipients per request
const ENQUEUE_ABOVE = 10;        // hand big sends to Africa's Talking to queue (no waiting on every telco)

// Map an HTTP failure / non-JSON reply to something the admin can act on.
function explainHttp(status: number, body: string): string {
    if (status === 401 || status === 403) return 'Africa\'s Talking rejected the username / API key. Check them, and that the Environment (sandbox / production) matches the app the key belongs to.';
    if (status === 429) return 'Africa\'s Talking is rate-limiting requests. Try again in a moment.';
    if (status >= 500) return `Africa's Talking is having problems (HTTP ${status}).`;
    const snippet = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
    return `Africa's Talking replied HTTP ${status}${snippet ? `: ${snippet}` : ''}.`;
}

async function call(url: string, init: RequestInit): Promise<{ status: number; text: string; json: any }> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
        const resp = await fetch(url, { ...init, signal: ctl.signal });
        const text = await resp.text();
        let json: any = null;
        try { json = JSON.parse(text); } catch { /* AT answers auth errors in plain text */ }
        return { status: resp.status, text, json };
    } finally { clearTimeout(timer); }
}

function parseRecipients(json: any, asked: string[]): { recipients: AtRecipientResult[]; note: string } {
    const data = json?.SMSMessageData;
    const list: any[] = Array.isArray(data?.Recipients) ? data.Recipients : [];
    const note = String(data?.Message || '');
    const byNumber = new Map<string, any>();
    list.forEach(r => byNumber.set(String(r.number || '').replace(/\s/g, ''), r));

    const recipients = asked.map((number): AtRecipientResult => {
        const r = byNumber.get(number);
        if (!r) {
            // Africa's Talking leaves out numbers it could not even parse.
            return { number, ok: false, statusCode: null, status: 'NotAccepted', policy: 'permanent', error: note && !/^sent to/i.test(note) ? note : 'Africa\'s Talking did not accept this number.' };
        }
        const code = Number(r.statusCode);
        const known = Number.isFinite(code) ? AT_STATUS[code] : undefined;
        const policy = policyOf(Number.isFinite(code) ? code : null);
        const ok = policy === 'ok';
        return {
            number, ok, statusCode: Number.isFinite(code) ? code : null, status: String(r.status || known?.label || ''), policy,
            messageId: r.messageId || undefined, cost: r.cost || undefined,
            error: ok ? undefined : `${known?.label || r.status || 'Failed'}${Number.isFinite(code) ? ` (${code})` : ''} — ${known?.explain || 'Not sent.'}`,
        };
    });
    return { recipients, note };
}

async function sendChunk(cfg: AtConfig, numbers: string[], message: string, withSender: boolean): Promise<AtSendResult> {
    const base = atBase(cfg), username = atUsername(cfg);
    const headers = { apiKey: cfg.apiKey, Accept: 'application/json' };
    const sender = withSender && cfg.senderId ? String(cfg.senderId).trim() : '';
    const enqueue = numbers.length > ENQUEUE_ABOVE;

    const legacy = () => {
        const form = new URLSearchParams({ username, to: numbers.join(','), message });
        if (sender) form.set('from', sender);
        if (enqueue) form.set('enqueue', '1');
        return call(`${base}/version1/messaging`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
    };
    const bulk = () => call(`${base}/version1/messaging/bulk`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, message, phoneNumbers: numbers, ...(sender ? { senderId: sender } : {}), ...(enqueue ? { enqueue: true } : {}) }),
    });

    try {
        let res: { status: number; text: string; json: any } | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            res = numbers.length > 1 ? await bulk() : await legacy();
            // The bulk endpoint isn't available on every account: fall back to the classic one.
            if (numbers.length > 1 && !res.json?.SMSMessageData && [400, 404, 405].includes(res.status)) res = await legacy();
            if (res.status < 500 && res.status !== 429) break;          // only retry when Africa's Talking itself failed
            await sleep(600 * (attempt + 1));
        }
        if (!res) throw new Error('no response');
        if (!res.json?.SMSMessageData) {
            return { recipients: [], requestError: { message: explainHttp(res.status, res.text), provider: true } };
        }
        const { recipients } = parseRecipients(res.json, numbers);
        return { recipients };
    } catch (e: any) {
        // A timeout leaves it unknown whether the message went out — never resend or fall back on that.
        if (e?.name === 'AbortError') return { recipients: [], requestError: { message: 'Africa\'s Talking did not answer in time. The message may still have been sent — check before resending.', provider: false, ambiguous: true } };
        return { recipients: [], requestError: { message: `Could not reach Africa's Talking (${e?.cause?.code || e?.message || 'network error'}).`, provider: true } };
    }
}

/** Send `message` to E.164 `numbers` (each "+2547…"). Never throws. */
export async function atSendSms(cfg: AtConfig, numbers: string[], message: string): Promise<AtSendResult> {
    if (!cfg?.apiKey || !cfg?.username) return { recipients: [], requestError: { message: 'Africa\'s Talking is not configured (username and API key are required).', provider: true } };
    const text = toGsmFriendly(message);
    const all: AtRecipientResult[] = [];
    let senderIdDropped = false;

    for (let i = 0; i < numbers.length; i += CHUNK) {
        const chunk = numbers.slice(i, i + CHUNK);
        let res = await sendChunk(cfg, chunk, text, true);
        if (res.requestError) {
            // This chunk and everything after it was not processed: the caller sees them as
            // numbers missing from `recipients`, together with the reason.
            return { recipients: all, requestError: res.requestError, senderIdDropped: senderIdDropped || undefined };
        }
        // Unregistered sender ID → resend just those numbers from Africa's Talking's default sender.
        const badSender = res.recipients.filter(r => r.policy === 'sender');
        if (badSender.length && cfg.senderId) {
            const retry = await sendChunk(cfg, badSender.map(r => r.number), text, false);
            if (!retry.requestError) {
                senderIdDropped = true;
                const fixed = new Map(retry.recipients.map(r => [r.number, r]));
                res = { recipients: res.recipients.map(r => fixed.get(r.number) || r) };
            }
        }
        all.push(...res.recipients);
    }
    return { recipients: all, senderIdDropped: senderIdDropped || undefined };
}

/** Account balance ("KES 1234.5000"). Throws an Error with a plain-English message. */
export async function atBalance(cfg: AtConfig): Promise<{ balance: string; raw: any }> {
    if (!cfg?.apiKey || !cfg?.username) throw new Error('Username and API key are required.');
    const url = `${atBase(cfg)}/version1/user?username=${encodeURIComponent(atUsername(cfg))}`;
    let res;
    try { res = await call(url, { headers: { apiKey: cfg.apiKey, Accept: 'application/json' } }); }
    catch (e: any) { throw new Error(e?.name === 'AbortError' ? 'Africa\'s Talking did not answer in time.' : `Could not reach Africa's Talking (${e?.cause?.code || e?.message || 'network error'}).`); }
    if (res.status < 200 || res.status >= 300 || !res.json?.UserData) throw new Error(explainHttp(res.status, res.text));
    return { balance: String(res.json.UserData.balance ?? ''), raw: res.json.UserData };
}
