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
            // Token belongs to a different school — clear session and redirect to login
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            localStorage.removeItem('tenant');
            // Redirect to the root domain login so they can pick their school.
            const { protocol, hostname } = window.location;
            const port = window.location.port ? `:${window.location.port}` : '';
            const rootHost = (hostname === 'localhost' || hostname.endsWith('.localhost'))
                ? 'localhost'
                : hostname.split('.').slice(-2).join('.');
            const msg = encodeURIComponent('Your session is not valid for this school. Please log in.');
            window.location.href = `${protocol}//${rootHost}${port}/login?error=${msg}`;
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
