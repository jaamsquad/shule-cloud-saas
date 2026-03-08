import { Link } from "react-router-dom";
import { School, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const services = [
  { name: "Web Application", status: "operational", uptime: "99.99%" },
  { name: "API Gateway", status: "operational", uptime: "99.98%" },
  { name: "Database Cluster", status: "operational", uptime: "99.99%" },
  { name: "File Storage (S3)", status: "operational", uptime: "99.97%" },
  { name: "SMS Gateway", status: "operational", uptime: "99.90%" },
  { name: "Email Service", status: "operational", uptime: "99.95%" },
  { name: "WebSocket Server", status: "operational", uptime: "99.96%" },
  { name: "Background Jobs", status: "operational", uptime: "99.99%" },
];

export default function Status() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
              <School className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-xl font-bold text-foreground">ShuleCloud</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-20">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success mb-4">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">All Systems Operational</span>
          </div>
          <h1 className="font-heading text-3xl font-bold text-foreground">ShuleCloud Status</h1>
          <p className="mt-2 text-muted-foreground">Real-time status of all platform services.</p>
        </div>

        <div className="space-y-2">
          {services.map(s => (
            <Card key={s.name} className="shadow-card">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-success" />
                  <span className="text-sm font-medium text-foreground">{s.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{s.uptime} uptime</span>
                  <Badge variant="default" className="text-xs">Operational</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">Last updated: Feb 28, 2026 at 14:00 EAT</p>
      </div>
    </div>
  );
}
