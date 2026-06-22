import { useState, useRef, useEffect, useCallback } from "react";
import {
    Search, ScanLine, Grid3X3, List, Plus, Minus,
    Loader2, ShoppingCart, Banknote, Smartphone,
    CreditCard, Building2, X, User, Tag,
    Zap, Sun, Moon, Printer, CheckCircle2,
    Maximize2, Minimize2
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { openPrintDoc } from "@/lib/pdfDoc";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItem {
    productId: string;
    productName: string;
    unitPrice: number;
    taxRate: number;
    taxName: string;
    qty: number;
    stock: number;
}

// ─── Receipt printer ──────────────────────────────────────────────────────────

function printReceipt(order: any, institute: any) {
    const win = openPrintDoc();
    if (!win) { toast.error("Allow popups to print receipts"); return; }

    const schoolName = institute?.schoolName || institute?.name || "ShuleCloud Store";
    const address    = institute?.address || "";
    const phone      = institute?.phone || "";
    const logo       = institute?.logo || null;

    const rows = (order.items || []).map((i: any) =>
        `<tr>
          <td>${i.productName}</td>
          <td style="text-align:center">${i.qty}</td>
          <td style="text-align:right">${Number(i.unitPrice).toLocaleString()}</td>
          <td style="text-align:right">${Number(i.subtotal ?? i.unitPrice * i.qty).toLocaleString()}</td>
        </tr>`
    ).join("");

    win.document.write(`<!DOCTYPE html><html><head>
    <title>Receipt — ${order.orderNo}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: "Courier New", monospace; font-size: 12px; padding: 20px; max-width: 320px; margin: 0 auto; color:#111; }
      .logo { text-align:center; margin-bottom:12px; }
      .logo img { height:50px; object-fit:contain; }
      .header { text-align:center; border-bottom: 1px dashed #aaa; padding-bottom:10px; margin-bottom:10px; }
      .header h1 { font-size:15px; font-weight:900; text-transform:uppercase; letter-spacing:1px; }
      .header p  { font-size:10px; color:#555; margin-top:2px; }
      .meta { margin-bottom:10px; font-size:10px; color:#333; line-height:1.7; }
      table { width:100%; border-collapse:collapse; margin-bottom:10px; }
      thead tr { border-bottom:1px solid #aaa; }
      th { font-size:9px; text-transform:uppercase; padding:4px 2px; }
      td { padding:4px 2px; font-size:11px; }
      .totals { border-top:1px dashed #aaa; padding-top:8px; font-size:11px; }
      .totals div { display:flex; justify-content:space-between; padding:2px 0; }
      .totals .grand { font-weight:900; font-size:14px; border-top:1px solid #aaa; margin-top:4px; padding-top:4px; }
      .change { background:#f0fff4; border:1px solid #a7f3d0; padding:6px; border-radius:4px; text-align:center; font-weight:900; color:#065f46; margin:8px 0; }
      .footer { text-align:center; margin-top:12px; font-size:9px; color:#888; border-top:1px dashed #aaa; padding-top:8px; }
      @media print { @page { margin:5mm; } }
    </style>
    </head><body>
    ${logo ? `<div class="logo"><img src="${logo}" /></div>` : ""}
    <div class="header">
      <h1>${schoolName}</h1>
      ${address ? `<p>${address}</p>` : ""}
      ${phone ? `<p>Tel: ${phone}</p>` : ""}
    </div>
    <div class="meta">
      <div><b>Order:</b> ${order.orderNo}</div>
      <div><b>Date:</b> ${new Date(order.createdAt || Date.now()).toLocaleString("en-GB")}</div>
      <div><b>Customer:</b> ${order.customerName || "Walk-in"}</div>
      <div><b>Payment:</b> ${order.paymentMethod || "CASH"}${order.paymentRef ? ` — ${order.paymentRef}` : ""}</div>
    </div>
    <table>
      <thead><tr><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div><span>Subtotal</span><span>KSh ${Number(order.subtotal ?? 0).toLocaleString()}</span></div>
      ${(order.taxTotal ?? 0) > 0 ? `<div><span>Tax</span><span>KSh ${Number(order.taxTotal).toLocaleString()}</span></div>` : ""}
      ${(order.discount ?? 0) > 0 ? `<div><span>Discount</span><span>- KSh ${Number(order.discount).toLocaleString()}</span></div>` : ""}
      <div class="grand"><span>TOTAL</span><span>KSh ${Number(order.total ?? 0).toLocaleString()}</span></div>
    </div>
    ${order.change > 0 ? `<div class="change">Change: KSh ${Number(order.change).toLocaleString()}</div>` : ""}
    <div class="footer">Thank you for your purchase!<br/>Powered by ShuleCloud POS</div>
    <script>window.onload = function(){ window.print(); }</script>
    </body></html>`);
    win.document.close();
}

// ─── Payment methods config ───────────────────────────────────────────────────

const PAYMENT_METHODS = [
    { key: "CASH",  label: "Cash",   icon: Banknote,   dark: "text-emerald-400", light: "text-emerald-600" },
    { key: "MPESA", label: "M-Pesa", icon: Smartphone, dark: "text-green-400",   light: "text-green-600" },
    { key: "CARD",  label: "Card",   icon: CreditCard, dark: "text-blue-400",    light: "text-blue-600" },
    { key: "BANK",  label: "Bank",   icon: Building2,  dark: "text-purple-400",  light: "text-purple-600" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewOrder() {
    const qc = useQueryClient();
    const scanRef = useRef<HTMLInputElement>(null);

    // ── Theme ────────────────────────────────────────────────────────────────
    const [isDark, setIsDark] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else {
            document.exitFullscreen().catch(() => {});
            setIsFullscreen(false);
        }
    };

    // Shorthand theme tokens
    const t = isDark ? {
        root:      "bg-slate-950 text-white",
        topbar:    "bg-slate-900 border-slate-800",
        panel:     "bg-slate-900 border-slate-800",
        card:      "bg-slate-800 border-slate-700",
        cardHover: "hover:border-indigo-500/60 hover:bg-slate-750",
        input:     "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500",
        pill:      "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white",
        pillActive:"bg-indigo-600 text-white shadow-lg shadow-indigo-900/50",
        divider:   "border-slate-800",
        label:     "text-slate-400",
        subtext:   "text-slate-500",
        empty:     "text-slate-700",
        catBg:     "bg-slate-900",
        toggleBtn: "bg-slate-800 border-slate-700 text-slate-400 hover:text-white",
        toggleAct: "bg-slate-700 text-white",
        scanMode:  "bg-indigo-950 border-indigo-500 text-indigo-100 placeholder-indigo-500/60",
        total:     "bg-slate-800",
        pmAct:     "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/40",
        pmIdle:    "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500",
        changeBg:  "bg-emerald-900/30 border-emerald-700/40 text-emerald-300",
        qtyBtn:    "bg-slate-700 hover:bg-slate-600 text-slate-300",
        avatar:    "bg-slate-700 text-slate-400",
        avatarAct: "bg-indigo-800 text-indigo-200",
        stockOk:   "bg-emerald-900/50 text-emerald-400",
        stockLow:  "bg-amber-900/50 text-amber-400",
        stockOut:  "bg-rose-900/50 text-rose-400",
        cartItem:  "bg-slate-800",
        scanBg:    "bg-indigo-950 border-indigo-700/50",
        scanIcon:  "text-indigo-400",
        scanRecentBg: "bg-slate-800",
        completeBg: "bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-900/50",
    } : {
        root:      "bg-gray-50 text-gray-900",
        topbar:    "bg-white border-gray-200",
        panel:     "bg-white border-gray-200",
        card:      "bg-white border-gray-200",
        cardHover: "hover:border-indigo-400 hover:shadow-md hover:bg-indigo-50/30",
        input:     "bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-500",
        pill:      "bg-white border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-800",
        pillActive:"bg-[#5C67F2] text-white shadow-md shadow-indigo-200",
        divider:   "border-gray-200",
        label:     "text-gray-500",
        subtext:   "text-gray-400",
        empty:     "text-gray-300",
        catBg:     "bg-gray-50",
        toggleBtn: "bg-white border-gray-200 text-gray-500 hover:text-gray-800",
        toggleAct: "bg-gray-100 text-gray-800",
        scanMode:  "bg-indigo-50 border-indigo-400 text-indigo-900 placeholder-indigo-300",
        total:     "bg-gray-100",
        pmAct:     "bg-[#5C67F2] border-[#5C67F2] text-white shadow-md shadow-indigo-200",
        pmIdle:    "bg-white border-gray-200 text-gray-500 hover:border-indigo-300",
        changeBg:  "bg-emerald-50 border-emerald-200 text-emerald-700",
        qtyBtn:    "bg-gray-100 hover:bg-gray-200 text-gray-600",
        avatar:    "bg-gray-100 text-gray-400",
        avatarAct: "bg-indigo-100 text-indigo-500",
        stockOk:   "bg-emerald-100 text-emerald-600",
        stockLow:  "bg-amber-100 text-amber-600",
        stockOut:  "bg-rose-100 text-rose-500",
        cartItem:  "bg-gray-50 border border-gray-100",
        scanBg:    "bg-indigo-50 border-indigo-200",
        scanIcon:  "text-indigo-500",
        scanRecentBg: "bg-gray-100",
        completeBg: "bg-[#5C67F2] hover:bg-indigo-600 shadow-lg shadow-indigo-200",
    };

    // ── UI state ──────────────────────────────────────────────────────────────
    const [mode, setMode]           = useState<"grid" | "scan">("grid");
    const [viewStyle, setViewStyle] = useState<"grid" | "list">("list");
    const [scanInput, setScanInput] = useState("");
    const [search, setSearch]       = useState("");
    const [activeCategory, setActiveCategory] = useState("ALL");

    // ── Cart ──────────────────────────────────────────────────────────────────
    const [cart, setCart] = useState<CartItem[]>([]);

    // ── Payment ───────────────────────────────────────────────────────────────
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [amountTendered, setAmountTendered] = useState("");
    const [paymentRef, setPaymentRef]   = useState("");
    const [customerName, setCustomerName] = useState("");
    const [discount, setDiscount]       = useState("");

    // ── Receipt modal ─────────────────────────────────────────────────────────
    const [completedOrder, setCompletedOrder] = useState<any>(null);

    // ── Data ──────────────────────────────────────────────────────────────────
    const { data: products = [] } = useQuery({
        queryKey: ["pos_products"],
        queryFn: async () => {
            const r = await api.get("/pos/products");
            return (Array.isArray(r.data) ? r.data : []).filter((p: any) => p.isActive !== false);
        },
    });

    const { data: categories = [] } = useQuery({
        queryKey: ["pos_categories"],
        queryFn: async () => {
            const r = await api.get("/pos/categories");
            return Array.isArray(r.data) ? r.data : [];
        },
    });

    const { data: institute } = useQuery({
        queryKey: ["pos_institute"],
        queryFn: async () => {
            // Prefer theme_settings (same source as the header) for the real school name/logo.
            let t: any = null;
            try { const r = await api.get("/theme_settings"); t = Array.isArray(r.data) ? r.data[0] : r.data; } catch { /* ignore */ }
            let p: any = null;
            try { const r = await api.get("/tenant_profile"); p = Array.isArray(r.data) ? r.data[0] : r.data; } catch { /* ignore */ }
            const s = { ...(p || {}), ...(t || {}) };
            return {
                schoolName: s.name || s.instituteName || s.schoolName || p?.schoolName,
                name: s.name || s.instituteName || s.schoolName,
                address: s.address || s.location || p?.address || "",
                phone: s.phone || s.contactPhone || s.mobile || p?.phone || "",
                logo: s.logo || s.schoolLogo || s.image || p?.logo || null,
            };
        },
    });

    useEffect(() => {
        if (mode === "scan") scanRef.current?.focus();
    }, [mode]);

    // ── Calculations ──────────────────────────────────────────────────────────
    const subtotal    = cart.reduce((s, c) => s + c.unitPrice * c.qty, 0);
    const taxTotal    = cart.reduce((s, c) => s + (c.unitPrice * c.qty * c.taxRate / 100), 0);
    const discountAmt = Math.min(Number(discount) || 0, subtotal + taxTotal);
    const total       = Math.max(0, subtotal + taxTotal - discountAmt);
    const change      = paymentMethod === "CASH" && Number(amountTendered) > 0
        ? Math.max(0, Number(amountTendered) - total) : 0;

    // ── Filtered products ─────────────────────────────────────────────────────
    const filtered = products.filter((p: any) => {
        const matchCat = activeCategory === "ALL" || p.categoryName === activeCategory;
        const matchQ   = !search || (p.name || "").toLowerCase().includes(search.toLowerCase()) || (p.sku || "").toLowerCase().includes(search.toLowerCase());
        return matchCat && matchQ;
    });

    // ── Cart helpers ──────────────────────────────────────────────────────────
    const addToCart = useCallback((p: any) => {
        const stock = Number(p.stock) || 0;
        if (stock === 0) { toast.error("Out of stock"); return; }
        setCart(prev => {
            const ex = prev.find(c => c.productId === p._id);
            if (ex) {
                if (ex.qty >= stock) { toast.error(`Only ${stock} in stock`); return prev; }
                return prev.map(c => c.productId === p._id ? { ...c, qty: c.qty + 1 } : c);
            }
            return [...prev, { productId: p._id, productName: p.name, unitPrice: Number(p.price), taxRate: Number(p.taxRate) || 0, taxName: p.taxName || "", qty: 1, stock }];
        });
    }, []);

    const updateQty = (pid: string, d: number) =>
        setCart(prev => prev.map(c => {
            if (c.productId !== pid) return c;
            const nq = c.qty + d;
            if (nq <= 0) return { ...c, qty: 0 };
            if (c.stock > 0 && nq > c.stock) { toast.error(`Max ${c.stock}`); return c; }
            return { ...c, qty: nq };
        }).filter(c => c.qty > 0));

    const removeFromCart = (pid: string) => setCart(p => p.filter(c => c.productId !== pid));

    // ── Scan handler ──────────────────────────────────────────────────────────
    const handleScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== "Enter") return;
        const val = scanInput.trim();
        if (!val) return;
        const found = products.find((p: any) =>
            (p.sku || "").toLowerCase() === val.toLowerCase() ||
            (p.name || "").toLowerCase() === val.toLowerCase()
        );
        if (found) { addToCart(found); toast.success(`Added: ${found.name}`); }
        else toast.error(`Not found: "${val}"`);
        setScanInput("");
    };

    // ── Complete order ────────────────────────────────────────────────────────
    const createMutation = useMutation({
        mutationFn: (payload: any) => api.post("/pos/orders", payload),
        onSuccess: (res) => {
            const order = { ...res.data, change };
            qc.invalidateQueries({ queryKey: ["pos_orders"] });
            qc.invalidateQueries({ queryKey: ["pos_products"] });
            setCompletedOrder(order);
            setCart([]); setCustomerName(""); setPaymentRef("");
            setAmountTendered(""); setDiscount("");
        },
        onError: (e: any) => toast.error(e.response?.data?.message || "Order failed"),
    });

    const handleComplete = () => {
        if (cart.length === 0) { toast.error("Cart is empty"); return; }
        if (paymentMethod === "CASH" && Number(amountTendered) > 0 && Number(amountTendered) < total) {
            toast.error("Amount tendered is less than total"); return;
        }
        createMutation.mutate({
            items: cart.map(c => ({ productId: c.productId, productName: c.productName, unitPrice: c.unitPrice, taxRate: c.taxRate, taxName: c.taxName, qty: c.qty })),
            customerName: customerName || "Walk-in",
            paymentMethod, paymentRef, discount: discountAmt,
        });
    };

    const pm = PAYMENT_METHODS.find(p => p.key === paymentMethod)!;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className={`flex-1 flex flex-col h-screen max-h-screen overflow-hidden ${t.root} font-sans`}>

            {/* ── Top bar ──────────────────────────────────────────────────── */}
            <div className={`h-14 ${t.topbar} border-b flex items-center px-4 gap-3 flex-shrink-0`}>
                {/* Mode toggle */}
                <div className={`flex rounded-xl overflow-hidden border ${t.divider} text-[10px] font-black uppercase`}>
                    <button onClick={() => setMode("grid")}
                        className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${mode === "grid" ? t.toggleAct : t.toggleBtn}`}>
                        <Search className="w-3.5 h-3.5" /> Search
                    </button>
                    <button onClick={() => setMode("scan")}
                        className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${mode === "scan" ? (isDark ? "bg-indigo-600 text-white" : "bg-[#5C67F2] text-white") : t.toggleBtn}`}>
                        <ScanLine className="w-3.5 h-3.5" /> Scan
                    </button>
                </div>

                {/* Search / Scan input */}
                <div className="relative flex-1 max-w-lg">
                    {mode === "grid" ? (
                        <>
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${t.label}`} />
                            <input value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Search product or SKU..."
                                className={`w-full h-9 pl-9 pr-3 rounded-xl border text-xs font-bold ${t.input} focus:outline-none`} />
                        </>
                    ) : (
                        <>
                            <ScanLine className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-pulse ${t.scanIcon}`} />
                            <input ref={scanRef} value={scanInput}
                                onChange={e => setScanInput(e.target.value)}
                                onKeyDown={handleScan}
                                placeholder="Scan barcode or type SKU → Enter"
                                className={`w-full h-9 pl-9 pr-3 rounded-xl border text-xs font-bold ${t.scanMode} focus:outline-none`} />
                        </>
                    )}
                </div>

                {/* Grid/List toggle */}
                <div className={`flex rounded-xl overflow-hidden border ${t.divider}`}>
                    {([["grid", Grid3X3], ["list", List]] as const).map(([k, Icon]) => (
                        <button key={k} onClick={() => setViewStyle(k)}
                            className={`px-2.5 py-1.5 transition-colors ${viewStyle === k ? t.toggleAct : t.toggleBtn}`}>
                            <Icon className="w-4 h-4" />
                        </button>
                    ))}
                </div>

                {/* Theme toggle */}
                <button onClick={() => setIsDark(d => !d)}
                    className={`p-2 rounded-xl border transition-colors ${t.toggleBtn}`}>
                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                {/* Fullscreen toggle */}
                <button onClick={toggleFullscreen}
                    className={`p-2 rounded-xl border transition-colors ${t.toggleBtn}`}
                    title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                {/* Cart total */}
                <div className={`flex items-center gap-2 ml-auto text-xs font-black uppercase tracking-widest px-4 h-9 rounded-xl ${isDark ? "bg-slate-800 text-indigo-400" : "bg-indigo-50 text-[#5C67F2] border border-indigo-100"}`}>
                    <ShoppingCart className="w-4 h-4" />
                    <span>KSh {Math.round(total).toLocaleString()}</span>
                    {cart.length > 0 && <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{cart.length}</span>}
                </div>
            </div>

            {/* ── Body ─────────────────────────────────────────────────────── */}
            <div className="flex-1 flex overflow-hidden">

                {/* ── Left: Products ───────────────────────────────────────── */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Category pills */}
                    <div className={`px-4 py-2.5 flex gap-2 overflow-x-auto flex-shrink-0 ${t.catBg} border-b ${t.divider}`}>
                        {["ALL", ...categories.map((c: any) => c.name)].map(cat => (
                            <button key={cat} onClick={() => setActiveCategory(cat)}
                                className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${activeCategory === cat ? t.pillActive : t.pill}`}>
                                {cat === "ALL" ? `All (${products.length})` : cat}
                            </button>
                        ))}
                    </div>

                    {/* Products area */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {mode === "scan" ? (
                            <div className="flex flex-col items-center justify-center h-full gap-6">
                                <div className={`w-24 h-24 rounded-3xl border-2 flex items-center justify-center ${t.scanBg}`}>
                                    <ScanLine className={`w-12 h-12 animate-pulse ${t.scanIcon}`} />
                                </div>
                                <div className="text-center">
                                    <p className={`font-black text-lg uppercase tracking-widest ${isDark ? "text-slate-300" : "text-gray-700"}`}>Scan Mode Active</p>
                                    <p className={`text-xs font-bold mt-1 uppercase tracking-widest ${t.subtext}`}>Point scanner at barcode or type SKU and press Enter</p>
                                </div>
                                {cart.length > 0 && (
                                    <div className={`rounded-2xl p-4 text-xs w-full max-w-xs ${t.scanRecentBg}`}>
                                        <p className={`font-black uppercase mb-2 ${t.label}`}>Recently added</p>
                                        {cart.slice(-4).reverse().map(c => (
                                            <div key={c.productId} className={`flex justify-between py-1.5 border-b ${t.divider}`}>
                                                <span className={isDark ? "text-slate-300" : "text-gray-700"}>{c.productName}</span>
                                                <span className="font-black text-indigo-500">×{c.qty}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : viewStyle === "grid" ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                                {filtered.map((p: any) => {
                                    const inCart = cart.find(c => c.productId === p._id);
                                    const oos = Number(p.stock) <= 0;
                                    const low = !oos && Number(p.stock) <= 5;
                                    return (
                                        <button key={p._id} onClick={() => !oos && addToCart(p)} disabled={oos}
                                            className={`relative group rounded-2xl p-4 text-left border transition-all duration-150 active:scale-95 ${
                                                oos ? `opacity-50 cursor-not-allowed ${t.card}` :
                                                inCart ? (isDark ? "bg-indigo-900/60 border-2 border-indigo-500" : "bg-indigo-50 border-2 border-[#5C67F2]") :
                                                `${t.card} ${t.cardHover}`
                                            }`}>
                                            {p.categoryName && (
                                                <span className={`absolute top-2 left-2 px-1.5 py-0.5 text-[8px] font-black uppercase rounded-lg ${isDark ? "bg-slate-700/80 text-slate-400" : "bg-gray-100 text-gray-500"}`}>
                                                    {p.categoryName}
                                                </span>
                                            )}
                                            {inCart && (
                                                <span className="absolute top-2 right-2 w-6 h-6 bg-indigo-500 text-white rounded-full text-[10px] font-black flex items-center justify-center">
                                                    {inCart.qty}
                                                </span>
                                            )}
                                            <div className={`w-full aspect-square rounded-xl flex items-center justify-center mb-3 mt-5 text-3xl font-black ${inCart ? t.avatarAct : t.avatar}`}>
                                                {p.name?.[0]?.toUpperCase() || "?"}
                                            </div>
                                            <p className={`text-xs font-black truncate ${isDark ? "text-white" : "text-gray-900"}`}>{p.name}</p>
                                            {p.sku && <p className={`text-[9px] font-bold mt-0.5 uppercase ${t.subtext}`}>#{p.sku}</p>}
                                            <div className="flex items-center justify-between mt-2">
                                                <span className={`text-sm font-black ${isDark ? "text-indigo-400" : "text-[#5C67F2]"}`}>KSh {Number(p.price).toLocaleString()}</span>
                                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-lg ${oos ? t.stockOut : low ? t.stockLow : t.stockOk}`}>
                                                    {oos ? "Out" : low ? `${p.stock} left` : p.stock}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <div className={`col-span-full flex flex-col items-center justify-center h-48 gap-3 ${t.empty}`}>
                                        <ShoppingCart className="w-10 h-10" />
                                        <p className="text-xs font-black uppercase tracking-widest">{products.length === 0 ? "No products in the store yet" : "No products match your search"}</p>
                                        {products.length === 0 && <a href="/pos-admin/products" className="text-[11px] font-black uppercase tracking-widest text-[#5C67F2] hover:underline">+ Add products</a>}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filtered.length === 0 && (
                                    <div className={`flex flex-col items-center justify-center h-48 gap-3 ${t.empty}`}>
                                        <ShoppingCart className="w-10 h-10" />
                                        <p className="text-xs font-black uppercase tracking-widest">{products.length === 0 ? "No products in the store yet" : "No products match your search"}</p>
                                        {products.length === 0 && <a href="/pos-admin/products" className="text-[11px] font-black uppercase tracking-widest text-[#5C67F2] hover:underline">+ Add products</a>}
                                    </div>
                                )}
                                {filtered.map((p: any) => {
                                    const inCart = cart.find(c => c.productId === p._id);
                                    const oos = Number(p.stock) <= 0;
                                    return (
                                        <button key={p._id} onClick={() => !oos && addToCart(p)} disabled={oos}
                                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl border text-left transition-all ${
                                                oos ? `opacity-50 cursor-not-allowed ${t.card}` :
                                                inCart ? (isDark ? "bg-indigo-900/50 border-indigo-500" : "bg-indigo-50 border-[#5C67F2]") :
                                                `${t.card} ${t.cardHover}`
                                            }`}>
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0 ${inCart ? t.avatarAct : t.avatar}`}>
                                                {p.name?.[0]?.toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-black truncate ${isDark ? "text-white" : "text-gray-900"}`}>{p.name}</p>
                                                <p className={`text-[9px] font-bold uppercase ${t.subtext}`}>{p.categoryName || "—"}{p.sku ? ` · #${p.sku}` : ""}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className={`font-black ${isDark ? "text-indigo-400" : "text-[#5C67F2]"}`}>KSh {Number(p.price).toLocaleString()}</p>
                                                <p className={`text-[9px] font-black uppercase ${oos ? "text-rose-500" : "text-emerald-500"}`}>{oos ? "Out of stock" : `${p.stock} in stock`}</p>
                                            </div>
                                            {inCart && <span className="w-6 h-6 bg-indigo-500 text-white rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0">{inCart.qty}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right: Cart + Payment ────────────────────────────────── */}
                <div className={`w-80 xl:w-96 flex flex-col ${t.panel} border-l ${t.divider} flex-shrink-0`}>
                    {/* Cart header */}
                    <div className={`px-5 py-3 border-b ${t.divider} flex items-center justify-between flex-shrink-0`}>
                        <div className="flex items-center gap-2">
                            <ShoppingCart className={`w-4 h-4 ${isDark ? "text-indigo-400" : "text-[#5C67F2]"}`} />
                            <span className={`text-xs font-black uppercase tracking-widest ${isDark ? "text-white" : "text-gray-900"}`}>Cart</span>
                            {cart.length > 0 && <span className="bg-indigo-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{cart.length}</span>}
                        </div>
                        {cart.length > 0 && (
                            <button onClick={() => setCart([])} className={`text-[9px] font-black uppercase tracking-widest transition-colors ${t.label} hover:text-rose-500`}>
                                Clear all
                            </button>
                        )}
                    </div>

                    {/* Cart items */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
                        {cart.length === 0 ? (
                            <div className={`flex flex-col items-center justify-center h-full gap-3 ${t.empty}`}>
                                <ShoppingCart className="w-10 h-10" />
                                <p className="text-xs font-black uppercase tracking-widest">Cart is empty</p>
                            </div>
                        ) : cart.map(item => (
                            <div key={item.productId} className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${t.cartItem}`}>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-black truncate ${isDark ? "text-white" : "text-gray-900"}`}>{item.productName}</p>
                                    <p className={`text-[9px] font-bold mt-0.5 ${t.subtext}`}>KSh {item.unitPrice.toLocaleString()} each</p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <button onClick={() => updateQty(item.productId, -1)} className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${t.qtyBtn}`}><Minus className="w-3 h-3" /></button>
                                    <span className={`w-6 text-center text-xs font-black ${isDark ? "text-white" : "text-gray-900"}`}>{item.qty}</span>
                                    <button onClick={() => updateQty(item.productId, 1)} className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${t.qtyBtn}`}><Plus className="w-3 h-3" /></button>
                                </div>
                                <p className={`text-xs font-black w-16 text-right flex-shrink-0 ${isDark ? "text-indigo-400" : "text-[#5C67F2]"}`}>{(item.unitPrice * item.qty).toLocaleString()}</p>
                                <button onClick={() => removeFromCart(item.productId)} className={`transition-colors flex-shrink-0 ${t.label} hover:text-rose-500`}><X className="w-3.5 h-3.5" /></button>
                            </div>
                        ))}
                    </div>

                    {/* Payment section */}
                    <div className={`border-t ${t.divider} px-4 py-4 space-y-3 flex-shrink-0`}>
                        {/* Customer + discount */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${t.label}`} />
                                <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name"
                                    className={`w-full h-9 pl-9 pr-3 rounded-xl border text-xs font-bold focus:outline-none ${t.input}`} />
                            </div>
                            <div className="relative w-24">
                                <Tag className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${t.label}`} />
                                <input value={discount} onChange={e => setDiscount(e.target.value)} type="number" placeholder="Disc."
                                    className={`w-full h-9 pl-8 pr-2 rounded-xl border text-xs font-bold focus:outline-none ${t.input}`} />
                            </div>
                        </div>

                        {/* Totals */}
                        <div className={`rounded-2xl px-4 py-3 space-y-1.5 text-xs ${t.total}`}>
                            <div className={`flex justify-between ${t.label}`}><span className="font-bold">Subtotal</span><span className={`font-black ${isDark ? "text-slate-200" : "text-gray-800"}`}>KSh {Math.round(subtotal).toLocaleString()}</span></div>
                            {taxTotal > 0 && <div className={`flex justify-between ${t.label}`}><span className="font-bold">Tax</span><span className="font-black text-amber-500">KSh {Math.round(taxTotal).toLocaleString()}</span></div>}
                            {discountAmt > 0 && <div className={`flex justify-between ${t.label}`}><span className="font-bold">Discount</span><span className="font-black text-rose-500">- KSh {discountAmt.toLocaleString()}</span></div>}
                            <div className={`flex justify-between pt-2 border-t ${t.divider}`}>
                                <span className={`font-black uppercase tracking-wider ${isDark ? "text-white" : "text-gray-900"}`}>Total</span>
                                <span className={`font-black text-lg ${isDark ? "text-indigo-400" : "text-[#5C67F2]"}`}>KSh {Math.round(total).toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Payment method */}
                        <div className="grid grid-cols-4 gap-1.5">
                            {PAYMENT_METHODS.map(p => (
                                <button key={p.key} onClick={() => setPaymentMethod(p.key)}
                                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[8px] font-black uppercase tracking-wider transition-all ${paymentMethod === p.key ? t.pmAct : t.pmIdle}`}>
                                    <p.icon className={`w-4 h-4 ${paymentMethod === p.key ? "text-white" : (isDark ? p.dark : p.light)}`} />
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {/* Cash: amount + quick buttons */}
                        {paymentMethod === "CASH" && (
                            <div className="space-y-2">
                                <div className="relative">
                                    <Banknote className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${t.label}`} />
                                    <input value={amountTendered} onChange={e => setAmountTendered(e.target.value)} type="number" placeholder="Amount tendered (KSh)"
                                        className={`w-full h-9 pl-9 pr-3 rounded-xl border text-xs font-bold focus:outline-none ${t.input}`} />
                                </div>
                                {change > 0 && (
                                    <div className={`flex justify-between px-3 py-2 rounded-xl border ${t.changeBg}`}>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Change</span>
                                        <span className="text-sm font-black">KSh {Math.round(change).toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="grid grid-cols-4 gap-1.5">
                                    {[500, 1000, 2000, 5000].map(amt => (
                                        <button key={amt} onClick={() => setAmountTendered(String(amt))}
                                            className={`py-1.5 rounded-xl border text-[9px] font-black transition-colors ${t.pill}`}>
                                            {amt >= 1000 ? `${amt / 1000}K` : amt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Reference for non-cash */}
                        {paymentMethod !== "CASH" && (
                            <div className="relative">
                                <pm.icon className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${t.label}`} />
                                <input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder={`${pm.label} reference / code`}
                                    className={`w-full h-9 pl-9 pr-3 rounded-xl border text-xs font-bold focus:outline-none ${t.input}`} />
                            </div>
                        )}

                        {/* Complete */}
                        <button onClick={handleComplete} disabled={createMutation.isPending || cart.length === 0}
                            className={`w-full py-3.5 text-white font-black text-sm uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2.5 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${t.completeBg}`}>
                            {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                            {createMutation.isPending ? "Processing..." : `Complete · KSh ${Math.round(total).toLocaleString()}`}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Receipt Confirmation Modal ────────────────────────────────── */}
            {completedOrder && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white max-w-sm w-full rounded-[2.5rem] shadow-2xl overflow-hidden">
                        {/* Green success bar */}
                        <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-emerald-600" />

                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-9 h-9 text-emerald-500" />
                            </div>

                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-1">Order Complete!</h2>
                            <p className="text-sm font-black text-[#5C67F2] mb-1">{completedOrder.orderNo}</p>
                            <p className="text-xs text-gray-400 font-bold uppercase mb-5">
                                {completedOrder.customerName || "Walk-in"} · {completedOrder.paymentMethod}
                            </p>

                            {/* Mini receipt */}
                            <div className="bg-gray-50 rounded-2xl p-4 text-left mb-5 space-y-1.5 text-xs">
                                {(completedOrder.items || []).slice(0, 4).map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between">
                                        <span className="text-gray-600 font-bold truncate max-w-[60%]">{item.productName} ×{item.qty}</span>
                                        <span className="font-black text-gray-800">KSh {Number(item.subtotal ?? item.unitPrice * item.qty).toLocaleString()}</span>
                                    </div>
                                ))}
                                {(completedOrder.items || []).length > 4 && (
                                    <p className="text-gray-400 font-bold text-center">+{completedOrder.items.length - 4} more items</p>
                                )}
                                <div className="flex justify-between pt-2 border-t border-gray-200 mt-2">
                                    <span className="font-black text-gray-900 uppercase">Total</span>
                                    <span className="font-black text-[#5C67F2] text-base">KSh {Number(completedOrder.total || 0).toLocaleString()}</span>
                                </div>
                                {completedOrder.change > 0 && (
                                    <div className="flex justify-between">
                                        <span className="font-bold text-emerald-600">Change</span>
                                        <span className="font-black text-emerald-600">KSh {Math.round(completedOrder.change).toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3">
                                <button onClick={() => setCompletedOrder(null)}
                                    className="flex-1 h-12 border-2 border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700 font-black text-xs uppercase tracking-widest rounded-2xl transition-all">
                                    Skip
                                </button>
                                <button onClick={() => { printReceipt(completedOrder, institute); setCompletedOrder(null); }}
                                    className="flex-1 h-12 bg-[#5C67F2] hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200">
                                    <Printer className="w-4 h-4" />
                                    Print Receipt
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
