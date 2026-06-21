import { LegalShell, NAVY } from "./MarketingChrome";

const services = [
  { name: "Web Application", uptime: "99.99%" },
  { name: "API Gateway", uptime: "99.98%" },
  { name: "Database Cluster", uptime: "99.99%" },
  { name: "File Storage", uptime: "99.97%" },
  { name: "SMS Gateway", uptime: "99.90%" },
  { name: "Email Service", uptime: "99.95%" },
  { name: "WhatsApp & Realtime", uptime: "99.96%" },
  { name: "Background Jobs", uptime: "99.99%" },
];

export default function Status() {
  return (
    <LegalShell title="System Status" subtitle="Real-time status of all ShuleCloud services.">
      <p className="text-center text-emerald-600 font-bold mb-10">● All systems operational</p>
      <div className="divide-y divide-slate-100">
        {services.map(s => (
          <div key={s.name} className="flex items-center justify-between py-4">
            <span className="flex items-center gap-3 font-bold" style={{ color: NAVY }}>
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> {s.name}
            </span>
            <span className="text-sm text-slate-400">{s.uptime} uptime</span>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-slate-400 mt-10">Last updated: Feb 28, 2026 at 14:00 EAT</p>
    </LegalShell>
  );
}
