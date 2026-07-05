import { LegalShell, NAVY } from "./MarketingChrome";

export default function Terms() {
  return (
    <LegalShell title="Terms of Service" badge="Legal Policy" subtitle="The terms that govern your use of ShuleCloud." lastUpdated="February 28, 2026">
      <div className="space-y-8 leading-relaxed text-slate-600">
        <p className="text-lg">
          By using ShuleCloud, you agree to these terms. ShuleCloud provides a multi-tenant school management platform designed for Kenyan schools following the CBC and 8-4-4 curricula.
        </p>
        <div>
          <h2 className="text-xl font-black mb-2" style={{ color: NAVY }}>1. Service Description</h2>
          <p>ShuleCloud provides cloud-based school management software including student management, academic tracking, fee management, timetabling, and other educational administration tools.</p>
        </div>
        <div>
          <h2 className="text-xl font-black mb-2" style={{ color: NAVY }}>2. Data Protection</h2>
          <p>We comply with the Kenya Data Protection Act (2019). All student and school data is encrypted, isolated per tenant, and stored securely within our infrastructure.</p>
        </div>
        <div>
          <h2 className="text-xl font-black mb-2" style={{ color: NAVY }}>3. Tenant Responsibilities</h2>
          <p>Each school is responsible for maintaining accurate records, managing user access, and ensuring compliance with Ministry of Education guidelines.</p>
        </div>
        <div>
          <h2 className="text-xl font-black mb-2" style={{ color: NAVY }}>4. Subscription &amp; Billing</h2>
          <p>Subscriptions are billed monthly or annually in KES. Failure to pay may result in account suspension with read-only access to allow data export.</p>
        </div>
        <p className="text-xs text-slate-400 pt-4 border-t border-slate-100">Last updated: February 28, 2026</p>
      </div>
    </LegalShell>
  );
}
