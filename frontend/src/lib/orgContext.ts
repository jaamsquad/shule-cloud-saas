import api from "./api";

// ─── Organization (multi-branch) client state ─────────────────────────────────
// An org user logs in once, then switches between branches. The active branch's
// subdomain is written to localStorage so api.ts scopes every tenant request to
// that branch's isolated database. "All Branches" clears the active branch and
// routes the UI to the org-wide aggregated dashboards.

export interface OrgBranch { id: string; name: string; subdomain: string; isPrimary?: boolean }
export interface OrgUser { orgUserId: string; organizationId: string; role: string; allowedBranchIds: string[]; name?: string; email?: string; organizationName?: string }

const KEY_TOKEN = "org_token";
const KEY_USER = "org_user";
const KEY_BRANCHES = "org_branches";
const KEY_ACTIVE = "active_branch_subdomain";
const KEY_ACTIVE_ID = "active_branch_id";
const KEY_ALL = "org_all_branches";
const KEY_ORG = "org_info";   // { name, branding }

export interface OrgBranding { logo?: string; primaryColor?: string; motto?: string }
export interface OrgInfo { id?: string; name?: string; branding?: OrgBranding }

export const isOrgUser = () => !!localStorage.getItem(KEY_TOKEN);
export const getOrgUser = (): OrgUser | null => { try { return JSON.parse(localStorage.getItem(KEY_USER) || "null"); } catch { return null; } };
export const getOrgBranches = (): OrgBranch[] => { try { return JSON.parse(localStorage.getItem(KEY_BRANCHES) || "[]"); } catch { return []; } };
export const getOrgInfo = (): OrgInfo => { try { return JSON.parse(localStorage.getItem(KEY_ORG) || "{}"); } catch { return {}; } };
export const orgPrimary = () => getOrgInfo().branding?.primaryColor || "#5C67F2";
export const getActiveBranchId = () => localStorage.getItem(KEY_ACTIVE_ID) || "";
export const isAllBranches = () => localStorage.getItem(KEY_ALL) === "1";

const ORG_WIDE = new Set(["ORG_OWNER", "ORG_ADMIN", "ORG_FINANCE_MANAGER", "ORG_HR_MANAGER", "ORG_PROCUREMENT_MANAGER"]);
export const canSeeAllBranches = () => { const u = getOrgUser(); return !!u && ORG_WIDE.has(u.role); };

export async function orgLogin(email: string, password: string) {
    const { data } = await api.post("/org/auth/login", { email, password });
    localStorage.setItem(KEY_TOKEN, data.token);
    localStorage.setItem(KEY_USER, JSON.stringify(data.user));
    // Load branches the user can access + the org's branding.
    const me = (await api.get("/org/me")).data;
    localStorage.setItem(KEY_BRANCHES, JSON.stringify(me.branches || []));
    if (me.organization) localStorage.setItem(KEY_ORG, JSON.stringify(me.organization));
    // Default into the first/primary branch.
    const first = (me.branches || [])[0];
    if (first) selectBranch(first);
    return { user: data.user, branches: me.branches || [] };
}

export function selectBranch(branch: OrgBranch) {
    localStorage.setItem(KEY_ACTIVE, branch.subdomain);
    localStorage.setItem(KEY_ACTIVE_ID, branch.id);
    localStorage.removeItem(KEY_ALL);
}

export function selectAllBranches() {
    localStorage.removeItem(KEY_ACTIVE);
    localStorage.removeItem(KEY_ACTIVE_ID);
    localStorage.setItem(KEY_ALL, "1");
}

export function orgLogout() {
    [KEY_TOKEN, KEY_USER, KEY_BRANCHES, KEY_ACTIVE, KEY_ACTIVE_ID, KEY_ALL, KEY_ORG].forEach(k => localStorage.removeItem(k));
}
