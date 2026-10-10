import { useTerminology } from "@/hooks/useTerminology";
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, HelpCircle, LogOut, ChevronRight, ExternalLink } from "lucide-react";
import { appForPath, appGroupItems, touchApp } from "@/lib/apps";
import { useAppAccess } from "@/lib/useAppAccess";
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

export { navItems, groupOverviewPath, PAGE_PERMISSIONS, PAGE_PERM_TO_MODULE, groupDashboardOptions, CREATE_PATHS } from "./navItems";
export type { NavItem, NavChild } from "./navItems";
import { groupOverviewPath, type NavItem, type NavChild } from "./navItems";

export default function AppSidebar() {
  const location = useLocation();
  const access = useAppAccess();
  const words = useTerminology();   // Subjects / Exams follow the enabled curriculum (e.g. Learning Areas / Assessments)
  const app = appForPath(location.pathname);
  const appView = app ? access.apps.find(a => a.key === app.key) : undefined;
  const [open, setOpen] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => { if (appView && !appView.locked) touchApp(appView.key); }, [appView?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: theme } = useQuery({
      queryKey: ["theme_settings"],
      queryFn: async () => { const r = await api.get("/theme_settings"); return r.data?.[0]; },
  });
  // Pending staff leave requests / new requests → badges.
  const { data: pendingLeave } = useQuery({
      queryKey: ["tsc_pending_leave"],
      queryFn: async () => { try { return (await api.get("/tsc/leave-requests/pending-count")).data?.count || 0; } catch { return 0; } },
      refetchInterval: 60000,
  });
  const { data: reqCount } = useQuery({
      queryKey: ["req_count"],
      queryFn: async () => { try { return (await api.get("/requests/notifications/count")).data || { inbox: 0, unread: 0 }; } catch { return { inbox: 0, unread: 0 }; } },
      refetchInterval: 30000,
  });
  const badgeFor = (path: string): number =>
      path === "/tsc/leave" ? (pendingLeave || 0) : path === "/requests/inbox" ? (reqCount?.inbox || 0) : 0;

  const isDark = theme?.sidebarBackground === "dark";
  const accent = "#5C67F2";
  const groups: NavItem[] = app ? appGroupItems(app).filter(g => access.canGroup(g) || access.isPlanLocked(g.moduleKey)) : [];

  const isChildActive = (path: string) => path.includes("?")
      ? (location.pathname + location.search) === path
      : location.pathname === path.split("#")[0] || location.pathname.startsWith(path.split("#")[0] + "/");

  // Open the section holding the current page
  useEffect(() => {
      const g = groups.find(gr => (gr.children || []).some(c => isChildActive(c.path)));
      if (g && !open.includes(g.label)) setOpen([g.label]);
  }, [location.pathname, app?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const rowCls = (active: boolean) => `w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors ${
      active ? (isDark ? "bg-white/10 text-white font-semibold ring-1 ring-white/20" : "bg-indigo-50 text-[#3f48c9] font-semibold ring-1 ring-[#5C67F2]/40")
             : (isDark ? "text-gray-400 hover:bg-gray-800 hover:text-gray-200" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")}`;

  const ChildLink = ({ child }: { child: NavChild }) => {
      if (child.path === "/logout") return null;
      if (child.path.startsWith("http")) return (
          <a href={child.path} target="_blank" rel="noopener noreferrer" className={rowCls(false)}><span className="truncate">{words.label(child.label)}</span><ExternalLink className="w-3 h-3 ml-auto opacity-50" /></a>
      );
      const active = isChildActive(child.path);
      return (
          <Link to={child.path} className={rowCls(active)}>
              <span className="truncate">{words.label(child.label)}</span>
              {badgeFor(child.path) > 0 && <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-500 text-white">{badgeFor(child.path)}</span>}
              {child.locked && <Lock className="w-3 h-3 text-red-300 ml-auto" />}
          </Link>
      );
  };

  const GroupBlock = ({ g, flat }: { g: NavItem; flat: boolean }) => {
      if (access.isPlanLocked(g.moduleKey)) return (
          <button type="button" onClick={() => toast.message(PLAN_LOCK_MSG, { duration: 6000 })} title={PLAN_LOCK_MSG} className={`${rowCls(false)} opacity-60 cursor-not-allowed`}>
              <span className="truncate">{words.label(g.label)}</span><Lock className="w-3.5 h-3.5 text-amber-400 ml-auto" />
          </button>
      );
      const kids = access.visibleChildren(g);
      if (flat) return <>{kids.map((c, i) => <ChildLink key={i} child={c} />)}</>;
      const isOpen = open.includes(g.label);
      const holdsActive = kids.some(c => isChildActive(c.path));
      return (
          <div>
              <button type="button" onClick={() => setOpen(o => (o.includes(g.label) ? o.filter(x => x !== g.label) : [g.label]))}
                  className={`${rowCls(false)} ${holdsActive ? (isDark ? "text-white" : "text-gray-900 font-semibold") : ""}`}>
                  <span className="truncate">{words.label(g.label)}</span>
                  <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${isOpen ? "rotate-90" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                  {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className={`ml-3 pl-2 border-l ${isDark ? "border-gray-800" : "border-gray-200"} space-y-0.5 py-1`}>
                              <Link to={groupOverviewPath(g.label)} className={rowCls(location.pathname === groupOverviewPath(g.label))}><span className="truncate">Overview</span></Link>
                              {kids.map((c, i) => <ChildLink key={i} child={c} />)}
                          </div>
                      </motion.div>
                  )}
              </AnimatePresence>
          </div>
      );
  };

  const AppIcon = app?.icon;
  return (
    <div className={`flex h-full ${isDark ? "bg-gray-900 text-gray-300" : "bg-white text-[#4b5563]"} shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20 transition-colors duration-300`}>
      <aside className={`w-64 flex flex-col border-r ${isDark ? "border-gray-800" : "border-gray-100"}`}>
        <div className={`h-16 flex items-center gap-3 px-5 border-b ${isDark ? "border-gray-800" : "border-gray-100"}`}>
          {app && AppIcon ? (
            <>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${app.color}18`, color: app.color }}><AppIcon className="w-4 h-4" /></span>
              <span className={`font-bold text-[15px] truncate ${isDark ? "text-white" : "text-gray-800"}`}>{app.name}</span>
            </>
          ) : <span className={`font-bold text-[15px] ${isDark ? "text-white" : "text-gray-800"}`}>Home</span>}
        </div>

        <nav className="flex-1 py-3 overflow-y-auto custom-scrollbar">
          {app && appView && !appView.locked && (
            <div className="px-3 space-y-0.5 pb-3 mb-3 border-b border-gray-100">
              {!app.path && <Link to={`/apps/${app.key}`} className={rowCls(location.pathname === `/apps/${app.key}`)}><LayoutGrid className="w-4 h-4" /> Dashboard</Link>}
              {app.path && <Link to={app.path} className={rowCls(location.pathname === app.path)}><LayoutGrid className="w-4 h-4" /> {app.name}</Link>}
              {groups.length === 1 ? <GroupBlock g={groups[0]} flat /> : groups.map(g => <GroupBlock key={g.label} g={g} flat={false} />)}
            </div>
          )}
          {app && appView?.locked && (
            <p className="mx-3 mb-3 p-3 rounded-lg bg-amber-50 text-amber-700 text-xs">{PLAN_LOCK_MSG}</p>
          )}
          {app && !appView && access.loaded && (
            <p className="mx-3 mb-3 p-3 rounded-lg bg-slate-50 text-slate-500 text-xs">You don't have access to {app.name}.</p>
          )}

          <div className="px-3 space-y-0.5">
            <Link to="/home" className={rowCls(location.pathname === "/home")}><Home className="w-4 h-4" /> Home</Link>
            <Link to="/apps" className={rowCls(location.pathname === "/apps")}><LayoutGrid className="w-4 h-4" /> Apps</Link>
            <Link to="/help" className={rowCls(location.pathname === "/help")}><HelpCircle className="w-4 h-4" /> Help</Link>
            <button type="button" onClick={() => setSettingsOpen(o => !o)} className={rowCls(false)}>
              <Settings className="w-4 h-4" /> Settings <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${settingsOpen ? "rotate-90" : ""}`} />
            </button>
            {settingsOpen && (
              <div className={`ml-3 pl-2 border-l ${isDark ? "border-gray-800" : "border-gray-200"} space-y-0.5`}>
                <Link to="/settings/account" className={rowCls(location.pathname === "/settings/account")}>My account & security</Link>
                {access.isAdmin && <Link to="/settings/profile" className={rowCls(location.pathname === "/settings/profile")}>School profile</Link>}
                {access.isAdmin && <Link to="/roles" className={rowCls(location.pathname === "/roles")}>Roles & permissions</Link>}
              </div>
            )}
            <button type="button" onClick={() => { window.location.href = "/logout"; }} className={`${rowCls(false)} hover:!text-rose-600`}><LogOut className="w-4 h-4" /> Logout</button>
          </div>
        </nav>
      </aside>
    </div>
  );
}
