import AppHeader from "@/components/AppHeader";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, TrendingUp, AlertTriangle, Receipt } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function BursarDashboard() {
  return (
    <>
      <AppHeader title="Bursar Dashboard" subtitle="Financial Overview · Term 1, 2026" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Collections Today" value="KES 234K" change="+15% vs yesterday" changeType="positive" icon={CreditCard} iconBg="bg-accent" />
          <StatCard label="Term Collection" value="78%" icon={TrendingUp} iconBg="gradient-gold" />
          <StatCard label="Arrears" value="KES 4.1M" change="342 students" changeType="negative" icon={AlertTriangle} iconBg="bg-accent" />
          <StatCard label="Invoices Sent" value="1,247" icon={Receipt} iconBg="gradient-gold" />
        </div>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-heading">Arrears Aging</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { range: "0-30 days", amount: "KES 1.2M", pct: 30 },
              { range: "31-60 days", amount: "KES 1.5M", pct: 37 },
              { range: "61-90 days", amount: "KES 800K", pct: 20 },
              { range: "90+ days", amount: "KES 600K", pct: 15 },
            ].map(a => (
              <div key={a.range} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground">{a.range}</span>
                  <span className="font-medium text-foreground">{a.amount}</span>
                </div>
                <Progress value={a.pct} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
