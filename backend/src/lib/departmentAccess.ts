/**
 * Department access control.
 *
 * A Department Head (HOD) may only act on departments they head (or are an
 * assistant of, or an explicit member of with a managing role). Organization /
 * school administrators and principals may act on every department.
 *
 * Branch isolation is handled one level up by the tenancy layer: each branch is
 * its own database, so a request already only ever sees ONE branch's departments.
 * This module therefore scopes WITHIN a tenant DB, by department.
 *
 * The functions read the authenticated user from req.tenantContext.user
 * ({ staffId, role, name }) — populated server-side from the verified JWT — so a
 * client can never widen its own access by tampering with request params.
 */
import { Db, ObjectId } from 'mongodb';
import type { Request, Response, NextFunction } from 'express';

const ADMIN_ROLES = new Set([
    'super_admin', 'school_admin', 'admin', 'principal', 'deputy_principal',
    'academic_director', 'super admin', 'school admin',
]);

// Roles inside a department that may MANAGE it (beyond just being a member).
const MANAGING_DEPT_ROLES = /head|hod|deputy head|assistant/i;

export interface DeptAccess {
    isAdmin: boolean;
    staffId: string | null;
    /** Department _id strings the user may access. Empty + !isAdmin ⇒ none. */
    departmentIds: string[];
    /** Quick membership test. Admins always return true. */
    can: (departmentId: string) => boolean;
}

const roleOf = (req: Request) => String((req as any).tenantContext?.user?.role || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
const staffIdOf = (req: Request) => { const s = (req as any).tenantContext?.user?.staffId; return s ? String(s) : null; };

/**
 * Resolve the set of departments the current request's user may access.
 */
export async function resolveDeptAccess(req: Request, db: Db): Promise<DeptAccess> {
    const role = roleOf(req);
    const staffId = staffIdOf(req);

    if (!staffId || ADMIN_ROLES.has(role)) {
        return { isAdmin: true, staffId, departmentIds: [], can: () => true };
    }

    // Departments this staff heads (departments.headOfDepartment) or manages via a
    // membership row with a managing role.
    const [headed, memberships] = await Promise.all([
        db.collection('departments').find({ headOfDepartment: staffId }, { projection: { _id: 1 } }).toArray().catch(() => []),
        db.collection('department_members').find({ staffId }).toArray().catch(() => []),
    ]);
    const ids = new Set<string>();
    headed.forEach((d: any) => ids.add(String(d._id)));
    memberships.forEach((m: any) => {
        if (m.isHead || MANAGING_DEPT_ROLES.test(String(m.role || ''))) ids.add(String(m.departmentId));
    });

    const departmentIds = [...ids];
    const idSet = new Set(departmentIds);
    return {
        isAdmin: false,
        staffId,
        departmentIds,
        can: (departmentId: string) => idSet.has(String(departmentId)),
    };
}

/**
 * Express middleware: require that the user may access the :id department (or a
 * departmentId in the body/query). Admins pass. Fails closed with 403.
 *
 * Pass the param/field name that carries the department id (defaults to 'id').
 */
export const requireDeptAccess = (source: 'param' | 'body' | 'query' = 'param', key = 'id') =>
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const db: Db = (req as any).tenantDb;
            if (!db) return res.status(400).json({ message: 'No tenant context' });
            const access = await resolveDeptAccess(req, db);
            if (access.isAdmin) { (req as any).deptAccess = access; return next(); }

            const deptId = source === 'param' ? req.params[key]
                : source === 'body' ? (req.body || {})[key]
                    : (req.query || {})[key];
            if (!deptId) return res.status(400).json({ message: `Missing ${key}` });
            if (!access.can(String(deptId))) {
                return res.status(403).json({ message: 'You do not have access to this department.' });
            }
            (req as any).deptAccess = access;
            next();
        } catch {
            res.status(403).json({ message: 'Department permission check failed' });
        }
    };

/**
 * Express middleware: allow ONLY organization/school administrators (and
 * principals). Used to protect actions an HOD must never perform — e.g.
 * (re)assigning a department head. Department heads are blocked with 403.
 */
export const requireAdmin = () =>
    async (req: Request, res: Response, next: NextFunction) => {
        const role = roleOf(req);
        if (!role || ADMIN_ROLES.has(role)) return next();
        return res.status(403).json({ message: 'Only an administrator can perform this action.' });
    };

/** Convenience: does the department own this subject (case-insensitive name match)? */
export async function departmentOwnsSubject(db: Db, departmentId: string, subjectName: string): Promise<boolean> {
    const id = (() => { try { return new ObjectId(departmentId); } catch { return null; } })();
    if (!id) return false;
    const dep: any = await db.collection('departments').findOne({ _id: id }).catch(() => null);
    if (!dep || !Array.isArray(dep.subjects)) return false;
    const want = String(subjectName || '').toLowerCase().replace(/\s+/g, ' ').trim();
    return dep.subjects.some((s: string) => String(s).toLowerCase().replace(/\s+/g, ' ').trim() === want);
}
