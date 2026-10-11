import { useEffect, useRef, useState } from "react";
import { MessageSquare, Wallet, Smartphone, History, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

const QUICK_AMOUNTS = [50, 100, 250, 500, 1000];

export default function SmsCredits() {
    const [phone, setPhone] = useState("");
    const [amount, setAmount] = useState<number | "">(100);
    const [paying, setPaying] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const pollRef = useRef<number | null>(null);
    const queryClient = useQueryClient();

    const { data: wallet, isLoading } = useQuery({
        queryKey: ["sms-wallet"],
        queryFn: async () => (await api.get("/sms/wallet")).data,
    });

    const { data: ledger = [] } = useQuery({
        queryKey: ["sms-wallet-ledger"],
        queryFn: async () => (await api.get("/sms/wallet/ledger")).data,
    });

    useEffect(() => () => { if (pollRef.current) window.clearInterval(pollRef.current); }, []);

    const smsForAmount = (ksh: number) => wallet ? Math.floor(ksh * (wallet.smsPerKsh || 0)) : 0;

    const refreshWallet = () => {
        queryClient.invalidateQueries({ queryKey: ["sms-wallet"] });
        queryClient.invalidateQueries({ queryKey: ["sms-wallet-ledger"] });
    };

    const handleBuy = async () => {
        const amt = Number(amount);
        if (!amt || amt < 1) { toast.error("Enter an amount in KSH"); return; }
        if (!/^0?7\d{8}$|^0?1\d{8}$|^254(7|1)\d{8}$/.test(phone.replace(/\s/g, ""))) { toast.error("Enter a valid Safaricom number, e.g. 0712 345 678"); return; }
        setPaying(true);
        setStatusMessage("Starting payment...");
        try {
            const r = await api.post("/sms/wallet/purchase", { amountKsh: amt, phone });
            setStatusMessage(r.data.message || "Enter your M-PESA PIN on your phone to complete.");
            const checkoutRequestId = r.data.checkoutRequestId;

            pollRef.current = window.setInterval(async () => {
                try {
                    const p = await api.get("/sms/wallet/purchase-status", { params: { checkoutRequestId } });
                    if (p.data.status === "completed") {
                        if (pollRef.current) window.clearInterval(pollRef.current);
                        setPaying(false);
                        setStatusMessage("");
                        toast.success(`${p.data.smsCount || ""} SMS credits added to your wallet!`);
                        refreshWallet();
                    } else if (p.data.status === "failed") {
                        if (pollRef.current) window.clearInterval(pollRef.current);
                        setPaying(false);
                        toast.error(p.data.message || "Payment failed");
                        setStatusMessage("");
                    }
                } catch { /* keep polling */ }
            }, 3000);
        } catch (e: any) {
            setPaying(false);
            setStatusMessage("");
            toast.error(e?.response?.data?.message || "Could not start the M-PESA payment");
        }
    };

    return (
        <div className="flex-1 bg-white overflow-hidden flex flex-col p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                <div className="w-8 h-8 rounded-sm bg-gray-50 flex items-center justify-center border border-gray-100 shadow-sm">
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                </div>
                <h1 className="text-xl font-bold text-gray-800 tracking-tight">SMS Credits</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Balance card */}
                <div className="border border-gray-100 rounded-sm shadow-sm bg-white p-6 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-gray-400">
                        <Wallet className="w-3.5 h-3.5" /> Wallet Balance
                    </div>
                    <div className="text-4xl font-black text-emerald-600 leading-none mt-1">
                        {isLoading ? "…" : (wallet?.balance ?? 0).toLocaleString()}
                    </div>
                    <div className="text-[12px] text-gray-500 font-medium">SMS credits available</div>
                    {!isLoading && (
                        <div className="mt-4 pt-4 border-t border-gray-100 text-[12px] text-gray-500 space-y-1">
                            <div className="flex justify-between"><span>Current ratio</span><span className="font-bold text-slate-700">1 KSH = {wallet?.smsPerKsh} SMS</span></div>
                            <div className="flex justify-between"><span>Welcome bonus</span><span className="font-bold text-slate-700">{wallet?.welcomeBonus} SMS</span></div>
                        </div>
                    )}
                </div>

                {/* Buy credits card */}
                <div className="lg:col-span-2 border border-gray-100 rounded-sm shadow-sm bg-white p-6 space-y-5">
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-gray-400">
                        <Smartphone className="w-3.5 h-3.5" /> Buy More Credits (M-PESA)
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {QUICK_AMOUNTS.map(a => (
                            <Button key={a} type="button" variant={amount === a ? "default" : "outline"} size="sm"
                                className={amount === a ? "h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[12px]" : "h-9 px-4 font-bold text-[12px] border-gray-300"}
                                onClick={() => setAmount(a)}>
                                KSH {a}
                            </Button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount (KSH)</Label>
                            <Input type="number" min={1} className="h-11 border-gray-200 rounded-sm bg-slate-50/30 font-bold"
                                value={amount} onChange={e => setAmount(e.target.value === "" ? "" : Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">M-PESA Phone Number</Label>
                            <Input className="h-11 border-gray-200 rounded-sm bg-slate-50/30 font-bold" placeholder="0712 345 678"
                                value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                    </div>

                    <div className="text-[12px] text-gray-500 font-medium">
                        {amount && wallet ? <>You'll receive <span className="font-black text-emerald-600">{smsForAmount(Number(amount)).toLocaleString()} SMS credits</span></> : null}
                    </div>

                    <Button onClick={handleBuy} disabled={paying} className="h-11 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[11px] gap-2">
                        {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        {paying ? "Waiting for M-PESA..." : "Buy Credits"}
                    </Button>
                    {statusMessage && <div className="text-[12px] text-sky-600 font-bold">{statusMessage}</div>}
                </div>
            </div>

            {/* Ledger */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-gray-400">
                    <History className="w-3.5 h-3.5" /> Recent Activity
                </div>
                <div className="border border-gray-100 rounded-sm shadow-sm overflow-hidden bg-white">
                    <Table>
                        <TableHeader className="bg-gray-50/50">
                            <TableRow className="h-10 hover:bg-gray-50/50 border-b border-gray-100">
                                <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black border-r last:border-r-0">Date</TableHead>
                                <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black border-r last:border-r-0">Description</TableHead>
                                <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black border-r last:border-r-0 text-right">SMS</TableHead>
                                <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black text-right">Balance After</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ledger.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-10 opacity-30 text-[11px] font-black uppercase tracking-[0.2em]">No activity yet</TableCell></TableRow>
                            ) : (
                                ledger.map((t: any) => (
                                    <TableRow key={t._id} className="border-b border-gray-50 h-12 text-[13px] text-gray-600">
                                        <TableCell className="px-8 border-r last:border-r-0">{new Date(t.createdAt).toLocaleString()}</TableCell>
                                        <TableCell className="px-8 border-r last:border-r-0 font-medium text-slate-700">{t.description || t.source}</TableCell>
                                        <TableCell className={`px-8 border-r last:border-r-0 text-right font-black ${t.type === "credit" ? "text-emerald-600" : "text-rose-500"}`}>
                                            {t.type === "credit" ? "+" : "-"}{t.smsCount}
                                        </TableCell>
                                        <TableCell className="px-8 text-right font-bold text-slate-700">{t.balanceAfter}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
