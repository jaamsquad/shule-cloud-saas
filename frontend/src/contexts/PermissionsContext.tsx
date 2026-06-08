import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import api from "@/lib/api";

export interface RolePermissions {
    role: string;
    modules: string[];
    crud: Record<string, string[]>;
    isAdmin: boolean;
    isTeacher: boolean;
    loaded: boolean;
    refreshPermissions: () => void;
}

// ─── Read role directly from JWT (synchronous) ────────────────────────────────
function readJwtPerms(): Omit<RolePermissions, "refreshPermissions"> {
    try {
        const token = localStorage.getItem("auth_token");
        if (!token) return { role: "", modules: [], crud: {}, isAdmin: false, isTeacher: false, loaded: false };

        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.exp && Date.now() / 1000 > payload.exp) {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("user");
            return { role: "", modules: [], crud: {}, isAdmin: false, isTeacher: false, loaded: false };
        }

        const rawRole = (payload.role || "school_admin").toLowerCase();
        const isAdmin = rawRole === "school_admin" || rawRole === "super_admin";
        const isTeacher = rawRole.includes("teacher");

        return {
            role: rawRole,
            // Show all for admin immediately; for others show nothing until DB fetch
            modules: isAdmin ? ["*"] : [],
            crud: {},
            isAdmin,
            isTeacher,
            loaded: isAdmin, // admins are fully loaded; others wait for API
        };
    } catch {
        return { role: "", modules: [], crud: {}, isAdmin: false, isTeacher: false, loaded: false };
    }
}

const defaultCtx: RolePermissions = {
    role: "", modules: [], crud: {}, isAdmin: false, isTeacher: false, loaded: false,
    refreshPermissions: () => {},
};

const PermissionsContext = createContext<RolePermissions>(defaultCtx);

export function PermissionsProvider({ children }: { children: ReactNode }) {
    const [perms, setPerms] = useState<Omit<RolePermissions, "refreshPermissions">>(readJwtPerms);
    const [fetchTick, setFetchTick] = useState(0);

    // Exposed to consumers — call after login to re-read JWT + re-fetch DB perms
    const refreshPermissions = useCallback(() => {
        const fresh = readJwtPerms();
        setPerms(fresh);
        setFetchTick(n => n + 1);
    }, []);

    // Also listen for storage changes (cross-tab login)
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === "auth_token") refreshPermissions();
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, [refreshPermissions]);

    // Fetch DB-saved permissions for non-admin roles
    useEffect(() => {
        const jwtState = readJwtPerms();

        // No token or already admin — nothing to fetch from DB
        if (!jwtState.role || jwtState.isAdmin) {
            setPerms(prev => ({ ...prev, loaded: true }));
            return;
        }

        const token = localStorage.getItem("auth_token");
        if (!token) return;

        api.get("/auth/my-permissions")
            .then(r => {
                const data = r.data;
                const role = (data.role || jwtState.role).toLowerCase();
                const isAdmin = role === "school_admin" || role === "super_admin";
                setPerms({
                    role,
                    modules: data.modules?.length ? data.modules : (isAdmin ? ["*"] : ["dashboard"]),
                    crud: data.crud || {},
                    isAdmin,
                    isTeacher: role.includes("teacher"),
                    loaded: true,
                });
            })
            .catch(() => {
                // API failed → stay with JWT defaults, mark loaded
                setPerms(prev => ({ ...prev, loaded: true }));
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchTick]);

    return (
        <PermissionsContext.Provider value={{ ...perms, refreshPermissions }}>
            {children}
        </PermissionsContext.Provider>
    );
}

export function usePermissions() {
    return useContext(PermissionsContext);
}

/** True if the current role can access this module */
export function useCanAccess(moduleKey: string): boolean {
    const { modules, isAdmin } = usePermissions();
    if (isAdmin) return true;
    if (!modules?.length) return false;
    if (modules.includes("*")) return true;
    return modules.includes(moduleKey);
}

/** Returns CRUD capabilities for a module */
export function useModuleCrud(moduleKey: string) {
    const { crud, isAdmin } = usePermissions();
    if (isAdmin) return { canCreate: true, canRead: true, canUpdate: true, canDelete: true };
    const moduleCrud = crud?.[moduleKey] || crud?.["*"] || ["read"];
    return {
        canCreate: moduleCrud.includes("create"),
        canRead: true,
        canUpdate: moduleCrud.includes("update"),
        canDelete: moduleCrud.includes("delete"),
    };
}
