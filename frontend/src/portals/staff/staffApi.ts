import { makePortalApi } from "../portal";

export const staffApi = makePortalApi("staff_token");
export const staffCalendarApi = makePortalApi("staff_token", "");
// Root-scoped (no /auth prefix) — for generic, non-staff-portal-specific reads
// like the school's class list (CBC Materials, etc.).
export const staffRootApi = makePortalApi("staff_token", "");

export interface StaffInfo {
    _id: string;
    name: string;
    designation?: string;
    portalUsername?: string;
    email?: string;
    phone?: string;
    photo?: string | null;
    [k: string]: any;
}
