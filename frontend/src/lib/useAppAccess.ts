import { useMemo } from "react";
import { usePermissions } from "@/contexts/PermissionsContext";
import { navItems, CREATE_PATHS, type NavItem, type NavChild } from "@/components/navItems";
import { APPS, appGroupItems, appModuleKeys, type AppDef } from "@/lib/apps";

// Who may see which app, section and page:
//  • an app the platform owner switched off for the school is hidden for everyone
//  • a module not in the school's plan is shown locked
//  • admins see everything else; others see what their role grants —
//    "app.<key>" = the whole app, a capability = its app's modules, a page = that page
//  • holding any page permission of a section switches it to "only granted pages"
//  • "create/add" pages need the module's create right
export function useAppAccess() {
    const perms = usePermissions();

    return useMemo(() => {
        const granted = perms.permissions || [];
        const off = new Set(perms.disabledApps || []);
        const offModules = new Set(perms.disabledModules || []);
        const full = perms.isAdmin || perms.modules.includes("*") || granted.includes("*");
        const appGrants = new Set(granted.filter(c => c.startsWith("app.")).map(c => c.slice(4)));
        const grantedByApp = new Set(APPS.filter(a => appGrants.has(a.key)).flatMap(a => appModuleKeys(a)));

        const isPlanLocked = (moduleKey?: string) => !!moduleKey && !!perms.planModules && !perms.planModules.includes(moduleKey);
        const isOff = (moduleKey?: string) => !!moduleKey && offModules.has(moduleKey);
        const canModule = (moduleKey?: string) => {
            if (isOff(moduleKey)) return false;
            if (!moduleKey) return perms.isAdmin;
            if (full) return true;
            if (!perms.loaded) return false;
            if (moduleKey === "dashboard") return true;
            return perms.modules.includes(moduleKey) || grantedByApp.has(moduleKey);
        };
        const canGroup = (item: NavItem) => canModule(item.moduleKey);
        const visibleChildren = (item: NavItem): NavChild[] => (item.children || []).filter(child => {
            if (full) return true;
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
            if (off.has(app.key)) continue;
            const groups = appGroupItems(app);
            const visible = groups.filter(g => canGroup(g) && !isPlanLocked(g.moduleKey));
            const pathOk = !!app.path && (app.moduleKeys || []).some(m => canModule(m));
            const lockedOnly = !visible.length && groups.some(g => isPlanLocked(g.moduleKey) && (perms.isAdmin || canGroup(g)));
            if (visible.length || pathOk) apps.push({ ...app, locked: false, groupsVisible: visible });
            else if (lockedOnly) apps.push({ ...app, locked: true, groupsVisible: [] });
        }

        // A page is open to this person when any section they can see lists it
        // (e.g. the Secretary section links to the learner list).
        const base = (p: string) => p.split(/[?#]/)[0];
        const pageReachable = (pathname: string) => apps.some(a => !a.locked && a.groupsVisible.some(g =>
            visibleChildren(g).some(c => !c.path.startsWith("http") && base(c.path) === pathname)));
        const pageSwitchedOff = (pathname: string) => navItems.some(g => isOff(g.moduleKey) && (g.children || []).some(c => base(c.path) === pathname))
            && !pageReachable(pathname);

        return { apps, canGroup, canModule, visibleChildren, isPlanLocked, pageReachable, pageSwitchedOff, loaded: perms.loaded || perms.isAdmin, isAdmin: perms.isAdmin, navItems };
    }, [perms]);
}
