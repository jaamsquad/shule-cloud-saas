import { Db, ObjectId } from 'mongodb';
import { schoolPrice } from '../lib/planPricing';

/**
 * Put a school on a plan: creates/updates its TenantSubscription and switches the school's
 * plan + enabled modules on the Tenant record. Used when a subscription is paid — through the
 * school's own "subscribe" flow (mpesa.routes) and when a subscription INVOICE is paid.
 *
 * `extendFromCurrent`: a renewal paid before the current period ends keeps the days already
 * paid for (new expiry = current expiry + plan duration) instead of restarting from today.
 */
export async function activateSubscription(meta: Db, opts: {
    tenantId: any; planId: any; amount?: number; receipt?: string; planName?: string; extendFromCurrent?: boolean;
}) {
    const tenantId = new ObjectId(String(opts.tenantId));
    const plan: any = await meta.collection('Plan').findOne({ _id: new ObjectId(String(opts.planId)) });
    const durationDays = Number(plan?.durationDays) > 0 ? Number(plan.durationDays) : 30;
    const graceDays = Number(plan?.graceDays) >= 0 ? Number(plan.graceDays) : 0;

    let start = Date.now();
    if (opts.extendFromCurrent) {
        const cur: any = await meta.collection('TenantSubscription').findOne({ tenantId });
        const curEnd = cur?.expiresAt ? new Date(cur.expiresAt).getTime() : 0;
        if (cur?.status === 'active' && curEnd > start) start = curEnd;
    }
    const expiresAt = new Date(start + durationDays * 86400000);
    const graceUntil = new Date(expiresAt.getTime() + graceDays * 86400000);
    const planName = opts.planName || plan?.name || '';

    await meta.collection('TenantSubscription').updateOne(
        { tenantId },
        {
            $set: { tenantId, planId: plan?._id || opts.planId, planName, amount: opts.amount ?? (plan ? schoolPrice(await meta.collection('Tenant').findOne({ _id: tenantId }), plan).price : 0), status: 'active', expiresAt, graceUntil, ...(opts.receipt ? { mpesaReceipt: opts.receipt } : {}), updatedAt: new Date() },
            $unset: { pendingPlanId: '', pendingPlanName: '' },
            $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true },
    );
    await meta.collection('Tenant').updateOne(
        { _id: tenantId },
        { $set: { planId: plan?._id || opts.planId, plan: planName, enabledModules: plan?.modules || [], status: 'active', updatedAt: new Date() } },
    );
    return { plan, expiresAt, graceUntil };
}
