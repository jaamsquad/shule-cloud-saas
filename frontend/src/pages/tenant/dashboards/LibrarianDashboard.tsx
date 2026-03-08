import AppHeader from "@/components/AppHeader";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Library, AlertTriangle, Users, BookOpen } from "lucide-react";

export default function LibrarianDashboard() {
  return (
    <>
      <AppHeader title="Library Dashboard" subtitle="Book Circulation & Catalog" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Books Issued Today" value="23" icon={BookOpen} iconBg="bg-accent" />
          <StatCard label="Overdue Books" value="47" change="12 > 14 days" changeType="negative" icon={AlertTriangle} iconBg="gradient-gold" />
          <StatCard label="Total Catalog" value="4,280" icon={Library} iconBg="bg-accent" />
          <StatCard label="Active Borrowers" value="312" icon={Users} iconBg="gradient-gold" />
        </div>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base font-heading">Recent Transactions</CardTitle></CardHeader>
          <CardContent>
            {[
              { student: "Jane Wanjiku", book: "Mathematics for JSS", action: "Issued", time: "10 min ago" },
              { student: "John Kamau", book: "English Grammar", action: "Returned", time: "30 min ago" },
              { student: "Faith Njeri", book: "CBC Science Textbook", action: "Issued", time: "1 hr ago" },
              { student: "Brian Kipchoge", book: "History of Kenya", action: "Overdue", time: "14 days" },
            ].map((t, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.student}</p>
                  <p className="text-xs text-muted-foreground">{t.book}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-medium ${t.action === "Overdue" ? "text-destructive" : t.action === "Returned" ? "text-success" : "text-primary"}`}>{t.action}</p>
                  <p className="text-xs text-muted-foreground">{t.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
