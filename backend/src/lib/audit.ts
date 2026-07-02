/**
 * Audit trail.
 *
 * recordAudit() appends one immutable entry to the tenant's `audit_logs`
 * collection for a meaningful action (Created / Edited / Deleted / Approved /
 * Rejected / Submitted / Locked / Published / Downloaded / Viewed …).
 *
 * It captures the actor (from the verified JWT via tenantContext.user), the
 * department/branch/org context, and the request's IP + browser + timestamp — as
 * required by the Department Management spec. Writes are best-effort and never
 * throw into the caller: an audit failure must not break the underlying action.
 */
import { Db } from 'mongodb';
import type { Request } from 'express';
import { getMetaDb } from './mongodb';

export interface AuditInput {
    action: string;                 // Created | Edited | Deleted | Approved | …
    entity: string;                 // 'marks' | 'department' | 'document' | …
    entityId?: string;              // affected record id / composite key
    departmentId?: string;
    meta?: Record<string, any>;     // small, non-sensitive extra context
}

const firstIp = (req: Request): string => {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff) return xff.split(',')[0].trim();
    return (req.socket && (req.socket as any).remoteAddress) || (req as any).ip || '';
};

export async function recordAudit(req: Request, input: AuditInput): Promise<void> {
    try {
        const db: Db = (req as any).tenantDb || getMetaDb();
        const ctx = (req as any).tenantContext || {};
        const user = ctx.user || {};
        const entry = {
            action: input.action,
            entity: input.entity,
            entityId: input.entityId || '',
            departmentId: input.departmentId || '',
            meta: input.meta || {},
            // Actor
            userId: user.staffId || null,
            userName: user.name || 'System',
            userRole: user.role || '',
            // Context
            organizationId: ctx.tenantId || '',
            branch: ctx.tenantSubdomain || '',
            // Request forensics
            ip: firstIp(req),
            userAgent: String(req.headers['user-agent'] || ''),
            method: req.method,
            path: req.originalUrl || req.url,
            at: new Date(),
        };
        await db.collection('audit_logs').insertOne(entry);
    } catch { /* audit must never break the action */ }
}
