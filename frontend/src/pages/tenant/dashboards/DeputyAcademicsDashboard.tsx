import AppHeader from "@/components/AppHeader";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, ClipboardCheck, Calendar, AlertTriangle } from "lucide-react";

export default function DeputyAcademicsDashboard() {
  return (
    <>
      <AppHeader title="Deputy Academics Dashboard" subtitle="Curriculum & Assessment Overview" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Syllabus Coverage" value="67%" change="+8% this term" changeType="positive" icon={BookOpen} iconBg="bg-accent" />
          <StatCard label="Exams Completed" value="12/18" icon={ClipboardCheck} iconBg="gradient-gold" />
          <StatCard label="Timetable Conflicts" value="2" change="Needs attention" changeType="negative" icon={Calendar} iconBg="bg-accent" />
          <StatCard label="Pending Results" value="3" icon={AlertTriangle} iconBg="gradient-gold" />
        </div>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-heading">Coverage by Learning Area</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: "Mathematics", pct: 72 }, { name: "English", pct: 68 },
              { name: "Kiswahili", pct: 75 }, { name: "Science & Tech", pct: 60 },
              { name: "Social Studies", pct: 65 }, { name: "Agriculture", pct: 55 },
            ].map(s => (
              <div key={s.name} className="space-y-1">
                <div className="flex justify-between text-sm"><span>{s.name}</span><span className="font-medium">{s.pct}%</span></div>
                <Progress value={s.pct} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
