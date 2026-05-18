import { useState } from "react";
import { 
    Trash2, RotateCcw, Search, GraduationCap, Briefcase, 
    Calendar, AlertCircle, ShieldCheck, ChevronRight, ArrowLeft,
    Clock, Database, History as HistoryIcon, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import { formatDistanceToNow, addDays } from "date-fns";

export default function Archives() {
    const [searchParams] = useSearchParams();
    const typeFilter = searchParams.get('type');
    const [search, setSearch] = useState("");
    const queryClient = useQueryClient();

    const { data: archives = [], isLoading } = useQuery({
        queryKey: ["archives-list"],
        queryFn: async () => {
            const r = await api.get("/academics/archives");
            return r.data;
        },
    });

    const restoreMutation = useMutation({
        mutationFn: (id: string) => api.post(`/academics/archives/restore/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["archives-list"] });
            queryClient.invalidateQueries({ queryKey: ["staff-list"] });
            queryClient.invalidateQueries({ queryKey: ["students-list"] });
            toast.success("Strategic Restoration Successful: Registry node reinstated");
        },
        onError: () => toast.error("Restoration Failed: Integrity or connection error")
    });

    const clearMutation = useMutation({
        mutationFn: () => api.delete("/academics/archives/clear"),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["archives-list"] });
            toast.success("Institutional archives purged successfully: Recovery vault is now void");
        },
        onError: () => toast.error("Clearance Failed: System or lock error")
    });

    const filtered = archives.filter((a: any) => {
        const matchesSearch = (a.name || `${a.firstName} ${a.lastName}`)?.toLowerCase().includes(search.toLowerCase());
        const matchesType = !typeFilter || a.originalCollection === typeFilter;
        return matchesSearch && matchesType;
    });

    return (
        <div className="flex flex-col h-full bg-[#f8fafc]">
            <AppHeader 
                title="Institutional Archives" 
                subtitle="High-fidelity recovery vault with 30-day autonomic purge protocol" 
            />

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-between group overflow-hidden relative">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-bl-[4rem] -mr-8 -mt-8 transition-all group-hover:scale-110" />
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Staged Nodes</p>
                            <h3 className="text-3xl font-black text-slate-800">{archives.length}</h3>
                        </div>
                        <HistoryIcon className="w-10 h-10 text-primary opacity-20" />
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-between group overflow-hidden relative">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-rose-500/5 rounded-bl-[4rem] -mr-8 -mt-8 transition-all group-hover:scale-110" />
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Pending Purge</p>
                            <h3 className="text-3xl font-black text-slate-800">
                                {archives.filter((a: any) => {
                                    const daysLeft = 30 - (new Date().getTime() - new Date(a.deletedAt).getTime()) / (1000 * 60 * 60 * 24);
                                    return daysLeft < 5;
                                }).length}
                            </h3>
                        </div>
                        <Clock className="w-10 h-10 text-rose-500 opacity-20" />
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-between group overflow-hidden relative">
                        <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-bl-[4rem] -mr-8 -mt-8 transition-all group-hover:scale-110" />
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Recoverable Registry</p>
                            <h3 className="text-3xl font-black text-slate-800">100%</h3>
                        </div>
                        <ShieldCheck className="w-10 h-10 text-emerald-500 opacity-20" />
                    </div>
                </div>

                {/* Search & Actions */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/40 space-y-8 border border-slate-100">
                    <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <div className="relative w-96 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 transition-colors group-focus-within:text-primary" />
                            <Input 
                                placeholder="Search archived names or nodes..." 
                                className="pl-12 h-12 bg-white border-slate-100 rounded-xl text-sm font-bold shadow-sm focus:ring-primary focus:border-primary transition-all"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3">
                             <Button 
                                onClick={() => { if(confirm("Are you absolutely sure? This will permanently erase all archived records.")) clearMutation.mutate(); }}
                                variant="outline" className="h-12 px-6 rounded-xl border-rose-100 font-black uppercase text-[10px] tracking-widest text-rose-400 hover:text-rose-500 hover:bg-rose-50 transition-all gap-2 shadow-sm"
                             >
                                 <Trash2 className="w-4" /> Clear Archive Vault
                             </Button>
                             <Button variant="outline" className="h-12 px-6 rounded-xl border-slate-200 font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-primary transition-all gap-2 shadow-sm">
                                 <Filter className="w-4" /> Filter Origins
                             </Button>
                        </div>
                    </div>

                    <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="hover:bg-transparent border-slate-100">
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 py-5 pl-8">Entity Name</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 py-5">Source Registry</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 py-5">Deleted At</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 py-5">TTL (Purge Countdown)</TableHead>
                                    <TableHead className="text-right font-black text-[10px] uppercase text-slate-400 py-5 pr-8">Strategic Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={5} className="py-32 text-center text-slate-400 font-bold uppercase tracking-widest italic animate-pulse">Accessing Secure Archives...</TableCell></TableRow>
                                ) : filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-32 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-30">
                                                <Database className="w-16 h-16 text-slate-300" />
                                                <p className="font-black uppercase text-xs tracking-[0.3em] text-slate-400 italic">No staged erasures in vault</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.map((item: any) => {
                                    const deletedDate = new Date(item.deletedAt);
                                    const purgeDate = addDays(deletedDate, 30);
                                    const daysLeft = Math.ceil((purgeDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                    
                                    return (
                                        <TableRow key={item._id} className="group hover:bg-slate-50 transition-colors border-slate-100">
                                            <TableCell className="py-6 pl-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 border border-slate-200">
                                                        {item.originalCollection === 'staff' ? <Briefcase className="w-5" /> : <GraduationCap className="w-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm text-slate-800 uppercase italic tracking-tighter">{item.name || `${item.firstName} ${item.lastName}`}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.staffId || item.admNo || 'NODE-REF'}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-[9px] font-black uppercase tracking-widest h-6 px-3 italic">
                                                    {item.originalCollection} Registry
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs font-bold text-slate-500 italic">
                                                {formatDistanceToNow(deletedDate, { addSuffix: true })}
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1.5 w-32">
                                                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                                                        <span className={daysLeft < 5 ? 'text-rose-500' : 'text-slate-400'}>Countdown</span>
                                                        <span className={daysLeft < 5 ? 'text-rose-500' : 'text-slate-600'}>{daysLeft} Days</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full transition-all duration-1000 ${daysLeft < 5 ? 'bg-rose-500' : 'bg-primary'}`} 
                                                            style={{ width: `${(daysLeft/30)*100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-8">
                                                <Button 
                                                    onClick={() => restoreMutation.mutate(item._id)}
                                                    disabled={restoreMutation.isPending}
                                                    className="h-10 px-6 rounded-xl bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 border-none gap-2 group-hover:scale-105"
                                                >
                                                    <RotateCcw className="w-3" /> Reinstate Node
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Important Policy Note */}
                <div className="bg-rose-50 border border-rose-100 p-8 rounded-[2rem] flex gap-6 items-start shadow-sm">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-inner border border-rose-100 shrink-0">
                        <AlertCircle className="w-6 h-6 text-rose-500" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-black uppercase text-xs text-rose-700 tracking-widest">Autonomic Purge Protocol</h4>
                        <p className="text-sm font-medium text-rose-600/80 leading-relaxed max-w-4xl">
                            All archived items are subject to permanent structural erasure after exactly 30 rotational days. 
                            This action is governed by schema-level TTL indices and is irreversible. To prevent systemic data loss, 
                            ensure all critical nodes are reinstated before the countdown reaches zero.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
