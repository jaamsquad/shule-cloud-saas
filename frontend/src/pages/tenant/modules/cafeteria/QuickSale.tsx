import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScanLine, Loader2, User, ShoppingCart, Check, X, Wallet, Coins, Camera, Keyboard } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import CameraScanner from "./CameraScanner";

export default function QuickSale() {
    const qc = useQueryClient();
    const [code, setCode] = useState("");
    const [student, setStudent] = useState<any>(null);
    const [cart, setCart] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [scanMode, setScanMode] = useState<"scanner" | "camera">("scanner");
    const cartRef = useRef<any[]>([]);
    cartRef.current = cart;
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<any>(null);

    const focus = () => { if (!student) inputRef.current?.focus(); };
    useEffect(() => { focus(); const i = setInterval(focus, 1500); return () => clearInterval(i); }, [student]);

    const { data: products = [] } = useQuery({ queryKey: ["canteen_products"], queryFn: async () => (await api.get("/pos/products")).data || [] });
    const { data: settings } = useQuery({ queryKey: ["canteen_settings"], queryFn: async () => (await api.get("/canteen/settings")).data });
    const { data: today } = useQuery({ queryKey: ["canteen_today"], queryFn: async () => (await api.get("/canteen/sales/today")).data, refetchInterval: 30000 });

    const [payMode, setPayMode] = useState("wallet");
    useEffect(() => { if (settings?.mode && settings.mode !== "both") setPayMode(settings.mode); }, [settings]);

    const add = (p: any) => setCart(c => { const e = c.find(x => x._id === p._id); return e ? c.map(x => x._id === p._id ? { ...x, qty: x.qty + 1 } : x) : [...c, { ...p, qty: 1 }]; });
    const dec = (id: string) => setCart(c => c.map(x => x._id === id ? { ...x, qty: x.qty - 1 } : x).filter(x => x.qty > 0));
    const total = cart.reduce((s, i) => s + Number(i.price || 0) * i.qty, 0);

    const sale = useMutation({
        mutationFn: async (c?: string) => (await api.post("/canteen/sale", { code: c || code || undefined, paymentMode: payMode, items: cartRef.current.map((i: any) => ({ productId: i._id, name: i.name, price: Number(i.price || 0), qty: i.qty })) })).data,
        onSuccess: (d: any) => {
            toast.success(`Sale complete${d.newBalance != null ? ` · Wallet: KES ${d.newBalance.toLocaleString()}` : ""}`);
            qc.invalidateQueries({ queryKey: ["canteen_today"] }); qc.invalidateQueries({ queryKey: ["canteen_products"] });
            setCart([]); setStudent(null); setCode(""); setTimeout(focus, 50);
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Sale failed"),
    });

    const lookup = useMutation({
        mutationFn: async (c: string) => ({ ...(await api.get(`/cafeteria/student/${encodeURIComponent(c)}`)).data, _code: c }),
        onSuccess: (s: any) => {
            setStudent(s);
            // Choose items → scan card → auto-complete the sale (fast flow).
            if (cartRef.current.length > 0) sale.mutate(s._code);
        },
        onError: (e: any) => { toast.error(e.response?.data?.message || "Card not recognised"); setCode(""); setTimeout(focus, 30); },
    });
    const onScan = (v: string) => { setCode(v); if (debounceRef.current) clearTimeout(debounceRef.current); if (v.trim().length >= 3) debounceRef.current = setTimeout(() => lookup.mutate(v.trim()), 120); };

    const filtered = products.filter((p: any) => !search || (p.name || "").toLowerCase().includes(search.toLowerCase()));
    const bothMode = settings?.mode === "both";

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-emerald-500 rounded-2xl flex items-center justify-center text-white"><ShoppingCart className="w-5 h-5" /></div>
                        <div><h1 className="text-xl font-black text-slate-800">Canteen Quick Sale</h1><p className="text-xs text-slate-500">Scan a card, pick items, complete the sale</p></div>
                    </div>
                    <div className="flex gap-2 text-[11px] font-bold">
                        <span className="px-2.5 py-1 rounded-full bg-white border border-slate-100 text-slate-500">Today: <b className="text-emerald-600">KES {(today?.totalSales || 0).toLocaleString()}</b></span>
                        <span className="px-2.5 py-1 rounded-full bg-white border border-slate-100 text-slate-500">Served: <b className="text-slate-700">{today?.students ?? 0}</b></span>
                    </div>
                </div>

                <div className="grid lg:grid-cols-[1fr_360px] gap-6">
                    {/* Products */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…" className="w-full h-10 px-4 mb-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
                        {products.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-300"><ShoppingCart className="w-10 h-10" /><p className="text-xs font-black uppercase">No products — add them in POS → Products</p></div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                                {filtered.map((p: any) => {
                                    const oos = Number(p.stock) <= 0;
                                    return (
                                        <button key={p._id} onClick={() => !oos && add(p)} disabled={oos} className={`rounded-2xl p-4 text-left border transition-all active:scale-95 ${oos ? "opacity-40 bg-slate-50" : "bg-slate-50 hover:border-emerald-400 border-slate-100"}`}>
                                            <div className="w-full aspect-square rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-black mb-2">{p.name?.[0]?.toUpperCase() || "?"}</div>
                                            <p className="text-xs font-black text-slate-800 truncate">{p.name}</p>
                                            <div className="flex items-center justify-between mt-1"><span className="text-sm font-black text-emerald-600">KES {Number(p.price).toLocaleString()}</span><span className="text-[8px] font-black text-slate-400">{oos ? "OUT" : p.stock}</span></div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Cart / student */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex flex-col h-fit">
                        {/* Student scan */}
                        {!student ? (
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-slate-700"><ScanLine className="w-4 h-4 text-emerald-500" /><span className="text-xs font-black uppercase">{cart.length ? "Scan card to pay" : "Scan student"}</span></div>
                                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-0.5 flex">
                                        <button onClick={() => setScanMode("scanner")} className={`px-2 py-1 rounded ${scanMode === "scanner" ? "bg-emerald-500 text-white" : "text-slate-400"}`}><Keyboard className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => setScanMode("camera")} className={`px-2 py-1 rounded ${scanMode === "camera" ? "bg-emerald-500 text-white" : "text-slate-400"}`}><Camera className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                                {scanMode === "scanner"
                                    ? <input ref={inputRef} value={code} onChange={e => onScan(e.target.value)} placeholder="Card / admission no…" className="w-full h-10 px-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
                                    : <CameraScanner onScan={(c) => { setCode(c); lookup.mutate(c); }} />}
                                {(lookup.isPending || sale.isPending) && <Loader2 className="w-4 h-4 animate-spin text-emerald-500 mx-auto mt-2" />}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 mb-4 bg-emerald-50 rounded-2xl p-3">
                                {student.photo ? <img src={student.photo} className="w-10 h-10 rounded-xl object-cover" /> : <div className="w-10 h-10 rounded-xl bg-emerald-200 flex items-center justify-center text-emerald-700"><User className="w-5 h-5" /></div>}
                                <div className="flex-1"><p className="text-sm font-black text-slate-800">{student.name}</p><p className="text-[11px] font-bold text-emerald-700">Wallet: KES {Number(student.walletBalance).toLocaleString()}</p></div>
                                <button onClick={() => { setStudent(null); setCode(""); }} className="text-slate-400 hover:text-rose-500"><X className="w-4 h-4" /></button>
                            </div>
                        )}

                        {/* Cart */}
                        <div className="border-t border-slate-100 pt-3 mb-3 max-h-56 overflow-y-auto">
                            {cart.length === 0 ? <p className="text-center text-xs text-slate-300 font-bold py-6">Cart is empty</p> : cart.map(i => (
                                <div key={i._id} className="flex items-center gap-2 py-1.5">
                                    <div className="flex-1"><p className="text-xs font-black text-slate-700 truncate">{i.name}</p><p className="text-[10px] text-slate-400">KES {Number(i.price).toLocaleString()}</p></div>
                                    <button onClick={() => dec(i._id)} className="w-6 h-6 rounded-lg bg-slate-100 font-black">−</button>
                                    <span className="w-5 text-center text-xs font-black">{i.qty}</span>
                                    <button onClick={() => add(i)} className="w-6 h-6 rounded-lg bg-slate-100 font-black">+</button>
                                </div>
                            ))}
                        </div>

                        {/* Payment mode (both) */}
                        {bothMode && (
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <button onClick={() => setPayMode("wallet")} className={`py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 ${payMode === "wallet" ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-500"}`}><Wallet className="w-3.5 h-3.5" /> Wallet</button>
                                <button onClick={() => setPayMode("fees")} className={`py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 ${payMode === "fees" ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-500"}`}><Coins className="w-3.5 h-3.5" /> Fees</button>
                            </div>
                        )}
                        {!bothMode && <p className="text-[10px] font-black text-slate-400 uppercase mb-2 text-center">{payMode === "wallet" ? "Charged to student wallet" : "Included in fees"}</p>}

                        <div className="flex items-center justify-between mb-3"><span className="text-xs font-black text-slate-400 uppercase">Total</span><span className="text-2xl font-black text-emerald-600">KES {total.toLocaleString()}</span></div>
                        <button onClick={() => sale.mutate(student?._code || code)} disabled={cart.length === 0 || sale.isPending || (payMode === "wallet" && !student)}
                            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-sm uppercase tracking-widest rounded-xl flex items-center justify-center gap-2">
                            {sale.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Complete Sale
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
