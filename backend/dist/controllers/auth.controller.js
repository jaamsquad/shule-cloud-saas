"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.updateTenantProfile = exports.getTenantProfile = exports.login = void 0;
const mongodb_1 = require("../lib/mongodb");
const mongodb_2 = require("mongodb");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// User and Tenant always live in the meta database.
// Staff/students live in the institution's isolated database.
const getInstDb = (req) => req.tenantDb || (0, mongodb_1.getMetaDb)();
const login = async (req, res) => {
    const { email, password, subdomain } = req.body;
    const metaDb = (0, mongodb_1.getMetaDb)();
    const instDb = getInstDb(req);
    let tenantId = req.tenantContext?.tenantId;
    if (subdomain) {
        const tenant = await metaDb.collection('Tenant').findOne({ subdomain: subdomain.toLowerCase() });
        if (tenant) {
            tenantId = tenant._id.toString();
        }
        else {
            return res.status(404).json({ message: 'School not found' });
        }
    }
    if (!tenantId) {
        return res.status(400).json({ message: 'Tenant context missing. Please access via your school subdomain.' });
    }
    try {
        let user = null;
        user = await metaDb.collection('User').findOne({ email, tenantId: new mongodb_2.ObjectId(tenantId) })
            || await metaDb.collection('User').findOne({ email, tenantId });
        if (!user)
            user = await metaDb.collection('User').findOne({ email });
        if (!user || !(await bcrypt_1.default.compare(password, user.passwordHash))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        let role = (user.role || user.designation || 'school_admin').toLowerCase();
        let staffInfo = null;
        try {
            staffInfo = await instDb.collection('staff').findOne({ email: user.email });
            if (staffInfo) {
                const designation = (staffInfo.designation || '').toLowerCase();
                if (designation.includes('teacher') || staffInfo.isTeachingStaff)
                    role = 'teacher';
            }
        }
        catch (_) { }
        const userName = (user.name || (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null)
            || staffInfo?.employeeName || user.email.split('@')[0]);
        // ── Portal assignment ────────────────────────────────────────────────
        // Teachers (and staff assigned to the teacher portal) are redirected to the
        // teacher portal with an SSO token — no second login. Admin-only staff stay.
        const portalAccess = (staffInfo?.portalAccess || 'both').toLowerCase();
        const isTeacher = !!staffInfo && (/teacher/i.test(String(staffInfo.designation || '')) || role === 'teacher'
            || (Array.isArray(staffInfo.roles) && staffInfo.roles.some((r) => /teacher/i.test(r)))
            || staffInfo.isTeachingStaff === true
            || (Array.isArray(staffInfo.subjectAssignments) && staffInfo.subjectAssignments.length > 0)
            || (Array.isArray(staffInfo.specializedSubjects) && staffInfo.specializedSubjects.length > 0));
        if (staffInfo && (portalAccess === 'staff' || (isTeacher && portalAccess !== 'admin'))) {
            const sub = (subdomain || req.tenantContext?.tenantSubdomain || '').toLowerCase();
            const staffToken = jsonwebtoken_1.default.sign({ staffId: staffInfo._id.toString(), username: staffInfo.portalUsername, role: staffInfo.role || 'teacher', name: staffInfo.employeeName || userName }, process.env.JWT_SECRET || 'shulecloud_student_secret_2024', { expiresIn: '7d' });
            return res.json({
                redirectPortal: 'staff',
                subdomain: sub,
                sso: {
                    token: staffToken,
                    staff: { _id: staffInfo._id.toString(), name: staffInfo.employeeName || userName, designation: staffInfo.designation, email: staffInfo.email, phone: staffInfo.phone },
                },
            });
        }
        const token = jsonwebtoken_1.default.sign({ sub: user._id.toString(), email: user.email, tenantId, role, name: userName }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        return res.json({
            access_token: token,
            user: { id: user._id.toString(), email: user.email, name: userName, role, staffId: staffInfo?._id?.toString() || null, portalAccess }
        });
    }
    catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json({ message: 'Login failed' });
    }
};
exports.login = login;
const getTenantProfile = async (req, res) => {
    const tenantId = req.tenantContext?.tenantId;
    if (!tenantId)
        return res.status(400).json({ message: 'Tenant context missing' });
    try {
        const tenant = await (0, mongodb_1.getMetaDb)().collection('Tenant').findOne({ _id: new mongodb_2.ObjectId(tenantId) });
        if (!tenant)
            return res.status(404).json({ message: 'Tenant not found' });
        res.json(tenant);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getTenantProfile = getTenantProfile;
const updateTenantProfile = async (req, res) => {
    const tenantId = req.tenantContext?.tenantId;
    if (!tenantId)
        return res.status(400).json({ message: 'Tenant context missing' });
    try {
        const data = { ...req.body, updatedAt: new Date() };
        delete data._id;
        delete data.subdomain;
        const result = await (0, mongodb_1.getMetaDb)().collection('Tenant').updateOne({ _id: new mongodb_2.ObjectId(tenantId) }, { $set: data });
        if (result.matchedCount === 0)
            return res.status(404).json({ message: 'Tenant not found' });
        res.json({ message: 'Profile updated successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateTenantProfile = updateTenantProfile;
const updateUser = async (req, res) => {
    const tenantId = req.tenantContext?.tenantId;
    if (!tenantId)
        return res.status(400).json({ message: 'Tenant context missing' });
    try {
        const { id } = req.params;
        const { email, password } = req.body;
        const updateData = { updatedAt: new Date() };
        if (email)
            updateData.email = email;
        if (password)
            updateData.passwordHash = await bcrypt_1.default.hash(password, 10);
        const result = await (0, mongodb_1.getMetaDb)().collection('User').updateOne({ _id: new mongodb_2.ObjectId(id), tenantId: new mongodb_2.ObjectId(tenantId) }, { $set: updateData });
        if (result.matchedCount === 0)
            return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User updated successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    const tenantId = req.tenantContext?.tenantId;
    if (!tenantId)
        return res.status(400).json({ message: 'Tenant context missing' });
    try {
        const { id } = req.params;
        const result = await (0, mongodb_1.getMetaDb)().collection('User').deleteOne({
            _id: new mongodb_2.ObjectId(id),
            tenantId: new mongodb_2.ObjectId(tenantId)
        });
        if (result.deletedCount === 0)
            return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteUser = deleteUser;
