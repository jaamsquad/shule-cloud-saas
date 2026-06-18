"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const onboard_controller_1 = require("../controllers/onboard.controller");
const owner_controller_1 = require("../controllers/owner.controller");
const router = (0, express_1.Router)();
router.get('/check-subdomain', onboard_controller_1.checkSubdomain);
router.post('/register-tenant', onboard_controller_1.registerTenant);
// Public, unauthenticated endpoints (onboard prefix is exempt from tenancy).
router.post('/contact', owner_controller_1.submitContactMessage); // /api/v1/onboard/contact
router.get('/public-settings', owner_controller_1.getPublicSettings); // /api/v1/onboard/public-settings
exports.default = router;
