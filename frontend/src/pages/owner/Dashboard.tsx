import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield, Building2, CreditCard, Users, Activity,
  MoreVertical, CheckCircle, XCircle, Clock, LogOut, GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatCard from "@/components/StatCard";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import OwnerAnalytics from "./OwnerAnalytics";
import OwnerUsers from "./OwnerUsers";
import OwnerPlansManager from "./OwnerPlansManager";
import OwnerMessages from "./OwnerMessages";
import OwnerSettings from "./OwnerSettings";
import OwnerReminders from "./OwnerReminders";
import OwnerBroadcast from "./OwnerBroadcast";
import OwnerWhatsApp from "./OwnerWhatsApp";
import OwnerProfile from "./OwnerProfile";
import OwnerBlog from "./blog/OwnerBlog";
import OwnerBusiness from "./business/OwnerBusiness";

// Owner role from JWT → drives which tabs/actions are visible.
const ownerRole = (): string => {
  try { const t = localStorage.getItem("owner_token"); if (!t) return "super_owner"; return String(JSON.parse(atob(t.split(".")[1])).role || "").toLowerCase(); } catch { return ""; }
};

type OwnerTab = "analytics" | "tenants" | "plans" | "billing" | "users" | "messages" | "settings" | "reminders" | "communicate" | "whatsapp" | "blog" | "business" | "profile";

export default function OwnerDashboard({ initialTab }: { initialTab?: OwnerTab } = {}) {
  const role = ownerRole();
  const isSuper = role === "super_owner";
  const canUsers = isSuper || role === "owner";
  const canPlans = isSuper || role === "owner" || role === "sales";
  const [tab, setTab] = useState<OwnerTab>(initialTab || "analytics");
  const navigate = useNavigate();

  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ["owner-tenants"],
    queryFn: async () => {
      const res = await api.get("/owner/tenants");
      return res.data;
    }
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["owner-plans"],
    queryFn: async () => {
      const res = await api.get("/owner/plans");
      return res.data;
    }
  });

  const { data: revenue, isLoading: revenueLoading } = useQuery({
    queryKey: ["owner-revenue"],
    queryFn: async () => {
      const res = await api.get("/owner/billing/revenue-report");
      return res.data;
    }
  });

  // Compute stats from real data
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t: any) => t.status === 'active').length;
  const totalRevenue = revenue?.totalRevenue || 0;

  const handleLogout = () => {
    localStorage.removeItem('owner_token');
    navigate('/owner');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Owner Header — white, logo + "Administration Portal" only */}
      <header className="h-16 bg-white border-b border-slate-100 flex items-center px-6 justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: "#534AB7" }}>
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="text-xl font-black text-slate-900">Shule<span style={{ color: "#534AB7" }}>Cloud</span></span>
          <span className="ml-3 pl-3 border-l border-slate-200 text-sm font-semibold text-slate-500">Administration Portal</span>
        </div>
        <button onClick={handleLogout} className="text-slate-400 hover:text-slate-700 transition-colors" title="Logout">
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Quick navigation */}
        <div className="flex flex-wrap gap-2">
          {[["Tenants", "/owner/tenants"], ["Organizations", "/owner/organizations"], ["Communications", "/owner/communications"], ["Plans", "/owner/plans"], ["Billing", "/owner/billing"], ["Invoices & Contracts", "/owner/business"], ["Audit", "/owner/audit"]].map(([label, path]) => (
            <Link key={path} to={path} className="h-9 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-sm flex items-center hover:border-[#534AB7] hover:text-[#534AB7] transition-colors">{label}</Link>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Schools"
            value={tenantsLoading ? "..." : totalTenants.toLocaleString()}
            change={`${activeTenants} active`}
            changeType="positive"
            icon={Building2}
            iconBg="bg-accent"
          />
          <StatCard
            label="Active Plans"
            value={plansLoading ? "..." : plans.length.toLocaleString()}
            change="Available tiers"
            icon={CreditCard}
            iconBg="gradient-gold"
          />
          <StatCard
            label="Platform Revenue"
            value={revenueLoading ? "..." : `KES ${totalRevenue.toLocaleString()}`}
            change="Total collected"
            changeType="positive"
            icon={Activity}
            iconBg="bg-accent"
          />
          <StatCard
            label="Active Subscriptions"
            value={tenantsLoading ? "..." : tenants.filter((t: any) => t.subscription).length.toLocaleString()}
            icon={Users}
            iconBg="gradient-gold"
          />
        </div>

        {/* Tabs — filtered by the owner user's role */}
        <div className="flex gap-1 border-b border-border flex-wrap">
          {(["analytics", "tenants", "plans", "billing", "business", "users", "reminders", "communicate", "whatsapp", "blog", "messages", "settings", "profile"] as const)
            .filter(t => {
              if (t === "users" && !canUsers) return false;
              if (t === "plans" && !canPlans) return false;
              if (t === "whatsapp" && !isSuper) return false;
              if (t === "blog" && !isSuper) return false;
              if (t === "business" && !(isSuper || role === "owner" || role === "finance" || role === "sales")) return false;
              return true;
            })
            .map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "analytics" && <OwnerAnalytics />}

        {tab === "users" && <OwnerUsers />}

        {tab === "messages" && <OwnerMessages />}

        {tab === "reminders" && <OwnerReminders />}

        {tab === "communicate" && <OwnerBroadcast />}

        {tab === "whatsapp" && <OwnerWhatsApp />}

        {tab === "blog" && <OwnerBlog />}

        {tab === "business" && <OwnerBusiness />}

        {tab === "settings" && <OwnerSettings />}

        {tab === "profile" && <OwnerProfile />}

        {tab === "tenants" && (
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading">Tenant Schools</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">SCHOOL</TableHead>
                    <TableHead className="text-xs">SUBDOMAIN</TableHead>
                    <TableHead className="text-xs">PLAN</TableHead>
                    <TableHead className="text-xs">STATUS</TableHead>
                    <TableHead className="text-xs">CREATED</TableHead>
                    <TableHead className="text-xs w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground animate-pulse">Loading schools...</TableCell>
                    </TableRow>
                  ) : tenants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No schools registered yet.</TableCell>
                    </TableRow>
                  ) : (
                    tenants.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-sm">{t.name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-primary font-mono">
                            {(t.subdomain || t.domains?.[0]?.domain || t.name?.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'school')}.shulecloud.com
                          </code>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{t.planName || t.subscription?.plan?.name || "No Plan"}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {t.status === 'active' ? <CheckCircle className="w-3.5 h-3.5 text-success" /> : <XCircle className="w-3.5 h-3.5 text-destructive" />}
                            <span className="text-xs capitalize">{t.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" className="h-8 text-xs font-bold" onClick={() => navigate(`/owner/schools/${t._id || t.id}`)}>
                            Manage School
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {tab === "plans" && <OwnerPlansManager />}

        {tab === "billing" && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base font-heading">Revenue Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <p className="text-3xl font-bold text-primary">KES {totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">Total platform revenue collected</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate("/owner/billing")}>
                  View Full Billing Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
