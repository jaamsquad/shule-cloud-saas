import { useState } from "react";
import { 
    Plus, Edit, Trash2, Eye, ChevronDown, List, LayoutGrid, Search, Info, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";

export default function GradingPresets() {
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({ name: "", maxSubjects: 7, curriculum: "8-4-4" });
    
    const queryClient = useQueryClient();

    const { data: presets = [], isLoading } = useQuery({
        queryKey: ["grading-presets"],
        queryFn: async () => {
            const r = await api.get("/academics/grading-presets");
            return r.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/academics/grading-presets", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["grading-presets"] });
            setShowAdd(false);
            setForm({ name: "", maxSubjects: 7, curriculum: "8-4-4" });
            toast.success("Grading preset successfully created");
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => api.patch(`/academics/grading-presets/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["grading-presets"] });
            setEditing(null);
            toast.success("Grading preset updated");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/academics/grading-presets/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["grading-presets"] });
            toast.success("Grading preset removed from registry");
        },
    });

    const handleEdit = (item: any) => {
        setEditing(item);
        setForm({ name: item.name, maxSubjects: item.maxSubjects || 7, curriculum: item.curriculum || "8-4-4" });
    };

    const filtered = presets.filter((p: any) => 
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.curriculum?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 bg-white overflow-hidden flex flex-col p-8 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-sm bg-gray-50 flex items-center justify-center border border-gray-100 shadow-sm">
                        <List className="w-4 h-4 text-gray-400" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-800 tracking-tight">Grading Presets</h1>
                </div>
                <Button onClick={() => { setForm({ name: "", maxSubjects: 7, curriculum: "8-4-4" }); setShowAdd(true); }} size="sm" variant="outline" className="text-gray-600 font-bold text-[11px] gap-2 h-8 px-4 rounded-sm border-gray-300 shadow-sm transition-all hover:bg-gray-50 uppercase tracking-wider">
                    <Plus className="w-3.5 h-3.5" /> Add Grading Preset
                </Button>
            </div>

            <div className="flex items-center justify-between py-2 px-1">
                <div className="flex items-center gap-2 text-[13px] text-gray-500 font-medium">
                    <span>Show</span>
                    <select className="border border-gray-300 rounded-sm px-2 py-1 outline-none font-bold text-gray-700 h-8 shadow-sm">
                        <option>10</option>
                        <option>50</option>
                    </select>
                    <span>entries</span>
                </div>
                
                <div className="flex items-center gap-2">
                   <span className="text-[13px] font-bold text-gray-400 uppercase tracking-tight mr-1">Search:</span>
                   <Input 
                        value={search} 
                        onChange={e => setSearch(e.target.value)}
                        className="w-56 h-8 rounded-sm bg-white border-gray-300 shadow-none text-[13px] font-medium" 
                    />
                </div>
            </div>

            <div className="border border-gray-100 rounded-sm shadow-sm overflow-hidden bg-white">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow className="h-10 hover:bg-gray-50/50 border-b border-gray-100">
                            <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black border-r last:border-r-0">Curriculum</TableHead>
                            <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black border-r last:border-r-0">Name</TableHead>
                            <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black border-r last:border-r-0 text-center">Maximum Subjects</TableHead>
                            <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-10 opacity-50 text-[11px] font-black uppercase tracking-[0.2em] italic">Loading Presets...</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-10 opacity-30 text-[11px] font-black uppercase tracking-[0.2em]">No records discovered</TableCell></TableRow>
                        ) : (
                            filtered.map((p: any) => (
                                <TableRow key={p._id} className="hover:bg-gray-50/30 transition-colors border-b border-gray-50 last:border-0 h-14 font-medium text-[13px] text-gray-600">
                                    <TableCell className="px-8 border-r last:border-r-0 font-bold">{p.curriculum || '8-4-4'}</TableCell>
                                    <TableCell className="px-8 border-r last:border-r-0 uppercase font-black text-slate-800">{p.name || 'KCSE Preset'}</TableCell>
                                    <TableCell className="px-8 border-r last:border-r-0 text-center font-black">{p.maxSubjects || '7'}</TableCell>
                                    <TableCell className="px-8 text-right">
                                         <div className="flex gap-1 justify-end">
                                            <Button onClick={() => handleEdit(p)} variant="outline" size="sm" className="h-7 px-3 text-[10px] font-bold text-gray-500 border-gray-200 gap-1.5 rounded-sm hover:bg-sky-50 transition-all uppercase tracking-wider"><Edit className="w-3" /> Edit</Button>
                                            <Button onClick={() => deleteMutation.mutate(p._id)} variant="outline" size="sm" className="h-7 px-3 text-[10px] font-bold text-gray-500 border-gray-200 gap-1.5 rounded-sm hover:bg-rose-50 hover:text-rose-600 transition-all uppercase tracking-wider"><Trash2 className="w-3" /> Delete</Button>
                                         </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between py-4 px-1 text-[13px] text-gray-400 font-bold bg-white">
                <div>Showing 1 to {filtered.length} of {presets.length} entries</div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 border-gray-300 rounded-sm font-bold text-gray-500 px-4 shadow-sm hover:bg-gray-50 uppercase tracking-widest text-[10px]">Previous</Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 bg-sky-600 text-white shadow-none border-none rounded-sm font-bold">1</Button>
                    <Button variant="outline" size="sm" className="h-8 border-gray-300 rounded-sm font-bold text-gray-500 px-4 shadow-sm hover:bg-gray-50 uppercase tracking-widest text-[10px]">Next</Button>
                </div>
            </div>

            <Dialog open={showAdd || !!editing} onOpenChange={(v) => { if(!v) { setShowAdd(false); setEditing(null); } }}>
                <DialogContent className="p-0 border-0 overflow-hidden rounded-sm max-w-md shadow-2xl">
                    <DialogHeader className="bg-[#10b981] p-4 text-white flex-row items-center gap-2 space-y-0">
                         <div className="bg-white/20 p-2 rounded-full shrink-0">
                             <Edit className="w-4 h-4" />
                         </div>
                         <div className="flex flex-col">
                             <DialogTitle className="text-[15px] font-black uppercase tracking-wider leading-none">Grading Preset Details</DialogTitle>
                             <DialogDescription className="text-white/60 text-[10px] font-medium uppercase tracking-tight mt-1 opacity-100">{editing ? 'Update preset parameters' : 'Register a new grading preset'}</DialogDescription>
                         </div>
                    </DialogHeader>
                    <div className="p-10 space-y-8 bg-white">
                         <div className="space-y-4">
                             <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Name</Label>
                                <Input className="h-11 border-gray-200 rounded-sm bg-slate-50/30 font-bold text-slate-700 focus-visible:ring-emerald-500 transition-all" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. KCSE Preset" />
                             </div>
                             <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Maximum Subjects</Label>
                                <Input type="number" className="h-11 border-gray-200 rounded-sm bg-slate-50/30 font-bold text-slate-700 focus-visible:ring-emerald-500 transition-all" value={form.maxSubjects} onChange={e => setForm({...form, maxSubjects: Number(e.target.value)})} />
                             </div>
                             <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Curriculum</Label>
                                <select className="w-full h-11 px-3 bg-slate-50/30 border border-gray-200 rounded-sm text-[13px] outline-none font-bold text-slate-700 focus:border-emerald-500 transition-all" value={form.curriculum} onChange={e => setForm({...form, curriculum: e.target.value})}>
                                    <option>8-4-4</option>
                                    <option>CBC</option>
                                </select>
                             </div>
                         </div>
                    </div>
                    <div className="p-6 bg-slate-50 flex gap-4 border-t border-slate-100">
                         <Button onClick={() => editing ? updateMutation.mutate({ id: editing._id, data: form }) : createMutation.mutate(form)} className="flex-1 h-11 bg-[#10b981] hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[11px] gap-2 shadow-emerald-500/20 shadow-lg"><CheckCircle className="w-4" /> Save</Button>
                         <Button onClick={() => { setShowAdd(false); setEditing(null); }} variant="outline" className="flex-1 h-11 border-gray-300 font-bold text-slate-600 gap-2 hover:bg-white transition-all uppercase tracking-widest text-[11px]">Cancel</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
