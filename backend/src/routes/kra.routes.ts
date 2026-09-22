/**
 * KRA PIN lookup for employee registration — Settings → Integrations → KRA PIN Checker holds the
 * credentials; this is the one endpoint Add Employee calls to look a person up by National ID or PIN.
 */
import { Router, Request, Response } from 'express';
import { getMetaDb } from '../lib/mongodb';
import { resolveKraConfig, isKraConfigured, kraCheckById, kraCheckByPin, looksLikePin, KraError } from '../services/kra.service';

const router = Router();
const db = (req: Request) => (req as any).tenantDb || getMetaDb();

router.post('/kra/lookup', async (req: Request, res: Response) => {
    try {
        const query = String(req.body?.query || '').trim();
        if (!query) return res.status(400).json({ message: 'Enter a National ID or KRA PIN.' });
        const cfg = await resolveKraConfig(db(req));
        if (!isKraConfigured(cfg)) return res.status(400).json({ message: 'KRA is not connected yet. Set it up in Settings → Integrations → KRA PIN Checker.' });

        const taxpayerType = String(req.body?.taxpayerType || 'KE');
        const mode = req.body?.mode === 'pin' ? 'pin' : req.body?.mode === 'id' ? 'id' : (looksLikePin(query) ? 'pin' : 'id');
        const result = mode === 'pin' ? await kraCheckByPin(cfg, query) : await kraCheckById(cfg, query, taxpayerType);
        res.json({ ...result, mode, env: cfg.env });
    } catch (e: any) {
        if (e instanceof KraError) return res.status(e.httpStatus).json({ message: e.message, kraCode: e.kraCode, stage: e.stage });
        console.error('[KRA] lookup error:', e);
        res.status(400).json({ message: e.message || 'Could not reach KRA. Try again shortly.' });
    }
});

export default router;
