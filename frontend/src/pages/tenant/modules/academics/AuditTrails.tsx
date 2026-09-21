import { who } from "@/lib/who";
import { useState } from "react";
import { Search, Shield, Eye, ChevronRight, User, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export default function AuditTrails() {
    const [search, setSearch] = useState("");
    
    const { data: items = [], isLoading } = useQuery({
        queryKey: ["audit-trails"],
        queryFn: async () => {
            const r = await api.get("/academics/audit_trails");
            return r.data;
        },
    });

    const filtered = items.filter((item: any) => 
        item.user?.toLowerCase().includes(search.toLowerCase()) || 
        item.action?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 bg-white overflow-hidden flex flex-col p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-sm bg-gray-50 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-gray-500" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-800">Audit Trails</h1>
                </div>
            </div>

            <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-[13px] text-gray-500">
                    <span>Show</span>
                    <select className="border border-gray-300 rounded-sm px-2 py-1 outline-none font-bold text-gray-700 h-8">
                        <option>50</option>
                    </select>
                    <span>entries</span>
                </div>
                
                <div className="flex items-center gap-2">
                   <span className="text-[13px] font-medium text-gray-500">Search:</span>
                   <Input 
                        value={search} 
                        onChange={e => setSearch(e.target.value)}
                        className="w-48 h-8 rounded-sm bg-white border-gray-300 shadow-none text-[13px]" 
                    />
                </div>
            </div>

            <div className="border border-gray-100 rounded-sm shadow-sm overflow-x-auto">
                <Table>
                    <TableHeader className="bg-gray-50 text-gray-500">
                        <TableRow className="h-10">
                            <TableHead className="font-bold text-[12px] uppercase h-10 px-6">Name</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase h-10 px-6">Description</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase h-10 px-6">Date</TableHead>
                            <TableHead className="font-bold text-[12px] uppercase h-10 px-6 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-10 opacity-50 text-xs text-gray-400">Loading audit logs...</TableCell></TableRow>
                        ) : filtered.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-10 opacity-50 text-xs font-bold text-gray-400">No logs recorded</TableCell></TableRow>
                        ) : (
                            filtered.map((item: any) => (
                                <TableRow key={item._id} className="hover:bg-gray-50/50 group border-b border-gray-50 h-10">
                                    <TableCell className="text-[13px] text-gray-800 px-6 font-medium flex items-center gap-2 h-10">
                                         <User className="w-3.5 h-3.5 text-gray-400" /> {who(item.user, 'System')}
                                    </TableCell>
                                    <TableCell className="text-[13px] text-gray-600 px-6">{item.action}</TableCell>
                                    <TableCell className="text-[13px] text-gray-500 px-6">{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}</TableCell>
                                    <TableCell className="text-right px-6">
                                         <div className="flex justify-end gap-1.5 opacity-80 group-hover:opacity-100">
                                            <Button variant="outline" size="sm" className="h-7 px-3 text-[11px] font-bold text-gray-600 bg-white border-gray-300 gap-1 rounded-sm shadow-none">
                                                <Eye className="w-3" /> View
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            
            <div className="flex items-center justify-between py-2 text-[13px] text-gray-500">
                <p>Showing {filtered.length} of {items.length} entries</p>
                <div className="flex">
                   <Button variant="outline" size="sm" className="h-8 shadow-none border-gray-200 rounded-l-md border-r-0 text-gray-400">Previous</Button>
                   <Button variant="outline" size="sm" className="h-8 w-8 bg-sky-600 text-white shadow-none border-none rounded-none">1</Button>
                   <Button variant="outline" size="sm" className="h-8 shadow-none border-gray-200 rounded-r-md border-l-0 text-gray-400">Next</Button>
                </div>
            </div>
        </div>
    );
}
