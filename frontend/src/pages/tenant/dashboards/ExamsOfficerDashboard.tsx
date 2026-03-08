import AppHeader from "@/components/AppHeader";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, BookOpen, BarChart3, Clock } from "lucide-react";

export default function ExamsOfficerDashboard() {
  return (
    <>
      <AppHeader title="Exams Officer Dashboard" subtitle="Assessment & Results Management" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Active Exams" value="3" icon={ClipboardCheck} iconBg="bg-accent" />
          <StatCard label="Question Bank" value="2,847" change="questions" icon={BookOpen} iconBg="gradient-gold" />
          <StatCard label="Pending Moderation" value="5" change="Needs review" changeType="negative" icon={Clock} iconBg="bg-accent" />
          <StatCard label="Published Results" value="12" change="This term" icon={BarChart3} iconBg="gradient-gold" />
        </div>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-heading">Upcoming Assessments</CardTitle></CardHeader>
          <CardContent>
            {[
              { name: "Form 4 Mock Exams", date: "Mar 3-14", status: "Scheduled" },
              { name: "Form 2 CAT 2", date: "Mar 7", status: "Papers Ready" },
              { name: "Form 1 End Term", date: "Mar 24-28", status: "Blueprint Created" },
              { name: "Form 3 Practical Exam", date: "Mar 10", status: "Pending Papers" },
            ].map((a, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{a.date}</p>
                </div>
                <span className={`text-xs font-medium ${a.status === "Pending Papers" ? "text-warning" : "text-primary"}`}>{a.status}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
