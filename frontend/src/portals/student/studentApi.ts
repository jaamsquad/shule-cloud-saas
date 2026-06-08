import { makePortalApi } from "../portal";

// Axios scoped to the student portal: attaches student_token + tenant subdomain.
export const studentApi = makePortalApi("student_token");

export interface StudentInfo {
    _id: string;
    name: string;
    registrationNo?: string;
    class?: string;
    portalUsername?: string;
    gender?: string;
    photo?: string | null;
    [k: string]: any;
}
