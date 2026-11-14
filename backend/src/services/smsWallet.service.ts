/**
 * Per-school SMS credit wallet (tenant DB, collection `sms_wallet` — a single document,
 * `_id: 'wallet'`) plus its ledger (`sms_wallet_transactions`).
 *
 * Every new school is credited a welcome bonus on registration (see onboard.controller.ts).
 * More credits are bought with an M-PESA STK push against the platform's own paybill — the
 * same config used for subscription billing (see routes/smsWallet.routes.ts + mpesa.routes.ts)
 * — converted to SMS at the ratio the platform owner sets (see platform_settings.sms_pricing
 * in the meta DB).
 */
import { Db } from 'mongodb';
import { getMetaDb } from '../lib/mongodb';

export interface SmsPricing { smsPerKsh: number; welcomeBonus: number; updatedAt?: Date }
const DEFAULT_PRICING: SmsPricing = { smsPerKsh: 2, welcomeBonus: 200 };

/** The platform owner's SMS price: how many SMS one KSH buys, and the free welcome bonus. */
export const getSmsPricing = async (): Promise<SmsPricing> => {
    const doc: any = await getMetaDb().collection('platform_settings').findOne({ key: 'sms_pricing' });
    return { ...DEFAULT_PRICING, ...(doc?.value || {}) };
};

export const setSmsPricing = async (patch: { smsPerKsh?: number; welcomeBonus?: number }): Promise<SmsPricing> => {
    const current = await getSmsPricing();
    const smsPerKsh = Number(patch.smsPerKsh);
    const welcomeBonus = Number(patch.welcomeBonus);
    const value: SmsPricing = {
        smsPerKsh: Number.isFinite(smsPerKsh) && smsPerKsh > 0 ? smsPerKsh : current.smsPerKsh,
        welcomeBonus: Number.isFinite(welcomeBonus) && welcomeBonus >= 0 ? welcomeBonus : current.welcomeBonus,
    };
    await getMetaDb().collection('platform_settings').updateOne({ key: 'sms_pricing' }, { $set: { value, updatedAt: new Date() } }, { upsert: true });
    return value;
};

export interface SmsWallet { _id: 'wallet'; balance: number; createdAt?: Date; updatedAt?: Date }

export const ensureSmsWallet = async (db: Db): Promise<SmsWallet> => {
    let wallet: any = await db.collection('sms_wallet').findOne({ _id: 'wallet' as any });
    if (!wallet) {
        wallet = { _id: 'wallet', balance: 0, createdAt: new Date(), updatedAt: new Date() };
        await db.collection('sms_wallet').insertOne(wallet as any).catch(() => {});
        wallet = await db.collection('sms_wallet').findOne({ _id: 'wallet' as any }) || wallet;
    }
    return wallet as SmsWallet;
};

const recordTxn = (db: Db, t: { type: 'credit' | 'debit'; smsCount: number; balanceBefore: number; balanceAfter: number; source: string; reference?: string; description?: string }) =>
    db.collection('sms_wallet_transactions').insertOne({ ...t, createdAt: new Date() }).catch(() => {});

/** Credit SMS credits (welcome bonus, M-PESA top-up, or a manual adjustment). */
export const creditSmsWallet = async (db: Db, smsCount: number, opts: { source: string; reference?: string; description?: string }) => {
    const amt = Math.round(Number(smsCount));
    if (!amt || amt <= 0) throw new Error('A valid SMS credit amount is required');
    const wallet = await ensureSmsWallet(db);
    const before = Number(wallet.balance || 0);
    const after = before + amt;
    await db.collection('sms_wallet').updateOne({ _id: 'wallet' as any }, { $set: { balance: after, updatedAt: new Date() } });
    await recordTxn(db, { type: 'credit', smsCount: amt, balanceBefore: before, balanceAfter: after, source: opts.source, reference: opts.reference, description: opts.description });
    return after;
};

/** Debit SMS credits as messages go out. Throws if the wallet can't cover it. */
export const debitSmsWallet = async (db: Db, smsCount: number, opts: { source: string; reference?: string; description?: string }) => {
    const amt = Math.round(Number(smsCount));
    if (!amt || amt <= 0) return (await ensureSmsWallet(db)).balance;
    const wallet = await ensureSmsWallet(db);
    const before = Number(wallet.balance || 0);
    if (amt > before) throw new Error(`Not enough SMS credits (need ${amt}, have ${before}). Top up to continue sending.`);
    const after = before - amt;
    await db.collection('sms_wallet').updateOne({ _id: 'wallet' as any }, { $set: { balance: after, updatedAt: new Date() } });
    await recordTxn(db, { type: 'debit', smsCount: amt, balanceBefore: before, balanceAfter: after, source: opts.source, reference: opts.reference, description: opts.description });
    return after;
};

export const getSmsWalletLedger = (db: Db, limit = 100) =>
    db.collection('sms_wallet_transactions').find({}).sort({ createdAt: -1 }).limit(limit).toArray();
