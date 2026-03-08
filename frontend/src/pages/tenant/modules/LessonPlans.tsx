import { useState } from "react";
import { Search, Plus, BookOpen, Clock, FileDown, Loader2 } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function LessonPlans() {
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ topic: "", content: "", subjectId: "", teacherId: "", date: "" });
    const queryClient = useQueryClient();

    const { data: lessons = [], isLoading } = useQuery({
        queryKey: ["lesson-plans"],
        queryFn: async () => {
            const r = await api.get("/academics/lessons");
            return r.data;
        },
    });

    const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: async () => (await api.get("/subjects")).data });
    const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: async () => (await api.get("/staff")).data });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/academics/lessons", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lesson-plans"] });
            setShowAdd(false);
            setForm({ topic: "", content: "", subjectId: "", teacherId: "", date: "" });
            toast.success("Lesson plan added successfully");
        },
    });

    const filtered = lessons.filter((l: any) =>
        l.topic.toLowerCase().includes(search.toLowerCase()) ||
        l.subject?.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            <AppHeader title="Lesson Plans" subtitle="Manage daily lesson guides and materials" />
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/30">

                {/* Simple Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">Total Lessons</p>
                                    <p className="text-3xl font-black mt-1">{lessons.length}</p>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                                    <BookOpen className="w-7 h-7 text-primary" />
                                </div>
                            </CardContent>
                            <div className="h-1.5 w-full bg-primary/20" />
                        </Card>
                    </motion.div>
                </div>

                <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-background/40 p-4 rounded-[2rem] border border-border/50 backdrop-blur-md shadow-sm">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search lessons..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-11 h-12 bg-background/50 border-none rounded-2xl shadow-none focus-visible:ring-2 focus-visible:ring-primary/20 font-bold"
                        />
                    </div>
                    <Button onClick={() => setShowAdd(true)} className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 font-black gap-2">
                        <Plus className="w-5 h-5" /> Create New Plan
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-40 gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading lesson plans...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-40 bg-background/20 rounded-[4rem] border-2 border-dashed border-border/50 group">
                        <BookOpen className="w-20 h-20 text-muted-foreground/20 mx-auto mb-6 group-hover:scale-110 transition-transform" />
                        <h3 className="text-2xl font-black mb-2">No Plans Found</h3>
                        <p className="text-muted-foreground text-sm max-w-sm mx-auto">There are no lesson plans here yet. Click the button above to add one.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filtered.map((l: any, idx: number) => (
                            <motion.div
                                key={l.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <Card className="group border-0 shadow-soft bg-background/60 backdrop-blur-md hover:bg-background transition-all duration-500 rounded-[2.5rem] overflow-hidden cursor-pointer h-full flex flex-col pt-8">
                                    <div className="flex-1 px-8 pb-8">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500 border border-primary/20 shadow-xl shadow-primary/5">
                                                <BookOpen className="w-7 h-7" />
                                            </div>
                                            <Badge className={`text-[8px] font-black uppercase h-5 border-none ${l.status === 'READY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
                                                {l.status}
                                            </Badge>
                                        </div>
                                        <h3 className="font-black text-xl mb-2 group-hover:text-primary transition-colors leading-tight">{l.topic}</h3>
                                        <p className="text-xs font-medium text-muted-foreground mb-6">{l.subject?.name} • Teacher: {l.teacher?.firstName} {l.teacher?.lastName}</p>

                                        <div className="space-y-4 pt-6 border-t border-dashed border-border/50">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Planned Date</span>
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                                                    <Clock className="w-3.5 h-3.5" /> {new Date(l.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-3 pb-3">
                                        <Button variant="ghost" className="h-12 bg-muted/30 hover:bg-primary hover:text-white rounded-[1.5rem] w-full text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2">
                                            Download Plan <FileDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
                                        </Button>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent className="max-w-xl rounded-[3rem] border-0 shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Add New Lesson Plan</DialogTitle>
                        <p>Fill in the details below to create a new lesson guide.</p>
                    </DialogHeader>
                    <div className="h-2 bg-primary" />
                    <div className="p-10">
                        <div className="mb-8">
                            <h2 className="text-3xl font-black flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Plus className="w-6 h-6" />
                                </div>
                                New Lesson Plan
                            </h2>
                            <p className="text-sm font-medium text-muted-foreground mt-2">Fill in the details below to create a new lesson guide.</p>
                        </div>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">Lesson Topic *</Label>
                                    <Input placeholder="What will you teach?" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} className="h-12 rounded-2xl bg-muted/50 border-0 focus-visible:ring-primary shadow-none font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">Subject</Label>
                                    <Select value={form.subjectId} onValueChange={v => setForm({ ...form, subjectId: v })}>
                                        <SelectTrigger className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none font-bold"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/50 shadow-2xl">
                                            {subjects.map((s: any) => <SelectItem key={s.id} value={s.id} className="font-bold">{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">Teacher</Label>
                                    <Select value={form.teacherId} onValueChange={v => setForm({ ...form, teacherId: v })}>
                                        <SelectTrigger className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none font-bold"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/50 shadow-2xl">
                                            {staff.filter((s: any) => s.isTeachingStaff).map((s: any) => <SelectItem key={s.id} value={s.id} className="font-bold">{s.firstName} {s.lastName}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">Date</Label>
                                    <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="h-12 rounded-2xl bg-muted/50 border-0 focus-visible:ring-primary shadow-none font-bold" />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">Lesson Notes</Label>
                                    <Textarea placeholder="Write down what you will cover..." className="min-h-[120px] rounded-2xl bg-muted/50 border-0 focus-visible:ring-primary shadow-none resize-none p-4 text-sm font-medium" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="mt-8 flex !flex-row gap-3">
                            <Button variant="outline" onClick={() => setShowAdd(false)} className="flex-1 h-12 rounded-2xl font-bold border-border/50">Cancel</Button>
                            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="flex-[2] h-12 rounded-2xl font-black shadow-lg shadow-primary/20 bg-primary">Save Plan</Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
