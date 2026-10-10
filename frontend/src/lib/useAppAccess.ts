import { useMemo } from "react";
import { usePermissions } from "@/contexts/PermissionsContext";
import { navItems, CREATE_PATHS, type NavItem, type NavChild } from "@/components/navItems";
import { APPS, appGroupItems, appModuleKeys, type AppDef } from "@/lib/apps";

// Who may see which app, group and page — the same rules the sidebar always used:
//  • a module not in the school's plan is shown locked
//  • admins see everything; others see modules their role grants ("app.<key>" grants an app)
//  • holding any page permission of a group switches that group to "only granted pages"
//  • "create/add" pages need the module's create right
export function useAppAccess() {
    const perms = usePermissions();

    return useMemo(() => {
        const granted = perms.permissions || [];
        const allMods = perms.isAdmin || perms.modules.includes("*") || granted.includes("*");
        const appGrants = new Set(granted.filter(c => c.startsWith("app.")).map(c => c.slice(4)));
        const grantedByApp = new Set(APPS.filter(a => appGrants.has(a.key)).flatMap(a => appModuleKeys(a)));

        const isPlanLocked = (moduleKey?: string) => !!moduleKey && !!perms.planModules && !perms.planModules.includes(moduleKey);
        const canModule = (moduleKey?: string) => {
            if (!moduleKey) return perms.isAdmin;
            if (allMods) return true;
            if (!perms.loaded) return false;
            if (moduleKey === "dashboard") return true;
            return perms.modules.includes(moduleKey) || grantedByApp.has(moduleKey);
        };
        const canGroup = (item: NavItem) => canModule(item.moduleKey);
        const visibleChildren = (item: NavItem): NavChild[] => (item.children || []).filter(child => {
            if (perms.isAdmin || granted.includes("*")) return true;
            const groupPagePerms = (item.children || []).map(ch => ch.pagePerm).filter(Boolean) as string[];
            const fineGrained = groupPagePerms.some(p => granted.includes(p));
            if (fineGrained && child.pagePerm && !granted.includes(child.pagePerm)) return false;
            if (!(child.create || CREATE_PATHS.has(child.path))) return true;
            const acts = (item.moduleKey && perms.crud?.[item.moduleKey]) || [];
            return acts.includes("create");
        });

        type AppView = AppDef & { locked: boolean; groupsVisible: NavItem[] };
        const apps: AppView[] = [];
        for (const app of APPS) {
            const groups = appGroupItems(app);
            const visible = groups.filter(g => canGroup(g) && !isPlanLocked(g.moduleKey));
            const pathOk = !!app.path && (app.moduleKeys || []).some(m => canModule(m));
            const lockedOnly = !visible.length && groups.some(g => isPlanLocked(g.moduleKey) && (perms.isAdmin || canGroup(g)));
            if (visible.length || pathOk) apps.push({ ...app, locked: false, groupsVisible: visible });
            else if (lockedOnly) apps.push({ ...app, locked: true, groupsVisible: [] });
        }
        return { apps, canGroup, visibleChildren, isPlanLocked, loaded: perms.loaded || perms.isAdmin, isAdmin: perms.isAdmin, navItems };
    }, [perms]);
}
