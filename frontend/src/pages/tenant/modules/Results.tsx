import { useState, useMemo } from "react";
import {
    Download, FileBarChart, ArrowUpRight, Users, Award, ShieldCheck, Loader2,
    TrendingUp, TrendingDown, Target, Zap, Activity, ChevronRight,
    Sparkles, Filter, Search, Share2, Info, BarChart3
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

export default function Results() {
    const [selectedExam, setSelectedExam] = useState("");
    const [search, setSearch] = useState("");

    // Fetch Assessments
    const { data: exams = [] } = useQuery({
        queryKey: ["exams"],
        queryFn: async () => {
            const r = await api.get("/assessments");
            return r.data;
        },
    });

    // Fetch Marks for selected exam
    const { data: marks = [], isLoading } = useQuery({
        queryKey: ["marks", selectedExam],
        queryFn: async () => {
            if (!selectedExam) return [];
            const r = await api.get(`/assessments/marks/${selectedExam}`);
            return r.data;
        },
        enabled: !!selectedExam,
    });

    const analysis = useMemo(() => {
        if (!marks || marks.length === 0) return null;

        const sorted = [...marks].sort((a, b) => b.score - a.score);
        const total = marks.reduce((acc: number, m: any) => acc + parseFloat(m.score), 0);
        const mean = (total / marks.length).toFixed(1);
        const passRank = marks.filter((m: any) => parseFloat(m.score) >= 50).length;
        const passRate = ((passRank / marks.length) * 100).toFixed(0);
        const gradeA = marks.filter((m: any) => parseFloat(m.score) >= 80).length;

        const filtered = sorted.filter((m: any) =>
            `${m.student?.firstName} ${m.student?.lastName}`.toLowerCase().includes(search.toLowerCase())
        );

        return { sorted: filtered, original: sorted, mean, passRate, gradeA, count: marks.length };
    }, [marks, search]);

    return (
        <>
            <AppHeader title="Analytics Studio" subtitle="High-fidelity performance metrics & cohort metadata" />
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/30">

                {/* Selective Ingress */}
                <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-background/40 p-4 rounded-[2rem] border border-border/50 backdrop-blur-md shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                        <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 rounded-2xl border border-primary/10">
                            <Target className="w-4 h-4 text-primary" />
                            <span className="text-[10px] font-black uppercase text-primary tracking-widest whitespace-nowrap">Target Engine</span>
                        </div>
                        <Select onValueChange={setSelectedExam} value={selectedExam}>
                            <SelectTrigger className="w-full sm:w-[320px] h-12 rounded-2xl bg-background/50 border-none font-bold shadow-none focus:ring-2 focus:ring-primary/20 transition-all">
                                <SelectValue placeholder="LOCATE EVALUATION NODE" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-border/50 shadow-2xl">
                                {exams.map((e: any) => (
                                    <SelectItem key={e.id} value={e.id} className="font-bold">{e.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-3 w-full xl:w-auto">
                        {analysis && (
                            <>
                                <Button variant="outline" className="h-12 w-12 rounded-2xl border-border/50" title="Export Dataset"><Download className="w-4 h-4" /></Button>
                                <Button variant="outline" className="h-12 w-12 rounded-2xl border-border/50" title="Share Analytics"><Share2 className="w-4 h-4" /></Button>
                                <Button className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 font-black gap-2 flex-1 xl:flex-none">
                                    <Sparkles className="w-5 h-5" /> GENERATE REPORT
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {selectedExam ? (
                        isLoading ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40 gap-4">
                                <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aggregating Cohort Data...</p>
                            </motion.div>
                        ) : analysis ? (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 animate-in fade-in duration-500">
                                {/* Summary Metrics Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <Card className="border-0 shadow-soft bg-primary rounded-[2.5rem] overflow-hidden text-white group">
                                        <CardContent className="p-8 flex flex-col justify-between h-40">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Cohort Mean</p>
                                                <TrendingUp className="w-5 h-5 opacity-40 group-hover:scale-125 transition-transform" />
                                            </div>
                                            <div>
                                                <p className="text-4xl font-black">{analysis.mean}%</p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <div className="w-6 h-0.5 bg-white/20 rounded-full overflow-hidden">
                                                        <div className="h-full bg-white w-2/3" />
                                                    </div>
                                                    <span className="text-[8px] font-bold opacity-60 uppercase tracking-tighter">+2.4% vs PREV</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-border/50 group">
                                        <CardContent className="p-8 flex flex-col justify-between h-40">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Premium Nodes (A)</p>
                                                <Award className="w-5 h-5 text-primary opacity-20 group-hover:scale-125 transition-transform" />
                                            </div>
                                            <div>
                                                <p className="text-4xl font-black text-foreground">{analysis.gradeA}</p>
                                                <p className="text-[10px] font-bold text-primary uppercase mt-1 tracking-widest">Excellence Benchmark</p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-border/50 group">
                                        <CardContent className="p-8 flex flex-col justify-between h-40">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Analysis Batch</p>
                                                <Users className="w-5 h-5 text-primary opacity-20 group-hover:scale-125 transition-transform" />
                                            </div>
                                            <div>
                                                <p className="text-4xl font-black text-foreground">{analysis.count}</p>
                                                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase mt-1 tracking-widest">Total Active Entries</p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-0 shadow-soft bg-emerald-500/10 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-emerald-100 group">
                                        <CardContent className="p-8 flex flex-col justify-between h-40">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Integrity Pass</p>
                                                <ShieldCheck className="w-5 h-5 text-emerald-500 opacity-20 group-hover:scale-125 transition-transform" />
                                            </div>
                                            <div>
                                                <p className="text-4xl font-black text-emerald-600">{analysis.passRate}%</p>
                                                <p className="text-[10px] font-bold text-emerald-500 uppercase mt-1 tracking-widest">Threshold Consensus</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Merit Engine */}
                                <div className="space-y-6">
                                    <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-background/40 p-4 rounded-[2rem] border border-border/50 backdrop-blur-md shadow-sm">
                                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                                            <div className="relative w-full sm:w-80">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Locate within merit list..."
                                                    value={search}
                                                    onChange={e => setSearch(e.target.value)}
                                                    className="pl-11 h-12 bg-background/50 border-none rounded-2xl shadow-none focus-visible:ring-2 focus-visible:ring-primary/20 font-bold"
                                                />
                                            </div>
                                            <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-background/50 rounded-2xl border border-border/50 text-[10px] font-black uppercase text-muted-foreground whitespace-nowrap">
                                                <Filter className="w-3.5 h-3.5" /> Sorting Active
                                            </div>
                                        </div>
                                        <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-3 px-6 py-2 bg-primary/10 text-primary rounded-2xl border border-primary/10">
                                            <BarChart3 className="w-4 h-4" /> Performance Merit Spectrum
                                        </h3>
                                    </div>

                                    <Card className="border-0 shadow-soft bg-background/40 backdrop-blur-md rounded-[3rem] border border-border/50 overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="hover:bg-transparent border-border/50">
                                                    <TableHead className="w-32 pl-10 py-8 text-[10px] font-black uppercase tracking-widest">Merit Rank</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Student Identity</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Raw Metric</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Grade Grade</TableHead>
                                                    <TableHead className="text-right pr-10 text-[10px] font-black uppercase tracking-widest">Insight</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {analysis.sorted.map((m: any, idx: number) => {
                                                    const rank = analysis.original.findIndex((o: any) => o.id === m.id) + 1;
                                                    return (
                                                        <TableRow key={m.id} className="group hover:bg-background/60 transition-colors border-border/50">
                                                            <TableCell className="pl-10 py-6">
                                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs transition-transform group-hover:scale-110 ${rank <= 3 ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-muted/80 text-muted-foreground'
                                                                    }`}>
                                                                    #{rank}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center text-[10px] font-black text-muted-foreground uppercase">{m.student?.firstName?.[0]}{m.student?.lastName?.[0]}</div>
                                                                    <div className="flex flex-col">
                                                                        <h4 className="font-bold text-sm tracking-tight">{m.student?.firstName} {m.student?.lastName}</h4>
                                                                        <p className="text-[9px] font-mono font-bold text-muted-foreground uppercase opacity-40">{m.student?.admissionNumber}</p>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex flex-col gap-1.5 w-32">
                                                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                                                        <span>{m.score}%</span>
                                                                        <span className="opacity-40 font-mono tracking-tighter">RAW</span>
                                                                    </div>
                                                                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                                                                        <div className={`h-full ${m.score >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${m.score}%` }} />
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge className={`font-black text-[10px] uppercase h-7 px-4 border-none ${m.score >= 80 ? "bg-emerald-500/10 text-emerald-600" :
                                                                        m.score >= 70 ? "bg-indigo-500/10 text-indigo-600" :
                                                                            m.score >= 60 ? "bg-skye-500/10 text-sky-600" :
                                                                                m.score >= 50 ? "bg-amber-500/10 text-amber-600" : "bg-rose-500/10 text-rose-600"
                                                                    }`}>
                                                                    GRADE {m.score >= 80 ? "A" : m.score >= 70 ? "B" : m.score >= 60 ? "C" : m.score >= 50 ? "D" : "E"}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right pr-10">
                                                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted group-hover:scale-110 transition-transform">
                                                                    <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </Card>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40 gap-6 glass-card rounded-[3rem] border border-dashed border-muted-foreground/20">
                                <Zap className="w-16 h-16 text-muted-foreground/10" />
                                <div className="text-center">
                                    <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Analytic Void Detected</p>
                                    <p className="text-[10px] font-bold text-muted-foreground/60 mt-2">No performance packets found for this evaluation node.</p>
                                </div>
                            </motion.div>
                        )
                    ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40 gap-6 glass-card rounded-[3rem] border border-dashed border-muted-foreground/20">
                            <Activity className="w-16 h-16 text-muted-foreground/10" />
                            <div className="text-center">
                                <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Studio Standby</p>
                                <p className="text-[10px] font-bold text-muted-foreground/60 mt-2">Please select an evaluation node to begin deeper cohort analysis.</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-indigo-50 flex items-center gap-3">
                                <Info className="w-4 h-4 text-indigo-500" />
                                <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">Optimization engine active</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}
