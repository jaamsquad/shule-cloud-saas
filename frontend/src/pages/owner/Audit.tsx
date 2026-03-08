import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, History, ShieldAlert, Cpu, UserCircle, Database, CreditCard } from "lucide-react";

export default function OwnerAudit() {
    const { data: logs = [], isLoading } = useQuery({
        queryKey: ["owner-audit"],
        queryFn: async () => {
            const res = await api.get("/owner/audit-logs");
            return res.data;
        }
    });

    const getActionColor = (action: string) => {
        if (action.includes('CREATE')) return 'bg-success/10 text-success border-success/20';
        if (action.includes('DELETE')) return 'bg-destructive/10 text-destructive border-destructive/20';
        if (action.includes('UPDATE')) return 'bg-accent text-accent-foreground border-accent';
        if (action.includes('FAILED')) return 'bg-destructive/10 text-destructive border-destructive/20';
        return 'bg-muted text-muted-foreground border-muted';
    };

    const getEntityIcon = (entity: string) => {
        if (entity === 'PlatformUser') return <UserCircle className="w-4 h-4 text-muted-foreground" />;
        if (entity === 'Tenant') return <Cpu className="w-4 h-4 text-muted-foreground" />;
        if (entity === 'Plan') return <CreditCard className="w-4 h-4 text-muted-foreground" />;
        return <Database className="w-4 h-4 text-muted-foreground" />;
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-heading font-bold">Platform Audit Logs</h1>
                <p className="text-muted-foreground">Comprehensive record of all administrative actions performed on ShuleCloud.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-sidebar-accent/30 border-sidebar-border">
                    <CardHeader className="p-4 flex-row items-center gap-3 space-y-0">
                        <History className="w-5 h-5 text-primary" />
                        <div className="space-y-0.5">
                            <p className="text-2xl font-bold">{logs.length}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">Total Platform Events</p>
                        </div>
                    </CardHeader>
                </Card>
                <Card className="bg-sidebar-accent/30 border-sidebar-border">
                    <CardHeader className="p-4 flex-row items-center gap-3 space-y-0">
                        <ShieldAlert className="w-5 h-5 text-destructive" />
                        <div className="space-y-0.5">
                            <p className="text-2xl font-bold">{logs.filter((l: any) => l.action.includes('FAILED')).length}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">Security Incidents</p>
                        </div>
                    </CardHeader>
                </Card>
            </div>

            <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-heading">Activity Stream</CardTitle>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Filter audit trail..." className="pl-9 h-8 text-xs" />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-[10px] uppercase tracking-widest">TIMESTAMP</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-widest">ACTOR</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-widest">ACTION</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-widest">ENTITY</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-widest">METADATA</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-10 animate-pulse">Consulting platform history...</TableCell></TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">The platform is quiet. No audit logs recorded yet.</TableCell></TableRow>
                            ) : logs.map((log: any) => (
                                <TableRow key={log.id} className="group hover:bg-muted/30">
                                    <TableCell className="text-xs whitespace-nowrap font-mono">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm font-medium">{log.platformUser?.email || <span className="text-muted-foreground italic">system</span>}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{log.platformUser?.role || 'SYSTEM_CORE'}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`text-[10px] font-mono tracking-tighter rounded-sm px-1.5 py-0 shadow-sm ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {getEntityIcon(log.entity)}
                                            <span className="text-sm">{log.entity}</span>
                                        </div>
                                        {log.entityId && <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{log.entityId}</div>}
                                    </TableCell>
                                    <TableCell>
                                        <pre className="text-[10px] text-muted-foreground bg-accent/30 p-1.5 rounded border border-accent/20 max-w-[200px] truncate group-hover:whitespace-normal group-hover:max-w-none transition-all cursor-help">
                                            {JSON.stringify(log.metadata, null, 2)}
                                        </pre>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
