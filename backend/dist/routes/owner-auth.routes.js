"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const owner_auth_controller_1 = require("../controllers/owner-auth.controller");
const router = (0, express_1.Router)();
router.post('/register', owner_auth_controller_1.registerOwner);
router.post('/login', owner_auth_controller_1.loginOwner);
exports.default = router;
