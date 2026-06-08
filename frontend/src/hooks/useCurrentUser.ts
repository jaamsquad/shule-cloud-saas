/**
 * Hook to get the current logged-in user's info and helper flags.
 * Reads from localStorage (set on login).
 */
export function useCurrentUser() {
    try {
        const raw = localStorage.getItem("user");
        if (!raw) return null;
        const user = JSON.parse(raw);
        return {
            id: user.id || user.sub || "",
            email: user.email || "",
            name: user.name || "",
            role: (user.role || "school_admin").toLowerCase(),
            staffId: user.staffId || null,
            isTeacher: (user.role || "").toLowerCase().includes("teacher"),
            isAdmin: (user.role || "school_admin").toLowerCase().includes("admin") || (user.role || "").toLowerCase().includes("super"),
        };
    } catch (_) {
        return null;
    }
}

/** Returns just the role string */
export function useUserRole(): string {
    const user = useCurrentUser();
    return user?.role || "school_admin";
}

/** True if the current user is a teacher */
export function useIsTeacher(): boolean {
    const user = useCurrentUser();
    return user?.isTeacher ?? false;
}

/** True if current user is admin or super admin */
export function useIsAdmin(): boolean {
    const user = useCurrentUser();
    return user?.isAdmin ?? true;
}
