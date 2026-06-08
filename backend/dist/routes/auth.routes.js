"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const mongodb_1 = require("../lib/mongodb");
const mongodb_2 = require("mongodb");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
// Institution data (staff / students) lives in the tenant's isolated database.
// User / Tenant records always live in the meta database.
const getInstDb = (req) => req.tenantDb || (0, mongodb_1.getMetaDb)();
router.post('/login', auth_controller_1.login);
// ─── Student Portal Login ─────────────────────────────────────────────────────
router.post('/student-login', async (req, res) => {
    try {
        const db = getInstDb(req);
        const { username, password } = req.body;
        if (!username || !password)
            return res.status(400).json({ message: 'Username and password are required' });
        const student = await db.collection('students').findOne({ portalUsername: username });
        if (!student || student.portalPassword !== password) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        const secret = process.env.JWT_SECRET || 'shulecloud_student_secret_2024';
        const token = jsonwebtoken_1.default.sign({ studentId: student._id.toString(), username: student.portalUsername, role: 'student', name: student.studentName }, secret, { expiresIn: '7d' });
        res.json({
            token,
            student: {
                _id: student._id,
                name: student.studentName,
                registrationNo: student.registrationNo || student.admNo,
                class: student.studentClass || student.currentClass,
                portalUsername: student.portalUsername,
                gender: student.gender,
                photo: student.studentPhoto || null,
            },
        });
    }
    catch (e) {
        console.error('[Auth] student-login error:', e);
        res.status(500).json({ message: e.message });
    }
});
// ─── Username uniqueness check ─────────────────────────────────────────────────
// With DB-per-tenant isolation, we simply check within the institution's own DB.
router.get('/check-username', async (req, res) => {
    try {
        const db = getInstDb(req);
        const { username, excludeId, excludeType } = req.query;
        if (!username || typeof username !== 'string' || username.trim().length < 2) {
            return res.status(400).json({ available: false, message: 'Username too short' });
        }
        const u = username.trim();
        const toExclude = (t) => excludeType === t && excludeId ? { _id: { $ne: new mongodb_2.ObjectId(excludeId) } } : {};
        const [staffConflict, studentConflict, parentConflict] = await Promise.all([
            db.collection('staff').findOne({ portalUsername: u, ...toExclude('staff') }),
            db.collection('students').findOne({ portalUsername: u, ...toExclude('student') }),
            db.collection('students').findOne({ parentPortalUsername: u, ...toExclude('parent') }),
        ]);
        if (staffConflict)
            return res.json({ available: false, takenBy: 'staff', message: 'Username already used by a staff member' });
        if (studentConflict)
            return res.json({ available: false, takenBy: 'student', message: 'Username already used by a student' });
        if (parentConflict)
            return res.json({ available: false, takenBy: 'parent', message: 'Username already used by a parent' });
        res.json({ available: true, message: 'Username is available' });
    }
    catch (e) {
        res.status(500).json({ available: false, message: e.message });
    }
});
// ─── Universal Smart Login (subdomain-strict) ─────────────────────────────────
// Rules:
//   1. A user account created for School A can ONLY log in via School A's subdomain.
//   2. Attempting to log in via School B's subdomain with School A credentials → 403.
//   3. The subdomain passed in the request body (or detected from the hostname header)
//      is the authoritative source of truth — no cross-tenant fallback.
// NOTE: This route is excluded from tenancy middleware (publicPrefixes).
router.post('/smart-login', async (req, res) => {
    try {
        const metaDb = (0, mongodb_1.getMetaDb)();
        const { username, password, subdomain } = req.body;
        if (!username || !password)
            return res.status(400).json({ message: 'Username/email and password are required' });
        const secret = process.env.JWT_SECRET || 'shulecloud_student_secret_2024';
        const adminSecret = process.env.JWT_SECRET || 'secret';
        // ── Resolve the target school (tenant) ────────────────────────────────
        let resolvedTenantId = null;
        let resolvedTenantSubdomain = '';
        let resolvedTenantName = '';
        let tenantInstDb = metaDb;
        let isSubdomainExplicit = false; // true when subdomain was given by caller
        const loadTenant = (t) => {
            resolvedTenantId = t._id.toString();
            resolvedTenantSubdomain = t.subdomain;
            resolvedTenantName = t.name || t.subdomain;
            const dbName = t.databaseName || (0, mongodb_1.subdomainToDbName)(t.subdomain);
            tenantInstDb = (0, mongodb_1.getTenantDb)(dbName);
        };
        if (subdomain) {
            const t = await metaDb.collection('Tenant').findOne({ subdomain: subdomain.toLowerCase() });
            if (t) {
                loadTenant(t);
                isSubdomainExplicit = true;
            }
        }
        // Dev / bare-localhost fallback — only when no subdomain was provided
        if (!resolvedTenantId) {
            const t = await metaDb.collection('Tenant').findOne({ status: 'active' });
            if (t)
                loadTenant(t);
        }
        // ── HELPER: check if a credential belongs to a different school ───────
        // Returns the tenant name if the account is found but tied to a different school, else null.
        const findUserTenantMismatch = async () => {
            if (!isSubdomainExplicit || !resolvedTenantId)
                return null;
            if (username.includes('@')) {
                const anyUser = await metaDb.collection('User').findOne({ email: username });
                if (!anyUser)
                    return null;
                const utid = anyUser.tenantId?.toString();
                if (utid && utid !== resolvedTenantId) {
                    const otherTenant = await metaDb.collection('Tenant').findOne({ _id: new mongodb_2.ObjectId(utid) });
                    return otherTenant?.name || 'another school';
                }
            }
            return null;
        };
        // ── 1. Admin / Teacher email login (User collection in meta db) ───────
        if (username.includes('@')) {
            // STRICT: only look up this user for the CURRENT tenant
            let user = null;
            if (resolvedTenantId) {
                user = await metaDb.collection('User').findOne({ email: username, tenantId: new mongodb_2.ObjectId(resolvedTenantId) })
                    || await metaDb.collection('User').findOne({ email: username, tenantId: resolvedTenantId });
            }
            // If not found for this tenant — check if they're registered at another school
            if (!user && isSubdomainExplicit) {
                const mismatch = await findUserTenantMismatch();
                if (mismatch) {
                    return res.status(403).json({
                        message: `This email is registered with "${mismatch}", not with "${resolvedTenantName}". Please use your school's correct login URL.`,
                        code: 'CROSS_TENANT_BLOCKED',
                    });
                }
                // email genuinely doesn't exist anywhere → let it fall through to username checks
            }
            // Last resort dev fallback (no explicit subdomain): find by email alone
            if (!user && !isSubdomainExplicit) {
                user = await metaDb.collection('User').findOne({ email: username });
                // If found but in a different tenant than our resolved one, use their actual tenant
                if (user?.tenantId) {
                    const actualTenant = await metaDb.collection('Tenant').findOne({ _id: new mongodb_2.ObjectId(user.tenantId.toString()) });
                    if (actualTenant)
                        loadTenant(actualTenant);
                }
            }
            if (user) {
                const passwordMatch = await require('bcrypt').compare(password, user.passwordHash).catch(() => false);
                if (!passwordMatch)
                    return res.status(401).json({ message: 'Invalid credentials.' });
                let role = (user.role || 'school_admin').toLowerCase();
                const effectiveTenantId = resolvedTenantId || user.tenantId?.toString() || null;
                let staffInfo = null;
                try {
                    staffInfo = await tenantInstDb.collection('staff').findOne({ email: username });
                    if (staffInfo) {
                        const d = (staffInfo.designation || '').toLowerCase();
                        if (d.includes('teacher') || staffInfo.isTeachingStaff)
                            role = 'teacher';
                    }
                }
                catch (_) { }
                const name = user.name
                    || (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null)
                    || staffInfo?.employeeName || username.split('@')[0];
                const token = jsonwebtoken_1.default.sign({ sub: user._id.toString(), email: username, tenantId: effectiveTenantId, tenantSubdomain: resolvedTenantSubdomain, role, name }, adminSecret, { expiresIn: '7d' });
                return res.json({
                    token, access_token: token,
                    tenantSubdomain: resolvedTenantSubdomain,
                    user_type: role.includes('teacher') ? 'teacher' : 'admin',
                    user: { id: user._id.toString(), email: username, name, role, staffId: staffInfo?._id?.toString() || null },
                    redirect: '/dashboard',
                });
            }
        }
        // ── 2. Staff Portal login — strictly within this school's database ──────
        // Staff records are already isolated in tenantInstDb, so no cross-tenant
        // leakage is possible here. If the username doesn't exist in this school,
        // the login simply fails — we do NOT search other schools' databases.
        const staffMatch = await tenantInstDb.collection('staff').findOne({ portalUsername: username });
        if (staffMatch && staffMatch.portalPassword === password) {
            const rawDesignation = staffMatch.designation || 'staff';
            const role = rawDesignation.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
            const userType = role.includes('teacher') ? 'teacher' : 'staff';
            const name = staffMatch.employeeName || staffMatch.name || username;
            const token = jsonwebtoken_1.default.sign({ staffId: staffMatch._id.toString(), username, role, name, tenantId: resolvedTenantId, tenantSubdomain: resolvedTenantSubdomain }, secret, { expiresIn: '7d' });
            return res.json({
                token, access_token: token,
                tenantSubdomain: resolvedTenantSubdomain,
                user_type: userType,
                user: { id: staffMatch._id.toString(), name, role, email: staffMatch.email || '', tenantId: resolvedTenantId },
                redirect: '/dashboard',
            });
        }
        // ── 3. Try Student Portal login (in institution's own database) ──
        const studentMatch = await tenantInstDb.collection('students').findOne({ portalUsername: username });
        if (studentMatch && studentMatch.portalPassword === password) {
            const name = studentMatch.studentName || `${studentMatch.firstName || ''} ${studentMatch.lastName || ''}`.trim();
            const token = jsonwebtoken_1.default.sign({ studentId: studentMatch._id.toString(), username, role: 'student', name, tenantId: resolvedTenantId, tenantSubdomain: resolvedTenantSubdomain }, secret, { expiresIn: '7d' });
            return res.json({
                token, access_token: token,
                tenantSubdomain: resolvedTenantSubdomain,
                user_type: 'student',
                user: { id: studentMatch._id.toString(), name, role: 'student', registrationNo: studentMatch.registrationNo, class: studentMatch.studentClass, portalUsername: username, tenantId: resolvedTenantId },
                redirect: '/student-portal/dashboard',
            });
        }
        // ── 4. Try Parent login (in institution's own database) ──
        const parentMatch = await tenantInstDb.collection('students').findOne({
            $or: [
                { parentPortalUsername: username },
                { parentPhone: username },
                { phone: username },
            ]
        });
        if (parentMatch) {
            const storedPass = parentMatch.parentPortalPassword;
            const defaultPass = `parent@${(parentMatch.parentPhone || parentMatch.phone || '0000').slice(-4)}`;
            if (password === (storedPass || defaultPass)) {
                const parentName = parentMatch.fatherName || parentMatch.motherName || parentMatch.parentName || 'Parent';
                const token = jsonwebtoken_1.default.sign({ role: 'parent', studentId: parentMatch._id.toString(), studentName: parentMatch.studentName, parentName, username, tenantId: resolvedTenantId, tenantSubdomain: resolvedTenantSubdomain }, secret, { expiresIn: '7d' });
                return res.json({
                    token, access_token: token,
                    tenantSubdomain: resolvedTenantSubdomain,
                    user_type: 'parent',
                    parent: { name: parentName, username, student: { _id: parentMatch._id, name: parentMatch.studentName, class: parentMatch.studentClass, registrationNo: parentMatch.registrationNo }, tenantId: resolvedTenantId },
                    redirect: '/parent-portal/dashboard',
                });
            }
        }
        return res.status(401).json({ message: 'Invalid username/email or password. Check your credentials and try again.' });
    }
    catch (e) {
        console.error('[SmartLogin] error:', e);
        res.status(500).json({ message: 'Login failed. Please try again.' });
    }
});
// ─── Current user's role permissions ─────────────────────────────────────────
router.get('/my-permissions', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return res.status(401).json({ message: 'No token' });
        const token = authHeader.split(' ')[1];
        let userRole = 'school_admin';
        let userId = '';
        try {
            const secret = process.env.JWT_SECRET || 'secret';
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            userId = decoded.sub || decoded.userId || decoded.staffId || '';
            if (decoded.role) {
                userRole = decoded.role.toLowerCase();
            }
            else if (decoded.staffId) {
                const staff = await db.collection('staff').findOne({ _id: new mongodb_2.ObjectId(decoded.staffId) });
                const designation = staff?.designation || staff?.role || 'teacher';
                userRole = designation.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
            }
        }
        catch (_) { }
        // ── Full admin → return wildcard immediately ──────────────────────────
        if (userRole === 'school_admin' || userRole === 'super_admin') {
            return res.json({ role: userRole, userId, modules: ['*'], crud: {} });
        }
        // ── Load the permissions matrix from the tenant DB ────────────────────
        const saved = await db.collection('role_permissions').findOne({});
        const permMatrix = saved?.permissions || {};
        // Resolution order:
        // 1. Exact key match (e.g. "head_teacher")
        // 2. Name match via roles collection (e.g. "Head Teacher" → "head_teacher")
        // 3. Slug-based fallback variants
        let resolvedModules = null;
        // 1. Exact match
        if (permMatrix[userRole]) {
            resolvedModules = permMatrix[userRole];
        }
        // 2. Look up the roles collection to find the right key
        if (!resolvedModules) {
            const roleDoc = await db.collection('roles').findOne({
                $or: [
                    { key: userRole },
                    { name: { $regex: new RegExp(`^${userRole.replace(/_/g, '[_ ]')}$`, 'i') } },
                ]
            });
            if (roleDoc?.key && permMatrix[roleDoc.key]) {
                resolvedModules = permMatrix[roleDoc.key];
            }
        }
        // 3. Slug partial fallback — try common role families
        if (!resolvedModules) {
            const familyMap = {
                teacher: ['teacher', 'instructor', 'educator', 'seniour_teacher', 'class_teacher'],
                accountant: ['accountant', 'bursar', 'finance', 'accounts'],
                principal: ['principal', 'headmaster', 'head_teacher', 'deputy_principal'],
                librarian: ['librarian', 'library'],
                transport_manager: ['transport', 'driver', 'bus'],
                hostel_warden: ['warden', 'hostel', 'dormitory'],
            };
            for (const [familyKey, variants] of Object.entries(familyMap)) {
                if (variants.some(v => userRole.includes(v))) {
                    resolvedModules = permMatrix[familyKey] || null;
                    if (resolvedModules)
                        break;
                }
            }
        }
        // 4. Absolute fallback — dashboard only
        if (!resolvedModules) {
            resolvedModules = ['dashboard'];
        }
        res.json({ role: userRole, userId, modules: resolvedModules, crud: saved?.crudPermissions?.[userRole] || {} });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ─── Staff / Teacher Portal Login ────────────────────────────────────────────
router.post('/staff-login', async (req, res) => {
    try {
        const db = getInstDb(req);
        const { username, password } = req.body;
        if (!username || !password)
            return res.status(400).json({ message: 'Username and password are required' });
        const staff = await db.collection('staff').findOne({ portalUsername: username });
        if (!staff || staff.portalPassword !== password)
            return res.status(401).json({ message: 'Invalid username or password' });
        const secret = process.env.JWT_SECRET || 'shulecloud_student_secret_2024';
        const token = jsonwebtoken_1.default.sign({ staffId: staff._id.toString(), username: staff.portalUsername, role: staff.role || 'teacher', name: staff.employeeName || staff.name }, secret, { expiresIn: '7d' });
        res.json({
            token,
            staff: {
                _id: staff._id,
                name: staff.employeeName || staff.name,
                designation: staff.designation || 'Teacher',
                portalUsername: staff.portalUsername,
                email: staff.email,
                phone: staff.phone,
            }
        });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.get('/staff-portal/me', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return res.status(401).json({ message: 'No token' });
        const decoded = jsonwebtoken_1.default.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'shulecloud_student_secret_2024');
        const staff = await db.collection('staff').findOne({ _id: new mongodb_2.ObjectId(decoded.staffId) });
        if (!staff)
            return res.status(404).json({ message: 'Staff not found' });
        res.json(staff);
    }
    catch (e) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});
router.get('/staff-portal/live-meetings', async (req, res) => {
    try {
        const db = getInstDb(req);
        const meetings = await db.collection('live_meetings').find({ status: 'active' }).sort({ createdAt: -1 }).toArray();
        res.json(meetings);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.get('/staff-portal/announcements', async (req, res) => {
    try {
        const db = getInstDb(req);
        const items = await db.collection('announcements').find({
            $or: [{ audience: 'All' }, { audience: 'Staff' }, { audience: 'Teachers' }]
        }).sort({ createdAt: -1 }).limit(10).toArray();
        res.json(items);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ─── Parent Portal Login ──────────────────────────────────────────────────────
router.post('/parent-login', async (req, res) => {
    try {
        const db = getInstDb(req);
        const { username, password, phone } = req.body;
        const loginId = username || phone;
        if (!loginId)
            return res.status(400).json({ message: 'Username or phone number is required' });
        if (!password)
            return res.status(400).json({ message: 'Password is required' });
        const student = await db.collection('students').findOne({
            $or: [{ parentPortalUsername: loginId }, { parentPhone: loginId }, { phone: loginId }]
        });
        if (!student)
            return res.status(401).json({ message: 'Invalid username or password' });
        const storedPass = student.parentPortalPassword;
        const defaultPass = `parent@${(student.parentPhone || student.phone || '0000').slice(-4)}`;
        if (password !== (storedPass || defaultPass))
            return res.status(401).json({ message: 'Invalid username or password' });
        const parentName = student.fatherName || student.motherName || student.parentName || student.guardianName || 'Parent';
        const secret = process.env.JWT_SECRET || 'shulecloud_student_secret_2024';
        const token = jsonwebtoken_1.default.sign({ role: 'parent', studentId: student._id.toString(), studentName: student.studentName, parentName, username: loginId }, secret, { expiresIn: '7d' });
        res.json({
            token,
            parent: {
                name: parentName,
                username: student.parentPortalUsername || loginId,
                phone: student.parentPhone || student.phone,
                student: {
                    _id: student._id,
                    name: student.studentName,
                    class: student.studentClass || student.currentClass,
                    registrationNo: student.registrationNo,
                    admissionNo: student.admNo || student.registrationNo,
                }
            }
        });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.get('/parent-portal/student', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return res.status(401).json({ message: 'No token' });
        const decoded = jsonwebtoken_1.default.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'shulecloud_student_secret_2024');
        const student = await db.collection('students').findOne({ _id: new mongodb_2.ObjectId(decoded.studentId) });
        if (!student)
            return res.status(404).json({ message: 'Student not found' });
        res.json(student);
    }
    catch (e) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});
// ─── Student Portal: profile & data ──────────────────────────────────────────
router.get('/student-portal/me', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return res.status(401).json({ message: 'No token' });
        const decoded = jsonwebtoken_1.default.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'shulecloud_student_secret_2024');
        const student = await db.collection('students').findOne({ _id: new mongodb_2.ObjectId(decoded.studentId) });
        if (!student)
            return res.status(404).json({ message: 'Student not found' });
        res.json(student);
    }
    catch (e) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});
router.get('/student-portal/marks', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return res.status(401).json({ message: 'No token' });
        const decoded = jsonwebtoken_1.default.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'shulecloud_student_secret_2024');
        const marks = await db.collection('exam_marks').find({ studentId: decoded.studentId }).toArray();
        res.json(marks);
    }
    catch (e) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});
router.get('/student-portal/assignments', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return res.status(401).json({ message: 'No token' });
        jsonwebtoken_1.default.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'shulecloud_student_secret_2024');
        const assignments = await db.collection('academic_assignments').find({ status: 'Published' }).toArray();
        res.json(assignments);
    }
    catch (e) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});
router.get('/student-portal/exam-results', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return res.status(401).json({ message: 'No token' });
        const decoded = jsonwebtoken_1.default.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'shulecloud_student_secret_2024');
        const marks = await db.collection('exam_marks').find({ studentId: decoded.studentId }).toArray();
        const exams = await db.collection('exams').find({}).toArray();
        const examMap = {};
        exams.forEach((e) => { examMap[e._id.toString()] = e; });
        const grouped = {};
        marks.forEach((m) => {
            const examId = m.examId?.toString() || 'unknown';
            const exam = examMap[examId] || {};
            if (!grouped[examId]) {
                grouped[examId] = {
                    examId,
                    examName: m.examName || exam.name || exam.type || 'Exam',
                    term: m.term || exam.term || '',
                    academicYear: exam.academicYear || '',
                    subjects: [], totalMarks: 0, totalOutOf: 0,
                };
            }
            const marks_obtained = Number(m.marksObtained || 0);
            const out_of = Number(m.totalMarks || 100);
            grouped[examId].subjects.push({ name: m.subjectName || '—', marks: marks_obtained, outOf: out_of, grade: m.grade || '', points: m.gradePoints || 0 });
            grouped[examId].totalMarks += marks_obtained;
            grouped[examId].totalOutOf += out_of;
        });
        const results = Object.values(grouped).map((g) => ({
            ...g, average: g.totalOutOf > 0 ? (g.totalMarks / g.totalOutOf) * 100 : 0,
        })).sort((a, b) => b.examName.localeCompare(a.examName));
        res.json(results);
    }
    catch (e) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});
router.get('/student-portal/fee-invoices', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return res.status(401).json({ message: 'No token' });
        const decoded = jsonwebtoken_1.default.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'shulecloud_student_secret_2024');
        const student = await db.collection('students').findOne({ _id: new mongodb_2.ObjectId(decoded.studentId) });
        if (!student)
            return res.status(404).json({ message: 'Student not found' });
        const invoices = await db.collection('invoices').find({
            $or: [
                { studentId: decoded.studentId },
                { student_id: decoded.studentId },
                { registrationNo: student.registrationNo || student.admNo },
            ]
        }).sort({ createdAt: -1 }).toArray();
        res.json(invoices);
    }
    catch (e) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
});
router.post('/student-portal/pay-invoice', async (req, res) => {
    try {
        const db = getInstDb(req);
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return res.status(401).json({ message: 'No token' });
        const decoded = jsonwebtoken_1.default.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'shulecloud_student_secret_2024');
        const { invoiceId, invoiceNo, amount, method, reference, phone, notes } = req.body;
        if (!amount || Number(amount) <= 0)
            return res.status(400).json({ message: 'Valid amount is required' });
        const payment = {
            invoiceId, invoiceNo,
            studentId: decoded.studentId, studentName: decoded.name,
            amount: Number(amount), method: method || 'MPESA',
            reference: reference || '', phone: phone || '', notes: notes || '',
            status: 'Pending', submittedAt: new Date(),
        };
        const result = await db.collection('student_payment_requests').insertOne(payment);
        if (reference && invoiceId) {
            try {
                const inv = await db.collection('invoices').findOne({ _id: new mongodb_2.ObjectId(invoiceId) });
                if (inv) {
                    const newPaid = (Number(inv.paid_amount || inv.amount_paid || 0)) + Number(amount);
                    const newBal = Math.max(0, (Number(inv.total_due || inv.amount || 0)) - newPaid);
                    await db.collection('invoices').updateOne({ _id: new mongodb_2.ObjectId(invoiceId) }, { $set: { paid_amount: newPaid, balance: newBal, status: newBal <= 0 ? 'PAID' : 'PARTIAL', updatedAt: new Date() } });
                }
            }
            catch (_) { }
        }
        res.status(201).json({ id: result.insertedId, message: 'Payment request submitted successfully', status: 'Pending' });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.get('/student-portal/live-meetings', async (req, res) => {
    try {
        const db = getInstDb(req);
        const meetings = await db.collection('live_meetings').find({ status: 'active' }).sort({ createdAt: -1 }).limit(20).toArray();
        res.json(meetings);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.get('/student-portal/announcements', async (req, res) => {
    try {
        const db = getInstDb(req);
        const announcements = await db.collection('announcements').find({
            $or: [{ audience: 'All' }, { audience: 'Students' }]
        }).sort({ createdAt: -1 }).limit(10).toArray();
        res.json(announcements);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
router.get('/tenant/profile', auth_controller_1.getTenantProfile);
router.patch('/tenant/profile', auth_controller_1.updateTenantProfile);
router.patch('/tenant/user/:id', auth_controller_1.updateUser);
router.delete('/tenant/user/:id', auth_controller_1.deleteUser);
exports.default = router;
