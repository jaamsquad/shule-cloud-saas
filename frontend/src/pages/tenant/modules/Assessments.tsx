import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus, FileText, Printer, Loader2, Search,
  Sparkles, TrendingUp, AlertCircle, CheckCircle2,
  Clock, ChevronRight, BarChart3, Database, PenTool,
  Flame, LayoutGrid, List
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function Assessments() {
  const [search, setSearch] = useState("");
  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ["assessments"],
    queryFn: async () => {
      const r = await api.get("/assessments");
      return r.data;
    },
  });

  const filtered = assessments.filter((a: any) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <AppHeader title="Assessment Center" subtitle="High-fidelity evaluation & cognitive performance tracking" />
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/30">

        {/* Core Metrics Portfolio */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">Cumulative Exams</p>
                  <p className="text-3xl font-black mt-1">{assessments.length}</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                  <FileText className="w-7 h-7 text-primary" />
                </div>
              </CardContent>
              <div className="h-1.5 w-full bg-primary/20" />
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Published Nodes</p>
                  <p className="text-3xl font-black mt-1">{assessments.filter((a: any) => a.isPublished).length}</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                </div>
              </CardContent>
              <div className="h-1.5 w-full bg-emerald-500/20" />
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">Average Performance</p>
                  <p className="text-3xl font-black mt-1">74.2%</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-7 h-7 text-indigo-500" />
                </div>
              </CardContent>
              <div className="h-1.5 w-full bg-indigo-500/20" />
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Pending Evaluation</p>
                  <p className="text-3xl font-black mt-1">{assessments.filter((a: any) => !a.isPublished).length}</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 group-hover:scale-110 transition-transform">
                  <Clock className="w-7 h-7 text-rose-500" />
                </div>
              </CardContent>
              <div className="h-1.5 w-full bg-rose-500/20" />
            </Card>
          </motion.div>
        </div>

        {/* Dynamic Navigation Shortcuts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/assessments/questions" className="group">
            <Card className="border-0 shadow-soft bg-background/40 backdrop-blur-md hover:bg-white transition-all duration-500 rounded-[2.5rem] p-6 border border-border/10 group-hover:border-primary/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest">Question Bank</h4>
                  <p className="text-[10px] font-bold text-muted-foreground">Browse 12.4k itemized prompts</p>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          </Link>
          <Link to="/assessments/marks" className="group">
            <Card className="border-0 shadow-soft bg-background/40 backdrop-blur-md hover:bg-white transition-all duration-500 rounded-[2.5rem] p-6 border border-border/10 group-hover:border-emerald-500/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                  <PenTool className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest">Mark Registry</h4>
                  <p className="text-[10px] font-bold text-muted-foreground">Synchronize cognitive scores</p>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          </Link>
          <Link to="/assessments/results" className="group">
            <Card className="border-0 shadow-soft bg-background/40 backdrop-blur-md hover:bg-white transition-all duration-500 rounded-[2.5rem] p-6 border border-border/10 group-hover:border-indigo-500/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest">Analytics Studio</h4>
                  <p className="text-[10px] font-bold text-muted-foreground">Visualize cohort progress</p>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          </Link>
        </div>

        {/* Content Engine */}
        <div className="space-y-6">
          <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-background/40 p-4 rounded-[2rem] border border-border/50 backdrop-blur-md shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search assessment nodes..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-11 h-12 bg-background/50 border-none rounded-2xl shadow-none focus-visible:ring-2 focus-visible:ring-primary/20 font-bold"
                />
              </div>
            </div>

            <Link to="/assessments/create" className="w-full xl:w-auto">
              <Button className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 font-black gap-2 w-full">
                <Plus className="w-5 h-5" /> Initialize Ingress
              </Button>
            </Link>
          </div>

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40 gap-4">
                <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Synchronizing Assessment Registry...</p>
              </motion.div>
            ) : filtered.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40 gap-4 glass-card rounded-[3rem]">
                <Flame className="w-16 h-16 text-muted-foreground/10" />
                <div className="text-center">
                  <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">No Assessment Clusters Found</p>
                  <p className="text-[10px] font-bold text-muted-foreground/60 mt-2">Initialize your first evaluation node to begin tracking cognitive growth.</p>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((a: any, i: number) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-md hover:bg-background transition-all duration-500 rounded-[2rem] overflow-hidden group">
                      <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center relative group-hover:scale-110 transition-transform">
                            <FileText className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${a.isPublished ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter px-2 h-4 border-muted-foreground/20 text-muted-foreground">{a.type}</Badge>
                              <span className="text-[8px] font-bold text-muted-foreground/40 font-mono uppercase tracking-tighter">{new Date(a.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                            </div>
                            <h4 className="text-base font-black tracking-tight group-hover:text-primary transition-colors">{a.name}</h4>
                            <p className="text-[10px] font-bold text-muted-foreground/60">{a.learningArea || "Integrated Curriculum"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted group-hover:scale-110 transition-transform"><Printer className="w-4 h-4 opacity-40 group-hover:opacity-100" /></Button>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted group-hover:scale-110 transition-transform group-hover:text-primary"><ChevronRight className="w-5 h-5" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
