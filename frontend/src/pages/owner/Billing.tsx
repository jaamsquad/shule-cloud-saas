import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreditCard, TrendingUp, DollarSign } from "lucide-react";

export default function OwnerBilling() {
    const { data: revenue, isLoading: revenueLoading } = useQuery({
        queryKey: ["owner-revenue"],
        queryFn: async () => {
            const res = await api.get("/owner/billing/revenue-report");
            return res.data;
        }
    });

    const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
        queryKey: ["owner-invoices"],
        queryFn: async () => {
            const res = await api.get("/owner/billing/invoices");
            return res.data;
        }
    });

    return (
        <div className="p-6 space-y-6 text-white bg-foreground/5 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-gray-100">Global Financials</h1>
                    <p className="text-muted-foreground">Track platform revenue and manage tenant invoices.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-primary/5 border-primary/10">
                    <CardHeader className="p-4 flex flex-row items-center gap-4 space-y-0">
                        <TrendingUp className="w-8 h-8 text-primary opacity-40 shrink-0" />
                        <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground uppercase tracking-widest leading-none mb-1">Total Platform Revenue</p>
                            <p className="text-2xl font-bold text-gray-900">KES {(revenue?.totalRevenue || 0).toLocaleString()}</p>
                        </div>
                    </CardHeader>
                </Card>
            </div>

            <Card className="shadow-premium">
                <CardHeader>
                    <CardTitle className="text-base font-heading text-gray-900">Recent Invoices</CardTitle>
                    <CardDescription>Track all billing cycles for ShuleCloud tenants.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">TENANT SCHOOL</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">AMOUNT (KES)</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">STATUS</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">DUE DATE</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-widest text-muted-foreground">ISSUED AT</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoicesLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-10 animate-pulse text-muted-foreground">Consulting billing history...</TableCell></TableRow>
                            ) : invoices.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No invoices generated for this period.</TableCell></TableRow>
                            ) : invoices.map((invoice: any) => (
                                <TableRow key={invoice.id} className="hover:bg-muted/30">
                                    <TableCell className="font-medium text-gray-900">{invoice.tenant?.name}</TableCell>
                                    <TableCell className="text-gray-900">{(invoice.amount || 0).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Badge className={invoice.status === 'PAID' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}>
                                            {invoice.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground font-mono">
                                        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground font-mono">
                                        {new Date(invoice.issuedAt).toLocaleDateString()}
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
