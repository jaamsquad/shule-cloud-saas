import { useState } from "react";
import { Search, Plus, Phone, Mail } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const guardians = [
  { id: 1, name: "Mary Mwangi", phone: "+254 711 111 111", email: "mary@email.com", relation: "Mother", students: ["Jane Wanjiku"], status: "Active" },
  { id: 2, name: "Peter Njoroge", phone: "+254 722 222 222", email: "peter@email.com", relation: "Father", students: ["John Kamau"], status: "Active" },
  { id: 3, name: "Hassan Ali", phone: "+254 733 333 333", email: "hassan@email.com", relation: "Father", students: ["Amina Hassan", "Fatima Ali"], status: "Active" },
  { id: 4, name: "Grace Otieno", phone: "+254 744 444 444", email: "grace@email.com", relation: "Mother", students: ["David Ochieng"], status: "Invited" },
  { id: 5, name: "James Waithaka", phone: "+254 755 555 555", email: "james@email.com", relation: "Father", students: ["Faith Njeri"], status: "Active" },
  { id: 6, name: "Rose Odhiambo", phone: "+254 766 666 666", email: "rose@email.com", relation: "Mother", students: ["Lucy Akinyi"], status: "Active" },
];

export default function GuardiansList() {
  const [search, setSearch] = useState("");
  const filtered = guardians.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <AppHeader title="Parents & Guardians" subtitle="Manage guardian records and portal access" />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search guardians..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Mail className="w-4 h-4 mr-1.5" />Invite All</Button>
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" />Add Guardian</Button>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead className="text-xs">NAME</TableHead><TableHead className="text-xs">PHONE</TableHead><TableHead className="text-xs">EMAIL</TableHead><TableHead className="text-xs">RELATION</TableHead><TableHead className="text-xs">LINKED STUDENTS</TableHead><TableHead className="text-xs">PORTAL</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map(g => (
                <TableRow key={g.id}>
                  <TableCell className="text-sm font-medium">{g.name}</TableCell>
                  <TableCell className="text-sm"><span className="flex items-center gap-1"><Phone className="w-3 h-3" />{g.phone}</span></TableCell>
                  <TableCell className="text-sm">{g.email}</TableCell>
                  <TableCell className="text-sm">{g.relation}</TableCell>
                  <TableCell className="text-sm">{g.students.join(", ")}</TableCell>
                  <TableCell><Badge variant={g.status === "Active" ? "default" : "secondary"} className="text-xs">{g.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
