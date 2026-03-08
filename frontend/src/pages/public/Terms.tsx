import { Link } from "react-router-dom";
import { School } from "lucide-react";

export default function Terms() {
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
        <h1 className="font-heading text-3xl font-bold text-foreground">Terms of Service</h1>
        <p className="text-muted-foreground mt-4 leading-relaxed">
          By using ShuleCloud, you agree to these terms. ShuleCloud provides a multi-tenant school management platform designed for Kenyan high schools following the CBC curriculum.
        </p>
        <h2 className="font-heading text-xl font-semibold text-foreground mt-8">1. Service Description</h2>
        <p className="text-muted-foreground leading-relaxed">ShuleCloud provides cloud-based school management software including student management, academic tracking, fee management, timetabling, and other educational administration tools.</p>
        <h2 className="font-heading text-xl font-semibold text-foreground mt-8">2. Data Protection</h2>
        <p className="text-muted-foreground leading-relaxed">We comply with the Kenya Data Protection Act (2019). All student and school data is encrypted, isolated per tenant, and stored securely within our infrastructure.</p>
        <h2 className="font-heading text-xl font-semibold text-foreground mt-8">3. Tenant Responsibilities</h2>
        <p className="text-muted-foreground leading-relaxed">Each school is responsible for maintaining accurate records, managing user access, and ensuring compliance with Ministry of Education guidelines.</p>
        <h2 className="font-heading text-xl font-semibold text-foreground mt-8">4. Subscription & Billing</h2>
        <p className="text-muted-foreground leading-relaxed">Subscriptions are billed monthly or annually in KES. Failure to pay may result in account suspension with read-only access to allow data export.</p>
        <p className="text-muted-foreground mt-8 text-xs">Last updated: February 28, 2026</p>
      </div>
    </div>
  );
}
