import AppHeader from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle } from "lucide-react";

const notifications = [
  { title: "Fee payment received", body: "KES 45,000 from guardian Mary Mwangi for Jane Wanjiku", time: "2 min ago", read: false },
  { title: "Exam results ready", body: "Form 3A Mid-Term results have been compiled and are ready for review", time: "1 hr ago", read: false },
  { title: "Leave request", body: "Mr. Ochieng has requested 3 days personal leave (Mar 3-5)", time: "3 hrs ago", read: true },
  { title: "Library overdue alert", body: "12 books are overdue for return. See library report for details", time: "5 hrs ago", read: true },
  { title: "System update", body: "ShuleCloud v2.4 deployed with new timetable features", time: "1 day ago", read: true },
];

export default function Notifications() {
  return (
    <>
      <AppHeader title="Notifications" subtitle="Stay updated on school activities" />
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {notifications.map((n, i) => (
          <Card key={i} className={`shadow-card cursor-pointer transition-shadow hover:shadow-card-hover ${!n.read ? "border-l-2 border-l-primary" : ""}`}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${!n.read ? "bg-primary/10" : "bg-muted"}`}>
                <Bell className={`w-4 h-4 ${!n.read ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm ${!n.read ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>{n.title}</p>
                  {!n.read && <Badge className="text-xs h-5">New</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{n.time}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
