"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTenant = exports.checkSubdomain = void 0;
const mongodb_1 = require("../lib/mongodb");
const bcrypt_1 = __importDefault(require("bcrypt"));
const mongodb_2 = require("mongodb");
// Use meta db for onboarding (Tenant / User / Plan collections)
const getDb = () => (0, mongodb_1.getMetaDb)();
const checkSubdomain = async (req, res) => {
    const { subdomain } = req.query;
    if (!subdomain || typeof subdomain !== 'string') {
        return res.status(400).json({ message: 'Subdomain is required' });
    }
    const reserved = ['owner', 'api', 'www', 'admin', 'support', 'mail', 'localhost', '127'];
    if (reserved.includes(subdomain.toLowerCase())) {
        return res.json({ available: false, message: 'Reserved subdomain' });
    }
    try {
        const db = getDb();
        const existing = await db.collection('Tenant').findOne({ subdomain: subdomain.toLowerCase() });
        return res.json({
            available: !existing,
            message: existing ? 'Subdomain already taken' : 'Available'
        });
    }
    catch (e) {
        return res.json({ available: true, message: 'Available' });
    }
};
exports.checkSubdomain = checkSubdomain;
const registerTenant = async (req, res) => {
    const { schoolName, subdomain, planId, adminName, adminEmail, adminPhone, password } = req.body;
    try {
        const db = getDb();
        // 1. Basic check
        const existing = await db.collection('Tenant').findOne({ subdomain: subdomain.toLowerCase() });
        if (existing)
            return res.status(409).json({ message: 'Subdomain already taken' });
        // 2. Fetch or Create plan
        let plan;
        if (planId) {
            plan = await db.collection('Plan').findOne({ _id: new mongodb_2.ObjectId(planId) });
        }
        else {
            plan = await db.collection('Plan').findOne({ name: 'Basic' });
        }
        if (!plan) {
            const planResult = await db.collection('Plan').insertOne({
                name: 'Basic',
                description: 'Default Basic Plan',
                price: 0,
                billingCycle: 'monthly',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            plan = { _id: planResult.insertedId, name: 'Basic' };
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        // 3. Create Tenant — stamp databaseName so DB-per-tenant isolation works immediately
        const cleanSubdomain = subdomain.toLowerCase().trim();
        const databaseName = (0, mongodb_1.subdomainToDbName)(cleanSubdomain);
        const tenantResult = await db.collection('Tenant').insertOne({
            name: schoolName,
            subdomain: cleanSubdomain,
            databaseName,
            contactEmail: adminEmail,
            contactPhone: adminPhone,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        const tenantId = tenantResult.insertedId;
        // Create Domain
        await db.collection('TenantDomain').insertOne({
            tenantId: tenantId,
            domain: subdomain.toLowerCase(),
            isPrimary: true
        });
        // Create Subscription
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 30);
        await db.collection('TenantSubscription').insertOne({
            tenantId: tenantId,
            planId: plan._id,
            status: 'trial',
            trialEnd,
            startDate: new Date()
        });
        // Seed Roles
        const roleNames = ['Super Admin', 'Teacher', 'Bursar', 'Student', 'Parent'];
        const createdRoles = {};
        for (const name of roleNames) {
            const roleResult = await db.collection('Role').insertOne({
                tenantId: tenantId,
                name,
                createdAt: new Date()
            });
            createdRoles[name] = roleResult.insertedId;
        }
        // Create Admin User — stamped with tenantId, role, and school info
        // This is the ONLY super admin for this school; tenantId is the key
        // that binds this account to the school's subdomain forever.
        const userResult = await db.collection('User').insertOne({
            tenantId,
            tenantSubdomain: cleanSubdomain, // extra safety binding
            email: adminEmail,
            passwordHash: hashedPassword,
            name: adminName || adminEmail.split('@')[0],
            role: 'school_admin',
            isSchoolAdmin: true,
            status: 'active',
            createdAt: new Date()
        });
        const userId = userResult.insertedId;
        // Assign Role
        await db.collection('UserRole').insertOne({
            userId: userId,
            roleId: createdRoles['Super Admin']
        });
        // Settings
        await db.collection('SchoolSetting').insertOne({
            tenantId: tenantId,
            jsonSettings: {
                currency: 'KES',
                timezone: 'Africa/Nairobi'
            }
        });
        return res.status(201).json({
            message: 'Onboarding successful',
            tenant: {
                id: tenantId,
                name: schoolName,
                subdomain: subdomain.toLowerCase(),
                loginUrl: `http://${subdomain.toLowerCase()}.localhost:8080/login`
            }
        });
    }
    catch (error) {
        console.error('Registration Error:', error);
        return res.status(500).json({ message: error.message || 'Registration failed' });
    }
};
exports.registerTenant = registerTenant;
