import { LegalShell, NAVY } from "./MarketingChrome";

export default function Privacy() {
  return (
    <LegalShell title="Privacy Policy" subtitle="How we collect, use and protect your data.">
      <div className="space-y-8 leading-relaxed text-slate-600">
        <p className="text-lg">
          ShuleCloud is committed to protecting the privacy of students, parents, staff, and school administrators.
        </p>
        <div>
          <h2 className="text-xl font-black mb-2" style={{ color: NAVY }}>Data We Collect</h2>
          <p>We collect school profiles, student records, guardian information, attendance data, academic records, and financial transactions — all necessary for school management operations.</p>
        </div>
        <div>
          <h2 className="text-xl font-black mb-2" style={{ color: NAVY }}>How We Protect Data</h2>
          <p>All data is encrypted in transit and at rest. Multi-tenant isolation ensures no school can access another school's data, with strict server-side tenant enforcement on every request.</p>
        </div>
        <div>
          <h2 className="text-xl font-black mb-2" style={{ color: NAVY }}>Data Retention</h2>
          <p>Data is retained for the duration of the subscription plus 90 days. Schools can export all their data at any time. Upon account cancellation, data is permanently deleted after the retention period.</p>
        </div>
        <p className="text-xs text-slate-400 pt-4 border-t border-slate-100">Last updated: February 28, 2026</p>
      </div>
    </LegalShell>
  );
}
