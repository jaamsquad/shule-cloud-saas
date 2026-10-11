import { useEffect } from "react";

/**
 * Students, parents and staff all sign in on the school's one login page.
 * Opening a portal's old /login address drops the portal session and goes there.
 */
export default function ToMainLogin({ tokenKey }: { tokenKey: string }) {
    useEffect(() => {
        try { localStorage.removeItem(tokenKey); localStorage.removeItem("active_portal"); } catch { /* private mode */ }
        window.location.replace("/login");
    }, [tokenKey]);
    return null;
}
