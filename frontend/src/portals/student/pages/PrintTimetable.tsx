import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer } from "lucide-react";
import { PageTitle, PanelCard } from "../../PortalShell";
import TimetableGrid from "../../TimetableGrid";
import type { StudentCtx } from "../StudentLayout";

export default function PrintTimetable() {
    const { student, api } = useOutletContext<StudentCtx>();

    const { data, isLoading } = useQuery({
        queryKey: ["sp_timetable"],
        queryFn: async () => (await api.get("/student-portal/timetable")).data,
        retry: false,
    });

    return (
        <>
            <div className="flex items-center justify-between mb-4 print:hidden">
                <PageTitle title="Print Timetable" />
                <button onClick={() => window.print()}
                    className="inline-flex items-center gap-2 bg-[#0f2942] hover:bg-[#15395c] text-white text-sm font-bold px-4 py-2 rounded">
                    <Printer className="w-4 h-4" /> Print
                </button>
            </div>

            <PanelCard title={`Class Timetable — ${student.class || student.programme || ""}`}>
                {isLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" /> Loading timetable…
                    </div>
                ) : (
                    <TimetableGrid data={data} />
                )}
            </PanelCard>
        </>
    );
}
