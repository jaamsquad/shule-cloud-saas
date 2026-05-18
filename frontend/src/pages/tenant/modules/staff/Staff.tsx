import { useState } from "react";
import { 
    Search, Plus, Briefcase, Mail, Phone, Edit, Trash2, 
    ChevronRight, ArrowLeft, Camera, User, 
    BookOpen, School, Filter, MoreHorizontal, MessageSquare, Download,
    GraduationCap, Globe, ShieldCheck, Hash, UserCheck, Eye, History as HistoryIcon,
    Upload
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export default function Staff() {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [editingStaff, setEditingStaff] = useState<any>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [form, setForm] = useState({ 
        name: "", role: "Teacher", gender: "Male", phone: "", email: "", status: "Active" 
    });
    
    const queryClient = useQueryClient();

    const { data: staff = [], isLoading } = useQuery({
        queryKey: ["staff-list"],
        queryFn: async () => {
            const r = await api.get("/academics/staff");
            return r.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/academics/staff", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["staff-list"] });
            setShowAdd(false);
            setForm({ name: "", role: "Teacher", gender: "Male", phone: "", email: "", status: "Active" });
            toast.success("Staff member added");
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => api.patch(`/academics/staff/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["staff-list"] });
            setEditingStaff(null);
            toast.success("Staff record updated");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/academics/staff/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["staff-list"] });
            toast.success("Staff record moved to archives");
        },
    });

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);
                
                const res = await api.post("/academics/staff/bulk", { items: data });
                toast.success(`Successfully imported ${res.data.count} staff records`);
                queryClient.invalidateQueries({ queryKey: ["staff-list"] });
                setShowImport(false);
            } catch (err) {
                toast.error("Bulk import failed. Ensure CSV matches header requirements.");
            }
        };
        reader.readAsBinaryString(file);
    };

    const filtered = staff.filter((s: any) => 
        s.name?.toLowerCase().includes(search.toLowerCase()) || 
        s.role?.toLowerCase().includes(search.toLowerCase())
    );

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleEditClick = (s: any) => {
        setEditingStaff(s);
        setForm({ 
            name: s.name, role: s.role, gender: s.gender, 
            phone: s.phone || "", email: s.email || "", status: s.status || "Active" 
        });
    };

    return (
        <div className="flex-1 bg-gray-50/30 overflow-hidden flex flex-col p-6 space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-sm bg-sky-50 flex items-center justify-center">
                        <Users className="w-5 h-5 text-sky-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            Staff <Badge variant="secondary" className="bg-sky-500 text-white rounded-full">{staff.length}</Badge>
                        </h1>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="bg-sky-600 text-white hover:bg-sky-700 border-none gap-2 h-9">
                        <MessageSquare className="w-4 h-4" /> SMS
                    </Button>
                    <Button onClick={() => { setForm({ name: "", role: "Teacher", gender: "Male", phone: "", email: "", status: "Active" }); setShowAdd(true); }} size="sm" variant="outline" className="text-gray-600 gap-2 h-9 border-gray-200">
                        <Plus className="w-4 h-4" /> Add Staff
                    </Button>
                    <Button onClick={() => setShowImport(true)} size="sm" variant="outline" className="text-gray-600 gap-2 h-9 border-gray-200">
                        <Upload className="w-4 h-4" /> Import
                    </Button>
                </div>
            </div>

            {/* List Controls */}
            <div className="flex items-center justify-between bg-white p-4 rounded-sm border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 text-[13px] text-gray-500">
                    <span>Show</span>
                    <select className="border border-gray-200 rounded-sm px-1 py-0.5 outline-none">
                        <option>10</option>
                        <option>25</option>
                    </select>
                    <span>entries</span>
                </div>
                
                <div className="relative w-64">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[13px] font-medium text-gray-400">Search:</span>
                    <Input 
                        value={search} 
                        onChange={e => setSearch(e.target.value)}
                        className="pl-14 h-8 rounded-sm bg-white border-gray-200 text-[13px]" 
                    />
                </div>
            </div>

            {/* Data Table */}
            <div className="flex-1 overflow-auto bg-white border border-gray-100 rounded-sm shadow-sm overflow-x-auto">
                <Table>
                    <TableHeader className="bg-gray-50 text-gray-600">
                        <TableRow>
                            <TableHead className="w-12 text-center">
                                <Checkbox checked={selectedIds.length === filtered.length && filtered.length > 0} onCheckedChange={(v) => setSelectedIds(v ? filtered.map((s:any) => s._id) : [])} />
                            </TableHead>
                            <TableHead className="w-16"></TableHead>
                            <TableHead className="font-bold text-[12px] uppercase">Name</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase">Role</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase">Gender</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase">Phone</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase">Email</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase text-center">Status</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={9} className="text-center py-10 opacity-50">Loading staff records...</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={9} className="text-center py-10 opacity-50 font-bold">No staff found.</TableCell></TableRow>
                        ) : (
                            filtered.map((s: any) => (
                                <TableRow key={s._id} className="hover:bg-gray-50/50 group border-b border-gray-50">
                                    <TableCell className="text-center">
                                         <Checkbox checked={selectedIds.includes(s._id)} onCheckedChange={() => toggleSelect(s._id)} />
                                    </TableCell>
                                    <TableCell>
                                        <div className="w-9 h-9 rounded-sm overflow-hidden bg-gray-100 border border-gray-100 flex items-center justify-center">
                                            {s.avatar ? <img src={s.avatar} className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-gray-400" />}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-sky-600 hover:underline cursor-pointer text-[13px]">{s.name}</TableCell>
                                    <TableCell className="text-[13px] text-gray-600">{s.role}</TableCell>
                                    <TableCell className="text-[13px] text-gray-600">{s.gender}</TableCell>
                                    <TableCell className="text-[13px] text-emerald-600 font-medium">{s.phone || 'N/A'}</TableCell>
                                    <TableCell className="text-[13px] text-gray-500">{s.email || 'N/A'}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={`bg-[#10b981] hover:bg-[#059669] text-white font-normal text-[10px] rounded-[2px] px-2 py-0.5`}>
                                            {s.status || 'Active'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button onClick={() => handleEditClick(s)} variant="ghost" size="icon" className="h-7 w-7 text-sky-600 hover:text-sky-700 hover:bg-sky-50"><Edit className="w-3.5" /></Button>
                                            <Button onClick={() => deleteMutation.mutate(s._id)} variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50"><Trash2 className="w-3.5" /></Button>
                                            <Button variant="outline" size="sm" className="h-7 px-3 text-[11px] font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border-gray-300 gap-1.5 rounded-sm shadow-none">
                                                <Eye className="w-3.5 h-3.5" /> View
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Placeholder */}
            <div className="flex items-center justify-between py-2 px-1 text-[13px] text-gray-500">
                <p>Showing {filtered.length} of {staff.length} entries</p>
                <div className="flex gap-1">
                   <Button variant="outline" size="sm" disabled className="h-8 shadow-none border-gray-200 rounded-sm">Previous</Button>
                   <Button variant="outline" size="sm" className="h-8 w-8 bg-sky-600 text-white shadow-none border-none rounded-sm">1</Button>
                   <Button variant="outline" size="sm" disabled className="h-8 shadow-none border-gray-200 rounded-sm">Next</Button>
                </div>
            </div>

            {/* Form Dialog (Add/Edit) */}
            <Dialog open={showAdd || !!editingStaff} onOpenChange={(v) => { if(!v) { setShowAdd(false); setEditingStaff(null); } }}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle className="text-sky-600">{editingStaff ? 'Edit Staff Member' : 'New Staff Registration'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Mary Claires" />
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Input value={form.role} onChange={e => setForm({...form, role: e.target.value})} placeholder="Teacher" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Gender</Label>
                                <select className="w-full h-10 px-3 rounded-md border text-[13px]" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                                    <option>Male</option>
                                    <option>Female</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+254" />
                            </div>
                        </div>
                        <div className="space-y-2">
                                <Label>Email</Label>
                                <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@school.com" />
                         </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowAdd(false); setEditingStaff(null); }}>Cancel</Button>
                        {editingStaff ? (
                             <Button onClick={() => updateMutation.mutate({ id: editingStaff._id, data: form })} className="bg-[#10b981] text-white hover:bg-emerald-600">Save Changes</Button>
                        ) : (
                             <Button onClick={() => createMutation.mutate(form)} className="bg-sky-600 text-white hover:bg-sky-700">Add Staff</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Import Dialog */}
            <Dialog open={showImport} onOpenChange={setShowImport}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Bulk Import Staff</DialogTitle><DialogDescription>Upload an Excel/CSV file with staff details</DialogDescription></DialogHeader>
                    <div className="py-10 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center space-y-3">
                         <Upload className="w-10 h-10 text-gray-300" />
                         <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                         <input type="file" accept=".xlsx,.xls,.mcsv" className="hidden" id="staff-upload" onChange={handleImport} />
                         <Button onClick={() => document.getElementById('staff-upload')?.click()} variant="outline">Browse Files</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
