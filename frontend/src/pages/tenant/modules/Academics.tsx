import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, Layers, CheckCircle2, Plus, ArrowRight, Sparkles, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";

export default function Academics() {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newLA, setNewLA] = useState({ name: "" });
  const queryClient = useQueryClient();

  const { data: learningAreas = [], isLoading } = useQuery({
    queryKey: ["learning-areas"],
    queryFn: async () => {
      const r = await api.get("/academics/learning-areas");
      return r.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/academics/learning-areas", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning-areas"] });
      setShowAdd(false);
      setNewLA({ name: "" });
      toast.success("New learning area registered successfully");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Failed to create learning area"),
  });

  const filtered = learningAreas.filter((la: any) =>
    la.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <AppHeader title="Academics" subtitle="CBC Learning Areas & Competency Framework" />
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-muted/30">

        {/* Hero Section / Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-soft bg-gradient-to-br from-primary/10 to-transparent backdrop-blur-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20">
                <BookOpen className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Total Areas</p>
                <p className="text-3xl font-black">{isLoading ? "---" : learningAreas.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <Layers className="w-7 h-7 text-indigo-500" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500/60">System Strands</p>
                <p className="text-3xl font-black">
                  {learningAreas.reduce((acc: number, la: any) => acc + (la.strands?.length || 0), 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-soft bg-background/50 backdrop-blur-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20">
                <Sparkles className="w-7 h-7 text-success" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-success/60">Active Framework</p>
                <p className="text-sm font-black mt-1">CBC Version 2.4.1</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-background/40 p-4 rounded-[2rem] border border-border/50 backdrop-blur-md">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search curriculum areas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-11 h-12 bg-background/50 border-none rounded-2xl shadow-none focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>
          <Button onClick={() => setShowAdd(true)} className="w-full sm:w-auto h-12 px-8 rounded-2xl shadow-lg shadow-primary/20 font-bold gap-2">
            <Plus className="w-5 h-5" /> Register New Area
          </Button>
        </div>

        {/* Areas Grid */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="w-10 h-10 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Indexing Curriculum...</p>
            </motion.div>
          ) : filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-32 bg-background/20 rounded-[3rem] border-2 border-dashed border-border/50">
              <BookOpen className="w-16 h-16 text-muted-foreground/20 mx-auto mb-6" />
              <h3 className="text-xl font-black mb-2">No Areas Found</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">Start building your school's academic framework by adding your first learning area.</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filtered.map((la: any, idx: number) => (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={la.id}
                >
                  <Card className="shadow-soft hover:shadow-2xl transition-all duration-500 border-0 bg-background/60 backdrop-blur-md group overflow-hidden rounded-[2rem] cursor-pointer">
                    <div className="h-2 w-full bg-gradient-to-r from-primary to-indigo-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="bg-primary/10 p-3 rounded-2xl border border-primary/10 group-hover:scale-110 transition-transform duration-500">
                          <GraduationCap className="w-6 h-6 text-primary" />
                        </div>
                        <Badge variant="secondary" className="bg-success/10 text-success border-none text-[10px] font-black h-5 uppercase tracking-tighter">
                          System Default
                        </Badge>
                      </div>
                      <CardTitle className="text-xl font-black mt-4 leading-tight group-hover:text-primary transition-colors">{la.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dashed border-border/50">
                        <div className="flex flex-col">
                          <span className="text-2xl font-black text-foreground">{la.strands?.length || 0}</span>
                          <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest flex items-center gap-1.5">
                            <Layers className="w-2.5 h-2.5" /> Strands
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-2xl font-black text-foreground">
                            {la.strands?.reduce((acc: number, s: any) => acc + (s.subStrands?.reduce((acc2: number, ss: any) => acc2 + (ss.competencies?.length || 0), 0) || 0), 0) || 0}
                          </span>
                          <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest flex items-center gap-1.5">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Skills
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" className="w-full justify-between h-10 px-0 hover:bg-transparent group-hover:text-primary transition-colors text-xs font-bold uppercase tracking-widest">
                        Manage Curriculum <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="rounded-[2.5rem] p-0 border-0 shadow-2xl overflow-hidden max-w-sm">
          <div className="h-2 bg-primary" />
          <div className="p-8">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black">Register Area</DialogTitle>
              <DialogDescription className="text-xs font-medium">Add a new learning area to the school's dynamic curriculum framework.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest ml-1">Learning Area Name</Label>
                <Input
                  placeholder="e.g. Creative Arts & Sports"
                  value={newLA.name}
                  onChange={e => setNewLA({ ...newLA, name: e.target.value })}
                  className="h-12 bg-muted/50 border-0 rounded-2xl focus-visible:ring-primary"
                />
              </div>
            </div>
            <DialogFooter className="mt-8 flex !flex-row gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)} className="flex-1 h-12 rounded-2xl font-bold">Cancel</Button>
              <Button
                onClick={() => createMutation.mutate(newLA)}
                disabled={createMutation.isPending || !newLA.name}
                className="flex-1 h-12 rounded-2xl font-bold shadow-lg shadow-primary/20"
              >
                {createMutation.isPending ? "Creating..." : "Save Area"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
