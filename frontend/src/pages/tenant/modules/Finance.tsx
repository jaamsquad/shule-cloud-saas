import {
  CreditCard, TrendingUp, AlertTriangle, Receipt, DollarSign,
  Sparkles, ArrowUpRight, ArrowDownRight, Activity,
  Filter, Search, Download, Share2, Plus, Users,
  ChevronRight, Info, ShieldCheck, Landmark, Settings
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

export default function Finance() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["finance-summary"],
    queryFn: async () => {
      const res = await api.get("/finance/summary");
      return res.data;
    }
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["finance-payments"],
    queryFn: async () => {
      const res = await api.get("/finance/payments");
      return res.data;
    }
  });

  return (
    <>
      <AppHeader title="Fiscal Command" subtitle="Institutional revenue flow & student balance synchronization" />
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/30">

        {/* Fiscal Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-black uppercase text-muted-foreground/40 border-none bg-muted/20">TARGET</Badge>
                </div>
                <h4 className="text-2xl font-black tracking-tighter">KES {summaryLoading ? "..." : (summary?.totalInvoiced || 0).toLocaleString()}</h4>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1 group-hover:text-indigo-500 transition-colors">Cumulative Invoiced</p>
              </CardContent>
              <div className="h-1.5 w-full bg-indigo-500/20" />
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-soft bg-emerald-500 rounded-[2.5rem] overflow-hidden text-white group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {summary?.collectionRate}%</span>
                    <span className="text-[8px] font-bold opacity-60 uppercase">Collection Flux</span>
                  </div>
                </div>
                <h4 className="text-2xl font-black tracking-tighter">KES {summaryLoading ? "..." : (summary?.totalPaid || 0).toLocaleString()}</h4>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mt-1">Acquired Revenue</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-black uppercase text-rose-500 border-none bg-rose-500/10">PENDING</Badge>
                </div>
                <h4 className="text-2xl font-black tracking-tighter text-rose-600">KES {summaryLoading ? "..." : (summary?.totalArrears || 0).toLocaleString()}</h4>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1 group-hover:text-rose-500 transition-colors">Arrears Spectrum</p>
              </CardContent>
              <div className="h-1.5 w-full bg-rose-500/20" />
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> +12.4%</span>
                    <span className="text-[8px] font-bold text-muted-foreground/40 uppercase">MoM Flux</span>
                  </div>
                </div>
                <h4 className="text-2xl font-black tracking-tighter">KES 2.45M</h4>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1 group-hover:text-indigo-500 transition-colors">Monthly Velocity</p>
              </CardContent>
              <div className="h-1.5 w-full bg-indigo-500/20" />
            </Card>
          </motion.div>
        </div>

        {/* Tactical Controls */}
        <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-background/40 p-4 rounded-[2rem] border border-border/50 backdrop-blur-md shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Filter transactions..."
                className="pl-11 h-12 bg-background/50 border-none rounded-2xl shadow-none focus-visible:ring-2 focus-visible:ring-primary/20 font-bold"
              />
            </div>
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-background/50 rounded-2xl border border-border/50 text-[10px] font-black uppercase text-muted-foreground whitespace-nowrap">
              <Filter className="w-3.5 h-3.5" /> Filter Matrix
            </div>
          </div>

          <div className="flex items-center gap-3 w-full xl:w-auto">
            <Button variant="outline" className="h-12 w-12 rounded-2xl border-border/50" title="Export Ledger"><Download className="w-4 h-4" /></Button>
            <Button variant="outline" className="h-12 w-12 rounded-2xl border-border/50" title="Fiscal Settings"><Settings className="w-4 h-4" /></Button>
            <Button className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 font-black gap-2 flex-1 xl:flex-none">
              <Plus className="w-5 h-5" /> SYNCHRONIZE PAYMENT
            </Button>
          </div>
        </div>

        {/* Content Engine */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12">

          {/* Payment Stream */}
          <Card className="lg:col-span-8 border-0 shadow-soft bg-background/40 backdrop-blur-md rounded-[3rem] overflow-hidden border border-border/10">
            <CardHeader className="p-8 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black flex items-center gap-3 lowercase tracking-tight">
                    <Landmark className="w-6 h-6 text-primary" /> Recent Ingress Stream
                  </CardTitle>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mt-1">Real-time revenue synchronization</p>
                </div>
                <Button variant="ghost" className="h-10 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest gap-2 bg-muted/40 hover:bg-primary hover:text-white transition-all">
                  Ledger View <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <AnimatePresence mode="wait">
                {paymentsLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Accessing Bank Registry...</p>
                  </div>
                ) : payments.length === 0 ? (
                  <div className="py-20 text-center opacity-40">
                    <Info className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-sm font-bold">No Recent Transactions Detected</p>
                  </div>
                ) : (
                  payments.map((p: any, i: number) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-5 rounded-[2.5rem] bg-background border border-border/10 group hover:border-emerald-500/20 hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Receipt className="w-6 h-6 text-muted-foreground group-hover:text-emerald-500" />
                        </div>
                        <div>
                          <h5 className="font-black text-sm tracking-tight">{p.invoice?.student?.firstName} {p.invoice?.student?.lastName}</h5>
                          <p className="text-[10px] font-mono font-bold text-muted-foreground/60 uppercase mt-0.5">REF: {p.reference} · {new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="text-lg font-black tracking-tighter">KES {Number(p.amount).toLocaleString()}</p>
                        <Badge variant="outline" className="text-[9px] font-black uppercase h-5 px-3 bg-emerald-500/10 text-emerald-600 border-none">
                          <ShieldCheck className="w-3 h-3 mr-1.5" /> SECURE
                        </Badge>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Collection Logic Grid */}
          <Card className="lg:col-span-4 border-0 shadow-soft bg-background/50 backdrop-blur-md rounded-[3rem] overflow-hidden border border-border/10">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-black lowercase tracking-tight">Cohort Saturation</CardTitle>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Fee coverage by structural unit</p>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {[
                { cls: "Secondary Grade 7", pct: 85, color: "bg-primary" },
                { cls: "Secondary Grade 8", pct: 72, color: "bg-indigo-500" },
                { cls: "Primary Grade 6", pct: 80, color: "bg-emerald-500" },
                { cls: "Early Childhood", pct: 91, color: "bg-amber-500" },
              ].map((item, idx) => (
                <div key={item.cls} className="space-y-3 group">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-black group-hover:text-primary transition-colors">{item.cls}</span>
                    <span className="text-[10px] font-black opacity-40 group-hover:opacity-100 transition-opacity">{item.pct}% SECURED</span>
                  </div>
                  <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.pct}%` }}
                      transition={{ duration: 1, delay: idx * 0.1 }}
                      className={`h-full ${item.color} group-hover:animate-pulse`}
                    />
                  </div>
                </div>
              ))}

              <div className="mt-8 p-6 rounded-[2.5rem] bg-indigo-500/10 border border-indigo-200">
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-900">Fiscal Insight</span>
                </div>
                <p className="text-[10px] font-bold text-indigo-600/80 leading-relaxed">
                  Revenue collection is currently trending <span className="font-black">+5.2%</span> above previous cluster average. Focus on Grade 8 arrears to reach optimal flow.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
