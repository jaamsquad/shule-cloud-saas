import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer, Landmark } from "lucide-react";
import { PageTitle, PanelCard } from "../../PortalShell";
import type { StudentCtx } from "../StudentLayout";

export default function FeeStructure() {
    const { student, api } = useOutletContext<StudentCtx>();

    const { data, isLoading } = useQuery({
        queryKey: ["sp_fee_structure"],
        queryFn: async () => (await api.get("/student-portal/fee-structure")).data,
        retry: false,
    });

    const items: any[] = data?.items || [];
    const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);

    return (
        <>
            <div className="flex items-center justify-between mb-4 print:hidden">
                <PageTitle title="Fee Structure" />
                <button onClick={() => window.print()}
                    className="inline-flex items-center gap-2 bg-[#0f2942] hover:bg-[#15395c] text-white text-sm font-bold px-4 py-2 rounded">
                    <Printer className="w-4 h-4" /> Print
                </button>
            </div>

            <PanelCard title={`Fee Structure — ${data?.term || student.class || student.programme || ""}`}>
                {isLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" /> Loading fee structure…
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <Landmark className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-semibold">No fee structure published for your class yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-500 border-b-2 border-black/10">
                                    <th className="py-2">#</th>
                                    <th className="py-2">Fee Item</th>
                                    <th className="py-2 text-right">Amount (KSh)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((it, i) => (
                                    <tr key={i} className="border-b border-black/5">
                                        <td className="py-2.5 text-slate-400">{i + 1}</td>
                                        <td className="py-2.5 font-semibold text-slate-700">{it.name || it.particular}</td>
                                        <td className="py-2.5 text-right text-slate-700">{Number(it.amount || 0).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-black/10 font-bold text-slate-800">
                                    <td className="py-3" colSpan={2}>Total Payable</td>
                                    <td className="py-3 text-right text-[#b08642]">KSh {total.toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </PanelCard>
        </>
    );
}
