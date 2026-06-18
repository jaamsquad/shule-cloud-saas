import { Router } from 'express';
import { getTenants, getPlans, createPlan, updatePlan, deletePlan, getRevenueReport, getOwnerStats, getOwnerRevenue, getSchoolsSummary, getOwnerRoles, listOwnerUsers, createOwnerUser, updateOwnerUser, deleteOwnerUser, getSchoolDetail, assignSchoolPlan, setSchoolStatus, setSchoolModules, impersonateSchool, listContactMessages, updateContactMessage, getPublicSettings, setPublicSettings } from '../controllers/owner.controller';

const router = Router();

router.get('/tenants', getTenants);
router.get('/plans', getPlans);
router.post('/plans', createPlan);
router.patch('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);
router.get('/billing/revenue-report', getRevenueReport);

// ─── Owner analytics ─────────────────────────────────────────────────────────
router.get('/stats', getOwnerStats);                 // GET /api/v1/owner/stats
router.get('/revenue', getOwnerRevenue);             // GET /api/v1/owner/revenue?period=monthly
router.get('/schools/summary', getSchoolsSummary);   // GET /api/v1/owner/schools/summary

// ─── Single-school management ────────────────────────────────────────────────
router.get('/schools/:id', getSchoolDetail);
router.post('/schools/:id/plan', assignSchoolPlan);
router.post('/schools/:id/status', setSchoolStatus);
router.post('/schools/:id/modules', setSchoolModules);
router.post('/schools/:id/impersonate', impersonateSchool);

// ─── Contact messages + platform settings ────────────────────────────────────
router.get('/contact-messages', listContactMessages);
router.patch('/contact-messages/:id', updateContactMessage);
router.get('/public-settings', getPublicSettings);
router.post('/public-settings', setPublicSettings);

// ─── Owner user management (add users + assign roles) ────────────────────────
router.get('/roles', getOwnerRoles);
router.get('/users', listOwnerUsers);
router.post('/users', createOwnerUser);
router.patch('/users/:id', updateOwnerUser);
router.delete('/users/:id', deleteOwnerUser);

export default router;
