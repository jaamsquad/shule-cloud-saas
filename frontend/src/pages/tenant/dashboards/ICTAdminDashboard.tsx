import AppHeader from "@/components/AppHeader";
import StatCard from "@/components/StatCard";
import { Monitor, Server, Shield, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ICTAdminDashboard() {
  return (
    <>
      <AppHeader title="ICT Admin Dashboard" subtitle="System Administration & Security" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Users" value="142" change="Online now" icon={Monitor} iconBg="bg-accent" />
          <StatCard label="Storage Used" value="12.4 GB" change="of 20 GB" icon={Server} iconBg="gradient-gold" />
          <StatCard label="Failed Logins" value="3" change="Last 24 hrs" changeType="negative" icon={Shield} iconBg="bg-accent" />
          <StatCard label="System Alerts" value="0" change="All clear" changeType="positive" icon={AlertTriangle} iconBg="gradient-gold" />
        </div>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-heading">Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {[
              { event: "User login: Head Teacher", time: "2 min ago", type: "info" },
              { event: "Backup completed", time: "1 hr ago", type: "success" },
              { event: "Failed login attempt: unknown@email.com", time: "3 hrs ago", type: "warning" },
              { event: "Role permissions updated: Class Teacher", time: "5 hrs ago", type: "info" },
            ].map((e, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className={`w-2 h-2 rounded-full ${e.type === "success" ? "bg-success" : e.type === "warning" ? "bg-warning" : "bg-info"}`} />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{e.event}</p>
                </div>
                <span className="text-xs text-muted-foreground">{e.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
