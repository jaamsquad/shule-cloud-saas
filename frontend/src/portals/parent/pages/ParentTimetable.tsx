import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { PageTitle, PanelCard } from "../../PortalShell";
import TimetableGrid from "../../TimetableGrid";
import type { ParentCtx } from "../ParentLayout";

export default function ParentTimetable() {
    const { parent, api } = useOutletContext<ParentCtx>();

    const { data, isLoading } = useQuery({
        queryKey: ["parent_timetable"],
        queryFn: async () => (await api.get("/parent-portal/timetable")).data,
        retry: false,
    });

    return (
        <>
            <PageTitle title="Class Timetable" />
            <PanelCard title={`Timetable — ${parent.student?.class || ""}`}>
                {isLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
                    </div>
                ) : (
                    <TimetableGrid data={data} />
                )}
            </PanelCard>
        </>
    );
}
