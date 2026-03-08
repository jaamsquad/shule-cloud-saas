import { useState } from "react";
import {
    Search, Plus, MoreVertical, HelpCircle,
    Sparkles, Database, Brain, Zap, Target,
    Filter, ChevronRight, Info, Trash2, Pencil,
    LayoutGrid, List, BarChart3, TrendingUp
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
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";

const difficultyMatrix: Record<string, { color: string; bg: string; icon: any }> = {
    EASY: { color: "text-emerald-500", bg: "bg-emerald-500/10", icon: Zap },
    MEDIUM: { color: "text-amber-500", bg: "bg-amber-500/10", icon: Target },
    HARD: { color: "text-rose-500", bg: "bg-rose-500/10", icon: Brain },
};

export default function QuestionBank() {
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ content: "", difficulty: "MEDIUM", category: "" });
    const queryClient = useQueryClient();

    const { data: questions = [], isLoading } = useQuery({
        queryKey: ["questions"],
        queryFn: async () => {
            const r = await api.get("/assessments/questions");
            return r.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/assessments/questions", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["questions"] });
            setShowAdd(false);
            setForm({ content: "", difficulty: "MEDIUM", category: "" });
            toast.success("Cognitive unit integrated into central bank");
        },
    });

    const filtered = questions.filter((q: any) =>
        q.content.toLowerCase().includes(search.toLowerCase()) ||
        q.tags?.category?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            <AppHeader title="Intelligence Bank" subtitle="Centralized architecture for diagnostic & summative items" />
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/30">

                {/* Stats Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                        <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">Total Items</p>
                                    <p className="text-3xl font-black mt-1">{isLoading ? "---" : questions.length}</p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                                    <Database className="w-7 h-7 text-primary" />
                                </div>
                            </CardContent>
                            <div className="h-1.5 w-full bg-primary/20" />
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                        <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Optimal Load</p>
                                    <p className="text-3xl font-black mt-1">92%</p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                    <Zap className="w-7 h-7 text-emerald-600" />
                                </div>
                            </CardContent>
                            <div className="h-1.5 w-full bg-emerald-500/20" />
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                        <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Item Diversity</p>
                                    <p className="text-3xl font-black mt-1">{new Set(questions.map((q: any) => q.tags?.category)).size}</p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                                    <BarChart3 className="w-7 h-7 text-indigo-500" />
                                </div>
                            </CardContent>
                            <div className="h-1.5 w-full bg-indigo-500/20" />
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                        <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Deep Inquiry</p>
                                    <p className="text-3xl font-black mt-1">{questions.filter((q: any) => q.difficulty === 'HARD').length}</p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                                    <Brain className="w-7 h-7 text-amber-500" />
                                </div>
                            </CardContent>
                            <div className="h-1.5 w-full bg-amber-500/20" />
                        </Card>
                    </motion.div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-background/40 p-4 rounded-[2rem] border border-border/50 backdrop-blur-md shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Filter knowledge items..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-11 h-12 bg-background/50 border-none rounded-2xl shadow-none focus-visible:ring-2 focus-visible:ring-primary/20 font-bold"
                            />
                        </div>
                        <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-background/50 rounded-2xl border border-border/50 text-[10px] font-black uppercase text-muted-foreground whitespace-nowrap">
                            <Filter className="w-3.5 h-3.5" /> Filter Matrix
                        </div>
                    </div>
                    <Button onClick={() => setShowAdd(true)} className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 font-black gap-2 w-full xl:w-auto">
                        <Plus className="w-5 h-5" /> Integrate Item
                    </Button>
                </div>

                {/* Question Inventory */}
                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-40 gap-4">
                                <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Accessing Memory Cluster...</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-40 gap-4 glass-card rounded-[3rem]">
                                <HelpCircle className="w-16 h-16 text-muted-foreground/10" />
                                <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Index Empty</p>
                            </div>
                        ) : (
                            filtered.map((q: any, i: number) => {
                                const DM = difficultyMatrix[q.difficulty] || difficultyMatrix.MEDIUM;
                                return (
                                    <motion.div
                                        key={q.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                    >
                                        <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-md hover:bg-background transition-all duration-500 rounded-[2.5rem] overflow-hidden group">
                                            <CardContent className="p-6">
                                                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                                    <div className="flex flex-col gap-3 flex-1">
                                                        <div className="flex items-center gap-3">
                                                            <Badge variant="outline" className={`text-[9px] font-black uppercase h-5 px-3 border-none ${DM.bg} ${DM.color}`}>
                                                                {q.difficulty}
                                                            </Badge>
                                                            <Badge variant="outline" className="text-[9px] font-black uppercase h-5 px-3 bg-muted/40 border-none text-muted-foreground">
                                                                {q.tags?.category || "UNCLASSIFIED"}
                                                            </Badge>
                                                            <span className="text-[8px] font-black text-muted-foreground/30 uppercase font-mono tracking-tighter">NODE: {q.id.split('-')[0]}</span>
                                                        </div>
                                                        <p className="text-base font-bold leading-relaxed tracking-tight text-foreground transition-colors group-hover:text-primary">{q.content}</p>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <div className="flex flex-col items-end mr-4 hidden md:flex">
                                                            <p className="text-[9px] font-black uppercase text-muted-foreground/40">Usage Rank</p>
                                                            <div className="flex items-center gap-1">
                                                                <TrendingUp className="w-3 h-3 text-emerald-500" />
                                                                <span className="text-xs font-black uppercase">Top 10%</span>
                                                            </div>
                                                        </div>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted group-hover:scale-110 transition-transform"><MoreVertical className="w-4 h-4" /></Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="rounded-2xl border-border/50 shadow-2xl p-1">
                                                                <DropdownMenuItem className="rounded-xl font-bold py-2.5"><Pencil className="w-3.5 h-3.5 mr-3" /> Re-Draft</DropdownMenuItem>
                                                                <DropdownMenuItem className="text-rose-500 rounded-xl font-bold py-2.5"><Trash2 className="w-3.5 h-3.5 mr-3" /> Purge Item</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Ingress Dialog */}
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent className="max-w-2xl rounded-[3rem] border-0 shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
                    <div className="h-2 bg-primary" />
                    <div className="p-10">
                        <DialogHeader className="mb-8">
                            <DialogTitle className="text-3xl font-black flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                Item Ingress
                            </DialogTitle>
                            <DialogDescription className="text-sm font-medium">Capture a high-fidelity cognitive unit into the centralized question bank.</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Cognitive Prompt (Content)</Label>
                                <Textarea
                                    placeholder="Define the query protocol..."
                                    value={form.content}
                                    onChange={e => setForm({ ...form, content: e.target.value })}
                                    className="min-h-[140px] rounded-[2rem] bg-muted/40 border-0 focus-visible:ring-2 focus-visible:ring-primary transition-all p-6 font-bold leading-relaxed shadow-inner"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Difficulty Density</Label>
                                    <Select value={form.difficulty} onValueChange={v => setForm({ ...form, difficulty: v })}>
                                        <SelectTrigger className="h-12 rounded-2xl bg-muted/40 border-0 font-bold px-6 shadow-none"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/50 shadow-2xl">
                                            <SelectItem value="EASY" className="font-bold">LOW (EASY)</SelectItem>
                                            <SelectItem value="MEDIUM" className="font-bold">NOMINAL (MEDIUM)</SelectItem>
                                            <SelectItem value="HARD" className="font-bold">CRITICAL (HARD)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Knowledge Cluster</Label>
                                    <Input
                                        placeholder="e.g. ALGEBRAX"
                                        value={form.category}
                                        onChange={e => setForm({ ...form, category: e.target.value })}
                                        className="h-12 rounded-2xl bg-muted/40 border-0 font-bold px-6 shadow-none"
                                    />
                                </div>
                            </div>

                            <div className="p-6 rounded-[2rem] bg-indigo-50/50 border border-indigo-100 flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-500 shadow-sm">
                                    <Info className="w-5 h-5" />
                                </div>
                                <p className="text-[10px] font-bold text-indigo-600/80 leading-relaxed">
                                    Items are automatically indexed and optimized for structural alignment with CBC learning strands.
                                </p>
                            </div>
                        </div>

                        <DialogFooter className="mt-10 flex !flex-row gap-3 pt-4">
                            <Button variant="outline" onClick={() => setShowAdd(false)} className="flex-1 h-12 rounded-2xl font-bold border-border/50">Abort Ingress</Button>
                            <Button
                                onClick={() => createMutation.mutate({ ...form, tags: { category: form.category } })}
                                disabled={createMutation.isPending}
                                className="flex-[2] h-12 rounded-2xl font-black shadow-lg shadow-primary/20 bg-primary"
                            >
                                {createMutation.isPending ? "INTEGRATING..." : "FINALIZE ITEM"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
