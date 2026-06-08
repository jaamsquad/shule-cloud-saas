import { useQuery } from "@tanstack/react-query";
import { Loader2, Megaphone } from "lucide-react";
import type { AxiosInstance } from "axios";
import { PageTitle, PanelCard } from "./PortalShell";

interface Props {
    api: AxiosInstance;
    endpoint: string;       // e.g. "/staff-portal/announcements"
    queryKey: string;
}

export default function AnnouncementsView({ api, endpoint, queryKey }: Props) {
    const { data = [], isLoading } = useQuery({
        queryKey: [queryKey],
        queryFn: async () => {
            const r = await api.get(endpoint);
            return Array.isArray(r.data) ? r.data : [];
        },
        retry: false,
    });

    return (
        <>
            <PageTitle title="Announcements" />
            <PanelCard title="School Announcements">
                {isLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
                    </div>
                ) : data.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-semibold">No announcements yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {data.map((a: any) => (
                            <div key={a._id} className={`rounded-md border p-4 ${a.priority === "Urgent" ? "border-rose-200 bg-rose-50" : "border-black/5 bg-slate-50"}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    {a.priority && (
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${a.priority === "Urgent" ? "bg-rose-500 text-white" : "bg-[#159a52] text-white"}`}>
                                            {a.priority}
                                        </span>
                                    )}
                                    <span className="text-[11px] text-slate-400 font-semibold">
                                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-GB") : ""}
                                    </span>
                                </div>
                                <p className="font-bold text-slate-800 text-sm">{a.title}</p>
                                <p className="text-slate-600 text-sm mt-0.5">{a.message}</p>
                            </div>
                        ))}
                    </div>
                )}
            </PanelCard>
        </>
    );
}
