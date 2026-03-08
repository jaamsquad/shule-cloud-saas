import { useState, useMemo } from "react";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Check, X, Clock, Calendar, Users, Search,
  Sparkles, ChevronRight, Activity, TrendingUp, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const studentsAttendance = [
  { name: "Jane Wanjiku", adm: "ADM-001", status: "present", avatar: "JW" },
  { name: "John Kamau", adm: "ADM-002", status: "present", avatar: "JK" },
  { name: "Amina Hassan", adm: "ADM-003", status: "absent", avatar: "AH" },
  { name: "David Ochieng", adm: "ADM-004", status: "present", avatar: "DO" },
  { name: "Faith Njeri", adm: "ADM-005", status: "late", avatar: "FN" },
  { name: "Brian Kipchoge", adm: "ADM-006", status: "present", avatar: "BK" },
  { name: "Lucy Akinyi", adm: "ADM-007", status: "present", avatar: "LA" },
  { name: "Kevin Wekesa", adm: "ADM-008", status: "absent", avatar: "KW" },
];

export default function Attendance() {
  const [records, setRecords] = useState(studentsAttendance);
  const [search, setSearch] = useState("");

  const setStatus = (i: number, status: string) => {
    setRecords(prev => prev.map((r, idx) => idx === i ? { ...r, status } : r));
  };

  const stats = useMemo(() => {
    const present = records.filter(r => r.status === "present").length;
    const absent = records.filter(r => r.status === "absent").length;
    const late = records.filter(r => r.status === "late").length;
    return { present, absent, late, total: records.length };
  }, [records]);

  const filtered = records.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.adm.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    toast.success("Attendance payload synchronized with central registry");
  };

  return (
    <>
      <AppHeader title="Attendance Registry" subtitle="Form 1A · Daily Presence Monitoring Matrix" />
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/30">

        {/* Real-time Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">Cumulative Load</p>
                  <p className="text-3xl font-black mt-1">{stats.total}</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                  <Users className="w-7 h-7 text-primary" />
                </div>
              </CardContent>
              <div className="h-1.5 w-full bg-primary/10" />
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group border-b-[3px] border-b-emerald-500/50">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Present (Active)</p>
                  <p className="text-3xl font-black mt-1">{stats.present}</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <Check className="w-7 h-7 text-emerald-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group border-b-[3px] border-b-rose-500/50">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600">Absent (Dropout)</p>
                  <p className="text-3xl font-black mt-1">{stats.absent}</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 group-hover:scale-110 transition-transform">
                  <X className="w-7 h-7 text-rose-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group border-b-[3px] border-b-amber-500/50">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Temporal Lag (Late)</p>
                  <p className="text-3xl font-black mt-1">{stats.late}</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                  <Clock className="w-7 h-7 text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-background/40 p-4 rounded-[2rem] border border-border/50 backdrop-blur-md shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Locate entity by name or node ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-11 h-12 bg-background/50 border-none rounded-2xl shadow-none focus-visible:ring-2 focus-visible:ring-primary/20 font-bold"
              />
            </div>
            <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-background/50 rounded-2xl border border-border/50">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-xs font-black uppercase tracking-widest">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>

          <Button onClick={handleSave} className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 font-black gap-2 w-full xl:w-auto">
            <Activity className="w-5 h-5" /> Synchronize Matrix
          </Button>
        </div>

        {/* Attendance Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filtered.map((student, i) => (
              <motion.div
                key={student.adm}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-md hover:bg-background transition-all duration-500 rounded-[2.5rem] overflow-hidden group">
                  <div className="p-6 flex flex-col items-center">
                    <div className="relative mb-4">
                      <div className="w-20 h-20 rounded-[2rem] bg-muted flex items-center justify-center text-xl font-black group-hover:scale-110 transition-transform duration-500">
                        {student.avatar}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-4 border-background flex items-center justify-center shadow-lg transition-colors ${student.status === "present" ? "bg-emerald-500" : student.status === "absent" ? "bg-rose-500" : "bg-amber-500"
                        }`}>
                        {student.status === "present" ? <Check className="w-4 h-4 text-white" /> : student.status === "absent" ? <X className="w-4 h-4 text-white" /> : <Clock className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                    <h3 className="text-lg font-black group-hover:text-primary transition-colors">{student.name}</h3>
                    <p className="text-[10px] font-mono font-bold text-muted-foreground mb-6 uppercase tracking-widest">{student.adm}</p>

                    <div className="grid grid-cols-3 gap-2 w-full">
                      <button
                        onClick={() => setStatus(i, "present")}
                        className={`h-11 rounded-xl flex items-center justify-center transition-all ${student.status === "present" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-muted/40 text-muted-foreground hover:bg-emerald-500/10"
                          }`}
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setStatus(i, "absent")}
                        className={`h-11 rounded-xl flex items-center justify-center transition-all ${student.status === "absent" ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" : "bg-muted/40 text-muted-foreground hover:bg-rose-500/10"
                          }`}
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setStatus(i, "late")}
                        className={`h-11 rounded-xl flex items-center justify-center transition-all ${student.status === "late" ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "bg-muted/40 text-muted-foreground hover:bg-amber-500/10"
                          }`}
                      >
                        <Clock className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="px-3 pb-3">
                    <Button variant="ghost" className="h-10 w-full rounded-2xl text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:bg-primary/5 hover:text-primary transition-all">
                      Inspect History <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Global Warnings */}
        {stats.absent > 1 && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="p-6 rounded-[2.5rem] bg-rose-500/10 border border-rose-200 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-black uppercase text-rose-900 tracking-widest">Attendance Critical Path</p>
                <p className="text-[10px] font-bold text-rose-600/80">Multiple absent nodes detected in current batch. Automated notifications will be dispatched upon synchronization.</p>
              </div>
              <Button variant="ghost" className="text-rose-600 font-black text-[10px] uppercase tracking-widest hover:bg-rose-500/5">Review Insights</Button>
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
}
