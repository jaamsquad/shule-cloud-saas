import AppHeader from "@/components/AppHeader";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, BookOpen, ClipboardCheck, Clock, Check } from "lucide-react";

export default function TeacherDashboard() {
  const todayLessons = [
    { time: "8:00 - 8:40", class: "Form 1A", subject: "Mathematics", room: "R101" },
    { time: "9:20 - 10:00", class: "Form 2B", subject: "Mathematics", room: "R203" },
    { time: "10:30 - 11:10", class: "Form 3A", subject: "Mathematics", room: "R301" },
    { time: "1:30 - 2:10", class: "Form 1B", subject: "Mathematics", room: "R102" },
  ];

  return (
    <>
      <AppHeader title="Teacher Dashboard" subtitle="Mr. Ochieng · Mathematics Department" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Today's Lessons" value="4" icon={Calendar} iconBg="bg-accent" />
          <StatCard label="Weekly Load" value="28" change="lessons" icon={Clock} iconBg="gradient-gold" />
          <StatCard label="Pending Marks" value="2" change="CATs to mark" changeType="negative" icon={ClipboardCheck} iconBg="bg-accent" />
          <StatCard label="Coverage" value="72%" change="+5% this week" changeType="positive" icon={BookOpen} iconBg="gradient-gold" />
        </div>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-heading">Today's Timetable</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayLessons.map((l, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <span className="text-xs font-mono text-muted-foreground w-24">{l.time}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{l.subject} — {l.class}</p>
                    <p className="text-xs text-muted-foreground">{l.room}</p>
                  </div>
                  <button className="text-xs text-primary hover:underline">Take Attendance</button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
