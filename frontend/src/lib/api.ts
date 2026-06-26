import axios from "axios";
import { currentTenantSubdomain } from "./portal";
import { API_ORIGIN } from "./config";

const api = axios.create({
    baseURL: `${API_ORIGIN}/api/v1`,
    timeout: 30000,   // fail fast instead of hanging forever on an unresponsive backend
});

// Detect if we are in owner context based on URL path or hostname
const isOwnerContext = () => {
    const host = window.location.hostname;
    const path = window.location.pathname;
    // Owner context: either on owner.* subdomain OR browsing /owner/* paths
    return host.startsWith('owner.') || path.startsWith('/owner');
};

api.interceptors.request.use((config) => {
    if (isOwnerContext()) {
        // Owner portal auth
        const ownerToken = localStorage.getItem('owner_token');
        if (ownerToken) config.headers.Authorization = `Bearer ${ownerToken}`;
    } else {
        // Tenant portal auth
        const token = localStorage.getItem('auth_token');
        if (token) config.headers.Authorization = `Bearer ${token}`;

        // Send subdomain header for tenant context.
        // Handles tenant hosts (egerton.localhost) as well as portal-prefixed
        // hosts (students.egerton.localhost, staff.egerton.localhost, ...).
        const sub = currentTenantSubdomain();
        if (sub) {
            config.headers['x-tenant-subdomain'] = sub;
        }

        // Also check localStorage for subdomain (for localhost dev)
        const tenant = localStorage.getItem('tenant');
        if (tenant) {
            try {
                const parsed = JSON.parse(tenant);
                if (parsed.subdomain) {
                    config.headers['x-tenant-subdomain'] = parsed.subdomain;
                }
            } catch { }
        }

        // ── Multi-branch: an org user's chosen branch overrides the host subdomain ──
        // The Branch Switcher writes the active branch's subdomain here, so the
        // entire tenant app instantly scopes to that branch's isolated database.
        const activeBranch = localStorage.getItem('active_branch_subdomain');
        if (activeBranch) config.headers['x-tenant-subdomain'] = activeBranch;

        // Org-level auth token (for /org/* calls). Sent alongside; org routes use it,
        // tenant routes ignore it in favour of auth_token above.
        const orgToken = localStorage.getItem('org_token');
        if (orgToken && config.url?.includes('/org/')) config.headers.Authorization = `Bearer ${orgToken}`;
    }

    return config;
});

// Auto-redirect / clear session on auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const code   = error.response?.data?.code;

        if (status === 403 && code === 'TOKEN_SUBDOMAIN_MISMATCH') {
            // Organization mode: a branch session intentionally runs under the org
            // URL with a token for the branch subdomain. Don't nuke it — send the
            // user back to the account switcher to re-enter, not the root finder.
            const orgToken = localStorage.getItem('org_token');
            const activeBranch = localStorage.getItem('active_branch_subdomain');
            if (orgToken || activeBranch) {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('active_branch_subdomain');
                localStorage.removeItem('active_branch_id');
                if (!window.location.pathname.startsWith('/org')) window.location.href = '/org/switch';
                return Promise.reject(error);
            }
            // Standalone school: token belongs to a different school — clear and
            // redirect to login, keeping the current subdomain (not the root).
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            localStorage.removeItem('tenant');
            const msg = encodeURIComponent('Your session is not valid for this school. Please log in.');
            window.location.href = `/login?error=${msg}`;
            return Promise.reject(error);
        }

        if (status === 401) {
            if (isOwnerContext()) {
                localStorage.removeItem('owner_token');
                if (window.location.pathname !== '/owner' && window.location.pathname !== '/owner/login') {
                    window.location.href = '/owner';
                }
            } else {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
                localStorage.removeItem('tenant');
                if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                    window.location.href = '/login?session=expired';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
