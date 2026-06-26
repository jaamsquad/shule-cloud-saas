import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Search, MoreVertical, CheckCircle, XCircle, Ban, RefreshCw, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";

export default function OwnerTenants() {
    const [search, setSearch] = useState("");
    const [selectedTenant, setSelectedTenant] = useState<any>(null);
    const [showPlanDialog, setShowPlanDialog] = useState(false);
    const queryClient = useQueryClient();

    const { data: tenants = [], isLoading } = useQuery({
        queryKey: ["owner-tenants"],
        queryFn: async () => {
            const res = await api.get("/owner/tenants");
            return res.data;
        }
    });

    const { data: plans = [] } = useQuery({
        queryKey: ["owner-plans"],
        queryFn: async () => {
            const res = await api.get("/owner/plans");
            return res.data;
        }
    });

    const assignPlanMutation = useMutation({
        mutationFn: ({ tenantId, planId }: { tenantId: string, planId: string }) =>
            api.post(`/owner/subscriptions/${tenantId}/assign-plan`, { planId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["owner-tenants"] });
            setShowPlanDialog(false);
            toast.success("Subscription plan updated");
        }
    });

    const suspendMutation = useMutation({
        mutationFn: (id: string) => api.post(`/owner/tenants/${id}/suspend`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["owner-tenants"] });
            toast.success("Tenant suspended");
        }
    });

    const reactivateMutation = useMutation({
        mutationFn: (id: string) => api.post(`/owner/tenants/${id}/reactivate`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["owner-tenants"] });
            toast.success("Tenant reactivated");
        }
    });

    const filteredTenants = tenants.filter((t: any) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.domains?.[0]?.domain?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-heading font-bold">Tenant Management</h1>
                    <p className="text-muted-foreground">Monitor and manage school environments across the platform.</p>
                </div>
                <Button className="shrink-0"><Plus className="w-4 h-4 mr-2" /> Provision School</Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search schools or subdomains..."
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Badge variant="outline" className="h-9 px-3 font-normal text-muted-foreground">
                            {filteredTenants.length} Total Schools
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>SCHOOL NAME</TableHead>
                                <TableHead>SUBDOMAIN</TableHead>
                                <TableHead>STATUS</TableHead>
                                <TableHead>SUBSCRIPTION</TableHead>
                                <TableHead>CREATED</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-10 animate-pulse">Fetching schools...</TableCell></TableRow>
                            ) : filteredTenants.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center py-10">No schools found.</TableCell></TableRow>
                            ) : filteredTenants.map((t: any) => (
                                <TableRow key={t.id}>
                                    <TableCell className="font-medium">{t.name}</TableCell>
                                    <TableCell>
                                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-primary">
                                            {t.domains?.[0]?.domain}.shulecloud.co.ke
                                        </code>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={t.status === 'active' ? 'bg-success/10 text-success' : t.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-destructive/10 text-destructive'}>
                                            {t.status === 'pending' ? 'Awaiting Review' : t.status}
                                        </Badge>
                                        {t.status === 'pending' && t.activationCode && (
                                            <div className="mt-1 text-[11px]">
                                                <span className="text-muted-foreground">Code: </span>
                                                <code className="font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded cursor-pointer" title="Click to copy — give this to the school"
                                                    onClick={() => { navigator.clipboard?.writeText(t.activationCode); toast.success("Activation code copied"); }}>{t.activationCode}</code>
                                                {!t.emailVerified && <span className="ml-1 text-[10px] text-slate-400">(email not verified)</span>}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">{t.subscription?.plan?.name || 'No Plan'}</div>
                                        <div className="text-xs text-muted-foreground">Expires: {t.subscription?.currentPeriodEnd ? new Date(t.subscription.currentPeriodEnd).toLocaleDateString() : 'N/A'}</div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {new Date(t.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => toast.info("Details coming soon")}>View Dashboard</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => { setSelectedTenant(t); setShowPlanDialog(true); }}>
                                                    <CreditCard className="w-4 h-4 mr-2" /> Change Plan
                                                </DropdownMenuItem>
                                                {t.status === 'active' ? (
                                                    <DropdownMenuItem className="text-destructive" onClick={() => suspendMutation.mutate(t.id)}>
                                                        <Ban className="w-4 h-4 mr-2" /> Suspend
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem className="text-success" onClick={() => reactivateMutation.mutate(t.id)}>
                                                        <RefreshCw className="w-4 h-4 mr-2" /> Reactivate
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Change Subscription Plan</DialogTitle>
                        <DialogDescription>
                            Select a new service tier for <strong>{selectedTenant?.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {plans.map((p: any) => (
                            <div
                                key={p.id}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group ${selectedTenant?.subscription?.planId === p.id ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/30'}`}
                                onClick={() => assignPlanMutation.mutate({ tenantId: selectedTenant.id, planId: p.id })}
                            >
                                <div className="space-y-1">
                                    <p className="font-bold flex items-center gap-2">
                                        {p.name}
                                        {selectedTenant?.subscription?.planId === p.id && <Badge className="h-5 px-1.5 bg-primary/20 text-primary border-none text-[8px] font-black uppercase">Active</Badge>}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{p.description || "School management tier."}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black">KES {(Number(p.priceMonthly ?? p.price ?? 0)).toLocaleString()}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">/MO</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
