import { useState } from "react";
import { Search, Plus, BookOpen, ArrowRightLeft, AlertTriangle } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const books = [
  { id: "BK-001", title: "Things Fall Apart", author: "Chinua Achebe", isbn: "978-0-385-47454-2", copies: 15, available: 8, category: "Literature" },
  { id: "BK-002", title: "The River Between", author: "Ngugi wa Thiong'o", isbn: "978-0-435-90548-5", copies: 12, available: 3, category: "Literature" },
  { id: "BK-003", title: "New Horizon Mathematics", author: "KLB", isbn: "978-9966-10-001", copies: 40, available: 35, category: "Textbook" },
  { id: "BK-004", title: "Explore Science Grade 8", author: "Oxford", isbn: "978-0-19-444-021", copies: 40, available: 38, category: "Textbook" },
  { id: "BK-005", title: "Blossoms of the Savannah", author: "H. Ole Kulet", isbn: "978-9966-25-887", copies: 20, available: 0, category: "Literature" },
  { id: "BK-006", title: "A Doll's House", author: "Henrik Ibsen", isbn: "978-0-486-27062-5", copies: 18, available: 12, category: "Literature" },
];

export default function LibraryCatalog() {
  const [search, setSearch] = useState("");
  const filtered = books.filter(b => b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <AppHeader title="Library" subtitle="Book catalog and circulation management" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><BookOpen className="w-8 h-8 text-primary" /><div><p className="text-2xl font-bold">145</p><p className="text-xs text-muted-foreground">Total Titles</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><ArrowRightLeft className="w-8 h-8 text-info" /><div><p className="text-2xl font-bold">32</p><p className="text-xs text-muted-foreground">Currently Issued</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="w-8 h-8 text-warning" /><div><p className="text-2xl font-bold">7</p><p className="text-xs text-muted-foreground">Overdue</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><BookOpen className="w-8 h-8 text-success" /><div><p className="text-2xl font-bold">96</p><p className="text-xs text-muted-foreground">Available</p></div></div></CardContent></Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by title or author..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><ArrowRightLeft className="w-4 h-4 mr-1.5" />Issue Book</Button>
            <Button size="sm"><Plus className="w-4 h-4 mr-1.5" />Add Book</Button>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead className="text-xs">BOOK ID</TableHead><TableHead className="text-xs">TITLE</TableHead><TableHead className="text-xs">AUTHOR</TableHead><TableHead className="text-xs">CATEGORY</TableHead><TableHead className="text-xs">COPIES</TableHead><TableHead className="text-xs">AVAILABLE</TableHead><TableHead className="text-xs">STATUS</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map(b => (
                <TableRow key={b.id}>
                  <TableCell className="text-sm font-mono text-primary">{b.id}</TableCell>
                  <TableCell className="text-sm font-medium">{b.title}</TableCell>
                  <TableCell className="text-sm">{b.author}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{b.category}</Badge></TableCell>
                  <TableCell className="text-sm">{b.copies}</TableCell>
                  <TableCell className="text-sm">{b.available}</TableCell>
                  <TableCell><Badge variant={b.available > 0 ? "default" : "destructive"} className="text-xs">{b.available > 0 ? "In Stock" : "All Issued"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
