import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wand2, Calendar, Clock, MapPin, User, ChevronRight,
  Sparkles, LayoutGrid, List, Download, Share2, Info, Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const periods = [
  { time: "08:00 - 08:40", label: "P1" },
  { time: "08:40 - 09:20", label: "P2" },
  { time: "09:20 - 10:00", label: "P3" },
  { time: "10:00 - 10:30", label: "Break", type: "break" },
  { time: "10:30 - 11:10", label: "P4" },
  { time: "11:10 - 11:50", label: "P5" },
  { time: "11:50 - 12:30", label: "P6" },
  { time: "12:30 - 13:30", label: "Lunch", type: "break" },
  { time: "13:30 - 14:10", label: "P7" },
  { time: "14:10 - 14:50", label: "P8" },
];

const timetableData: Record<string, Record<string, { subject: string; teacher: string; room: string; color: string } | null>> = {
  Monday: {
    P1: { subject: "Mathematics", teacher: "Mr. Ochieng", room: "R101", color: "bg-indigo-500" },
    P2: { subject: "English", teacher: "Ms. Njeri", room: "R101", color: "bg-emerald-500" },
    P3: { subject: "Kiswahili", teacher: "Mr. Wafula", room: "R101", color: "bg-amber-500" },
    P4: { subject: "Science & Tech", teacher: "Dr. Kamau", room: "Lab 1", color: "bg-rose-500" },
    P5: { subject: "Social Studies", teacher: "Ms. Akinyi", room: "R101", color: "bg-sky-500" },
    P6: { subject: "CRE", teacher: "Mr. Mwangi", room: "R101", color: "bg-violet-500" },
    P7: { subject: "Agriculture", teacher: "Ms. Chebet", room: "Farm", color: "bg-lime-500" },
    P8: { subject: "PE", teacher: "Mr. Kiprop", room: "Field", color: "bg-orange-500" },
  },
  Tuesday: {
    P1: { subject: "English", teacher: "Ms. Njeri", room: "R101", color: "bg-emerald-500" },
    P2: { subject: "Mathematics", teacher: "Mr. Ochieng", room: "R101", color: "bg-indigo-500" },
    P3: { subject: "Science & Tech", teacher: "Dr. Kamau", room: "Lab 1", color: "bg-rose-500" },
    P4: { subject: "Kiswahili", teacher: "Mr. Wafula", room: "R101", color: "bg-amber-500" },
    P5: { subject: "Art & Design", teacher: "Ms. Wanjiru", room: "Art Room", color: "bg-pink-500" },
    P6: { subject: "Music", teacher: "Mr. Omondi", room: "Music Room", color: "bg-cyan-500" },
    P7: { subject: "Mathematics", teacher: "Mr. Ochieng", room: "R101", color: "bg-indigo-500" },
    P8: { subject: "Social Studies", teacher: "Ms. Akinyi", room: "R101", color: "bg-sky-500" },
  },
};

export default function Timetable() {
  const [activeClass, setActiveClass] = useState("Form 1A");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAutoGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      toast.success("Structural collision avoided. Timetable optimized.");
    }, 2000);
  };

  return (
    <>
      <AppHeader title="Scheduling Matrix" subtitle="Form 1A · Term 1 · Temporal Load Distribution" />
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/30">

        {/* Navigation & Controls */}
        <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-background/40 p-4 rounded-[2rem] border border-border/50 backdrop-blur-md shadow-sm">
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            {["Form 1A", "Form 1B", "Form 2A", "Form 2B", "Form 3A"].map(cls => (
              <Button
                key={cls}
                variant={activeClass === cls ? "default" : "ghost"}
                onClick={() => setActiveClass(cls)}
                className={`h-10 px-6 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${activeClass === cls ? 'shadow-lg shadow-primary/20' : 'text-muted-foreground'}`}
              >
                {cls}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full xl:w-auto">
            <Button variant="outline" className="h-12 w-12 rounded-2xl border-border/50" title="Share Configuration"><Share2 className="w-4 h-4" /></Button>
            <Button variant="outline" className="h-12 w-12 rounded-2xl border-border/50" title="Export PDF"><Download className="w-4 h-4" /></Button>
            <Button
              onClick={handleAutoGenerate}
              className="h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 font-black gap-2 flex-1 xl:flex-none overflow-hidden relative"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Wand2 className="w-5 h-5" />
                </motion.div>
              ) : <Wand2 className="w-5 h-5" />}
              {isGenerating ? "CALIBRATING..." : "OPTIMIZE MATRIX"}
              {isGenerating && (
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 bg-white/20 skew-x-12"
                />
              )}
            </Button>
          </div>
        </div>

        {/* Timetable Grid */}
        <div className="bg-background/40 backdrop-blur-md rounded-[3rem] border border-border/50 overflow-hidden shadow-soft p-4">
          <div className="overflow-x-auto custom-scrollbar rounded-[2rem]">
            <table className="w-full min-w-[1000px] border-separate border-spacing-2">
              <thead>
                <tr>
                  <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-left bg-muted/20 rounded-2xl w-32">Temporal Index</th>
                  {days.map(day => (
                    <th key={day} className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center bg-muted/10 rounded-2xl">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((period, pIdx) => (
                  <tr key={period.label}>
                    <td className="p-4 bg-muted/5 rounded-2xl align-top">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-black text-primary">{period.label}</span>
                        <span className="text-[10px] font-bold font-mono opacity-50">{period.time}</span>
                      </div>
                    </td>
                    {period.type === "break" ? (
                      <td colSpan={5} className="p-0">
                        <div className="h-12 rounded-2xl bg-muted/30 flex items-center justify-center gap-4 relative overflow-hidden group">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                          <Clock className="w-4 h-4 text-muted-foreground/40" />
                          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground italic">{period.label} PROTOCOL</span>
                          <Clock className="w-4 h-4 text-muted-foreground/40" />
                        </div>
                      </td>
                    ) : (
                      days.map((day, dIdx) => {
                        const slot = timetableData[day]?.[period.label];
                        return (
                          <td key={day} className="p-0 align-top">
                            <AnimatePresence mode="wait">
                              {slot ? (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: (pIdx + dIdx) * 0.02 }}
                                  className="h-full"
                                >
                                  <div className={`p-4 rounded-3xl border-0 shadow-sm transition-all duration-300 group relative overflow-hidden h-[120px] flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 ${slot.color}/10 border border-${slot.color.split('-')[1]}-500/20`}>
                                    <div className={`absolute top-0 left-0 w-1 h-full ${slot.color}`} />
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md ${slot.color} text-white`}>{slot.subject[0]}</span>
                                        <Badge variant="outline" className="text-[8px] font-black h-4 px-1.5 opacity-40 uppercase">{slot.room}</Badge>
                                      </div>
                                      <h4 className="text-sm font-black tracking-tight leading-tight group-hover:text-primary transition-colors">{slot.subject}</h4>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                      <div className="w-5 h-5 rounded-lg bg-background flex items-center justify-center text-[10px] font-bold uppercase shadow-sm border border-border/50">
                                        {slot.teacher[3]}
                                      </div>
                                      <span className="text-[10px] font-bold truncate">{slot.teacher}</span>
                                    </div>
                                  </div>
                                </motion.div>
                              ) : (
                                <div className="h-[120px] rounded-3xl border-2 border-dashed border-border/30 bg-muted/5 flex items-center justify-center group hover:bg-muted/10 transition-colors">
                                  <Plus className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary/40 transition-colors" />
                                </div>
                              )}
                            </AnimatePresence>
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend & Meta Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
          <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-8">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" /> Utilization Metrics
              </h5>
              <div className="space-y-4">
                {[
                  { label: "Instructional Hours", val: "32.5 / Week", pct: 85 },
                  { label: "Resource Efficiency", val: "Optimal", pct: 92 },
                  { label: "Teacher Diversity", val: "12 Node Leads", pct: 70 }
                ].map((m, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center text-[11px] font-bold">
                      <span>{m.label}</span>
                      <span className="text-primary">{m.val}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${m.pct}%` }}
                        className="h-full bg-primary"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft bg-indigo-500/10 backdrop-blur-md rounded-[2.5rem] border border-indigo-200 overflow-hidden">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-white border border-indigo-100 flex items-center justify-center text-indigo-500 shadow-xl shadow-indigo-500/10">
                <Sparkles className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-xl font-black text-indigo-900 mb-2">Automated Optimization</h4>
                <p className="text-xs font-semibold text-indigo-600/80 leading-relaxed max-w-sm">
                  The ShuleCloud scheduling engine automatically detects conflict collisions and optimizes classroom throughput based on your school's structural parameters.
                </p>
                <Button variant="ghost" className="mt-4 p-0 text-indigo-700 font-black text-[10px] uppercase tracking-widest hover:bg-transparent hover:translate-x-1 transition-transform">
                  View Collision Report <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
