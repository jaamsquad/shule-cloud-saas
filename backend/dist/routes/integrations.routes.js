"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongodb_1 = require("../lib/mongodb");
const mpesa_service_1 = require("../services/mpesa.service");
const router = (0, express_1.Router)();
const tdb = (req) => req.tenantDb || (0, mongodb_1.getMetaDb)();
const last4 = (s) => (s ? `••••${String(s).slice(-4)}` : '');
// ─── M-PESA settings (per school) ────────────────────────────────────────────
router.get('/integrations/mpesa/settings', async (req, res) => {
    try {
        const s = (await tdb(req).collection('mpesa_settings').findOne({})) || {};
        const cfg = await (0, mpesa_service_1.resolveMpesaConfig)(tdb(req)); // effective config (incl. integration_settings)
        res.json({
            enabled: cfg.enabled,
            env: cfg.env,
            shortcode: cfg.shortcode,
            txType: cfg.txType,
            initiator: cfg.initiator || '',
            // never return raw secrets — only masked hints (from the effective config)
            consumerKeyMask: last4(cfg.key),
            consumerSecretSet: !!cfg.secret,
            passkeySet: !!cfg.passkey,
            securityCredentialSet: !!cfg.securityCredential,
            configured: (0, mpesa_service_1.isMpesaConfigured)(cfg),
            callbackBase: cfg.callbackBase,
            registered: !!s.urlsRegistered,
        });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.put('/integrations/mpesa/settings', async (req, res) => {
    try {
        const b = req.body || {};
        const $set = { updatedAt: new Date() };
        // Plain fields
        ['env', 'shortcode', 'txType', 'initiator'].forEach(k => { if (b[k] !== undefined)
            $set[k] = b[k]; });
        if (b.enabled !== undefined)
            $set.enabled = !!b.enabled;
        // Secrets: only overwrite when a non-empty value is provided (avoid wiping on save).
        ['consumerKey', 'consumerSecret', 'passkey', 'securityCredential'].forEach(k => {
            if (typeof b[k] === 'string' && b[k].trim())
                $set[k] = b[k].trim();
        });
        await tdb(req).collection('mpesa_settings').updateOne({}, { $set }, { upsert: true });
        res.json({ message: 'M-PESA settings saved' });
    }
    catch (e) {
        res.status(400).json({ message: e.message });
    }
});
// Test connectivity (obtains an OAuth token with the school's credentials).
router.post('/integrations/mpesa/test', async (req, res) => {
    try {
        const cfg = await (0, mpesa_service_1.resolveMpesaConfig)(tdb(req));
        if (!(0, mpesa_service_1.isMpesaConfigured)(cfg))
            return res.status(400).json({ message: 'Enter Consumer Key, Secret, Shortcode and Passkey first.' });
        await (0, mpesa_service_1.getAccessToken)(cfg);
        res.json({ ok: true, message: 'Connected to Daraja successfully.' });
    }
    catch (e) {
        res.status(400).json({ ok: false, message: e.message });
    }
});
// Register C2B validation/confirmation URLs with Safaricom.
router.post('/integrations/mpesa/register-urls', async (req, res) => {
    try {
        const cfg = await (0, mpesa_service_1.resolveMpesaConfig)(tdb(req));
        if (!cfg.callbackBase)
            return res.status(400).json({ message: 'Platform callback URL (MPESA_CALLBACK_URL) is not set by the operator.' });
        if (!(0, mpesa_service_1.isMpesaConfigured)(cfg))
            return res.status(400).json({ message: 'Configure your M-PESA credentials first.' });
        const result = await (0, mpesa_service_1.registerC2BUrls)(cfg, `${cfg.callbackBase}/mpesa/c2b/validation`, `${cfg.callbackBase}/mpesa/c2b/confirmation`);
        await tdb(req).collection('mpesa_settings').updateOne({}, { $set: { urlsRegistered: true, registeredAt: new Date() } }, { upsert: true });
        res.json({ ok: true, result });
    }
    catch (e) {
        res.status(400).json({ ok: false, message: e.message });
    }
});
exports.default = router;
