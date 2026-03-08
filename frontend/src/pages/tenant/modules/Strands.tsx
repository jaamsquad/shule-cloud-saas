import { useState } from "react";
import {
    Search, Plus, MoreVertical, Pencil, Trash2, Layers, BookOpen, GraduationCap,
    ChevronRight, Filter, LayoutGrid, Info, Sparkles
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function Strands() {
    const [search, setSearch] = useState("");
    const [selectedLA, setSelectedLA] = useState<string>("all");
    const [showAdd, setShowAdd] = useState(false);
    const [strandName, setStrandName] = useState("");
    const [learningAreaId, setLearningAreaId] = useState("");
    const queryClient = useQueryClient();

    const { data: learningAreas = [], isLoading } = useQuery({
        queryKey: ["learning-areas"],
        queryFn: async () => {
            const r = await api.get("/academics/learning-areas");
            return r.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: { learningAreaId: string; name: string }) =>
            api.post(`/academics/learning-areas/${data.learningAreaId}/strands`, { name: data.name }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["learning-areas"] });
            setShowAdd(false); setStrandName(""); setLearningAreaId("");
            toast.success("Strand added to curriculum");
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to add strand"),
    });

    // Flatten strands for easier filtering if needed, but grouping is better
    const allStrands = learningAreas.flatMap((la: any) =>
        (la.strands || []).map((s: any) => ({ ...s, learningAreaName: la.name, learningAreaId: la.id }))
    );

    const filteredAreas = learningAreas.filter((la: any) => {
        const matchesLA = selectedLA === "all" || la.id === selectedLA;
        const hasMatchingStrand = la.strands?.some((s: any) =>
            s.name.toLowerCase().includes(search.toLowerCase())
        );
        const matchesSearch = la.name.toLowerCase().includes(search.toLowerCase()) || hasMatchingStrand;
        return matchesLA && (search === "" ? matchesLA : matchesSearch);
    });

    return (
        <>
            <AppHeader title="Curriculum Strands" subtitle="Manage specific strands within learning areas" />
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/30">

                {/* Stats / Hero */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md relative overflow-hidden group">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <Layers className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">FLattened Strands</p>
                                    <p className="text-3xl font-black">{isLoading ? "---" : allStrands.length}</p>
                                </div>
                            </div>
                        </CardContent>
                        <div className="absolute bottom-0 left-0 h-1 w-full bg-primary/10 group-hover:bg-primary transition-all duration-500" />
                    </Card>

                    <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md relative overflow-hidden group">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                    <Sparkles className="w-6 h-6 text-indigo-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Competency Ratio</p>
                                    <p className="text-3xl font-black">4.2:1</p>
                                </div>
                            </div>
                        </CardContent>
                        <div className="absolute bottom-0 left-0 h-1 w-full bg-indigo-500/10 group-hover:bg-indigo-500 transition-all duration-500" />
                    </Card>

                    <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md relative overflow-hidden group">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                    <GraduationCap className="w-6 h-6 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Completion Rate</p>
                                    <p className="text-3xl font-black">88%</p>
                                </div>
                            </div>
                        </CardContent>
                        <div className="absolute bottom-0 left-0 h-1 w-full bg-amber-500/10 group-hover:bg-amber-500 transition-all duration-500" />
                    </Card>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-background/40 p-4 rounded-[2rem] border border-border/50 backdrop-blur-md">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search strands..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-11 h-12 bg-background/50 border-none rounded-2xl shadow-none"
                            />
                        </div>
                        <Select value={selectedLA} onValueChange={setSelectedLA}>
                            <SelectTrigger className="h-12 w-[200px] bg-background/50 border-none rounded-2xl shadow-none">
                                <SelectValue placeholder="All Learning Areas" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-border/50 shadow-xl">
                                <SelectItem value="all">Global Framework</SelectItem>
                                {learningAreas.map((la: any) => (
                                    <SelectItem key={la.id} value={la.id}>{la.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={() => setShowAdd(true)} className="w-full sm:w-auto h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 font-bold gap-2">
                        <Plus className="w-5 h-5" /> Append Strand
                    </Button>
                </div>

                {/* Content Grid (Grouped by Learning Area) */}
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-32 gap-4">
                            <div className="w-10 h-10 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Syncing Curriculum Strands...</p>
                        </motion.div>
                    ) : filteredAreas.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-32 bg-background/20 rounded-[3rem] border-2 border-dashed border-border/50">
                            <Layers className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                            <h3 className="text-xl font-black mb-2">No Matching Strands</h3>
                            <p className="text-muted-foreground text-sm max-w-xs mx-auto">Adjust your search or add a new strand to a learning area.</p>
                        </motion.div>
                    ) : (
                        <div className="space-y-8">
                            {filteredAreas.map((la: any, laIdx: number) => (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: laIdx * 0.1 }}
                                    key={la.id}
                                    className="space-y-4"
                                >
                                    <div className="flex items-center gap-3 px-2">
                                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                                            <BookOpen className="w-4 h-4 text-primary" />
                                        </div>
                                        <h2 className="text-lg font-black tracking-tight">{la.name}</h2>
                                        <Badge variant="outline" className="text-[10px] font-bold border-none bg-muted/50 px-2 h-5">
                                            {la.strands?.length || 0} Strands
                                        </Badge>
                                        <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {(la.strands || []).filter((s: any) => s.name.toLowerCase().includes(search.toLowerCase())).map((strand: any, sIdx: number) => (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: laIdx * 0.1 + sIdx * 0.05 }}
                                                key={strand.id}
                                            >
                                                <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-md group hover:bg-background transition-all duration-300 relative overflow-hidden h-full flex flex-col justify-between">
                                                    <CardContent className="p-5">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/10 group-hover:scale-110 transition-transform">
                                                                <Layers className="w-4 h-4 text-indigo-500" />
                                                            </div>
                                                            <div className="flex gap-1 group-hover:opacity-100 opacity-0 transition-opacity">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <h3 className="font-bold text-sm leading-tight mb-4">{strand.name}</h3>
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter text-muted-foreground bg-muted/30 p-2 rounded-lg">
                                                                <span>Sub-Strands</span>
                                                                <span className="text-foreground">{strand._count?.subStrands || 0}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter text-muted-foreground bg-muted/30 p-2 rounded-lg">
                                                                <span>Assessments</span>
                                                                <span className="text-foreground">0</span>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                    <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-[0.2em] h-10 border-t border-border/50 rounded-none group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                                        Deep Dive <ChevronRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
                                                    </Button>
                                                </Card>
                                            </motion.div>
                                        ))}

                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                            <Card
                                                className="border-2 border-dashed border-border/50 bg-transparent hover:bg-background/40 cursor-pointer transition-all flex flex-col items-center justify-center py-10 gap-2 h-full"
                                                onClick={() => { setLearningAreaId(la.id); setStrandName(""); setShowAdd(true); }}
                                            >
                                                <Plus className="w-6 h-6 text-muted-foreground/50" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">New Strand</span>
                                            </Card>
                                        </motion.div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Add Strand Dialog */}
            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent className="rounded-[2.5rem] p-0 border-0 shadow-2xl overflow-hidden max-w-sm">
                    <div className="h-2 bg-primary" />
                    <div className="p-8">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-black">Define Strand</DialogTitle>
                            <DialogDescription className="text-xs font-medium">Add a core thematic area to a specific academic learning area.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest ml-1">Parent Learning Area</Label>
                                <Select value={learningAreaId} onValueChange={setLearningAreaId}>
                                    <SelectTrigger className="h-12 bg-muted/50 border-0 rounded-2xl focus:ring-primary shadow-none">
                                        <SelectValue placeholder="Target learning area" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-border/50 shadow-xl">
                                        {learningAreas.map((la: any) => (
                                            <SelectItem key={la.id} value={la.id} className="font-bold">{la.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest ml-1">Strand Title</Label>
                                <Input
                                    placeholder="e.g. Numbers and Operations"
                                    value={strandName}
                                    onChange={e => setStrandName(e.target.value)}
                                    className="h-12 bg-muted/50 border-0 rounded-2xl focus-visible:ring-primary shadow-none"
                                />
                            </div>
                        </div>
                        <DialogFooter className="mt-8 flex !flex-row gap-2">
                            <Button variant="outline" onClick={() => setShowAdd(false)} className="flex-1 h-12 rounded-2xl font-bold">Cancel</Button>
                            <Button
                                onClick={() => { if (learningAreaId && strandName) createMutation.mutate({ learningAreaId, name: strandName }); }}
                                disabled={createMutation.isPending || !learningAreaId || !strandName}
                                className="flex-1 h-12 rounded-2xl font-bold shadow-lg shadow-primary/20"
                            >
                                {createMutation.isPending ? "Configuring..." : "Save Strand"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
