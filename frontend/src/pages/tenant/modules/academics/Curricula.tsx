import { useState } from "react";
import { Search, Plus, Settings, Edit, Trash2, ChevronRight, Eye } from "lucide-react";
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

export default function Curricula() {
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({ code: "", name: "", levels: 3 });
    
    const queryClient = useQueryClient();

    const { data: items = [], isLoading } = useQuery({
        queryKey: ["curricula-list"],
        queryFn: async () => {
            const r = await api.get("/academics/curricula");
            return r.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/academics/curricula", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["curricula-list"] });
            setShowAdd(false);
            setForm({ code: "", name: "", levels: 3 });
            toast.success("Curriculum framework established");
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => api.patch(`/academics/curricula/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["curricula-list"] });
            setEditing(null);
            toast.success("Curriculum updated");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/academics/curricula/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["curricula-list"] });
            toast.success("Curriculum archived");
        },
    });

    const handleEdit = (item: any) => {
        setEditing(item);
        setForm({ code: item.code, name: item.name, levels: item.levels || 3 });
    };

    const filtered = items.filter((item: any) => 
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.code?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 bg-white overflow-hidden flex flex-col p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-sm bg-gray-50 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-gray-500" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-800">Curricula</h1>
                </div>
                <Button onClick={() => { setForm({ code: "", name: "", levels: 3 }); setShowAdd(true); }} size="sm" variant="outline" className="text-gray-500 font-bold text-[11px] gap-2 h-9 px-4 rounded-sm border-gray-300">
                    <Plus className="w-4 h-4" /> Add Curriculum
                </Button>
            </div>

            <div className="border border-gray-100 rounded-sm shadow-sm overflow-x-auto mt-4">
                <Table>
                    <TableHeader className="bg-gray-50 text-gray-500">
                        <TableRow className="h-10">
                            <TableHead className="font-bold text-[12px] uppercase h-10 px-6">Code</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase h-10 px-6">Name</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase h-10 px-6">Levels</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase h-10 px-6 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-10 opacity-50 text-xs text-gray-400">Loading curricular frameworks...</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-10 opacity-50 text-xs font-bold text-gray-400">No curricula defined</TableCell></TableRow>
                        ) : (
                            filtered.map((item: any) => (
                                <TableRow key={item._id} className="hover:bg-gray-50/50 group border-b border-gray-50 h-10">
                                    <TableCell className="text-[13px] text-sky-600 font-medium px-6">{item.code}</TableCell>
                                    <TableCell className="text-[13px] text-gray-800 px-6 font-medium">{item.name}</TableCell>
                                    <TableCell className="text-[13px] text-gray-600 px-6">{item.levels || 3}</TableCell>
                                    <TableCell className="text-right px-6">
                                         <div className="flex justify-end gap-1.5 opacity-80 group-hover:opacity-100">
                                            <Button variant="outline" size="sm" className="h-7 px-3 text-[11px] font-bold text-gray-600 bg-white border-gray-300 gap-1 rounded-sm shadow-none">
                                                <Eye className="w-3" /> View
                                            </Button>
                                            <Button onClick={() => handleEdit(item)} variant="outline" size="sm" className="h-7 px-3 text-[11px] font-bold text-gray-600 bg-white border-gray-300 gap-1 rounded-sm shadow-none">
                                                <Edit className="w-3" /> Edit
                                            </Button>
                                            <Button onClick={() => deleteMutation.mutate(item._id)} variant="outline" size="sm" className="h-7 px-3 text-[11px] font-bold text-gray-600 bg-white border-gray-300 gap-1 rounded-sm shadow-none">
                                                <Trash2 className="w-3" /> Delete
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Form Dialog */}
            <Dialog open={showAdd || !!editing} onOpenChange={(v) => { if(!v) { setShowAdd(false); setEditing(null); } }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle className="text-sky-600">{editing ? 'Edit Curriculum' : 'New Curriculum Framework'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                             <Label>Curriculum Code</Label>
                             <Input value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="e.g. 8-4-4" />
                        </div>
                        <div className="space-y-2">
                             <Label>Description Name</Label>
                             <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. KCSE Curriculum" />
                        </div>
                        <div className="space-y-2">
                             <Label>Educational Levels</Label>
                             <Input type="number" value={form.levels} onChange={e => setForm({...form, levels: Number(e.target.value)})} placeholder="4" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowAdd(false); setEditing(null); }}>Cancel</Button>
                        {editing ? (
                             <Button onClick={() => updateMutation.mutate({ id: editing._id, data: form })} className="bg-[#10b981] text-white hover:bg-emerald-600">Save Changes</Button>
                        ) : (
                             <Button onClick={() => createMutation.mutate(form)} className="bg-sky-600 text-white hover:bg-sky-700">Add Curriculum</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
