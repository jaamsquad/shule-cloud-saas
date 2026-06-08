"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const owner_controller_1 = require("../controllers/owner.controller");
const router = (0, express_1.Router)();
router.get('/tenants', owner_controller_1.getTenants);
router.get('/plans', owner_controller_1.getPlans);
router.get('/billing/revenue-report', owner_controller_1.getRevenueReport);
exports.default = router;
