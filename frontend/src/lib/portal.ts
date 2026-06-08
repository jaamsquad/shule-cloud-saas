import axios from "axios";

// ─── Portal / subdomain resolution ────────────────────────────────────────────
// Maps the browser hostname to a portal type and the tenant (school) subdomain.
//
//   students.egerton.localhost   → { portal: 'student', tenantSubdomain: 'egerton' }
//   staff.egerton.localhost      → { portal: 'staff',   tenantSubdomain: 'egerton' }
//   parent.egerton.localhost     → { portal: 'parent',  tenantSubdomain: 'egerton' }
//   egerton.localhost            → { portal: 'tenant',  tenantSubdomain: 'egerton' }
//   owner.localhost              → { portal: 'owner',   tenantSubdomain: null }
//   localhost                    → { portal: 'public',  tenantSubdomain: null }
//
// Production hosts work the same way:
//   students.egerton.shulecloud.co.ke → { portal: 'student', tenantSubdomain: 'egerton' }

export type PortalType = "student" | "staff" | "parent" | "owner" | "tenant" | "public";

const PORTAL_PREFIXES: Record<string, PortalType> = {
    students: "student",
    student: "student",
    staff: "staff",
    teacher: "staff",
    teachers: "staff",
    parent: "parent",
    parents: "parent",
};

const RESERVED = new Set(["www", "app", "api", "admin", "support", "mail"]);

export interface PortalContext {
    portal: PortalType;
    tenantSubdomain: string | null;
}

export function resolvePortal(hostname?: string): PortalContext {
    const host = (hostname ?? window.location.hostname).split(":")[0].toLowerCase();

    // bare localhost / loopback IP → public marketing site
    if (host === "localhost" || host === "127.0.0.1" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
        return { portal: "public", tenantSubdomain: null };
    }

    const parts = host.split(".");
    const first = parts[0];

    if (first === "owner") return { portal: "owner", tenantSubdomain: null };

    // students.<tenant>.<...> / staff.<tenant>.<...> / parent.<tenant>.<...>
    if (PORTAL_PREFIXES[first]) {
        const rest = parts.slice(1).filter(p => p !== "localhost");
        return { portal: PORTAL_PREFIXES[first], tenantSubdomain: rest[0] || null };
    }

    // <tenant>.localhost  or  <tenant>.<domain>.<tld>
    if (!RESERVED.has(first)) {
        if ((parts.length === 2 && parts[1] === "localhost") || parts.length > 2) {
            return { portal: "tenant", tenantSubdomain: first };
        }
    }

    return { portal: "public", tenantSubdomain: null };
}

/** The tenant subdomain that API calls should be scoped to, or null. */
export function currentTenantSubdomain(): string | null {
    return resolvePortal().tenantSubdomain;
}

/** Human-friendly school name derived from the subdomain (e.g. "egerton" → "Egerton"). */
export function tenantDisplayName(): string {
    const s = currentTenantSubdomain();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

/**
 * Build an axios instance for a portal (student / staff / parent) that
 * automatically attaches the portal's bearer token and the tenant subdomain
 * header so the backend resolves the correct school database.
 */
export function makePortalApi(tokenKey: string) {
    // Portal endpoints live on the auth router → /api/v1/auth/*
    const inst = axios.create({ baseURL: "/api/v1/auth" });
    inst.interceptors.request.use(cfg => {
        const token = localStorage.getItem(tokenKey);
        if (token) cfg.headers.Authorization = `Bearer ${token}`;
        const sub = currentTenantSubdomain();
        if (sub) cfg.headers["x-tenant-subdomain"] = sub;
        return cfg;
    });
    return inst;
}
