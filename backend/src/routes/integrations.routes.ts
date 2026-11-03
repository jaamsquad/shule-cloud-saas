import { Router } from 'express';
import { getMetaDb } from '../lib/mongodb';
import { getAccessToken, registerC2BUrls, registerPullUrl, platformCallbackBaseV1, callbackUrlProblems } from '../services/mpesa.service';
import {
    listAccounts, getAccount, createAccount, updateAccount, deleteAccount, setDefaultAccount,
    maskAccount, toConfig,
} from '../services/mpesaAccounts.service';

const router = Router();
const tdb = (req: any) => req.tenantDb || getMetaDb();

// ─── M-PESA accounts (per school, supports more than one Paybill/Till) ──────────
router.get('/integrations/mpesa/accounts', async (req, res) => {
    try { res.json((await listAccounts(tdb(req))).map(maskAccount)); }
    catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.post('/integrations/mpesa/accounts', async (req, res) => {
    try {
        if (!String(req.body?.shortcode || '').trim()) return res.status(400).json({ message: 'Enter a Business Shortcode (Paybill number, or the Store/Head Office number for a Till).' });
        const acc = await createAccount(tdb(req), req.body || {});
        res.status(201).json(maskAccount(acc));
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.put('/integrations/mpesa/accounts/:id', async (req, res) => {
    try {
        const acc = await updateAccount(tdb(req), req.params.id, req.body || {});
        if (!acc) return res.status(404).json({ message: 'M-PESA account not found.' });
        res.json(maskAccount(acc));
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.delete('/integrations/mpesa/accounts/:id', async (req, res) => {
    try { await deleteAccount(tdb(req), req.params.id); res.json({ message: 'M-PESA account removed.' }); }
    catch (e: any) { res.status(400).json({ message: e.message }); }
});

router.post('/integrations/mpesa/accounts/:id/set-default', async (req, res) => {
    try { await setDefaultAccount(tdb(req), req.params.id); res.json({ message: 'Default M-PESA account updated.' }); }
    catch (e: any) { res.status(400).json({ message: e.message }); }
});

// Test connectivity (obtains an OAuth token with the account's credentials).
router.post('/integrations/mpesa/accounts/:id/test', async (req, res) => {
    try {
        const acc = await getAccount(tdb(req), req.params.id);
        if (!acc) return res.status(404).json({ message: 'M-PESA account not found.' });
        await getAccessToken(toConfig(acc));
        res.json({ ok: true, message: 'Connected to Daraja successfully.' });
    } catch (e: any) { res.status(400).json({ ok: false, message: e.message }); }
});

// Register C2B validation/confirmation URLs with Safaricom for one account.
router.post('/integrations/mpesa/accounts/:id/register-urls', async (req, res) => {
    let storeNumber = '';
    try {
        const d = tdb(req);
        const acc = await getAccount(d, req.params.id);
        if (!acc) return res.status(404).json({ message: 'M-PESA account not found.' });
        const cfg = toConfig(acc);
        if (!cfg.callbackBase) return res.status(400).json({ message: 'Platform callback URL (MPESA_CALLBACK_URL) is not set by the operator.' });
        if (!cfg.key || !cfg.secret || !cfg.shortcode) return res.status(400).json({ message: 'Fill in the Consumer Key, Secret and Shortcode for this account first.' });
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
        storeNumber = String(req.body?.storeNumber || acc.tillNumber || acc.shortcode).trim();
        const result = await registerC2BUrls(cfg, validationUrl, confirmationUrl, 'Completed', storeNumber);
        await d.collection('mpesa_accounts').updateOne({ _id: acc._id }, { $set: { urlsRegistered: true, registeredAt: new Date(), registeredShortCode: storeNumber } });
        res.json({ ok: true, result, registeredShortCode: storeNumber });
    } catch (e: any) {
        // Safaricom's "duplicate registration" response means THIS CALL was
        // rejected — it does not by itself say whose URLs are registered. We only
        // have something to warn about when we have actual evidence they point
        // somewhere else: this same account was previously registered to a
        // DIFFERENT number (the admin just changed the Till/Store number and this
        // attempt to move it was refused — the old number is still live, and only
        // Safaricom support can change it). Every other case — no prior record at
        // all (a fresh account, e.g. one added after migrating off the old
        // single-account setup) or targeting the same number already on record —
        // means this shortcode already has OUR fixed callback URLs registered
        // (we always submit the same ones), so it's a success, not a problem.
        if (/already/i.test(e.message || '') && /register/i.test(e.message || '')) {
            const d = tdb(req);
            const acc = await getAccount(d, req.params.id).catch(() => null);
            const previousShortCode = String(acc?.registeredShortCode || '').trim();
            const movedAway = !!previousShortCode && !!storeNumber && storeNumber !== previousShortCode;
            if (!movedAway) {
                if (acc) await d.collection('mpesa_accounts').updateOne({ _id: acc._id }, { $set: { urlsRegistered: true, registeredShortCode: storeNumber, registeredAt: new Date() } });
                return res.json({ ok: true, alreadyRegistered: true, registeredShortCode: storeNumber, message: `C2B URLs are already registered for ${storeNumber} — direct payments are being captured.` });
            }
            return res.status(409).json({
                ok: false, alreadyRegistered: true, registeredShortCode: previousShortCode || undefined, attemptedShortCode: storeNumber,
                message: `Safaricom refused to move the registration from ${previousShortCode} to ${storeNumber} — it still has ${previousShortCode} registered, not the new number. Safaricom's API doesn't let a shortcode's C2B URLs change once set; ask apisupport@safaricom.co.ke to remove the old registration (or point your Till Number back to ${previousShortCode} if that's the one actually meant to receive payments).`,
            });
        }
        if (/failed to obtain m-pesa token/i.test(e.message || '')) {
            // getAccessToken already retried 4x with backoff — a persistent failure
            // here is Safaricom's real reason (bad/expired Consumer Key-Secret,
            // wrong environment, IP not whitelisted for production, etc.), not a
            // transient rate limit. Show it directly instead of a generic retry hint.
            return res.status(400).json({ ok: false, message: `Could not authenticate with Safaricom: ${e.message.replace(/^failed to obtain m-pesa token:\s*/i, '')}. Double-check this account's Consumer Key/Secret and Environment (sandbox vs production).` });
        }
        res.status(400).json({ ok: false, message: e.message });
    }
});

// One-time Pull API registration for one account's shortcode.
router.post('/integrations/mpesa/accounts/:id/register-pull', async (req, res) => {
    try {
        const d = tdb(req);
        const acc = await getAccount(d, req.params.id);
        if (!acc) return res.status(404).json({ message: 'M-PESA account not found.' });
        const cfg = toConfig(acc);
        if (!cfg.key || !cfg.secret || !cfg.shortcode) return res.status(400).json({ message: 'Fill in the Consumer Key, Secret and Shortcode for this account first.' });
        const nominated = String(req.body?.nominatedNumber || '').replace(/\D/g, '');
        if (!/^2547\d{8}$/.test(nominated) && !/^07\d{8}$/.test(nominated)) return res.status(400).json({ message: 'Provide the nominated phone number registered on the M-PESA org portal (e.g. 0712345678).' });
        const base = platformCallbackBaseV1().replace(/mpesa/gi, 'pesa');
        await registerPullUrl(cfg, `${base}/pesa/pull/result`, nominated.startsWith('07') ? '254' + nominated.slice(1) : nominated);
        await d.collection('mpesa_accounts').updateOne({ _id: acc._id }, { $set: { pullRegistered: true, pullRegisteredAt: new Date(), pullNominatedNumber: nominated } });
        res.json({ ok: true, message: 'Pull API registered — you can now Sync transactions from Safaricom.' });
    } catch (e: any) { res.status(400).json({ message: e.message }); }
});

export default router;
