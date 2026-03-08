import { ArrowRightLeft, Search, GraduationCap, ArrowUpCircle, Filter } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

export default function Promotions() {
    return (
        <>
            <AppHeader title="Promotions & Transfers" subtitle="Transfer students between classes or promote them to the next level" />
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <ArrowRightLeft className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1 text-center md:text-left">
                        <h3 className="text-lg font-semibold">Mass Promotion Tool</h3>
                        <p className="text-sm text-muted-foreground">Easily move an entire class to the next grade at the end of the academic year.</p>
                    </div>
                    <Button size="lg" className="shadow-lg shadow-primary/20">
                        <ArrowUpCircle className="w-4 h-4 mr-2" /> Start Mass Promotion
                    </Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input className="pl-9" placeholder="Search students for individual transfer..." />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" /> Filter Class</Button>
                    </div>
                </div>

                <Card className="shadow-card">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead>STUDENT</TableHead>
                                <TableHead>CURRENT CLASS</TableHead>
                                <TableHead>STATUS</TableHead>
                                <TableHead className="text-right">ACTION</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-20">
                                    <GraduationCap className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                                    <p className="text-muted-foreground">Select a class or search for a student to begin promotion or transfer.</p>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </>
    );
}
