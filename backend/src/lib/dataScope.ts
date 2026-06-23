/**
 * Data Access Control — student & staff scoping.
 *
 * The Super Administrator can limit, per user, which students and staff that user
 * may see anywhere in the system. The scope lives on the staff record:
 *
 *   staff.dataAccess = {
 *     studentScope: 'all' | 'classes' | 'streams' | 'students' | 'none',
 *     classIds:   string[],   // class _id or name (we match either)
 *     streamIds:  string[],   // stream _id or name
 *     studentIds: string[],   // student _id
 *     staffScope:  'all' | 'direct' | 'tree' | 'departments' | 'roles' | 'staff' | 'none',
 *     departments: string[],
 *     roles:       string[],
 *     staffIds:    string[],
 *   }
 *
 * resolveScope() returns Mongo filter fragments that callers merge into their
 * queries. The filters are computed SERVER-SIDE from the authenticated user, so a
 * client can never widen its own access by tampering with params.
 *
 * Admins (no staffId, or role super_admin/school_admin/admin/principal) get an
 * empty filter = full access.
 */
import { Db, ObjectId } from 'mongodb';
import type { Request } from 'express';

export interface DataAccess {
    studentScope?: 'all' | 'classes' | 'streams' | 'students' | 'none';
    classIds?: string[];
    streamIds?: string[];
    studentIds?: string[];
    staffScope?: 'all' | 'direct' | 'tree' | 'departments' | 'roles' | 'staff' | 'none';
    departments?: string[];
    roles?: string[];
    staffIds?: string[];
    reportingScope?: 'direct' | 'tree';
}

export interface ScopeResult {
    isAdmin: boolean;
    staffId: string | null;
    studentFilter: any;   // {} = all
    staffFilter: any;     // {} = all
}

const ADMIN_ROLES = ['super_admin', 'school_admin', 'admin', 'principal', 'super admin', 'school admin'];

function asOr(fields: string[], values: any[]): any {
    const ors: any[] = [];
    for (const f of fields) ors.push({ [f]: { $in: values } });
    return ors.length === 1 ? ors[0] : { $or: ors };
}

/** Build the set of staffIds visible under a reporting scope (direct or full tree). */
async function reportingTreeIds(db: Db, rootStaffId: string, full: boolean): Promise<string[]> {
    const all = await db.collection('staff').find({ deletedAt: { $exists: false } }, { projection: { reportsTo: 1 } }).toArray().catch(() => []);
    // child map: supervisorId -> [staffId]
    const children = new Map<string, string[]>();
    for (const s of all) {
        const sup = s.reportsTo ? String(s.reportsTo) : '';
        if (!sup) continue;
        if (!children.has(sup)) children.set(sup, []);
        children.get(sup)!.push(String(s._id));
    }
    const direct = children.get(rootStaffId) || [];
    if (!full) return direct;
    // BFS the whole subtree.
    const seen = new Set<string>();
    const queue = [...direct];
    while (queue.length) {
        const id = queue.shift()!;
        if (seen.has(id)) continue;
        seen.add(id);
        for (const c of children.get(id) || []) if (!seen.has(c)) queue.push(c);
    }
    return [...seen];
}

/**
 * Resolve the current request's data-access scope. Reads the authenticated staff
 * member (from tenantContext.user) and their dataAccess settings.
 */
export async function resolveScope(req: Request, db: Db): Promise<ScopeResult> {
    const ctxUser = (req as any).tenantContext?.user || null;
    const role = String(ctxUser?.role || '').toLowerCase();
    const staffId: string | null = ctxUser?.staffId ? String(ctxUser.staffId) : null;

    // No staff identity (pure admin login) or an admin role → full access.
    if (!staffId || ADMIN_ROLES.includes(role)) {
        return { isAdmin: true, staffId, studentFilter: {}, staffFilter: {} };
    }

    let staff: any = null;
    try { staff = await db.collection('staff').findOne({ _id: new ObjectId(staffId) }); } catch { /* */ }
    const da: DataAccess = (staff?.dataAccess as DataAccess) || {};

    // ── Student filter ──────────────────────────────────────────────────────────
    let studentFilter: any = {};
    switch (da.studentScope) {
        case undefined:
        case 'all':
            studentFilter = {}; break;
        case 'none':
            studentFilter = { _id: { $exists: false } }; break;  // match nothing
        case 'classes': {
            const vals = (da.classIds || []);
            studentFilter = vals.length ? asOr(['classId', 'className', 'currentClass', 'studentClass', 'levelName'], vals) : { _id: { $exists: false } };
            break;
        }
        case 'streams': {
            const vals = (da.streamIds || []);
            studentFilter = vals.length ? asOr(['streamId', 'streamName', 'stream'], vals) : { _id: { $exists: false } };
            break;
        }
        case 'students': {
            const ids = (da.studentIds || []).map(s => { try { return new ObjectId(s); } catch { return s; } });
            studentFilter = ids.length ? { _id: { $in: ids } } : { _id: { $exists: false } };
            break;
        }
        default:
            studentFilter = {};
    }

    // ── Staff filter ────────────────────────────────────────────────────────────
    let staffFilter: any = {};
    const includeSelf = true; // a user can always see their own staff record
    switch (da.staffScope) {
        case undefined:
        case 'all':
            staffFilter = {}; break;
        case 'none':
            staffFilter = { _id: { $exists: false } }; break;
        case 'direct':
        case 'tree': {
            const ids = await reportingTreeIds(db, staffId, da.staffScope === 'tree');
            const objIds = ids.map(id => { try { return new ObjectId(id); } catch { return id; } });
            if (includeSelf) { try { objIds.push(new ObjectId(staffId)); } catch { /* */ } }
            staffFilter = { _id: { $in: objIds } };
            break;
        }
        case 'departments': {
            const vals = da.departments || [];
            staffFilter = vals.length ? { department: { $in: vals } } : { _id: { $exists: false } };
            break;
        }
        case 'roles': {
            const vals = da.roles || [];
            staffFilter = vals.length ? asOr(['designation', 'role'], vals) : { _id: { $exists: false } };
            break;
        }
        case 'staff': {
            const ids = (da.staffIds || []).map(s => { try { return new ObjectId(s); } catch { return s; } });
            if (includeSelf) { try { ids.push(new ObjectId(staffId)); } catch { /* */ } }
            staffFilter = ids.length ? { _id: { $in: ids } } : { _id: { $exists: false } };
            break;
        }
        default:
            staffFilter = {};
    }

    return { isAdmin: false, staffId, studentFilter, staffFilter };
}

/** Merge a scope filter into an existing Mongo query with $and (preserves both). */
export function mergeFilter(base: any, scope: any): any {
    if (!scope || Object.keys(scope).length === 0) return base;
    if (!base || Object.keys(base).length === 0) return scope;
    return { $and: [base, scope] };
}

/** Convenience: the right scope filter for a collection name (students vs staff vs none). */
export function scopeForCollection(collection: string, scope: ScopeResult): any {
    if (scope.isAdmin) return {};
    if (collection === 'students') return scope.studentFilter;
    if (collection === 'staff') return scope.staffFilter;
    return {};
}

/**
 * Resolve the concrete SET of student _id strings this user may see. For admins
 * returns null (= unrestricted). Used by bespoke routes (fees defaulters, attendance
 * rosters) that join through the students collection and need a quick membership test.
 */
export async function accessibleStudentIds(req: Request, db: Db): Promise<Set<string> | null> {
    const scope = await resolveScope(req, db);
    if (scope.isAdmin || !scope.studentFilter || Object.keys(scope.studentFilter).length === 0) return null;
    const rows = await db.collection('students').find(scope.studentFilter, { projection: { _id: 1 } }).toArray().catch(() => []);
    return new Set(rows.map((r: any) => String(r._id)));
}

/** Same, for staff. */
export async function accessibleStaffIds(req: Request, db: Db): Promise<Set<string> | null> {
    const scope = await resolveScope(req, db);
    if (scope.isAdmin || !scope.staffFilter || Object.keys(scope.staffFilter).length === 0) return null;
    const rows = await db.collection('staff').find(scope.staffFilter, { projection: { _id: 1 } }).toArray().catch(() => []);
    return new Set(rows.map((r: any) => String(r._id)));
}
