import { makePortalApi } from "../portal";

export const parentApi = makePortalApi("parent_token");

// When a parent has multiple children, every request carries the active child id
// so the backend scopes data to the child currently being viewed.
parentApi.interceptors.request.use(cfg => {
    const child = localStorage.getItem("parent_active_child");
    if (child) cfg.headers["x-student-id"] = child;
    return cfg;
});

export interface ParentChild {
    _id: string;
    name: string;
    class?: string;
    registrationNo?: string;
    admissionNo?: string;
}

export interface ParentInfo {
    name: string;
    username?: string;
    phone?: string;
    children?: ParentChild[];
    student?: ParentChild;   // active / first child (back-compat)
    [k: string]: any;
}
