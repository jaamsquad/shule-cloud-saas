import { Router } from 'express';
import { getMetaDb } from '../lib/mongodb';
import { resolveMpesaConfig, getAccessToken, registerC2BUrls, isMpesaConfigured, platformCallbackBase } from '../services/mpesa.service';

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
            configured: isMpesaConfigured(cfg),
            callbackBase: cfg.callbackBase,
            registered: !!s.urlsRegistered,
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
        ['consumerKey', 'consumerSecret', 'passkey', 'securityCredential'].forEach(k => {
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
    try {
        const cfg = await resolveMpesaConfig(tdb(req));
        if (!cfg.callbackBase) return res.status(400).json({ message: 'Platform callback URL (MPESA_CALLBACK_URL) is not set by the operator.' });
        if (!isMpesaConfigured(cfg)) return res.status(400).json({ message: 'Configure your M-PESA credentials first.' });
        // Safaricom rejects any C2B URL containing the word "mpesa". Our endpoints are
        // also served under /pesa/... for exactly this reason — use that, and strip any
        // stray "mpesa" from the operator's callback base just in case.
        const safeBase = cfg.callbackBase.replace(/mpesa/gi, 'pesa');
        const result = await registerC2BUrls(cfg, `${safeBase}/pesa/c2b/validation`, `${safeBase}/pesa/c2b/confirmation`);
        await tdb(req).collection('mpesa_settings').updateOne({}, { $set: { urlsRegistered: true, registeredAt: new Date() } }, { upsert: true });
        res.json({ ok: true, result });
    } catch (e: any) {
        // Safaricom only lets a shortcode register once. A repeat attempt returning
        // "already registered" means C2B is set up — treat it as success, not an error.
        if (/already\s*registered/i.test(e.message || '')) {
            await tdb(req).collection('mpesa_settings').updateOne({}, { $set: { urlsRegistered: true } }, { upsert: true }).catch(() => { });
            return res.json({ ok: true, alreadyRegistered: true, message: 'C2B URLs are already registered for this shortcode — direct payments will be captured.' });
        }
        res.status(400).json({ ok: false, message: e.message });
    }
});

export default router;
