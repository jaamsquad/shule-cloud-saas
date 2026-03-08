import { useState, useEffect, useMemo } from "react";
import {
    Save, CheckCircle2, ChevronRight, User, Hash, Loader2,
    Sparkles, Filter, Activity, TrendingUp, AlertCircle,
    ClipboardCheck, Search, Database, Download, Share2
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function MarkEntry() {
    const [selectedStream, setSelectedStream] = useState("");
    const [selectedExam, setSelectedExam] = useState("");
    const [marks, setMarks] = useState<Record<string, string>>({});
    const [search, setSearch] = useState("");
    const queryClient = useQueryClient();

    // Fetch Streams
    const { data: streams = [] } = useQuery({
        queryKey: ["streams"],
        queryFn: async () => {
            const r = await api.get("/classes/streams");
            return r.data;
        },
    });

    // Fetch Assessments
    const { data: exams = [] } = useQuery({
        queryKey: ["exams"],
        queryFn: async () => {
            const r = await api.get("/assessments");
            return r.data;
        },
    });

    // Fetch Students for selected stream
    const { data: students = [], isLoading: loadingStudents } = useQuery({
        queryKey: ["students", selectedStream],
        queryFn: async () => {
            if (!selectedStream) return [];
            const r = await api.get(`/students?streamId=${selectedStream}`);
            return r.data;
        },
        enabled: !!selectedStream,
    });

    // Fetch existing marks for selected exam
    const { data: existingMarks = [], isLoading: loadingMarks } = useQuery({
        queryKey: ["marks", selectedExam],
        queryFn: async () => {
            if (!selectedExam) return [];
            const r = await api.get(`/assessments/marks/${selectedExam}`);
            return r.data;
        },
        enabled: !!selectedExam,
    });

    // Sync existing marks to local state
    useEffect(() => {
        if (existingMarks.length > 0) {
            const m: Record<string, string> = {};
            existingMarks.forEach((em: any) => {
                m[em.studentId] = em.score.toString();
            });
            setMarks(m);
        } else {
            setMarks({});
        }
    }, [existingMarks]);

    const saveMutation = useMutation({
        mutationFn: async (data: { studentId: string, score: number }) => {
            return api.post("/assessments/marks", {
                assessmentId: selectedExam,
                studentId: data.studentId,
                score: data.score,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["marks", selectedExam] });
        },
    });

    const handleSaveAll = async () => {
        const promises = Object.entries(marks)
            .filter(([_, score]) => score !== "")
            .map(([studentId, score]) => {
                return saveMutation.mutateAsync({ studentId, score: parseFloat(score) });
            });

        try {
            await Promise.all(promises);
            toast.success("Cognitive data synchronized successfully");
        } catch (e) {
            toast.error("Packet loss detected during sync");
        }
    };

    const streamName = streams.find((s: any) => s.id === selectedStream)?.name;
    const examName = exams.find((e: any) => e.id === selectedExam)?.name;

    const filteredStudents = useMemo(() => {
        return students.filter((s: any) =>
            `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
            s.admissionNumber.toLowerCase().includes(search.toLowerCase())
        );
    }, [students, search]);

    const classAverage = useMemo(() => {
        const values = Object.values(marks).map(v => parseFloat(v)).filter(v => !isNaN(v));
        if (values.length === 0) return 0;
        return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
    }, [marks]);

    return (
        <>
            <AppHeader title="Intelligence Registry" subtitle="Synchronizing student performance parameters" />
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/30">

                {/* Configuration Layer */}
                <div className="flex flex-col xl:flex-row gap-6">
                    <Card className="flex-1 border-0 bg-background/50 backdrop-blur-md shadow-soft rounded-[2.5rem] overflow-hidden">
                        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-1">Target Cluster (Stream)</label>
                                <Select value={selectedStream} onValueChange={setSelectedStream}>
                                    <SelectTrigger className="h-12 rounded-2xl bg-muted/40 border-0 font-bold px-6 shadow-none focus:ring-2 focus:ring-primary/20"><SelectValue placeholder="LOCATE CLUSTER" /></SelectTrigger>
                                    <SelectContent className="rounded-2xl border-border/50 shadow-2xl">
                                        {streams.map((s: any) => (
                                            <SelectItem key={s.id} value={s.id} className="font-bold">{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-1">Evaluation Node (Assessment)</label>
                                <Select value={selectedExam} onValueChange={setSelectedExam}>
                                    <SelectTrigger className="h-12 rounded-2xl bg-muted/40 border-0 font-bold px-6 shadow-none focus:ring-2 focus:ring-primary/20"><SelectValue placeholder="LOCATE EXAM" /></SelectTrigger>
                                    <SelectContent className="rounded-2xl border-border/50 shadow-2xl">
                                        {exams.map((e: any) => (
                                            <SelectItem key={e.id} value={e.id} className="font-bold">{e.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {selectedStream && selectedExam && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="xl:w-80">
                            <Card className="h-full border-0 bg-primary shadow-lg shadow-primary/20 rounded-[2.5rem] overflow-hidden text-white group">
                                <CardContent className="p-6 flex flex-col justify-between h-full">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Aggregate Rank</p>
                                        <Activity className="w-5 h-5 opacity-40 group-hover:scale-110 transition-transform" />
                                    </div>
                                    <div>
                                        <p className="text-4xl font-black">{classAverage}%</p>
                                        <p className="text-[10px] font-bold opacity-60 uppercase mt-1 tracking-widest">Calculated Cluster Average</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </div>

                {selectedStream && selectedExam ? (
                    <div className="space-y-6">
                        {/* Registry Toolbar */}
                        <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-background/40 p-4 rounded-[2rem] border border-border/50 backdrop-blur-md shadow-sm">
                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                                <div className="relative w-full sm:w-80">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Locate student by name..."
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="pl-11 h-12 bg-background/50 border-none rounded-2xl shadow-none focus-visible:ring-2 focus-visible:ring-primary/20 font-bold"
                                    />
                                </div>
                                <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-background/50 rounded-2xl border border-border/50 text-[10px] font-black uppercase text-muted-foreground">
                                    <Filter className="w-3.5 h-3.5" /> Filter Matrix
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full xl:w-auto">
                                <Button variant="outline" className="h-12 w-12 rounded-2xl border-border/50" title="Export Dataset"><Download className="w-4 h-4" /></Button>
                                <Button
                                    onClick={handleSaveAll}
                                    className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 font-black gap-2 flex-1 xl:flex-none"
                                    disabled={saveMutation.isPending}
                                >
                                    {saveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    SYNCHRONIZE ALL
                                </Button>
                            </div>
                        </div>

                        {/* Mark Matrix */}
                        <AnimatePresence mode="wait">
                            {loadingStudents || loadingMarks ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40 gap-4">
                                    <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Synchronizing Performance Data...</p>
                                </motion.div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {filteredStudents.map((s: any, i: number) => (
                                        <motion.div
                                            key={s.id}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: i * 0.02 }}
                                        >
                                            <Card className={`border-0 shadow-soft bg-background/60 backdrop-blur-md hover:bg-background transition-all duration-500 rounded-[2.5rem] overflow-hidden group ${marks[s.id] ? 'ring-2 ring-emerald-500/20' : ''}`}>
                                                <CardContent className="p-6">
                                                    <div className="flex flex-col gap-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground font-black group-hover:scale-110 transition-transform">
                                                                {s.firstName?.[0]}{s.lastName?.[0]}
                                                            </div>
                                                            <div className="flex-1">
                                                                <h4 className="text-sm font-black tracking-tight flex items-center gap-2">
                                                                    {s.firstName} {s.lastName}
                                                                    {marks[s.id] && <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-in fade-in zoom-in duration-500" />}
                                                                </h4>
                                                                <p className="text-[10px] font-mono font-bold text-muted-foreground/60 uppercase tracking-widest">{s.admissionNumber}</p>
                                                            </div>
                                                        </div>

                                                        <div className="relative group/input">
                                                            <Input
                                                                value={marks[s.id] || ""}
                                                                onChange={(e) => setMarks({ ...marks, [s.id]: e.target.value })}
                                                                className="h-16 text-2xl text-center font-black rounded-3xl bg-muted/30 border-none shadow-inner focus-visible:ring-primary/20 focus-visible:bg-white transition-all pr-12"
                                                                placeholder="0"
                                                                type="number"
                                                            />
                                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest hidden group-focus-within/input:block">Points</span>

                                                            {/* Performance Indicator Bar */}
                                                            {marks[s.id] && (
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${Math.min(100, parseFloat(marks[s.id]))}%` }}
                                                                    className={`absolute bottom-0 left-0 h-1.5 rounded-full ${parseFloat(marks[s.id]) >= 70 ? 'bg-emerald-500' :
                                                                            parseFloat(marks[s.id]) >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                                                        }`}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40 gap-6 glass-card rounded-[3rem]">
                        <div className="w-20 h-20 rounded-[2.5rem] bg-muted/40 flex items-center justify-center text-muted-foreground/20 group hover:scale-110 transition-transform">
                            <Hash className="w-10 h-10" />
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-lg font-black uppercase tracking-widest text-muted-foreground">Registry Idle</p>
                            <p className="text-[10px] font-bold text-muted-foreground/60 max-w-xs mx-auto">
                                Please establish a target cluster and evaluation node to initialize the performance synchronization flux.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-4 h-6 border-muted-foreground/20 text-muted-foreground/40 italic">Waiting for parameters...</Badge>
                        </div>
                    </motion.div>
                )}

                {/* Real-time Alerts */}
                {Object.keys(marks).length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-12">
                        <div className="p-6 rounded-[2.5rem] bg-indigo-500/10 border border-indigo-200 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white border border-indigo-100 flex items-center justify-center text-indigo-500 shadow-sm">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[11px] font-black uppercase text-indigo-900 tracking-widest">Real-time Buffer Active</p>
                                <p className="text-[10px] font-bold text-indigo-600/80">Currently buffering scores for {Object.keys(marks).length} students. Ensure a terminal synchronization before session termination.</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </>
    );
}
