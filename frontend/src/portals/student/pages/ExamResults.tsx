import { useOutletContext } from "react-router-dom";
import ReportCardView from "../../ReportCardView";
import type { StudentCtx } from "../StudentLayout";

export default function ExamResults() {
    const { api } = useOutletContext<StudentCtx>();
    return <ReportCardView api={api} base="/student-portal" title="Exam Results" />;
}
