import { Link } from "react-router-dom";
import { School } from "lucide-react";

export default function Privacy() {
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
      <div className="max-w-3xl mx-auto px-6 py-16 prose prose-sm">
        <h1 className="font-heading text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="text-muted-foreground mt-4 leading-relaxed">ShuleCloud is committed to protecting the privacy of students, parents, staff, and school administrators.</p>
        <h2 className="font-heading text-xl font-semibold text-foreground mt-8">Data We Collect</h2>
        <p className="text-muted-foreground leading-relaxed">We collect school profiles, student records, guardian information, attendance data, academic records, and financial transactions — all necessary for school management operations.</p>
        <h2 className="font-heading text-xl font-semibold text-foreground mt-8">How We Protect Data</h2>
        <p className="text-muted-foreground leading-relaxed">All data is encrypted in transit and at rest. Multi-tenant isolation ensures no school can access another school's data. We implement PostgreSQL Row Level Security and server-side tenant enforcement.</p>
        <h2 className="font-heading text-xl font-semibold text-foreground mt-8">Data Retention</h2>
        <p className="text-muted-foreground leading-relaxed">Data is retained for the duration of the subscription plus 90 days. Schools can export all their data at any time. Upon account cancellation, data is permanently deleted after the retention period.</p>
        <p className="text-muted-foreground mt-8 text-xs">Last updated: February 28, 2026</p>
      </div>
    </div>
  );
}
