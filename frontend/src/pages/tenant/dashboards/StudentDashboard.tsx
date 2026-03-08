import AppHeader from "@/components/AppHeader";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, BookOpen, ClipboardCheck, Bell } from "lucide-react";

export default function StudentDashboard() {
  return (
    <>
      <AppHeader title="Student Portal" subtitle="Welcome, Jane Wanjiku · Form 1A" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Today's Lessons" value="8" icon={Calendar} iconBg="bg-accent" />
          <StatCard label="Assignments Due" value="3" change="This week" changeType="negative" icon={ClipboardCheck} iconBg="gradient-gold" />
          <StatCard label="Term Average" value="76%" change="+3% vs last term" changeType="positive" icon={BookOpen} iconBg="bg-accent" />
          <StatCard label="Library Books" value="2" change="1 due soon" icon={BookOpen} iconBg="gradient-gold" />
        </div>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-heading">Today's Timetable</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { time: "8:00", subject: "Mathematics", teacher: "Mr. Ochieng" },
                { time: "8:40", subject: "English", teacher: "Ms. Njeri" },
                { time: "9:20", subject: "Kiswahili", teacher: "Mr. Wafula" },
                { time: "10:30", subject: "Science & Tech", teacher: "Dr. Kamau" },
                { time: "11:10", subject: "Social Studies", teacher: "Ms. Akinyi" },
                { time: "11:50", subject: "CRE", teacher: "Mr. Mwangi" },
              ].map(l => (
                <div key={l.time} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/30">
                  <span className="text-xs font-mono text-muted-foreground w-12">{l.time}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{l.subject}</p>
                    <p className="text-xs text-muted-foreground">{l.teacher}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
