import { Suspense, lazy, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, FileBarChart } from "lucide-react";
import { COLLECTION_REPORTS, COMPUTED_REPORTS, CUSTOM_REPORTS } from "./reportsConfig";
import { GenericReportView } from "./GenericReport";
import { ComputedReportView } from "./ComputedReport";

// Unified entry point for every report: /reports/:reportKey.
// Dispatches to the right renderer based on which registry the key is found in.
export default function ReportViewer() {
  const { reportKey = "" } = useParams();

  const LazyCustom = useMemo(() => {
    const cfg = CUSTOM_REPORTS[reportKey];
    return cfg ? lazy(cfg.loader) : null;
  }, [reportKey]);

  if (COLLECTION_REPORTS[reportKey]) return <GenericReportView reportKey={reportKey} />;
  if (COMPUTED_REPORTS[reportKey]) return <ComputedReportView reportKey={reportKey} />;
  if (LazyCustom) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" /></div>}>
        <LazyCustom />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-slate-400">
      <FileBarChart className="w-12 h-12" /><p className="font-bold">This report isn't configured yet.</p>
      <Link to="/reports" className="text-[#2563EB] font-black text-sm">← Back to Reports Center</Link>
    </div>
  );
}
