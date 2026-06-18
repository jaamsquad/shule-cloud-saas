"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const owner_controller_1 = require("../controllers/owner.controller");
const router = (0, express_1.Router)();
router.get('/tenants', owner_controller_1.getTenants);
router.get('/plans', owner_controller_1.getPlans);
router.post('/plans', owner_controller_1.createPlan);
router.patch('/plans/:id', owner_controller_1.updatePlan);
router.delete('/plans/:id', owner_controller_1.deletePlan);
router.get('/billing/revenue-report', owner_controller_1.getRevenueReport);
// ─── Owner analytics ─────────────────────────────────────────────────────────
router.get('/stats', owner_controller_1.getOwnerStats); // GET /api/v1/owner/stats
router.get('/revenue', owner_controller_1.getOwnerRevenue); // GET /api/v1/owner/revenue?period=monthly
router.get('/schools/summary', owner_controller_1.getSchoolsSummary); // GET /api/v1/owner/schools/summary
// ─── Single-school management ────────────────────────────────────────────────
router.get('/schools/:id', owner_controller_1.getSchoolDetail);
router.post('/schools/:id/plan', owner_controller_1.assignSchoolPlan);
router.post('/schools/:id/status', owner_controller_1.setSchoolStatus);
router.post('/schools/:id/modules', owner_controller_1.setSchoolModules);
router.post('/schools/:id/impersonate', owner_controller_1.impersonateSchool);
// ─── Contact messages + platform settings ────────────────────────────────────
router.get('/contact-messages', owner_controller_1.listContactMessages);
router.patch('/contact-messages/:id', owner_controller_1.updateContactMessage);
router.get('/public-settings', owner_controller_1.getPublicSettings);
router.post('/public-settings', owner_controller_1.setPublicSettings);
// ─── Owner user management (add users + assign roles) ────────────────────────
router.get('/roles', owner_controller_1.getOwnerRoles);
router.get('/users', owner_controller_1.listOwnerUsers);
router.post('/users', owner_controller_1.createOwnerUser);
router.patch('/users/:id', owner_controller_1.updateOwnerUser);
router.delete('/users/:id', owner_controller_1.deleteOwnerUser);
exports.default = router;
