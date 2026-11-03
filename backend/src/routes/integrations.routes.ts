import { Router } from 'express';
import { getMetaDb } from '../lib/mongodb';
import { resolveMpesaConfig, getAccessToken, registerC2BUrls, isMpesaConfigured, platformCallbackBase, platformCallbackBaseV1, callbackUrlProblems } from '../services/mpesa.service';

const router = Router();
const tdb = (req: any) => req.tenantDb || getMetaDb();
const last4 = (s?: string) => (s ? `••••${String(s).slice(-4)}` : '');

// ─── M-PESA settings (per school) ────────────────────────────────────────────
router.get('/integrations/mpesa/settings', async (req, res) => {
    try {
        const s: any = (await tdb(req).collection('mpesa_settings').findOne({})) || {};
        const cfg = await resolveMpesaConfig(tdb(req));   // effective config (incl. integration_settings)
        res.json({
            enabled: cfg.enabled,
            env: cfg.env,
            shortcode: cfg.shortcode,
            tillNumber: cfg.tillNumber || '',
            txType: cfg.txType,
            initiator: cfg.initiator || '',
            // never return raw secrets — only masked hints (from the effective config)
            consumerKeyMask: last4(cfg.key),
            consumerSecretSet: !!cfg.secret,
            passkeySet: !!cfg.passkey,
            securityCredentialSet: !!cfg.securityCredential,
            // A separate Daraja app for C2B, only if Safaricom gave the school one.
            c2bConsumerKeyMask: last4(cfg.c2bKey),
            c2bConsumerSecretSet: !!cfg.c2bSecret,
            configured: isMpesaConfigured(cfg),
            // The v1 base — the UI appends /pesa/c2b/... to display the exact URLs
            // that Register sends to Safaricom, so the two must stay in lockstep.
            callbackBase: platformCallbackBaseV1(),
            registered: !!s.urlsRegistered,
            registeredShortCode: s.registeredShortCode || '',
            pullRegistered: !!s.pullRegistered,
            pullNominatedNumber: s.pullNominatedNumber || '',
            // Reconciliation (Verify + Pull) is only possible with these set.
            reconciliationReady: !!(cfg.initiator && cfg.securityCredential),
        });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.put('/integrations/mpesa/settings', async (req, res) => {
    try {
        const b = req.body || {};
        const $set: any = { updatedAt: new Date() };
        // Plain fields
        ['env', 'shortcode', 'tillNumber', 'txType', 'initiator'].forEach(k => { if (b[k] !== undefined) $set[k] = b[k]; });
        if (b.enabled !== undefined) $set.enabled = !!b.enabled;
        // Secrets: only overwrite when a non-empty value is provided (avoid wiping on save).
        ['consumerKey', 'consumerSecret', 'passkey', 'securityCredential', 'c2bConsumerKey', 'c2bConsumerSecret'].forEach(k => {
            if (typeof b[k] === 'string' && b[k].trim()) $set[k] = b[k].trim();
        });
        await tdb(req).collection('mpesa_settings').updateOne({}, { $set }, { upsert: true });
        res.json({ message: 'M-PESA settings saved' });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});

// Test connectivity (obtains an OAuth token with the school's credentials).
router.post('/integrations/mpesa/test', async (req, res) => {
    try {
        const cfg = await resolveMpesaConfig(tdb(req));
        if (!isMpesaConfigured(cfg)) return res.status(400).json({ message: 'Enter Consumer Key, Secret, Shortcode and Passkey first.' });
        await getAccessToken(cfg);
        res.json({ ok: true, message: 'Connected to Daraja successfully.' });
    } catch (e: any) { res.status(400).json({ ok: false, message: e.message }); }
});

// Register C2B validation/confirmation URLs with Safaricom.
router.post('/integrations/mpesa/register-urls', async (req, res) => {
    let storeNumber = '';
    try {
        const cfg = await resolveMpesaConfig(tdb(req));
        if (!cfg.callbackBase) return res.status(400).json({ message: 'Platform callback URL (MPESA_CALLBACK_URL) is not set by the operator.' });
        if (!isMpesaConfigured(cfg)) return res.status(400).json({ message: 'Configure your M-PESA credentials first.' });
        // Safaricom rejects any C2B URL containing the word "mpesa". Our endpoints are
        // also served under /pesa/... for exactly this reason — use that, and strip any
        // stray "mpesa" from the operator's callback base just in case. All callbacks
        // are registered on the canonical /v1/ mount (platformCallbackBaseV1).
        const safeBase = platformCallbackBaseV1().replace(/mpesa/gi, 'pesa');
        const validationUrl = `${safeBase}/pesa/c2b/validation`;
        const confirmationUrl = `${safeBase}/pesa/c2b/confirmation`;
        // Catch an unreachable/blocked callback URL before ever calling Safaricom,
        // with a plain-language reason instead of a confusing Daraja rejection.
        const problems = [...new Set([...callbackUrlProblems(validationUrl, cfg.env), ...callbackUrlProblems(confirmationUrl, cfg.env)])];
        if (problems.length) return res.status(400).json({ message: problems.join(' ') });
        // Register against the STORE/TILL number, not the Head Office shortcode.
        // For a Buy Goods/Till the store number is `tillNumber`; allow an explicit
        // override via the request body (storeNumber) for edge cases.
        storeNumber = String(req.body?.storeNumber || cfg.tillNumber || cfg.shortcode).trim();
        const result = await registerC2BUrls(cfg, validationUrl, confirmationUrl, 'Completed', storeNumber);
        await tdb(req).collection('mpesa_settings').updateOne({}, { $set: { urlsRegistered: true, registeredAt: new Date(), registeredShortCode: storeNumber } }, { upsert: true });
        res.json({ ok: true, result, registeredShortCode: storeNumber });
    } catch (e: any) {
        // Safaricom's own "duplicate registration" response (sandbox throttling, or
        // registering the same shortcode again) still means the shortcode has OUR
        // URLs registered — never a reason to leave it stuck on an old target. Record
        // the number THIS attempt targeted (which may be a new store/till the admin
        // just changed to) so the UI reflects what was actually just registered, and
        // let the admin register again any time — nothing here blocks a retry.
        if (/already/i.test(e.message || '') && /register/i.test(e.message || '')) {
            await tdb(req).collection('mpesa_settings').updateOne({}, { $set: { urlsRegistered: true, registeredAt: new Date(), ...(storeNumber ? { registeredShortCode: storeNumber } : {}) } }, { upsert: true }).catch(() => { });
            return res.json({ ok: true, alreadyRegistered: true, registeredShortCode: storeNumber || undefined, message: `C2B URLs are registered for ${storeNumber || 'this shortcode'} — direct payments will be captured. You can register again any time, e.g. after changing the Till Number.` });
        }
        if (/failed to obtain m-pesa token/i.test(e.message || '')) {
            // getAccessToken already retried 4x with backoff — a persistent failure
            // here is Safaricom's real reason (bad/expired Consumer Key-Secret,
            // wrong environment, IP not whitelisted for production, etc.), not a
            // transient rate limit. Show it directly instead of a generic retry hint.
            return res.status(400).json({ ok: false, message: `Could not authenticate with Safaricom: ${e.message.replace(/^failed to obtain m-pesa token:\s*/i, '')}. Double-check your Consumer Key/Secret and Environment (sandbox vs production) in the M-PESA settings above.` });
        }
        res.status(400).json({ ok: false, message: e.message });
    }
});

export default router;
