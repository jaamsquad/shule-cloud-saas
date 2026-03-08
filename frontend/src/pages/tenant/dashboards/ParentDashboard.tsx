import AppHeader from "@/components/AppHeader";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, UserCheck, BarChart3, Bell, BookOpen, Calendar } from "lucide-react";

export default function ParentDashboard() {
  return (
    <>
      <AppHeader title="Parent Portal" subtitle="Welcome, Mrs. Mary Mwangi" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="bg-accent/50 border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-heading font-bold text-sm">JW</div>
          <div>
            <p className="text-sm font-medium text-foreground">Jane Wanjiku Mwangi</p>
            <p className="text-xs text-muted-foreground">Form 1A · ADM-001</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Fee Balance" value="KES 35,000" change="Due Mar 15" changeType="negative" icon={CreditCard} iconBg="bg-accent" />
          <StatCard label="Attendance" value="96.5%" change="This term" changeType="positive" icon={UserCheck} iconBg="gradient-gold" />
          <StatCard label="Class Rank" value="5th" change="Out of 42" icon={BarChart3} iconBg="bg-accent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base font-heading">Recent Results</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { subject: "Mathematics", score: "78/100", grade: "B+" },
                { subject: "English", score: "82/100", grade: "A-" },
                { subject: "Kiswahili", score: "71/100", grade: "B" },
                { subject: "Science", score: "85/100", grade: "A-" },
              ].map(r => (
                <div key={r.subject} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <span className="text-sm text-foreground">{r.subject}</span>
                  <div className="text-right">
                    <span className="text-sm font-medium text-foreground mr-2">{r.score}</span>
                    <span className="text-xs text-primary font-medium">{r.grade}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader><CardTitle className="text-base font-heading">Notices</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { title: "PTA Meeting", date: "Mar 8, 2:00 PM" },
                { title: "Sports Day", date: "Mar 15" },
                { title: "Fee deadline reminder", date: "Mar 15" },
                { title: "Term 1 report cards ready", date: "Apr 5" },
              ].map(n => (
                <div key={n.title} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <Bell className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.date}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
