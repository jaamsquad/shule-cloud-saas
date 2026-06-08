import { makePortalApi } from "../portal";

export const staffApi = makePortalApi("staff_token");

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
