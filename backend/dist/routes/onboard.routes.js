"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const onboard_controller_1 = require("../controllers/onboard.controller");
const router = (0, express_1.Router)();
router.get('/check-subdomain', onboard_controller_1.checkSubdomain);
router.post('/register-tenant', onboard_controller_1.registerTenant);
exports.default = router;
