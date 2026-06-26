import { Db } from 'mongodb';
import { getTenantDb } from '../lib/mongodb';
import { accessibleBranches } from './organization.service';

// ─── Cross-branch aggregation ──────────────────────────────────────────────────
// Org-wide dashboards/reports fan out across each branch's isolated DB and merge
// the results. There is no shared collection — we query each branch DB the user
// is allowed to see and combine, tagging every row with its branch.

export interface BranchRef { id: string; name: string; subdomain: string; db: Db }

/** Resolve the branch DBs an org user may read. */
export async function readableBranchDbs(user: { organizationId: string; role: string; allowedBranchIds?: string[] }, onlyBranchIds?: string[]): Promise<BranchRef[]> {
    let branches = await accessibleBranches(user);
    if (onlyBranchIds?.length) {
        const want = new Set(onlyBranchIds.map(String));
        branches = branches.filter(b => want.has(String(b._id)));
    }
    return branches.map(b => ({ id: String(b._id), name: b.name, subdomain: b.subdomain, db: getTenantDb(b.databaseName) }));
}

/**
 * Run `fn` against every readable branch DB in parallel and return per-branch
 * results (failures isolated so one bad branch can't break the whole report).
 */
export async function perBranch<T>(branches: BranchRef[], fn: (db: Db, branch: BranchRef) => Promise<T>): Promise<Array<{ branch: BranchRef; data: T | null; error?: string }>> {
    return Promise.all(branches.map(async (b) => {
        try { return { branch: b, data: await fn(b.db, b) }; }
        catch (e: any) { return { branch: b, data: null, error: e.message }; }
    }));
}

const num = (v: any) => Number(v) || 0;

// ─── Standard aggregations used by the org dashboard/reports ───────────────────

/** Enrollment (active student count) per branch + total. */
export async function aggregateEnrollment(branches: BranchRef[]) {
    const rows = await perBranch(branches, async (db) => {
        const count = await db.collection('students').countDocuments({ status: { $ne: 'inactive' } }).catch(() => 0);
        return { students: count };
    });
    return summarize(rows, r => ({ students: r?.students || 0 }), ['students']);
}

/** Fee collection (sum of non-voided payments) per branch + total. */
export async function aggregateFeeCollection(branches: BranchRef[], from?: Date, to?: Date) {
    const rows = await perBranch(branches, async (db) => {
        const q: any = { is_voided: { $ne: true } };
        if (from || to) { q.createdAt = {}; if (from) q.createdAt.$gte = from; if (to) q.createdAt.$lte = to; }
        const pays = await db.collection('payments').find(q).project({ amount: 1 }).toArray().catch(() => []);
        return { collected: pays.reduce((s, p) => s + num(p.amount), 0), count: pays.length };
    });
    return summarize(rows, r => ({ collected: r?.collected || 0, count: r?.count || 0 }), ['collected', 'count']);
}

/** Income vs expense per branch from accounting journals + total. */
export async function aggregateIncomeExpense(branches: BranchRef[], from?: Date, to?: Date) {
    const rows = await perBranch(branches, async (db) => {
        const q: any = { status: 'posted' };
        if (from || to) { q.date = {}; if (from) q.date.$gte = from; if (to) q.date.$lte = to; }
        const journals = await db.collection('accounting_journals').find(q).toArray().catch(() => []);
        let income = 0, expense = 0;
        for (const j of journals) {
            for (const l of (j.lines || [])) {
                const acct = String(l.account || '').toLowerCase();
                if (/income|revenue|fee/.test(acct) && l.type === 'credit') income += num(l.amount);
                if (/expense|cost|salary|payroll|wage/.test(acct) && l.type === 'debit') expense += num(l.amount);
            }
        }
        return { income, expense, net: income - expense };
    });
    return summarize(rows, r => ({ income: r?.income || 0, expense: r?.expense || 0, net: r?.net || 0 }), ['income', 'expense', 'net']);
}

/** Staff headcount per branch + total. */
export async function aggregateStaff(branches: BranchRef[]) {
    const rows = await perBranch(branches, async (db) => {
        const count = await db.collection('staff').countDocuments({ status: { $ne: 'inactive' } }).catch(() => 0);
        return { staff: count };
    });
    return summarize(rows, r => ({ staff: r?.staff || 0 }), ['staff']);
}

// Shape per-branch results into { branches:[{id,name,...metrics}], totals:{...} }.
function summarize<T extends Record<string, number>>(
    rows: Array<{ branch: BranchRef; data: any; error?: string }>,
    pick: (d: any) => T, keys: (keyof T)[],
) {
    const branchRows = rows.map(r => ({ branchId: r.branch.id, branchName: r.branch.name, subdomain: r.branch.subdomain, error: r.error, ...pick(r.data) }));
    const totals: any = {};
    for (const k of keys) totals[k] = branchRows.reduce((s, b: any) => s + num(b[k]), 0);
    return { branches: branchRows, totals };
}
