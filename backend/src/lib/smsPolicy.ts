/**
 * Communication → SMS settings: who is allowed to send SMS, and whether every SMS needs an
 * admin (or the sender's reporting officer) to approve it before it goes out. Stored on
 * communication_settings (one doc per school, tenant DB).
 */
import { Db, ObjectId } from 'mongodb';
import { isAdminRole } from './examWindow';

export interface SmsPolicy {
    /** Empty = everyone with Communication access may send (the historical default). */
    allowedStaffIds: string[];
    approvalRequired: boolean;
}

const DEFAULT_POLICY: SmsPolicy = { allowedStaffIds: [], approvalRequired: false };

export async function getSmsPolicy(db: Db): Promise<SmsPolicy> {
    const doc: any = await db.collection('communication_settings').findOne({ key: 'sms_policy' }).catch(() => null);
    if (!doc) return { ...DEFAULT_POLICY };
    return { allowedStaffIds: Array.isArray(doc.allowedStaffIds) ? doc.allowedStaffIds.map(String) : [], approvalRequired: !!doc.approvalRequired };
}

export async function saveSmsPolicy(db: Db, patch: Partial<SmsPolicy>): Promise<SmsPolicy> {
    const next = { ...(await getSmsPolicy(db)), ...patch };
    await db.collection('communication_settings').updateOne({ key: 'sms_policy' }, { $set: { key: 'sms_policy', ...next, updatedAt: new Date() } }, { upsert: true });
    return next;
}

/** True if this staff member/role may compose and send SMS at all (admins always can). */
export function canComposeSms(policy: SmsPolicy, actor: { staffId?: string | null; role?: string } | null | undefined): boolean {
    if (!actor) return true;   // system/automated sends (reminders, OTPs, etc.) are never gated
    if (isAdminRole(actor.role)) return true;
    if (!policy.allowedStaffIds.length) return true;
    return !!actor.staffId && policy.allowedStaffIds.includes(String(actor.staffId));
}

export interface PendingSmsApproval {
    _id?: ObjectId;
    message: string;
    numbers: string[];
    audience?: string | null;
    scheduledAt?: Date | null;
    requestedBy: { staffId: string | null; name: string; role: string };
    status: 'pending' | 'approved' | 'rejected';
    createdAt: Date;
    decidedAt?: Date;
    decidedBy?: string;
}

export async function queueForApproval(db: Db, p: Omit<PendingSmsApproval, 'status' | 'createdAt'>) {
    const doc: PendingSmsApproval = { ...p, status: 'pending', createdAt: new Date() };
    const r = await db.collection('sms_approvals').insertOne(doc as any);
    return { id: String(r.insertedId), ...doc };
}
