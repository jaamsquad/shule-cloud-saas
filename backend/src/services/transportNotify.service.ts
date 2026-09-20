import { Db, ObjectId } from 'mongodb';
import { sendEmail } from './communications.service';

/**
 * Notify a student's parent that they were picked up / dropped off, on whichever
 * channels the school enabled in `transport_settings` (SMS / Email / WhatsApp).
 * Shared by the admin Bus Pickup page and the driver app's board/drop actions so
 * the messaging + logging behave identically. Best-effort: never throws.
 *
 * Returns the list of channels a message was actually sent on.
 */
export async function notifyTransport(
    db: Db,
    opts: {
        tenantId?: string;
        tenantName?: string;
        student: any;
        studentName: string;
        type: 'pickup' | 'drop';
        direction?: 'to_school' | 'to_home';
        busId?: string; // reg/plate or bus name
        at?: Date;
    },
): Promise<string[]> {
    const at = opts.at || new Date();
    const settings: any = (await db.collection('transport_settings').findOne({})) || {};
    const name = opts.studentName;
    const timeStr = at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' });
    const goingHome = opts.direction ? opts.direction === 'to_home' : opts.type === 'drop';
    const fromPlace = goingHome ? 'school' : 'home';
    const busId = opts.busId || '';
    const msg = opts.type === 'drop'
        ? `${name} has been dropped ${goingHome ? 'home' : 'at school'} by school bus${busId ? ` ${busId}` : ''} at ${timeStr}.`
        : `${name} has been picked from ${fromPlace} by school bus${busId ? ` ${busId}` : ''} at ${timeStr}.`;

    const student = opts.student || {};
    const email = student.parentEmail || student.fatherEmail || student.motherEmail || '';
    const phone = student.parentPhone || student.fatherPhone || student.motherPhone || student.phone || '';

    const sent: string[] = [];
    try {
        if (settings.notifyEmail && email) {
            await sendEmail(db, { to: [email], subject: `Transport update — ${name}`, message: msg });
            sent.push('email');
        }
        if (settings.notifyWhatsapp && phone) {
            const { sendWhatsApp } = await import('./communications.service');
            await sendWhatsApp(db, { to: [phone], message: msg, schoolId: opts.tenantId });
            sent.push('whatsapp');
        }
        if (settings.notifySms && phone) {
            const { queueSms } = await import('./smsGateway.service');
            let schoolName = opts.tenantName || '';
            if (!schoolName && opts.tenantId) {
                try {
                    const { getMetaDb } = await import('../lib/mongodb');
                    const t: any = await getMetaDb().collection('Tenant').findOne({ _id: new ObjectId(String(opts.tenantId)) });
                    schoolName = t?.instituteName || t?.name || '';
                } catch { /* ignore */ }
            }
            const { brandMessage } = await import('./talksasa.service');
            const branded = brandMessage(schoolName, msg);
            const sr: any = await queueSms(db, String(opts.tenantId || 'default'), [phone], branded, { audience: 'transport' });
            const ok = sr.provider === 'device' || sr.sent > 0;
            await db.collection('sms_logs').insertOne({ to: phone, message: branded, status: ok ? 'Sent' : 'Failed', purpose: 'transport', createdAt: at });
            if (ok) sent.push('sms');
        }
    } catch { /* notification best-effort */ }
    return sent;
}
