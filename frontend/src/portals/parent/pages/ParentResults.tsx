import { useOutletContext } from "react-router-dom";
import ReportCardView from "../../ReportCardView";
import type { ParentCtx } from "../ParentLayout";

// Renders the child's results using the school's chosen report-card template.
export default function ParentResults() {
    const { api } = useOutletContext<ParentCtx>();
    return <ReportCardView api={api} base="/parent-portal" title="Exam Results" />;
}
