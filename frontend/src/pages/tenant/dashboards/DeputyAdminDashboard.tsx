import AppHeader from "@/components/AppHeader";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Home, Truck, Shield } from "lucide-react";

export default function DeputyAdminDashboard() {
  return (
    <>
      <AppHeader title="Deputy Administration Dashboard" subtitle="Operations & Facilities" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Staff on Duty" value="78" change="8 on leave" icon={Users} iconBg="bg-accent" />
          <StatCard label="Facilities" value="24" change="2 under maintenance" changeType="neutral" icon={Home} iconBg="gradient-gold" />
          <StatCard label="Transport Routes" value="6" icon={Truck} iconBg="bg-accent" />
          <StatCard label="Security Incidents" value="0" change="This week" changeType="positive" icon={Shield} iconBg="gradient-gold" />
        </div>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-heading">Pending Actions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {["3 leave requests pending approval", "Lab 2 maintenance scheduled for Monday", "Transport route update needed", "Gate security roster for next week"].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
