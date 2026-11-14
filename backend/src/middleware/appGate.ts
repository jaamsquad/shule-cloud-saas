/**
 * Blocks the API of an app the platform owner switched off for a school
 * (Tenant.disabledApps). Only routes that clearly belong to one app are listed, so
 * shared endpoints (students, classes, results…) keep working for the other apps.
 */
import type { Request, Response, NextFunction } from 'express';
import { disabledAppsFor } from '../lib/permissions';

// app → API path prefixes (under /api/v1) that only that app uses
export const APP_API_PREFIXES: Record<string, string[]> = {
    library: ['/library', '/library_members', '/library_books', '/library_issues'],
    transport: ['/transport', '/transport_zones', '/buses', '/transport_settings', '/transport_pickups', '/driver'],
    boarding: ['/hostel', '/hostels', '/hostel_rooms', '/hostel_beds', '/hostel_allocations', '/hostel_attendance_records', '/hostel_fees', '/hostel_settings', '/cafeteria', '/canteen'],
    pos: ['/pos', '/pos_products', '/pos_orders'],
    payroll: ['/salary', '/salary_payments'],
    activities: ['/sports', '/trips'],
    elearning: ['/lms', '/lms_courses', '/lms_lessons', '/lms_quizzes', '/lms_quiz_attempts', '/lms_enrollments', '/live_meetings'],
    frontdesk: ['/frontdesk', '/secretary'],
    accounting: ['/accounting', '/procurement', '/expenses', '/chart_of_accounts', '/income'],
    cbc: ['/cbc'],
    communication: ['/meetings', '/communications'],
};

const matches = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + '/') || path.startsWith(prefix + '?');

export async function appGate(req: Request, res: Response, next: NextFunction) {
    try {
        const tid = (req as any).tenantContext?.tenantId;
        if (!tid) return next();
        const off = await disabledAppsFor(tid);
        if (!off.length) return next();
        const path = req.path;   // relative to the /api/v1 mount
        for (const app of off) {
            if ((APP_API_PREFIXES[app] || []).some(p => matches(path, p))) {
                return res.status(403).json({ code: 'APP_DISABLED', app, message: 'This app is turned off for your school. Contact ShuleCloud to turn it on.' });
            }
        }
        next();
    } catch { next(); }
}
