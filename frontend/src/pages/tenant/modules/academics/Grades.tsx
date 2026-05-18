import { useState } from "react";
import { Search, Plus, List, Edit, Trash2, ChevronRight, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function Grades() {
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({ curriculum: "8-4-4", name: "", abbrev: "", points: 0 });
    
    const queryClient = useQueryClient();

    const { data: items = [], isLoading } = useQuery({
        queryKey: ["grades-list"],
        queryFn: async () => {
            const r = await api.get("/academics/grades");
            return r.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/academics/grades", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["grades-list"] });
            setShowAdd(false);
            setForm({ curriculum: "8-4-4", name: "", abbrev: "", points: 0 });
            toast.success("Grade level defined");
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => api.patch(`/academics/grades/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["grades-list"] });
            setEditing(null);
            toast.success("Grade level adjusted");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/academics/grades/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["grades-list"] });
            toast.success("Grade level removed");
        },
    });

    const handleEdit = (item: any) => {
        setEditing(item);
        setForm({ ...item, points: Number(item.points) });
    };

    const filtered = items.filter((item: any) => 
        item.name?.toLowerCase().includes(search.toLowerCase()) || 
        item.curriculum?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 bg-white overflow-hidden flex flex-col p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-sm bg-gray-50 flex items-center justify-center border border-gray-100 shadow-sm">
                        <List className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Grades</h1>
                        <p className="text-[12px] text-gray-400 font-bold uppercase tracking-tight mt-0.5">Curriculum: all</p>
                    </div>
                </div>
                <Button onClick={() => { setForm({ curriculum: "8-4-4", name: "", abbrev: "", points: 0 }); setShowAdd(true); }} size="sm" variant="outline" className="text-gray-500 font-bold text-[11px] gap-2 h-9 px-4 rounded-sm border-gray-300 shadow-sm">
                    <Plus className="w-4 h-4" /> Add Grade
                </Button>
            </div>

            <div className="flex items-center justify-between py-2 px-1">
                <div className="flex items-center gap-2 text-[13px] text-gray-500">
                    <span>Show</span>
                    <select className="border border-gray-300 rounded-sm px-2 py-1 outline-none font-bold text-gray-700 h-8 shadow-sm">
                        <option>10</option>
                        <option>25</option>
                    </select>
                    <span>entries</span>
                </div>
                
                <div className="flex items-center gap-2">
                   <span className="text-[13px] font-bold text-gray-400 uppercase tracking-tight">Search:</span>
                   <Input 
                        value={search} 
                        onChange={e => setSearch(e.target.value)}
                        className="w-48 h-8 rounded-sm bg-white border-gray-300 shadow-none text-[13px]" 
                    />
                </div>
            </div>

            <div className="border border-gray-100 rounded-sm shadow-sm overflow-x-auto">
                <Table>
                    <TableHeader className="bg-gray-50 text-gray-500">
                        <TableRow className="h-10">
                            <TableHead className="font-bold text-[12px] uppercase h-10 px-6">Curriculum</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase h-10 px-6">Name</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase h-10 px-6">Abbreviation</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase h-10 px-6">Points</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase h-10 px-6 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-10 opacity-50 text-xs text-gray-400">Loading catalog...</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-10 opacity-50 text-xs font-bold text-gray-400 uppercase tracking-widest">No grade levels defined</TableCell></TableRow>
                        ) : (
                            filtered.map((item: any) => (
                                <TableRow key={item._id} className="hover:bg-gray-50/50 group border-b border-gray-50 h-10">
                                    <TableCell className="text-[13px] text-gray-600 px-6">{item.curriculum || '8-4-4'}</TableCell>
                                    <TableCell className="text-[13px] text-gray-800 px-6 font-medium">{item.name}</TableCell>
                                    <TableCell className="text-[13px] text-gray-500 px-6 font-bold uppercase tracking-tight">{item.abbrev}</TableCell>
                                    <TableCell className="text-[13px] text-gray-600 px-6 font-bold">{item.points}</TableCell>
                                    <TableCell className="text-right px-6">
                                         <div className="flex justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <Button onClick={() => handleEdit(item)} variant="outline" size="sm" className="h-7 px-3 text-[11px] font-bold text-gray-600 bg-white border-gray-300 gap-1.5 rounded-sm shadow-none">
                                                <Edit className="w-3.5 h-3.5" /> Edit
                                            </Button>
                                            <Button onClick={() => deleteMutation.mutate(item._id)} variant="outline" size="sm" className="h-7 px-3 text-[11px] font-bold text-gray-600 bg-white border-gray-300 gap-1.5 rounded-sm shadow-none">
                                                <Trash2 className="w-3.5 h-3.5" /> Delete
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            
            <div className="flex items-center justify-between py-2 text-[13px] text-gray-500 px-1">
                <p>Showing {filtered.length} of {items.length} entries</p>
                <div className="flex">
                   <Button variant="outline" size="sm" className="h-8 shadow-none border-gray-200 rounded-l-md border-r-0 text-gray-400">Previous</Button>
                   <Button variant="outline" size="sm" className="h-8 w-8 bg-sky-600 text-white shadow-none border-none rounded-none">1</Button>
                   <Button variant="outline" size="sm" className="h-8 shadow-none border-gray-200 rounded-r-md border-l-0 text-gray-400">Next</Button>
                </div>
            </div>

            <Dialog open={showAdd || !!editing} onOpenChange={(v) => { if(!v) { setShowAdd(false); setEditing(null); } }}>
                <DialogContent className="max-w-md p-0 overflow-hidden border-none rounded-sm shadow-2xl">
                    <div className="bg-[#10b981] p-4 flex items-center gap-2 text-white">
                         <Edit className="w-5 h-5" />
                         <DialogTitle className="text-[15px] font-bold tracking-tight">Grade Details</DialogTitle>
                    </div>
                    <div className="p-8 bg-white space-y-6">
                        <div className="space-y-2">
                             <Label className="text-gray-500 font-bold text-[11px] uppercase tracking-tight">Curriculum</Label>
                             <select className="w-full h-10 px-3 rounded-sm border border-gray-200 text-[13px] bg-white focus:ring-1 focus:ring-[#10b981] outline-none" value={form.curriculum} onChange={e => setForm({...form, curriculum: e.target.value})}>
                                 <option>8-4-4</option>
                                 <option>CBC</option>
                                 <option>IGCSE</option>
                             </select>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <Label className="text-gray-500 font-bold text-[11px] uppercase tracking-tight">Name</Label>
                                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-10 border-gray-200 rounded-sm focus-visible:ring-[#10b981]" placeholder="A MINUS" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-500 font-bold text-[11px] uppercase tracking-tight">Abbreviation</Label>
                                <Input value={form.abbrev} onChange={e => setForm({...form, abbrev: e.target.value})} className="h-10 border-gray-200 rounded-sm focus-visible:ring-[#10b981]" placeholder="A-" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-500 font-bold text-[11px] uppercase tracking-tight">Points</Label>
                                <Input type="number" value={form.points} onChange={e => setForm({...form, points: Number(e.target.value)})} className="h-10 border-gray-200 rounded-sm focus-visible:ring-[#10b981]" placeholder="11" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 p-4 border-t flex justify-center gap-3">
                         <Button onClick={() => editing ? updateMutation.mutate({ id: editing._id, data: form }) : createMutation.mutate(form)} className="bg-[#10b981] text-white hover:bg-emerald-600 h-9 px-8 rounded-sm text-[12px] font-bold gap-2">
                            <CheckCircle className="w-4 h-4" /> Save
                         </Button>
                         <Button variant="outline" onClick={() => { setShowAdd(false); setEditing(null); }} className="h-9 px-8 rounded-sm text-[12px] font-bold gap-2 border-gray-300 text-gray-500">
                            <AlertCircle className="w-4 h-4" /> Cancel
                         </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
