"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const owner_controller_1 = require("../controllers/owner.controller");
const router = (0, express_1.Router)();
router.get('/tenants', owner_controller_1.getTenants);
router.get('/plans', owner_controller_1.getPlans);
router.get('/billing/revenue-report', owner_controller_1.getRevenueReport);
// ─── Owner analytics ─────────────────────────────────────────────────────────
router.get('/stats', owner_controller_1.getOwnerStats); // GET /api/v1/owner/stats
router.get('/revenue', owner_controller_1.getOwnerRevenue); // GET /api/v1/owner/revenue?period=monthly
router.get('/schools/summary', owner_controller_1.getSchoolsSummary); // GET /api/v1/owner/schools/summary
// ─── Owner user management (add users + assign roles) ────────────────────────
router.get('/roles', owner_controller_1.getOwnerRoles);
router.get('/users', owner_controller_1.listOwnerUsers);
router.post('/users', owner_controller_1.createOwnerUser);
router.patch('/users/:id', owner_controller_1.updateOwnerUser);
router.delete('/users/:id', owner_controller_1.deleteOwnerUser);
exports.default = router;
