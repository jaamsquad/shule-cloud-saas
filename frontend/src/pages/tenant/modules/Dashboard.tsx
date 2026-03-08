import { useState, useEffect } from "react";
import {
  Users, GraduationCap, CreditCard, UserCheck, TrendingUp, TrendingDown,
  AlertTriangle, BookOpen, Calendar, Clock, ArrowRight, Sparkles,
  Search, Bell, Settings, ChevronRight, Activity, Zap, Target, BarChart3
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

const recentActivity = [
  { action: "New Student", detail: "Jane Wanjiku joined Form 1A", time: "2m", type: "success" },
  { action: "Fee Payment", detail: "KES 45,000 received", time: "15m", type: "success" },
  { action: "Exam Done", detail: "Mid Term CAT for Grade 7", time: "1h", type: "info" },
  { action: "Absent Students", detail: "5 students absent in Form 2B", time: "2h", type: "warning" },
];

const upcomingEvents = [
  { name: "Form 4 Mock Exams", date: "Mar 3 - Mar 14", icon: BookOpen, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { name: "Parents Meeting", date: "Mar 8, 2:00 PM", icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { name: "Sports Day", date: "Mar 15", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
];

export default function Dashboard() {
  const [greeting, setGreeting] = useState("Good Morning");
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await api.get("/dashboard/stats");
      return res.data;
    },
  });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 17) setGreeting("Good Afternoon");
    else if (hour >= 17) setGreeting("Good Evening");
    else setGreeting("Good Morning");
  }, []);

  return (
    <>
      <AppHeader title="Dashboard" subtitle="Your school at a glance" />
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/30">

        {/* Welcome Hero (Premium) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-indigo-600 rounded-[3rem] opacity-90" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
          <div className="relative p-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-white text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" /> School Overview
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">
                {greeting}, <span className="text-white/70">Administrator.</span>
              </h2>
              <p className="text-white/60 text-sm font-medium max-w-sm">
                Everything is running well at <span className="text-white font-bold">98.4% uptime</span>.
                Term 1 numbers are looking good across all classes.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <Button className="bg-white text-primary hover:bg-white/90 rounded-2xl h-11 px-8 font-black text-xs shadow-xl shadow-white/10 group">
                  VIEW FULL REPORT <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-all" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              {[
                { label: "Students", val: stats?.totalStudents || 0, icon: Users },
                { label: "Fees Collected", val: `${stats?.feeCollection || 0}%`, icon: CreditCard }
              ].map((m, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/20 text-white min-w-[160px] hover:scale-105 transition-transform">
                  <m.icon className="w-6 h-6 mb-3 opacity-60" />
                  <p className="text-2xl font-black">{m.val}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tactical Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +12%</span>
                    <span className="text-[8px] font-bold text-muted-foreground/40">VS LAST TERM</span>
                  </div>
                </div>
                <h4 className="text-2xl font-black tracking-tighter">{stats?.totalStudents || 0}</h4>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1 group-hover:text-primary transition-colors">Total Students</p>
              </CardContent>
              <div className="h-1.5 w-full bg-primary/20" />
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col items-end text-muted-foreground opacity-40">
                    <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1">OPTIMAL</span>
                    <span className="text-[8px] font-bold uppercase tracking-widest">LOAD LEVEL</span>
                  </div>
                </div>
                <h4 className="text-2xl font-black tracking-tighter">{stats?.totalStaff || 0}</h4>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1 group-hover:text-indigo-500 transition-colors">Total Staff</p>
              </CardContent>
              <div className="h-1.5 w-full bg-indigo-500/20" />
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> STABLE</span>
                    <span className="text-[8px] font-bold text-muted-foreground/40 uppercase">Daily Sync</span>
                  </div>
                </div>
                <h4 className="text-2xl font-black tracking-tighter">{stats?.attendanceToday || 0}%</h4>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1 group-hover:text-emerald-500 transition-colors">Attendance Today</p>
              </CardContent>
              <div className="h-1.5 w-full bg-emerald-500/20" />
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1"><Target className="w-3 h-3" /> ON TRACK</span>
                    <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-widest">Collections</span>
                  </div>
                </div>
                <h4 className="text-2xl font-black tracking-tighter">{stats?.feeCollection || 0}%</h4>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1 group-hover:text-amber-500 transition-colors">Fees Collected</p>
              </CardContent>
              <div className="h-1.5 w-full bg-amber-500/20" />
            </Card>
          </motion.div>
        </div>

        {/* Performance & Events Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12">

          {/* Academic Spectrum */}
          <Card className="lg:col-span-8 border-0 shadow-soft bg-background/40 backdrop-blur-md rounded-[3rem] overflow-hidden border border-border/10">
            <CardHeader className="p-10 pb-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-black flex items-center gap-3">
                    <BarChart3 className="w-6 h-6 text-primary" /> Subject Results
                  </CardTitle>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mt-1">Average marks by subject</p>
                </div>
                <Button variant="ghost" className="rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 bg-muted/40 hover:bg-primary hover:text-white transition-all">
                  See All <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              {[
                { subject: "Mathematics", avg: 72, color: "bg-primary", trend: "+3%" },
                { subject: "English", avg: 85, color: "bg-emerald-500", trend: "+12%" },
                { subject: "Science", avg: 61, color: "bg-indigo-500", trend: "-2%" },
                { subject: "Social Studies", avg: 78, color: "bg-amber-500", trend: "+5%" },
              ].map((item, idx) => (
                <div key={idx} className="space-y-3 group">
                  <div className="flex items-end justify-between">
                    <div className="space-y-1">
                      <h5 className="text-sm font-black group-hover:text-primary transition-colors">{item.subject}</h5>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Class average score</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-lg font-black tracking-tighter">{item.avg}%</span>
                      <span className={`text-[8px] font-black uppercase tracking-widest ${item.trend.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>{item.trend} vs last term</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.avg}%` }}
                      transition={{ duration: 1, delay: idx * 0.1 }}
                      className={`h-full ${item.color} rounded-full relative`}
                    >
                      <div className="absolute top-0 right-0 w-8 h-full bg-white/20 skew-x-12 animate-pulse" />
                    </motion.div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Tactical Events & Log */}
          <div className="lg:col-span-4 space-y-8">
            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md rounded-[3rem] overflow-hidden border border-border/10">
              <CardHeader className="p-8 pb-4">
                <CardTitle className="text-lg font-black flex items-center gap-3 lowercase tracking-tight">
                  Coming Up
                </CardTitle>
              </CardHeader>
              <CardContent className="px-8 pb-8 space-y-4">
                {upcomingEvents.map((event, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-[2rem] hover:bg-background transition-all duration-300 group border border-transparent hover:border-border/50">
                    <div className={`w-12 h-12 rounded-2xl ${event.bg} flex items-center justify-center ${event.color} group-hover:scale-110 transition-transform`}>
                      <event.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-black tracking-tight leading-tight">{event.name}</p>
                      <p className="text-[10px] font-bold text-muted-foreground/60 uppercase mt-1">{event.date}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground opacity-20 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md rounded-[3rem] overflow-hidden border border-border/10">
              <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-black lowercase tracking-tight">Recent Activity</CardTitle>
                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-3 h-6 border-none bg-emerald-500/10 text-emerald-600">Live</Badge>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <div className="space-y-6 relative ml-2">
                  <div className="absolute top-0 left-[7px] w-px h-full bg-muted border-dashed border-l" />
                  {recentActivity.map((item, i) => (
                    <div key={i} className="flex items-start gap-5 relative z-10">
                      <div className={`w-4 h-4 rounded-full mt-1.5 border-4 border-background shadow-sm ${item.type === "success" ? "bg-emerald-500" :
                        item.type === "warning" ? "bg-amber-500" :
                          item.type === "info" ? "bg-indigo-500" : "bg-muted-foreground"
                        }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-black tracking-tight">{item.action}</p>
                          <span className="text-[9px] font-black font-mono text-muted-foreground/40">{item.time}</span>
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground/60 truncate mt-0.5">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" className="w-full mt-8 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground border-t border-border/30 pt-4 hover:text-primary transition-colors">
                  View All Activity <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
