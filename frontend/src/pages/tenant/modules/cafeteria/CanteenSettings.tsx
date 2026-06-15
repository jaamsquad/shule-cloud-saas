import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings2, Wallet, Coins, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const OPTIONS = [
    { v: "fees", label: "Included In Fees", desc: "Approved meals/snacks recorded against the student — no deduction.", icon: Coins },
    { v: "wallet", label: "Student Wallet", desc: "Purchases are deducted from the student's wallet balance automatically.", icon: Wallet },
    { v: "both", label: "Both", desc: "Cashier chooses per sale — e.g. lunch included, soda from wallet.", icon: Settings2 },
];

export default function CanteenSettings() {
    const qc = useQueryClient();
    const { data } = useQuery({ queryKey: ["canteen_settings"], queryFn: async () => (await api.get("/canteen/settings")).data });
    const [mode, setMode] = useState("wallet");
    useEffect(() => { if (data?.mode) setMode(data.mode); }, [data]);

    const save = useMutation({
        mutationFn: async () => (await api.post("/canteen/settings", { mode })).data,
        onSuccess: () => { toast.success("Canteen settings saved"); qc.invalidateQueries({ queryKey: ["canteen_settings"] }); },
    });

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-6"><div className="w-11 h-11 bg-emerald-500 rounded-2xl flex items-center justify-center text-white"><Settings2 className="w-5 h-5" /></div>
                    <div><h1 className="text-xl font-black text-slate-800">Canteen Settings</h1><p className="text-xs text-slate-500">How canteen purchases are paid for</p></div></div>

                <div className="space-y-3 mb-6">
                    {OPTIONS.map(o => (
                        <button key={o.v} onClick={() => setMode(o.v)} className={`w-full text-left flex items-start gap-4 p-5 rounded-2xl border-2 transition-all ${mode === o.v ? "border-emerald-500 bg-emerald-50/50" : "border-slate-100 bg-white hover:border-slate-200"}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mode === o.v ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}><o.icon className="w-5 h-5" /></div>
                            <div className="flex-1"><p className="font-black text-slate-800">{o.label}</p><p className="text-xs text-slate-500 mt-0.5">{o.desc}</p></div>
                            {mode === o.v && <Check className="w-5 h-5 text-emerald-500" />}
                        </button>
                    ))}
                </div>
                <button onClick={() => save.mutate()} disabled={save.isPending} className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2">{save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Settings</button>
            </div>
        </div>
    );
}
