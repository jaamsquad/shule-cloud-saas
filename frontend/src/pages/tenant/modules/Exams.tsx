import { useState } from "react";
import { Search, Plus, Calendar, Printer, MoreVertical, LayoutGrid } from "lucide-react";
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

export default function Exams() {
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ name: "", type: "EXAM" });
    const queryClient = useQueryClient();

    const { data: exams = [], isLoading } = useQuery({
        queryKey: ["exams"],
        queryFn: async () => {
            const r = await api.get("/assessments");
            return r.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/assessments", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["exams"] });
            setShowAdd(false);
            setForm({ name: "", type: "EXAM" });
            toast.success("Exam session created");
        },
    });

    const filtered = exams.filter((e: any) =>
        (e.name || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            <AppHeader title="Exams & Maintenance" subtitle="Schedule and manage institutional examinations" />
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Search exams..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-background/50" />
                    </div>
                    <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="w-4 h-4" /> Create New Assessment</Button>
                </div>

                {isLoading ? (
                    <div className="text-center py-20 text-muted-foreground">Loading assessments...</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">No assessments found.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map((e: any) => (
                            <Card key={e.id} className="shadow-card border-t-4 border-t-primary overflow-hidden hover:shadow-lg transition-all border-0 bg-background/60 backdrop-blur-md">
                                <CardContent className="p-5">
                                    <div className="flex justify-between items-start mb-4">
                                        <Badge variant={e.isPublished ? 'default' : 'secondary'} className="rounded-sm">
                                            {e.isPublished ? 'PUBLISHED' : 'DRAFT'}
                                        </Badge>
                                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                                    </div>

                                    <h3 className="font-bold text-lg leading-tight mb-2">{e.name}</h3>
                                    <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-4">{e.type}</p>

                                    <div className="space-y-3 py-4 border-y border-dashed">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Created</span>
                                            <span className="font-medium">{new Date(e.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground flex items-center gap-1.5"><LayoutGrid className="w-3.5 h-3.5" /> Marks Recorded</span>
                                            <span className="font-medium">{e._count?.markEntries || 0}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex gap-2">
                                        <Button variant="outline" size="sm" className="flex-1 h-9 hover:bg-primary hover:text-white transition-colors">Manage</Button>
                                        <Button variant="outline" size="icon" className="h-9 w-9"><Printer className="w-4 h-4" /></Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={showAdd} onOpenChange={setShowAdd}>
                <DialogContent>
                    <DialogHeader><DialogTitle>New Assessment Session</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Assessment Name</Label>
                            <Input placeholder="e.g. End Term 1 Exam" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EXAM">Formal Exam</SelectItem>
                                    <SelectItem value="CAT">Continuous Assessment (CAT)</SelectItem>
                                    <SelectItem value="PRACTICAL">Practical / Lab</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                        <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>Create Session</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
