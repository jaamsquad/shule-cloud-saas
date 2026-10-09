import { ObjectId, Db } from 'mongodb';
import { getMetaDb, getTenantDb, subdomainToDbName } from '../lib/mongodb';
import { generateUniqueSchoolId } from '../lib/schoolId';

// ─── Multi-branch organization layer ──────────────────────────────────────────
// A Branch IS a tenant (its own isolated DB). An Organization groups branches in
// the meta DB. This reuses the existing database-per-tenant isolation: a branch
// can never see another branch's data because it's a different database. The org
// layer only adds grouping, org-level users, cross-branch aggregation and audit.
//
// Meta collections:
//   Organization  { _id, name, ownerEmail, branding, createdAt }
//   Branch        { _id, organizationId, tenantId, subdomain, databaseName, name, isPrimary, status }
//   OrgUser       { _id, organizationId, email, passwordHash, role, allowedBranchIds[], name }
//   org_audit_logs { organizationId, branchId, userId, userName, action, oldValue, newValue, ip, device, ts }

export const ORG_ROLES = ['ORG_OWNER', 'ORG_ADMIN', 'ORG_FINANCE_MANAGER', 'ORG_HR_MANAGER', 'ORG_PROCUREMENT_MANAGER'] as const;
export type OrgRole = typeof ORG_ROLES[number];

// Org roles that can see/act across every branch without an explicit allow-list.
const ORG_WIDE_ROLES = new Set<OrgRole>(['ORG_OWNER', 'ORG_ADMIN', 'ORG_FINANCE_MANAGER', 'ORG_HR_MANAGER', 'ORG_PROCUREMENT_MANAGER']);

export const isOrgWideRole = (role: string) => ORG_WIDE_ROLES.has(role as OrgRole);

export async function ensureOrgIndexes() {
    const meta = getMetaDb();
    try {
        await meta.collection('Organization').createIndex({ name: 1 });
        await meta.collection('OrgUser').createIndex({ email: 1 }, { unique: true });
        await meta.collection('Branch').createIndex({ organizationId: 1 });
        await meta.collection('Branch').createIndex({ tenantId: 1 }, { unique: true, sparse: true });
        await meta.collection('Branch').createIndex({ subdomain: 1 }, { unique: true, sparse: true });
        await meta.collection('org_audit_logs').createIndex({ organizationId: 1, ts: -1 });
    } catch { /* indexes are best-effort */ }
}

/** All branches belonging to an organization. */
export async function listBranches(organizationId: string) {
    const meta = getMetaDb();
    return meta.collection('Branch').find({ organizationId: String(organizationId), status: { $ne: 'deleted' } }).sort({ isPrimary: -1, name: 1 }).toArray();
}

/** Resolve a single branch (by its _id) within an org. */
export async function getBranch(organizationId: string, branchId: string) {
    const meta = getMetaDb();
    return meta.collection('Branch').findOne({ _id: new ObjectId(branchId), organizationId: String(organizationId) });
}

/** The tenant DB for a given branch. */
export async function branchDb(organizationId: string, branchId: string): Promise<Db | null> {
    const b = await getBranch(organizationId, branchId);
    if (!b?.databaseName) return null;
    return getTenantDb(b.databaseName);
}

/**
 * Which branches a user may access. Org-wide roles → all branches; otherwise the
 * explicit allow-list. Returns full Branch docs (so callers get databaseName).
 */
export async function accessibleBranches(user: { organizationId: string; role: string; allowedBranchIds?: string[] }) {
    const all = await listBranches(user.organizationId);
    if (isOrgWideRole(user.role)) return all;
    const allow = new Set((user.allowedBranchIds || []).map(String));
    return all.filter(b => allow.has(String(b._id)));
}

/** True if the user may touch a specific branch. */
export async function canAccessBranch(user: { organizationId: string; role: string; allowedBranchIds?: string[] }, branchId: string) {
    if (isOrgWideRole(user.role)) return true;
    return (user.allowedBranchIds || []).map(String).includes(String(branchId));
}

/**
 * Create a branch = register a new tenant DB + link it to the org. The school's
 * own data lives in this fresh isolated database, exactly like a standalone
 * tenant. Reuses the Tenant registry so all existing tenancy/auth/settings work.
 */
export async function createBranch(opts: { organizationId: string; name: string; subdomain: string; isPrimary?: boolean; tenantId?: string; databaseName?: string }) {
    const meta = getMetaDb();
    const organizationId = String(opts.organizationId);
    const subdomain = opts.subdomain.toLowerCase().trim();

    // If this is wrapping an EXISTING tenant (backfill), reuse its tenantId/db.
    let tenantId = opts.tenantId;
    let databaseName = opts.databaseName;

    if (!tenantId) {
        const databaseNameNew = subdomainToDbName(subdomain);
        const existing = await meta.collection('Tenant').findOne({ subdomain });
        if (existing) {
            tenantId = String(existing._id);
            databaseName = existing.databaseName || databaseNameNew;
            await meta.collection('Tenant').updateOne({ _id: existing._id }, { $set: { organizationId, databaseName } });
        } else {
            const t = await meta.collection('Tenant').insertOne({
                name: opts.name, subdomain, databaseName: databaseNameNew,
                shulecloudId: await generateUniqueSchoolId(meta),
                organizationId, status: 'active', emailVerified: true,
                createdAt: new Date(), updatedAt: new Date(),
            });
            tenantId = String(t.insertedId);
            databaseName = databaseNameNew;
        }
    } else {
        await meta.collection('Tenant').updateOne({ _id: new ObjectId(tenantId) }, { $set: { organizationId } });
    }

    const branch = {
        organizationId, tenantId: String(tenantId), subdomain,
        databaseName: databaseName!, name: opts.name,
        isPrimary: !!opts.isPrimary, status: 'active', createdAt: new Date(),
    };
    const r = await meta.collection('Branch').insertOne(branch);
    return { _id: r.insertedId, ...branch };
}

/** Write an immutable audit entry (transfers + finance must call this). */
export async function audit(entry: {
    organizationId: string; branchId?: string; userId?: string; userName?: string;
    action: string; oldValue?: any; newValue?: any; ip?: string; device?: string;
}) {
    try {
        await getMetaDb().collection('org_audit_logs').insertOne({ ...entry, ts: new Date() });
    } catch { /* never block the operation on audit failure, but log */ }
}
