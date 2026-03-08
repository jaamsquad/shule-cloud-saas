import AppHeader from "@/components/AppHeader";
import StatCard from "@/components/StatCard";
import { BookOpen, Users, ClipboardCheck, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function HODDashboard() {
  return (
    <>
      <AppHeader title="HOD Dashboard" subtitle="Mathematics Department" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Teachers" value="6" icon={Users} iconBg="bg-accent" />
          <StatCard label="Avg Performance" value="72%" change="+3% vs last term" changeType="positive" icon={TrendingUp} iconBg="gradient-gold" />
          <StatCard label="Coverage" value="68%" icon={BookOpen} iconBg="bg-accent" />
          <StatCard label="Pending CATs" value="2" icon={ClipboardCheck} iconBg="gradient-gold" />
        </div>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-heading">Teacher Performance</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: "Mr. Ochieng", coverage: 75, avg: 74 },
              { name: "Mrs. Wambui", coverage: 70, avg: 71 },
              { name: "Mr. Kiprop", coverage: 62, avg: 68 },
              { name: "Ms. Nyambura", coverage: 65, avg: 73 },
            ].map(t => (
              <div key={t.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{t.name}</span>
                  <span className="text-xs text-muted-foreground">Coverage: {t.coverage}% · Avg: {t.avg}%</span>
                </div>
                <Progress value={t.coverage} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
