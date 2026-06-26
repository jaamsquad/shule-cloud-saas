import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, CreditCard, Users, Database, Globe, MoreVertical, Edit2, Trash2, Package, Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

export default function OwnerPlans() {
    const queryClient = useQueryClient();

    const { data: plans = [], isLoading } = useQuery({
        queryKey: ["owner-plans"],
        queryFn: async () => {
            const res = await api.get("/owner/plans");
            return res.data;
        }
    });

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [form, setForm] = useState({
        name: "",
        description: "",
        priceMonthly: 0,
        billingCycle: "monthly",
        maxStudents: 500,
        moduleToggles: {
            lms: true,
            finance: true,
            attendance: true,
            exams: true,
            comms: true
        }
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/owner/plans", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["owner-plans"] });
            toast.success("New platform tier deployed");
            setIsAddOpen(false);
            setForm({
                name: "",
                description: "",
                priceMonthly: 0,
                billingCycle: "monthly",
                maxStudents: 500,
                moduleToggles: { lms: true, finance: true, attendance: true, exams: true, comms: true }
            });
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || "Deployment failed")
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/owner/plans/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["owner-plans"] });
            toast.success("Tier decommissioned");
        }
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-heading font-bold">Subscription Tiers</h1>
                    <p className="text-muted-foreground">Manage service plans, pricing, and feature modules for schools.</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="shrink-0 rounded-xl font-black gap-2 transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-primary/20">
                            <Plus className="w-5 h-5" /> Deploy New Tier
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl rounded-[2.5rem] border-0 shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
                        <div className="h-2 gradient-primary" />
                        <div className="p-8">
                            <DialogHeader className="mb-8">
                                <DialogTitle className="text-3xl font-heading font-black">Design New Tier</DialogTitle>
                                <DialogDescription className="font-medium">Define pricing, capacity, and active modules for this school tier.</DialogDescription>
                            </DialogHeader>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2 col-span-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Tier Name</Label>
                                    <Input placeholder="e.g. Enterprise Elite" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="h-12 rounded-2xl bg-muted/50 border-0 focus-visible:ring-primary font-bold" />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Market Description</Label>
                                    <Textarea placeholder="Explain what makes this tier unique..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="rounded-2xl bg-muted/50 border-0 focus-visible:ring-primary min-h-[80px]" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Monthly Cost (KES)</Label>
                                    <Input type="number" value={form.priceMonthly} onChange={e => setForm({ ...form, priceMonthly: parseFloat(e.target.value) })} className="h-12 rounded-2xl bg-muted/50 border-0 focus-visible:ring-primary font-black" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Student Capacity</Label>
                                    <Input type="number" value={form.maxStudents} onChange={e => setForm({ ...form, maxStudents: parseInt(e.target.value) })} className="h-12 rounded-2xl bg-muted/50 border-0 focus-visible:ring-primary font-black" />
                                </div>

                                <div className="col-span-2 p-6 rounded-[2rem] bg-accent/30 border border-accent/50 space-y-4">
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-2">
                                        <Package className="w-3.5 h-3.5" /> Capabilities
                                    </p>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                        {Object.keys(form.moduleToggles).map((mod) => (
                                            <div key={mod} className="flex items-center justify-between">
                                                <Label className="text-xs font-bold uppercase tracking-tight capitalize">{mod} Module</Label>
                                                <Switch
                                                    checked={(form.moduleToggles as any)[mod]}
                                                    onCheckedChange={(v) => setForm({
                                                        ...form,
                                                        moduleToggles: { ...form.moduleToggles, [mod]: v }
                                                    })}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="mt-10 flex !flex-row gap-3">
                                <Button variant="outline" onClick={() => setIsAddOpen(false)} className="flex-1 h-12 rounded-2xl font-bold border-border/50">Abort</Button>
                                <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="flex-[2] h-12 rounded-2xl font-black shadow-lg shadow-primary/20 text-xs">
                                    {createMutation.isPending ? "Deploying..." : "Finalize & Deploy Tier"}
                                </Button>
                            </DialogFooter>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-3 text-center py-20 animate-pulse text-muted-foreground">Fetching platform tiers...</div>
                ) : plans.length === 0 ? (
                    <div className="col-span-3 text-center py-20 text-muted-foreground bg-muted/20 rounded-xl border-2 border-dashed border-muted/50">
                        No subscription plans found. Start by creating the initial tiers.
                    </div>
                ) : plans.map((p: any) => (
                    <Card key={p.id} className="shadow-premium group hover:border-primary/50 transition-all">
                        <CardHeader className="relative">
                            <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Edit2 className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                            <Badge className="w-fit mb-2 gradient-primary rounded-sm font-mono tracking-widest text-[10px] py-0 px-1.5 border-none shadow-sm">
                                KES {(Number(p.priceMonthly ?? p.price ?? 0)).toLocaleString()}/MO
                            </Badge>
                            <CardTitle className="text-xl font-heading">{p.name}</CardTitle>
                            <CardDescription className="line-clamp-2 mt-1 min-h-[40px] text-xs">
                                {p.description || "The core tier for mid-sized school environments."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-accent/50 flex items-center justify-center border border-accent">
                                        <Users className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mb-1">Students</p>
                                        <p className="text-sm font-bold">{p.maxStudents?.toLocaleString() || "UNLIMITED"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-accent/50 flex items-center justify-center border border-accent">
                                        <CreditCard className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mb-1">Billing</p>
                                        <p className="text-sm font-bold uppercase">{p.billingCycle}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mb-2">Modules Enabled</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {Object.entries(p.moduleToggles || {}).map(([key, enabled]) => (
                                        enabled && (
                                            <Badge key={key} variant="secondary" className="bg-success/5 text-success/80 border-success/10 text-[10px] font-normal lowercase py-0 shadow-none">
                                                {key}
                                            </Badge>
                                        )
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 border-t border-muted/30">
                            <Button variant="outline" size="sm" className="w-full text-xs hover:bg-primary/5 hover:text-primary hover:border-primary/30">View Active Subscriptions</Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
