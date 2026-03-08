import AppHeader from "@/components/AppHeader";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, AlertTriangle, Users, Activity } from "lucide-react";

export default function NurseDashboard() {
  return (
    <>
      <AppHeader title="Clinic Dashboard" subtitle="Student Health & Wellness" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Visits Today" value="8" icon={Heart} iconBg="bg-accent" />
          <StatCard label="In Sickbay" value="2" icon={Activity} iconBg="gradient-gold" />
          <StatCard label="Medical Alerts" value="15" change="Allergies/chronic" changeType="neutral" icon={AlertTriangle} iconBg="bg-accent" />
          <StatCard label="Referrals This Term" value="4" icon={Users} iconBg="gradient-gold" />
        </div>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-heading">Today's Visits</CardTitle></CardHeader>
          <CardContent>
            {[
              { student: "Jane Wanjiku", complaint: "Headache", time: "9:30 AM", status: "Treated & Released" },
              { student: "John Kamau", complaint: "Stomach ache", time: "10:15 AM", status: "In Sickbay" },
              { student: "Faith Njeri", complaint: "Minor cut (PE)", time: "11:00 AM", status: "Treated & Released" },
              { student: "David Ochieng", complaint: "Asthma flare-up", time: "11:45 AM", status: "In Sickbay" },
            ].map((v, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{v.student}</p>
                  <p className="text-xs text-muted-foreground">{v.complaint}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-medium ${v.status.includes("Sickbay") ? "text-warning" : "text-success"}`}>{v.status}</p>
                  <p className="text-xs text-muted-foreground">{v.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
