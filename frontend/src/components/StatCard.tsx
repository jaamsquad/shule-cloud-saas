import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconBg?: string;
}

export default function StatCard({ label, value, change, changeType = "neutral", icon: Icon, iconBg }: StatCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-card-hover transition-shadow animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-heading font-bold text-card-foreground">{value}</p>
          {change && (
            <p className={`text-xs font-medium ${
              changeType === "positive" ? "text-success" :
              changeType === "negative" ? "text-destructive" :
              "text-muted-foreground"
            }`}>
              {change}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg || "bg-accent"}`}>
          <Icon className="w-5 h-5 text-accent-foreground" />
        </div>
      </div>
    </div>
  );
}
