import { Router } from 'express';
import { getTenants, getPlans, getRevenueReport } from '../controllers/owner.controller';

const router = Router();

router.get('/tenants', getTenants);
router.get('/plans', getPlans);
router.get('/billing/revenue-report', getRevenueReport);

export default router;
