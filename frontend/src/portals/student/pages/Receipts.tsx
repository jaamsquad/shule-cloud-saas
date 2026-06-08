import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Receipt as ReceiptIcon, Printer } from "lucide-react";
import { PageTitle } from "../../PortalShell";
import { useBranding } from "../../useBranding";
import { printOfficialReceipt } from "../../printReceipt";
import { studentApi } from "../studentApi";
import type { StudentCtx } from "../StudentLayout";

export default function Receipts() {
    const { student, api } = useOutletContext<StudentCtx>();
    const { data: brand } = useBranding(studentApi);

    const { data = [], isLoading } = useQuery({
        queryKey: ["sp_receipts"],
        queryFn: async () => {
            const r = await api.get("/student-portal/receipts");
            return Array.isArray(r.data) ? r.data : [];
        },
        retry: false,
    });

    const { data: fees } = useQuery({
        queryKey: ["sp_fees_for_receipt"],
        queryFn: async () => (await api.get("/student-portal/fees")).data,
        retry: false,
    });

    const fmtAmount = (n: number) =>
        Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const printReceipt = (rcpt: any) => {
        printOfficialReceipt(
            {
                schoolName: brand?.name || student.schoolName,
                schoolCrest: brand?.logo || null,
                studentName: student.name,
                studentNo: student.registrationNo,
                feesBalance: fees?.balance ?? null,
            },
            rcpt,
        );
    };

    return (
        <>
            <PageTitle title="Receipts" />

            <div className="bg-white rounded-md shadow-sm border border-black/5 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-12 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" /> Loading receipts…
                    </div>
                ) : data.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <ReceiptIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-semibold">No receipts found for your account.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#1a1a1a] text-white text-left">
                                    <th className="px-5 py-3 font-bold">Receipt No</th>
                                    <th className="px-5 py-3 font-bold">Date</th>
                                    <th className="px-5 py-3 font-bold">Payment Mode</th>
                                    <th className="px-5 py-3 font-bold text-right">Amount</th>
                                    <th className="px-5 py-3 font-bold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((r: any, i: number) => (
                                    <tr key={r._id} className={i % 2 ? "bg-slate-50" : "bg-white"}>
                                        <td className="px-5 py-3.5 font-semibold text-slate-700">{r.receiptNo}</td>
                                        <td className="px-5 py-3.5 text-slate-600">{r.date ? new Date(r.date).toLocaleDateString("en-GB") : "—"}</td>
                                        <td className="px-5 py-3.5 text-[#b08642] font-medium">{r.paymentMode}</td>
                                        <td className="px-5 py-3.5 text-right text-slate-700 font-semibold">{fmtAmount(r.amount)}</td>
                                        <td className="px-5 py-3.5 text-right">
                                            <button onClick={() => printReceipt(r)}
                                                className="inline-flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-3 py-2 rounded">
                                                <Printer className="w-3.5 h-3.5" /> Print Receipt
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
