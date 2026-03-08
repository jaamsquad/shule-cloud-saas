import { useState } from "react";
import {
  Search, Plus, Filter, Download, Upload, MoreVertical, UserPlus, GraduationCap,
  Users, Eye, Pencil, Trash2, FileSpreadsheet, LayoutGrid, List, ChevronRight,
  CheckCircle2, AlertCircle, X, Calendar, MapPin, Phone, Mail, UserCheck
} from "lucide-react";
import * as XLSX from "xlsx";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const emptyForm = {
  admissionNumber: "", firstName: "", lastName: "", gender: "", dob: "", classStreamId: "",
  guardianFirstName: "", guardianLastName: "", guardianPhone: "", guardianEmail: "", guardianRelation: "Parent",
};

const emptyEdit = {
  admissionNumber: "", firstName: "", lastName: "", gender: "", dob: "", classStreamId: "",
};

export default function Students() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showView, setShowView] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewStudent, setViewStudent] = useState<any>(null);
  const [newClassName, setNewClassName] = useState("");
  const [showAddClass, setShowAddClass] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const queryClient = useQueryClient();

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => { const r = await api.get("/students"); return r.data; },
  });

  const { data: classStreams = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => { const r = await api.get("/academics/classes"); return r.data; },
  });

  const admitMutation = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      let guardianId;
      if (data.guardianFirstName && data.guardianLastName) {
        const gRes = await api.post("/guardians", {
          firstName: data.guardianFirstName, lastName: data.guardianLastName,
          phone: data.guardianPhone, email: data.guardianEmail,
        });
        guardianId = gRes.data.id;
      }
      return api.post("/students", {
        admNo: data.admissionNumber, firstName: data.firstName, lastName: data.lastName,
        gender: data.gender || undefined, dob: data.dob || undefined,
        classId: data.classStreamId || undefined,
        guardianId, guardianRelation: data.guardianRelation,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["guardians"] });
      setShowAdd(false); setForm(emptyForm);
      toast.success("Student admitted successfully!");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to admit student"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/students/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setShowEdit(false); setEditForm(emptyEdit); toast.success("Student details updated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/students/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["students"] }); toast.success("Student records archived"); },
  });

  const bulkImportMutation = useMutation({
    mutationFn: (students: any[]) => api.post("/students/bulk", { students }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setShowBulkImport(false);
      setImportPreview([]);
      toast.success("Bulk enrollment complete!");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Bulk import failed"),
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      setImportPreview(data);
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const template = [{ admissionNumber: "ADM001", firstName: "John", lastName: "Doe", gender: "Male", dob: "2010-05-15" }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Student_Admission_Template.xlsx");
  };

  const filtered = students.filter((s: any) => {
    const q = search.toLowerCase();
    return `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) || s.admNo?.toLowerCase().includes(q);
  });

  const maleCount = students.filter((s: any) => s.gender?.toLowerCase() === 'male').length;
  const femaleCount = students.filter((s: any) => s.gender?.toLowerCase() === 'female').length;

  return (
    <>
      <AppHeader title="Students" subtitle="Centralized student database & digital registry" />
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/30">

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">Digital Registry</p>
                  <p className="text-3xl font-black mt-1">{isLoading ? "---" : students.length}</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-7 h-7 text-primary" />
                </div>
              </CardContent>
              <div className="h-1.5 w-full bg-primary/20 group-hover:bg-primary transition-all" />
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-success transition-colors">Male Students</p>
                  <p className="text-3xl font-black mt-1">{maleCount}</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20 group-hover:scale-110 transition-transform">
                  <UserCheck className="w-7 h-7 text-success" />
                </div>
              </CardContent>
              <div className="h-1.5 w-full bg-success/20 group-hover:bg-success transition-all" />
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-pink-500 transition-colors">Female Students</p>
                  <p className="text-3xl font-black mt-1">{femaleCount}</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-pink-500/10 flex items-center justify-center border border-pink-500/20 group-hover:scale-110 transition-transform">
                  <Users className="w-7 h-7 text-pink-500" />
                </div>
              </CardContent>
              <div className="h-1.5 w-full bg-pink-500/20 group-hover:bg-pink-500 transition-all" />
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-indigo-500 transition-colors">Retention Rate</p>
                  <p className="text-3xl font-black mt-1">98.4%</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                  <AlertCircle className="w-7 h-7 text-indigo-500" />
                </div>
              </CardContent>
              <div className="h-1.5 w-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-all" />
            </Card>
          </motion.div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-background/40 p-4 rounded-[2rem] border border-border/50 backdrop-blur-md shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Find student by ADM or Name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-11 h-12 bg-background/50 border-none rounded-2xl shadow-none focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
            <div className="flex bg-muted/60 p-1.5 rounded-2xl border border-border/50 backdrop-blur-sm self-stretch sm:self-auto">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-9 w-9 rounded-xl shadow-none"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="w-5 h-5" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-9 w-9 rounded-xl shadow-none"
                onClick={() => setViewMode("list")}
              >
                <List className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto overflow-x-auto pb-2 sm:pb-0">
            <Button variant="outline" className="h-12 px-6 rounded-2xl bg-background/50 border-border/50 hover:bg-background gap-2 font-bold" onClick={downloadTemplate}>
              <Download className="w-4 h-4" /> Template
            </Button>
            <Button variant="outline" className="h-12 px-6 rounded-2xl bg-background/50 border-border/50 hover:bg-background gap-2 font-bold" onClick={() => setShowBulkImport(true)}>
              <Upload className="w-4 h-4" /> Bulk Import
            </Button>
            <Button onClick={() => { setForm(emptyForm); setShowAdd(true); }} className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 font-black gap-2 flex-grow sm:flex-grow-0 min-w-[160px]">
              <Plus className="w-5 h-5" /> Admit Student
            </Button>
          </div>
        </div>

        {/* Content Display */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40 gap-4">
              <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Indexing Student Database...</p>
            </motion.div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-40 bg-background/20 rounded-[4rem] border-2 border-dashed border-border/50"
            >
              <GraduationCap className="w-20 h-20 text-muted-foreground/20 mx-auto mb-6" />
              <h3 className="text-2xl font-black mb-2">No Records Found</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">Either refine your search or enroll a new student to expand the registry.</p>
            </motion.div>
          ) : viewMode === "grid" ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
            >
              {filtered.map((s: any, idx: number) => (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={s.id}
                  className="group relative"
                >
                  <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-md group-hover:bg-background transition-all duration-300 rounded-[2.5rem] overflow-hidden cursor-pointer" onClick={() => { setViewStudent(s); setShowView(true); }}>
                    <div className="p-6 flex flex-col items-center text-center">
                      <div className="relative mb-4">
                        <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-primary-foreground font-black text-2xl group-hover:scale-105 transition-transform duration-500 shadow-xl shadow-primary/20">
                          {s.firstName?.[0]}{s.lastName?.[0]}
                        </div>
                        <Badge variant="secondary" className="absolute -bottom-2 -right-2 bg-background border-border/50 text-[9px] font-black h-6 shadow-sm uppercase tracking-tighter">
                          {s.classStream?.name || "TBD"}
                        </Badge>
                      </div>
                      <h3 className="font-black text-lg line-clamp-1 group-hover:text-primary transition-colors">{s.firstName} {s.lastName}</h3>
                      <p className="text-[10px] font-black font-mono font-bold text-muted-foreground uppercase tracking-widest mt-1">{s.admNo}</p>

                      <div className="grid grid-cols-2 gap-2 w-full mt-6 pt-6 border-t border-dashed border-border/50">
                        <div className="flex flex-col p-2.5 rounded-2xl bg-muted/40 text-left">
                          <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Gender</span>
                          <span className="text-xs font-bold capitalize">{s.gender || "—"}</span>
                        </div>
                        <div className="flex flex-col p-2.5 rounded-2xl bg-muted/40 text-left">
                          <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Attendance</span>
                          <span className="text-xs font-bold">96%</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                  <div className="absolute top-4 right-4 group-hover:opacity-100 opacity-0 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-background/80 backdrop-blur-md border border-border/50 shadow-sm" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl border-border/50 shadow-2xl overflow-hidden p-1">
                        <DropdownMenuItem onClick={() => { setViewStudent(s); setShowView(true); }} className="rounded-xl font-bold py-2.5"><Eye className="w-4 h-4 mr-3" /> Profile</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setEditForm({
                            admNo: s.admNo, firstName: s.firstName, lastName: s.lastName,
                            gender: s.gender || "", dob: s.dob ? s.dob.substring(0, 10) : "", classStreamId: s.classId || "",
                          });
                          setEditId(s.id);
                          setShowEdit(true);
                        }} className="rounded-xl font-bold py-2.5"><Pencil className="w-4 h-4 mr-3" /> Edit Entry</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive rounded-xl font-bold py-2.5" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="w-4 h-4 mr-3" /> Archive</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-background/40 backdrop-blur-md rounded-[2.5rem] border border-border/50 overflow-hidden shadow-soft"
            >
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="w-16"></TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-6">Identity</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Stream Context</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Gender</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Guardian Node</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-10">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s: any) => (
                    <TableRow key={s.id} className="group hover:bg-background/60 transition-colors border-border/50">
                      <TableCell className="pl-6">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm group-hover:scale-110 transition-transform">
                          {s.firstName?.[0]}{s.lastName?.[0]}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <p className="font-black text-sm">{s.firstName} {s.lastName}</p>
                          <p className="text-[9px] font-mono font-bold text-muted-foreground uppercase">{s.admNo}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-black text-[9px] lowercase bg-background/50 border-border/50 px-3 h-6 rounded-full">
                          {s.classStream?.name || "Unassigned"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-bold capitalize text-foreground/80">{s.gender || "—"}</TableCell>
                      <TableCell>
                        {s.guardians?.[0]?.guardian ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">{s.guardians[0].guardian.firstName}</span>
                            <Badge variant="ghost" className="text-[8px] h-4 bg-muted font-black px-1.5">{s.guardians[0].relation}</Badge>
                          </div>
                        ) : <span className="text-[10px] italic text-muted-foreground/50">Not Linked</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-success">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-tighter">Active</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary transition-all" onClick={() => { setViewStudent(s); setShowView(true); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-amber-500/10 hover:text-amber-500 transition-all" onClick={() => {
                            setEditForm({
                              admissionNumber: s.admissionNumber, firstName: s.firstName, lastName: s.lastName,
                              gender: s.gender || "", dob: s.dob ? s.dob.substring(0, 10) : "", classStreamId: s.classStreamId || "",
                            });
                            setEditId(s.id);
                            setShowEdit(true);
                          }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Profile Detail Sheet (Premium Feel) */}
      <Sheet open={showView} onOpenChange={setShowView}>
        <SheetContent className="sm:max-w-xl w-[95vw] p-0 border-l-0 bg-background/95 backdrop-blur-xl">
          {viewStudent && (
            <div className="h-full flex flex-col">
              <div className="p-8 bg-gradient-to-br from-primary/10 via-background to-transparent border-b border-border/50">
                <SheetHeader className="text-left flex flex-row items-start justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-[2.5rem] bg-primary flex items-center justify-center text-primary-foreground text-4xl font-black shadow-2xl shadow-primary/20 border-4 border-background">
                      {viewStudent.firstName?.[0]}{viewStudent.lastName?.[0]}
                    </div>
                    <div className="space-y-1">
                      <SheetTitle className="text-3xl font-black">{viewStudent.firstName} {viewStudent.lastName}</SheetTitle>
                      <SheetDescription className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-black text-[10px] uppercase h-6 bg-primary/10 text-primary border-none">
                          {viewStudent.admNo}
                        </Badge>
                        <Badge variant="outline" className="font-black text-[10px] uppercase h-6 border-border/50">
                          {viewStudent.gender || "Global"}
                        </Badge>
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Academic Context */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Academic Profile
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="border-0 bg-muted/30 shadow-none rounded-[1.5rem]">
                      <CardContent className="p-4 flex flex-col">
                        <span className="text-[8px] font-black uppercase text-muted-foreground mb-1">Assigned Class</span>
                        <span className="text-sm font-black">{viewStudent.classStream?.name || "Not Streaming"}</span>
                      </CardContent>
                    </Card>
                    <Card className="border-0 bg-muted/30 shadow-none rounded-[1.5rem]">
                      <CardContent className="p-4 flex flex-col">
                        <span className="text-[8px] font-black uppercase text-muted-foreground mb-1">Admission Date</span>
                        <span className="text-sm font-black">{new Date(viewStudent.createdAt).toLocaleDateString()}</span>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Personal Bio */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Personal Nodes
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-background/50 border border-border/50">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-[8px] font-black uppercase text-muted-foreground">Birth Registry</p>
                        <p className="text-sm font-bold">{viewStudent.dob ? new Date(viewStudent.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : "Not Documented"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-background/50 border border-border/50">
                      <MapPin className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-[8px] font-black uppercase text-muted-foreground">Contact Node</p>
                        <p className="text-sm font-bold">Nairobi Central, Kenya</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Guardianship Graph */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Family Registry
                  </h4>
                  {viewStudent.guardians?.length > 0 ? (
                    <div className="space-y-2">
                      {viewStudent.guardians.map((g: any) => (
                        <div key={g.guardianId} className="p-4 rounded-[1.5rem] bg-primary/5 border border-primary/10 flex items-center justify-between group hover:bg-primary/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-bold text-primary shadow-sm">
                              {g.guardian.firstName?.[0]}{g.guardian.lastName?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-black">{g.guardian.firstName} {g.guardian.lastName}</p>
                              <p className="text-[9px] font-bold text-muted-foreground flex items-center gap-1.5 uppercase">
                                <Phone className="w-2.5 h-2.5" /> {g.guardian.phone || "No Phone"}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-white text-primary font-black uppercase text-[8px] h-5">{g.relation}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-muted/20 rounded-3xl border border-dashed border-border/50 opacity-50">
                      <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-xs font-bold">No linked guardians found</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 bg-muted/10 border-t border-border/50 flex gap-3">
                <Button variant="outline" className="flex-1 h-12 rounded-2xl font-bold border-border/50" onClick={() => setShowView(false)}>Dismiss</Button>
                <Button className="flex-1 h-12 rounded-2xl font-black shadow-lg shadow-primary/20 gap-2">
                  <Search className="w-4 h-4" /> Full Profile View
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Student Dialog (Glassmorphic) */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl rounded-[3rem] border-0 shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
          <div className="h-2 bg-primary" />
          <div className="p-10">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-3xl font-black">Digital Enrollment</DialogTitle>
              <DialogDescription className="text-sm font-medium">Create a high-fidelity student node in the school registry.</DialogDescription>
            </DialogHeader>
            <form onSubmit={e => { e.preventDefault(); admitMutation.mutate(form); }} className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] h-6 uppercase tracking-widest">Section 1</Badge>
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Identity & Identity</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">First Name</Label>
                    <Input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} required className="h-12 rounded-2xl bg-muted/50 border-0 focus-visible:ring-primary shadow-none" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Last Name</Label>
                    <Input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} required className="h-12 rounded-2xl bg-muted/50 border-0 focus-visible:ring-primary shadow-none" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Admission Number</Label>
                    <Input placeholder="ADM-2026-X" value={form.admissionNumber} onChange={e => setForm(p => ({ ...p, admissionNumber: e.target.value }))} required className="h-12 rounded-2xl bg-muted/50 border-0 focus-visible:ring-primary shadow-none font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Student Gender</Label>
                    <Select value={form.gender} onValueChange={v => setForm(p => ({ ...p, gender: v }))}>
                      <SelectTrigger className="h-12 rounded-2xl bg-muted/50 border-0 focus:ring-primary shadow-none">
                        <SelectValue placeholder="Select Identity" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-border/50 shadow-2xl">
                        <SelectItem value="Male" className="font-bold">Male</SelectItem>
                        <SelectItem value="Female" className="font-bold">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Academic Stream</Label>
                    <Select value={form.classStreamId} onValueChange={v => setForm(p => ({ ...p, classStreamId: v }))}>
                      <SelectTrigger className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none">
                        <SelectValue placeholder="Assign Level" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-border/50 shadow-2xl">
                        {classStreams.map((cs: any) => (
                          <SelectItem key={cs.id} value={cs.id} className="font-bold">{cs.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Date of Birth</Label>
                    <Input type="date" value={form.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))} className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none" />
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-10 flex !flex-row gap-3">
                <Button type="button" variant="outline" onClick={() => setShowAdd(false)} className="flex-1 h-12 rounded-2xl font-bold">Discard</Button>
                <Button type="submit" disabled={admitMutation.isPending} className="flex-1 h-12 rounded-2xl font-black shadow-lg shadow-primary/20">
                  {admitMutation.isPending ? "Configuring Node..." : "Launch Enrollment"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-xl rounded-[3rem] border-0 shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
          <div className="h-2 bg-amber-500" />
          <div className="p-10">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-3xl font-black">Meta Update</DialogTitle>
              <DialogDescription className="text-sm font-medium">Modify existing student identity parameters.</DialogDescription>
            </DialogHeader>
            <form onSubmit={e => { e.preventDefault(); if (editId) updateMutation.mutate({ id: editId, data: editForm }); }} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-amber-600">First Name</Label>
                  <Input value={editForm.firstName} onChange={e => setEditForm(p => ({ ...p, firstName: e.target.value }))} required className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-amber-600">Last Name</Label>
                  <Input value={editForm.lastName} onChange={e => setEditForm(p => ({ ...p, lastName: e.target.value }))} required className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-amber-600">Admission No</Label>
                  <Input value={editForm.admissionNumber} onChange={e => setEditForm(p => ({ ...p, admissionNumber: e.target.value }))} required className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none font-mono" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-amber-600">Gender</Label>
                  <Select value={editForm.gender} onValueChange={v => setEditForm(p => ({ ...p, gender: v }))}>
                    <SelectTrigger className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border/50 shadow-2xl">
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="mt-8 flex !flex-row gap-3">
                <Button type="button" variant="outline" onClick={() => setShowEdit(false)} className="flex-1 h-12 rounded-2xl font-bold">Cancel</Button>
                <Button type="submit" disabled={updateMutation.isPending} className="flex-1 h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 font-black shadow-lg shadow-amber-500/20">
                  {updateMutation.isPending ? "Updating..." : "Commit Changes"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import (Premium Interactive Feel) */}
      <Dialog open={showBulkImport} onOpenChange={setShowBulkImport}>
        <DialogContent className="max-w-4xl rounded-[3rem] border-0 shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
          <div className="h-2 bg-indigo-600" />
          <div className="p-10">
            <DialogHeader className="mb-8 flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-3xl font-black">Collective Ingestion</DialogTitle>
                <DialogDescription className="text-sm font-medium">Bulk import student entities from structured Excel assets.</DialogDescription>
              </div>
              <Button variant="ghost" className="h-14 px-8 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold gap-2" onClick={downloadTemplate}>
                <FileSpreadsheet className="w-5 h-5" /> Download Key Template
              </Button>
            </DialogHeader>

            <div className="space-y-8">
              <div className="relative group">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="h-48 rounded-[2rem] border-2 border-dashed border-indigo-200 bg-indigo-50/30 flex flex-col items-center justify-center gap-3 transition-all group-hover:bg-indigo-50 group-hover:border-indigo-400">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
                    <Upload className="w-8 h-8" />
                  </div>
                  <p className="font-black text-indigo-900">Drag & Propagate Excel Resource</p>
                  <p className="text-xs font-medium text-indigo-400">Supporting .XLXS and .XLS assets only</p>
                </div>
              </div>

              {importPreview.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Staged Entities ({importPreview.length})</h4>
                    <Button variant="ghost" size="sm" className="text-destructive font-black text-[9px] uppercase" onClick={() => setImportPreview([])}>Clear Queue</Button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto rounded-3xl border border-indigo-100 bg-white/50 backdrop-blur-md">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-indigo-50/50 hover:bg-transparent border-indigo-100">
                          <TableHead className="text-[9px] font-black uppercase text-indigo-400 py-4 pl-6">ADM Number</TableHead>
                          <TableHead className="text-[9px] font-black uppercase text-indigo-400">Full Name</TableHead>
                          <TableHead className="text-[9px] font-black uppercase text-indigo-400">Sex Node</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importPreview.map((row, idx) => (
                          <TableRow key={idx} className="border-indigo-50">
                            <TableCell className="font-mono text-xs font-bold pl-6 text-indigo-900">{row.admissionNumber}</TableCell>
                            <TableCell className="text-sm font-bold">{row.firstName} {row.lastName}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-none font-black uppercase text-[8px] h-5">{row.gender}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-10 flex !flex-row gap-4">
              <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold shadow-none" onClick={() => setShowBulkImport(false)}>Abort Process</Button>
              <Button
                className="flex-[2] h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black shadow-xl shadow-indigo-600/20 gap-3"
                disabled={importPreview.length === 0 || bulkImportMutation.isPending}
                onClick={() => bulkImportMutation.mutate(importPreview)}
              >
                {bulkImportMutation.isPending ? "Propagating Data..." : `Execute Ingestion (${importPreview.length} Nodes)`}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
