import { useTerminology } from "@/hooks/useTerminology";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home, Settings, LayoutTemplate, BookOpen, User, Briefcase,
  Wallet, Banknote, CreditCard, UserCheck, Calendar, Pencil,
  Eye, ShoppingCart, MessageCircle, MessageSquare, Mail, Video,
  Copy, ClipboardList, FileText, Lock, Award, Truck, BookMarked, GraduationCap, Building2,
  Zap, Shield, Monitor, Utensils, Trophy, MapPin, DoorOpen, ClipboardCheck, Landmark
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";

// Shown when a school clicks a module their plan doesn't include.
const PLAN_LOCK_MSG = "This module is not included in your plan, contact for more @ 0726151104";
import { usePermissions } from "@/contexts/PermissionsContext";
import { groupSlug } from "@/lib/groupSlug";

// The nav list lives in navItems.tsx (shared with search, permissions and the mobile app export).
export { navItems, groupOverviewPath, PAGE_PERMISSIONS, PAGE_PERM_TO_MODULE, groupDashboardOptions, CREATE_PATHS } from "./navItems";
export type { NavItem, NavChild } from "./navItems";
import { navItems, groupOverviewPath, CREATE_PATHS } from "./navItems";
import { useAppAccess } from "@/lib/useAppAccess";

export default function AppSidebar() {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const perms = usePermissions();
  const access = useAppAccess();
  const words = useTerminology();   // Subjects / Exams follow the enabled curriculum (e.g. Learning Areas / Assessments)

  // A module is "plan-locked" when the school's PLAN doesn't include it.
  // planModules === null means unrestricted (all modules allowed by the plan).
  const isPlanLocked = (moduleKey?: string): boolean => {
    if (!moduleKey) return false;
    const plan = perms.planModules;
    if (!plan) return false;                 // no plan restriction → nothing locked
    return !plan.includes(moduleKey);        // module not in the plan → locked
  };

  // Filter nav items by DB-fetched permissions for this role.
  // Every sidebar item MUST have a moduleKey to be shown to non-admins.
  // Dashboard is the only exception — always visible when authenticated.
  // Plan-locked modules are KEPT (shown with a lock) rather than hidden.
  const visibleNavItems = navItems.filter(item => {
    // Modules ShuleCloud switched off for this school are hidden for everyone.
    if (item.moduleKey && perms.disabledModules?.includes(item.moduleKey)) return false;

    // Plan-locked modules stay visible (rendered locked) for everyone.
    if (isPlanLocked(item.moduleKey)) return true;

    // Admin → show everything else
    if (perms.isAdmin) return true;

    // Still fetching from DB → only show Dashboard to avoid incorrect flash
    if (!perms.loaded) return item.path === "/dashboard";

    const allowed = perms.modules;
    if (!allowed?.length) return false;
    if (allowed.includes("*")) return true;

    // Dashboard is always visible for authenticated users
    if (item.path === "/dashboard") return true;

    // Items without a moduleKey are hidden for non-admins
    if (!item.moduleKey) return false;

    // Role grants given for a whole area in Roles & Permissions also open its section.
    return allowed.includes(item.moduleKey) || access.canModule(item.moduleKey);
  });

  const { data: theme } = useQuery({
      queryKey: ["theme_settings"],
      queryFn: async () => {
          const r = await api.get("/theme_settings");
          return r.data?.[0];
      }
  });

  // Pending staff leave requests → badge on the "Leave Management" item.
  const { data: pendingLeave } = useQuery({
      queryKey: ["tsc_pending_leave"],
      queryFn: async () => { try { return (await api.get("/tsc/leave-requests/pending-count")).data?.count || 0; } catch { return 0; } },
      refetchInterval: 60000,
  });
  // New requests awaiting the current user → badge on "New Requests".
  const { data: reqCount } = useQuery({
      queryKey: ["req_count"],
      queryFn: async () => { try { return (await api.get("/requests/notifications/count")).data || { inbox: 0, unread: 0 }; } catch { return { inbox: 0, unread: 0 }; } },
      refetchInterval: 30000,
  });
  const badgeFor = (path: string): number =>
      path === "/tsc/leave" ? (pendingLeave || 0)
      : path === "/requests/inbox" ? (reqCount?.inbox || 0)
      : 0;

  const isDark = theme?.sidebarBackground === "dark";
  const activeBg = theme?.activeItemBackground || "bg-[#5C67F2]";

  useEffect(() => {
    // Expand the group that matches the current route
    const group = navItems.find(item => 
      item.children?.some(child => location.pathname === child.path || location.pathname.startsWith(child.path))
    );
    if (group && !expandedGroups.includes(group.label)) {
      // Accordion: only the active route's group stays open.
      setExpandedGroups([group.label]);
    }
  }, [location.pathname]);

  const toggleGroup = (label: string) => {
    // Accordion: opening a group closes any other open group.
    setExpandedGroups(prev => (prev.includes(label) ? [] : [label]));
  };

  return (
    <div className={`flex h-full ${isDark ? 'bg-gray-900 text-gray-300' : 'bg-white text-[#4b5563]'} shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20 transition-colors duration-300`}>
      <aside className={`w-64 flex flex-col border-r ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
        
        {/* Header / Logo */}
        <div className={`h-16 flex items-center px-6 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
           <span className={`font-bold text-xl ${isDark ? 'text-white' : 'text-gray-800'} tracking-tight`}>menu</span>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
          <ul className="space-y-1 px-3">
            {visibleNavItems.map(item => {
              const Icon = item.icon;
              const isExpanded = expandedGroups.includes(item.label);
              const planLocked = isPlanLocked(item.moduleKey);

              // Determine if active
              const isParentActive = item.children
                ? item.children.some(c => location.pathname === c.path || location.pathname.startsWith(c.path))
                : location.pathname === item.path;

              // ── Plan-locked module — visible but inert; click shows the message ──
              if (planLocked) {
                return (
                  <li key={item.label} className="relative">
                    <button
                      type="button"
                      onClick={() => toast.message(PLAN_LOCK_MSG, { duration: 6000 })}
                      title={PLAN_LOCK_MSG}
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors cursor-not-allowed ${isDark ? "hover:bg-gray-800/50 text-gray-600" : "hover:bg-gray-50 text-gray-400"}`}
                    >
                      <span className="flex items-center gap-4 flex-1 text-left">
                        <Icon className="w-[18px] h-[18px] opacity-50" strokeWidth={1.5} />
                        <span className="text-[13px] font-medium opacity-70">{words.label(item.label)}</span>
                      </span>
                      <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    </button>
                  </li>
                );
              }

              return (
                <li key={item.label} className="relative">
                  {/* Parent Item */}
                  <div
                    className={`flex items-center justify-between px-3 py-3 rounded-lg transition-colors ${
                      isParentActive
                        ? `${activeBg} text-white shadow-sm`
                        : isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    {/* Label → navigates to the group overview (or the page for leaf items) */}
                    <Link
                        to={item.children ? groupOverviewPath(item.label) : (item.path || "#")}
                        className="flex items-center gap-4 flex-1 cursor-pointer"
                    >
                      <Icon className={`w-[18px] h-[18px] ${isParentActive ? "text-white" : isDark ? "text-gray-400" : "text-gray-500"}`} strokeWidth={1.5} />
                      <span className={`text-[13px] ${isParentActive ? "font-bold" : "font-medium"}`}>
                        {words.label(item.label)}
                      </span>
                    </Link>

                    {/* Right side icon — toggles inline expansion without navigating */}
                    {item.locked ? (
                       <Lock className={`w-3 h-3 ${isParentActive ? 'text-white/70' : 'text-red-400'}`} />
                    ) : item.children ? (
                       <button
                         type="button"
                         onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleGroup(item.label); }}
                         className={`px-2 -mr-1 ${isParentActive ? 'text-white/80' : isDark ? 'text-gray-500' : 'text-gray-400'} text-lg font-light leading-none cursor-pointer`}
                         aria-label={isExpanded ? "Collapse" : "Expand"}
                       >
                         {isExpanded ? "-" : "+"}
                       </button>
                    ) : null}
                  </div>

                  {/* Children Accordion */}
                  <AnimatePresence>
                    {item.children && isExpanded && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className={`overflow-hidden border-l ${isDark ? 'border-gray-800' : 'border-gray-200'} ml-[23px] mt-1 space-y-1 mb-2`}
                      >
                        {item.children.filter(child => {
                          // A child locked by the school's plan is left out entirely, not
                          // shown greyed-out — same as the Sections grid on its group page.
                          if (isPlanLocked(child.planModule)) return false;

                          if (perms.isAdmin) return true;
                          const granted = perms.permissions || [];
                          const wildcard = granted.includes("*");

                          // ── Page-level permissions ──────────────────────────
                          // If the user holds ANY of this group's child page-perms,
                          // switch to fine-grained mode: only show pages explicitly
                          // granted. If they hold none, the module grant shows all
                          // children (backward compatible).
                          if (!wildcard) {
                            const groupPagePerms = (item.children || []).map(ch => ch.pagePerm).filter(Boolean) as string[];
                            const userHasSomePagePerm = groupPagePerms.some(p => granted.includes(p));
                            if (userHasSomePagePerm && child.pagePerm && !granted.includes(child.pagePerm)) return false;
                          }

                          // ── Create-page hiding ──────────────────────────────
                          if (!(child.create || CREATE_PATHS.has(child.path))) return true;
                          const mod = item.moduleKey;
                          if (!mod) return true;
                          const acts = (perms.crud && perms.crud[mod]) || [];
                          return acts.includes("create");
                        }).map((child, idx) => {
                          // Query-param children (e.g. /departments?tab=members) match on
                          // the full path+search; plain children match on pathname.
                          const isChildActive = child.path.includes('?')
                            ? (location.pathname + location.search) === child.path
                            : location.pathname === child.path || (child.path.includes('#') && location.pathname === child.path.split('#')[0]);

                          return (
                            <li key={idx} className="relative">
                              {child.path.startsWith("http") ? (
                                <a
                                  href={child.path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-3 px-4 py-2 text-[12px] transition-colors ${
                                    isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-850"
                                  }`}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-transparent"></div>
                                  {words.label(child.label)}
                                </a>
                              ) : child.path === "/logout" ? (
                                <button
                                  onClick={() => { window.location.href = "/logout"; }}
                                  className={`w-full flex items-center gap-3 px-4 py-2 text-[12px] transition-colors text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg`}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
                                  {words.label(child.label)}
                                </button>
                              ) : (
                                <Link
                                  to={child.path}
                                  className={`flex items-center gap-3 px-4 py-2 text-[12px] transition-colors ${
                                    isChildActive
                                      ? isDark ? "text-white font-bold" : "text-gray-900 font-bold"
                                      : isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-500 hover:text-gray-800"
                                  }`}
                                >
                                  {/* Bullet indicator */}
                                  <div className={`w-1.5 h-1.5 rounded-full ${isChildActive ? activeBg : "bg-transparent"}`}></div>
                                  {words.label(child.label)}
                                  {badgeFor(child.path) > 0 && (
                                    <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-500 text-white">{badgeFor(child.path)}</span>
                                  )}
                                  {child.locked && <Lock className="w-3 h-3 text-red-300 ml-auto" />}
                                </Link>
                              )}
                            </li>
                          );
                        })}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </div>
  );
}
