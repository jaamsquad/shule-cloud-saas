import { Router } from 'express';
import { getTenants, getPlans, getRevenueReport, getOwnerStats, getOwnerRevenue, getSchoolsSummary, getOwnerRoles, listOwnerUsers, createOwnerUser, updateOwnerUser, deleteOwnerUser } from '../controllers/owner.controller';

const router = Router();

router.get('/tenants', getTenants);
router.get('/plans', getPlans);
router.get('/billing/revenue-report', getRevenueReport);

// ─── Owner analytics ─────────────────────────────────────────────────────────
router.get('/stats', getOwnerStats);                 // GET /api/v1/owner/stats
router.get('/revenue', getOwnerRevenue);             // GET /api/v1/owner/revenue?period=monthly
router.get('/schools/summary', getSchoolsSummary);   // GET /api/v1/owner/schools/summary

// ─── Owner user management (add users + assign roles) ────────────────────────
router.get('/roles', getOwnerRoles);
router.get('/users', listOwnerUsers);
router.post('/users', createOwnerUser);
router.patch('/users/:id', updateOwnerUser);
router.delete('/users/:id', deleteOwnerUser);

export default router;
