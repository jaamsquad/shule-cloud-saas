import axios from "axios";

const api = axios.create({
    baseURL: "/api/v1",
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

        // Send subdomain header for tenant context
        const host = window.location.hostname;
        const parts = host.split('.');
        if (parts.length > 2 && parts[0] !== 'www') {
            config.headers['x-tenant-subdomain'] = parts[0];
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

// Auto-redirect to login on 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            if (isOwnerContext()) {
                localStorage.removeItem('owner_token');
                if (!window.location.pathname.startsWith('/owner/register') && window.location.pathname !== '/owner') {
                    window.location.href = '/owner';
                }
            } else {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user');
                localStorage.removeItem('tenant');
                if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
