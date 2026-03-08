import { useState } from "react";
import {
  Search, Plus, MoreVertical, Pencil, Trash2, GraduationCap, Users, Mail, Phone,
  Shield, UserCheck, UserX, Briefcase, BookOpen, School, LayoutGrid, List,
  ChevronRight, Sparkles, Star, UserPlus, Info, AtSign, PhoneCall
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const emptyForm = {
  staffNumber: "", firstName: "", lastName: "", email: "", phone: "",
  role: "TEACHER", isTeachingStaff: true, designation: "", departmentId: ""
};

export default function Staff() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showView, setShowView] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [viewMember, setViewMember] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => { const r = await api.get("/staff"); return r.data; },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["staff-departments"],
    queryFn: async () => { const r = await api.get("/staff/departments"); return r.data; },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/staff", { ...data, departmentId: data.departmentId === "none" ? null : data.departmentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setShowAdd(false); setForm(emptyForm);
      toast.success("Staff member successfully integrated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Integration failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/staff/${id}`, { ...data, departmentId: data.departmentId === "none" ? null : data.departmentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setShowEdit(false); setEditId(null);
      toast.success("Member credentials updated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Transmission failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/staff/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["staff"] }); toast.success("Record archived"); },
  });

  const filtered = staff.filter((s: any) => {
    const matchesSearch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      s.staffNumber.toLowerCase().includes(search.toLowerCase());

    if (filter === "teachers") return matchesSearch && s.isTeachingStaff;
    if (filter === "non-teaching") return matchesSearch && !s.isTeachingStaff;
    return matchesSearch;
  });

  const openEdit = (s: any) => {
    setEditId(s.id);
    setForm({
      staffNumber: s.staffNumber, firstName: s.firstName, lastName: s.lastName,
      email: s.email || "", phone: s.phone || "", role: s.role || "TEACHER",
      isTeachingStaff: s.isTeachingStaff, designation: s.designation || "",
      departmentId: s.departmentId || "none"
    });
    setShowEdit(true);
  };

  return (
    <>
      <AppHeader title="Staff & Personnel" subtitle="Dynamic human resource management system" />
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/30">

        {/* Stats Hero */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md relative overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                    <Users className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">Digital Workforce</p>
                    <p className="text-3xl font-black mt-1">{isLoading ? "---" : staff.length}</p>
                  </div>
                </div>
              </CardContent>
              <div className="h-1.5 w-full bg-primary/20 group-hover:bg-primary transition-all duration-500" />
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md relative overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-7 h-7 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-indigo-500 transition-colors">Teaching core</p>
                    <p className="text-3xl font-black mt-1">{staff.filter((s: any) => s.isTeachingStaff).length}</p>
                  </div>
                </div>
              </CardContent>
              <div className="h-1.5 w-full bg-indigo-500/20 group-hover:bg-indigo-500 transition-all duration-500" />
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md relative overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                    <Shield className="w-7 h-7 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-amber-500 transition-colors">Administrative</p>
                    <p className="text-3xl font-black mt-1">{staff.filter((s: any) => s.role === 'ADMIN').length}</p>
                  </div>
                </div>
              </CardContent>
              <div className="h-1.5 w-full bg-amber-500/20 group-hover:bg-amber-500 transition-all duration-500" />
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md relative overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 flex items-center justify-center border border-indigo-600/20 group-hover:scale-110 transition-transform">
                    <Briefcase className="w-7 h-7 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-indigo-600 transition-colors">Divisions</p>
                    <p className="text-3xl font-black mt-1">{departments.length}</p>
                  </div>
                </div>
              </CardContent>
              <div className="h-1.5 w-full bg-indigo-600/20 group-hover:bg-indigo-600 transition-all duration-500" />
            </Card>
          </motion.div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-background/40 p-4 rounded-[2rem] border border-border/50 backdrop-blur-md shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
            <div className="flex bg-muted/60 p-1 rounded-2xl border border-border/40 self-stretch sm:self-auto">
              <Button variant={filter === "all" ? "secondary" : "ghost"} size="sm" className={`h-10 px-6 rounded-xl font-bold transition-all ${filter === 'all' ? 'shadow-sm translate-y-[-1px]' : ''}`} onClick={() => setFilter("all")}>Global</Button>
              <Button variant={filter === "teachers" ? "secondary" : "ghost"} size="sm" className={`h-10 px-6 rounded-xl font-bold transition-all ${filter === 'teachers' ? 'shadow-sm translate-y-[-1px]' : ''}`} onClick={() => setFilter("teachers")}>Teaching</Button>
              <Button variant={filter === "non-teaching" ? "secondary" : "ghost"} size="sm" className={`h-10 px-6 rounded-xl font-bold transition-all ${filter === 'non-teaching' ? 'shadow-sm translate-y-[-1px]' : ''}`} onClick={() => setFilter("non-teaching")}>Other</Button>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Find personnel by Meta ID or Name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-11 h-12 bg-background/50 border-none rounded-2xl shadow-none focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-auto">
            <div className="hidden sm:flex bg-muted/60 p-1.5 rounded-2xl border border-border/50 backdrop-blur-sm mr-2">
              <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-xl shadow-none" onClick={() => setViewMode("grid")}><LayoutGrid className="w-4 h-4" /></Button>
              <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="h-9 w-9 rounded-xl shadow-none" onClick={() => setViewMode("list")}><List className="w-4 h-4" /></Button>
            </div>
            <Button onClick={() => { setForm(emptyForm); setShowAdd(true); }} className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 font-black gap-2 flex-1 sm:flex-initial">
              <UserPlus className="w-5 h-5" /> Integrate New Member
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40 gap-4">
              <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">Calibrating Personnel Meta-Matrix...</p>
            </motion.div>
          ) : filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-40 bg-background/20 rounded-[4rem] border-2 border-dashed border-border/50">
              <Briefcase className="w-20 h-20 text-muted-foreground/20 mx-auto mb-6" />
              <h3 className="text-2xl font-black mb-2">No Personnel Discovered</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">Start building your school's structural team by integrating your first staff member.</p>
            </motion.div>
          ) : viewMode === "grid" ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {filtered.map((s: any, idx: number) => (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={s.id}
                  className="group"
                >
                  <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-md group-hover:bg-background transition-all duration-500 rounded-[2.5rem] overflow-hidden cursor-pointer h-full flex flex-col pt-8" onClick={() => { setViewMember(s); setShowView(true); }}>
                    <div className="flex flex-col items-center px-6 pb-6 text-center flex-1">
                      <div className="relative mb-6">
                        <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-white font-black text-3xl group-hover:scale-105 transition-transform duration-500 shadow-2xl ${s.role === 'ADMIN' ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20' : 'bg-gradient-to-br from-primary to-indigo-600 shadow-primary/20'}`}>
                          {s.firstName[0]}{s.lastName[0]}
                        </div>
                        <Badge className="absolute -bottom-2 translate-x-1/2 right-1/2 bg-background border border-border/50 text-[9px] font-black h-6 px-3 shadow-md uppercase tracking-tight text-foreground whitespace-nowrap">
                          {s.role}
                        </Badge>
                      </div>
                      <h3 className="font-black text-xl line-clamp-1 group-hover:text-primary transition-colors">{s.firstName} {s.lastName}</h3>
                      <p className="text-[10px] font-mono font-black text-muted-foreground uppercase tracking-widest mt-1 bg-muted/40 px-3 py-1 rounded-full">{s.staffNumber}</p>

                      <div className="w-full mt-8 pt-6 border-t border-dashed border-border/50 space-y-3">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase text-muted-foreground tracking-widest bg-muted/30 p-2.5 rounded-2xl group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                          <span className="flex items-center gap-2"><Briefcase className="w-3.5 h-3.5" /> Division</span>
                          <span className="text-foreground font-black group-hover:text-primary">{s.department?.name || "Global"}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-black uppercase text-muted-foreground tracking-widest bg-muted/30 p-2.5 rounded-2xl">
                          <span className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> Assignments</span>
                          <span className="text-foreground font-black">{s.isTeachingStaff ? (s._count?.subjectsAssigned || 0) + (s._count?.streamsManaged || 0) : '—'}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" className="h-12 border-t border-border/50 rounded-none w-full text-[10px] font-black uppercase tracking-[0.2em] group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      Synchronize Record <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-background/40 backdrop-blur-md rounded-[2.5rem] border border-border/50 overflow-hidden shadow-soft">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="w-20"></TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 pl-0">Identification</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Division & Role</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Contact Node</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Capacity</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest pr-10">Meta Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s: any) => (
                    <TableRow key={s.id} className="group hover:bg-background/60 transition-colors border-border/50">
                      <TableCell className="pl-6 py-6">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-sm shadow-xl ${s.isTeachingStaff ? 'bg-primary' : 'bg-slate-400 opacity-60'}`}>
                          {s.firstName[0]}{s.lastName[0]}
                        </div>
                      </TableCell>
                      <TableCell className="pl-0">
                        <div className="flex flex-col">
                          <p className="font-black text-sm">{s.firstName} {s.lastName}</p>
                          <p className="text-[9px] font-mono font-bold text-muted-foreground uppercase">{s.staffNumber}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[8px] font-black uppercase h-5 bg-background border-border/50">{s.department?.name || "General"}</Badge>
                            <Badge className="text-[8px] font-black uppercase h-5 bg-indigo-50 text-indigo-700 border-indigo-100">{s.role}</Badge>
                          </div>
                          <p className="text-[10px] font-bold text-muted-foreground px-1">{s.designation || "No Title Set"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground"><Mail className="w-3 h-3 text-primary/40" /> {s.email || "—"}</span>
                          <span className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground"><Phone className="w-3 h-3 text-primary/40" /> {s.phone || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {s.isTeachingStaff ?
                          <Badge className="bg-success/10 text-success border-none font-black text-[9px] h-6 px-3 tracking-tighter uppercase">Academic</Badge> :
                          <Badge variant="outline" className="text-muted-foreground border-border font-black text-[9px] h-6 px-3 tracking-tighter uppercase">Support</Badge>
                        }
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-muted group-hover:scale-110 transition-transform"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl border-border/50 shadow-2xl p-1">
                            <DropdownMenuItem onClick={() => { setViewMember(s); setShowView(true); }} className="rounded-xl font-bold py-2.5"><Eye className="w-4 h-4 mr-3" /> Profile Context</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(s)} className="rounded-xl font-bold py-2.5"><Pencil className="w-4 h-4 mr-3" /> Update Meta</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive rounded-xl font-bold py-2.5" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="w-4 h-4 mr-3" /> Archive Unit</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Profile Detail Sheet (Premium) */}
      <Sheet open={showView} onOpenChange={setShowView}>
        <SheetContent className="sm:max-w-xl w-[95vw] p-0 border-l-0 bg-background/95 backdrop-blur-xl">
          {viewMember && (
            <div className="h-full flex flex-col">
              {/* Premium Header */}
              <div className="p-8 bg-gradient-to-br from-primary/10 via-background to-transparent border-b border-border/50">
                <SheetHeader className="text-left flex flex-row items-center gap-6">
                  <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-white text-4xl font-black shadow-2xl border-4 border-background ${viewMember.role === 'ADMIN' ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-primary to-indigo-600'}`}>
                    {viewMember.firstName[0]}{viewMember.lastName[0]}
                  </div>
                  <div className="space-y-1">
                    <SheetTitle className="text-3xl font-black">{viewMember.firstName} {viewMember.lastName}</SheetTitle>
                    <div className="flex items-center gap-2">
                      <Badge className="font-black text-[10px] uppercase h-6 bg-primary/10 text-primary border-none">{viewMember.staffNumber}</Badge>
                      <Badge variant="outline" className="font-black text-[10px] uppercase h-6 border-border/50 bg-white/50">{viewMember.role}</Badge>
                    </div>
                  </div>
                </SheetHeader>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Identity Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-0 bg-muted/30 shadow-none rounded-[2rem] p-4 text-center">
                    <div className="w-10 h-10 rounded-2xl bg-white mx-auto mb-2 flex items-center justify-center shadow-sm">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Capacity</p>
                    <p className="text-sm font-black mt-1">{viewMember.isTeachingStaff ? 'Academic Unit' : 'Administrative Unit'}</p>
                  </Card>
                  <Card className="border-0 bg-muted/30 shadow-none rounded-[2rem] p-4 text-center">
                    <div className="w-10 h-10 rounded-2xl bg-white mx-auto mb-2 flex items-center justify-center shadow-sm">
                      <School className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Node Depth</p>
                    <p className="text-sm font-black mt-1">{viewMember.department?.name || "Global"}</p>
                  </Card>
                </div>

                {/* Contact & Meta */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-1 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Comms Registry
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-4 rounded-3xl bg-background border border-border/50 group hover:border-primary transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/10">
                          <Mail className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase text-muted-foreground">Digital Address</p>
                          <p className="text-sm font-bold">{viewMember.email || "No Email Bound"}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"><AtSign className="w-3.5 h-3.5" /></Button>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-3xl bg-background border border-border/50 group hover:border-primary transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/10">
                          <Phone className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase text-muted-foreground">Voice Node</p>
                          <p className="text-sm font-bold">{viewMember.phone || "No Link Bound"}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"><PhoneCall className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </div>

                {/* Structural Assignment */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-1 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Load Registry
                  </h4>
                  <div className="p-6 rounded-[2.5rem] bg-indigo-50/50 border border-indigo-100/50 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-1000">
                      <Briefcase className="w-20 h-20 text-indigo-700" />
                    </div>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span className="text-indigo-900 font-black text-lg">{viewMember.designation || "Unclassified Personnel"}</span>
                        <Badge className="bg-white text-indigo-700 font-black shadow-sm">RANK: 02</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase text-indigo-400">Structural Unit</span>
                          <span className="text-sm font-bold text-indigo-900">{viewMember.department?.name || "Global General"}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase text-indigo-400">Integrity Check</span>
                          <span className="text-sm font-bold text-green-600 flex items-center gap-1"><UserCheck className="w-3 h-3" /> VERIFIED</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-muted/10 border-t border-border/50 flex gap-3">
                <Button variant="outline" className="flex-1 h-12 rounded-2xl font-bold border-border/50" onClick={() => setShowView(false)}>Dismiss</Button>
                <Button className="flex-1 h-12 rounded-2xl font-black shadow-lg shadow-primary/20 gap-2" onClick={() => openEdit(viewMember)}>
                  <Pencil className="w-4 h-4" /> Edit Parameters
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Integration Dialog (Glassmorphic) */}
      <Dialog open={showAdd || showEdit} onOpenChange={(open) => {
        if (!open) { setShowAdd(false); setShowEdit(false); setEditId(null); setForm(emptyForm); }
      }}>
        <DialogContent className="max-w-2xl rounded-[3rem] border-0 shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
          <div className={`h-2 ${showEdit ? 'bg-amber-500' : 'bg-primary'}`} />
          <div className="p-10">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-3xl font-black">{showEdit ? "Update Personnel Meta" : "Member Integration"}</DialogTitle>
              <DialogDescription className="text-sm font-medium">Define a structural unit in the school's human capital graph.</DialogDescription>
            </DialogHeader>

            <form onSubmit={e => {
              e.preventDefault();
              showEdit ? updateMutation.mutate({ id: editId!, data: form }) : createMutation.mutate(form);
            }} className="space-y-8">

              {/* Phase 1: Identity */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-primary/10 text-primary border-none font-black text-[9px] h-6 uppercase tracking-widest">Phase 1</Badge>
                  <span className="text-[10px] font-black uppercase text-muted-foreground mr-1">Identity Tokens</span>
                  <div className="flex-1 h-px bg-border/50 border-dashed" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Meta ID (Staff #)</Label>
                    <Input placeholder="EMP-202X-XX" value={form.staffNumber} onChange={e => setForm({ ...form, staffNumber: e.target.value })} disabled={showEdit} className="h-12 rounded-2xl bg-muted/50 border-0 focus-visible:ring-primary shadow-none font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Current Designation</Label>
                    <Input placeholder="e.g. Senior Registrar" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} className="h-12 rounded-2xl bg-muted/50 border-0 focus-visible:ring-primary shadow-none" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Known First Name</Label>
                    <Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Known Last Name</Label>
                    <Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none" />
                  </div>
                </div>
              </div>

              {/* Phase 2: Structural */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-indigo-500/10 text-indigo-500 border-none font-black text-[9px] h-6 uppercase tracking-widest">Phase 2</Badge>
                  <span className="text-[10px] font-black uppercase text-muted-foreground mr-1">Logic Alignment</span>
                  <div className="flex-1 h-px bg-border/50 border-dashed" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">System Capacity</Label>
                    <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                      <SelectTrigger className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-border/50 shadow-2xl overflow-hidden">
                        <SelectItem value="TEACHER" className="font-bold">Unit: Academic</SelectItem>
                        <SelectItem value="ADMIN" className="font-bold">Unit: Management</SelectItem>
                        <SelectItem value="BURSAR" className="font-bold">Unit: Finance</SelectItem>
                        <SelectItem value="LIBRARIAN" className="font-bold">Unit: Archive</SelectItem>
                        <SelectItem value="HOD" className="font-bold">Unit: Department Lead</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Division Segment</Label>
                    <Select value={form.departmentId} onValueChange={v => setForm({ ...form, departmentId: v })}>
                      <SelectTrigger className="h-12 rounded-2xl bg-muted/50 border-0 shadow-none">
                        <SelectValue placeholder="Target segment" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-border/50 shadow-2xl">
                        <SelectItem value="none" className="font-bold">Global General</SelectItem>
                        {departments.map((d: any) => (
                          <SelectItem key={d.id} value={d.id} className="font-bold">{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 p-6 rounded-[2rem] bg-primary/5 border border-primary/20 border-dashed flex items-center justify-between group overflow-hidden relative">
                    <div className="absolute inset-0 bg-primary/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-700" />
                    <div className="relative z-10 space-y-1">
                      <div className="flex items-center gap-2">
                        <Star className={`w-4 h-4 transition-colors ${form.isTeachingStaff ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="text-sm font-black uppercase tracking-tight">Activate Academic Capability</p>
                      </div>
                      <p className="text-[10px] font-medium text-muted-foreground max-w-xs">Required for subject mapping, exam invigilation and class leadership.</p>
                    </div>
                    <Switch checked={form.isTeachingStaff} onCheckedChange={checked => setForm({ ...form, isTeachingStaff: checked })} className="relative z-10 data-[state=checked]:bg-primary" />
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-10 flex !flex-row gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => { setShowAdd(false); setShowEdit(false); }} className="flex-1 h-12 rounded-2xl font-bold border-border/50">Abort Ingress</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className={`flex-2 h-12 rounded-2xl font-black shadow-lg flex-[2] ${showEdit ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'shadow-primary/20'}`}>
                  {showEdit ? (updateMutation.isPending ? "Transmission..." : "Commit Update") : (createMutation.isPending ? "Integrating..." : "Finalize Integration")}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
