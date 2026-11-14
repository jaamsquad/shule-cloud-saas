/**
 * Plan prices for schools (Owner portal → Plans, and a school's page → Pricing & discount).
 *
 *  - A plan is priced per billing cycle: per month, per term or per year (`billingCycle`).
 *  - The owner can give one school its own price for any plan (`Tenant.planPricing[planId]`)
 *  - and a discount for that school (`Tenant.discount`: a % or a fixed KES amount off each
 *    payment, with an optional reason and end date; after the end date it no longer applies).
 * schoolPrice() is what the school is actually charged, everywhere it is charged.
 */
export type BillingCycle = 'monthly' | 'termly' | 'yearly';
export const CYCLES: Record<BillingCycle, { label: string; short: string; days: number }> = {
    monthly: { label: 'Per month', short: '/mo', days: 30 },
    termly: { label: 'Per term', short: '/term', days: 120 },
    yearly: { label: 'Per year', short: '/yr', days: 365 },
};
export const cycleOf = (plan: any): BillingCycle => (['monthly', 'termly', 'yearly'].includes(plan?.billingCycle) ? plan.billingCycle : 'monthly');

export interface SchoolDiscount { type: 'percent' | 'fixed'; value: number; reason?: string; until?: string | null }
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; };

export function discountActive(d: any, now = new Date()): d is SchoolDiscount {
    if (!d || !['percent', 'fixed'].includes(d.type) || !(num(d.value) > 0)) return false;
    if (d.until) { const end = new Date(`${String(d.until).slice(0, 10)}T23:59:59`); if (!isNaN(end.getTime()) && end < now) return false; }
    return true;
}

export interface SchoolPrice {
    planId: string; listPrice: number; schoolPrice: number; custom: boolean;
    discount: SchoolDiscount | null; discountAmount: number; price: number;
    cycle: BillingCycle; cycleLabel: string; per: string;
}

/** The price this school pays for this plan per billing cycle. */
export function schoolPrice(tenant: any, plan: any, now = new Date()): SchoolPrice {
    const planId = String(plan?._id || '');
    const listPrice = num(plan?.price);
    const override = tenant?.planPricing?.[planId];
    const custom = override !== undefined && override !== null && override !== '';
    const base = custom ? num(override) : listPrice;
    const d = discountActive(tenant?.discount, now) ? (tenant.discount as SchoolDiscount) : null;
    const off = !d ? 0 : d.type === 'percent' ? (base * Math.min(100, num(d.value))) / 100 : Math.min(base, num(d.value));
    const price = Math.max(0, Math.round((base - off) * 100) / 100);
    const cycle = cycleOf(plan);
    return { planId, listPrice, schoolPrice: base, custom, discount: d, discountAmount: Math.round(off * 100) / 100, price, cycle, cycleLabel: CYCLES[cycle].label, per: CYCLES[cycle].short };
}

/** Clean what the owner sends for a school's prices + discount. */
export function cleanSchoolPricing(body: any, planIds: string[]) {
    const planPricing: Record<string, number> = {};
    for (const [k, v] of Object.entries(body?.planPricing || {})) {
        if (!planIds.includes(k) || v === '' || v === null || v === undefined) continue;
        const n = Number(v); if (Number.isFinite(n) && n >= 0) planPricing[k] = Math.round(n * 100) / 100;
    }
    const d = body?.discount;
    let discount: SchoolDiscount | null = null;
    if (d && ['percent', 'fixed'].includes(d.type) && Number(d.value) > 0) {
        discount = { type: d.type, value: d.type === 'percent' ? Math.min(100, Number(d.value)) : Number(d.value), reason: String(d.reason || '').slice(0, 200), until: /^\d{4}-\d{2}-\d{2}$/.test(String(d.until || '')) ? String(d.until) : null };
    }
    return { planPricing, discount };
}
