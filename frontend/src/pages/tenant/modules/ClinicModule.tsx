import { useState } from "react";
import { Search, Plus, Heart, AlertTriangle, Pill, Activity } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const visits = [
  { id: 1, student: "Jane Wanjiku", class: "Grade 8 East", complaint: "Headache", treatment: "Paracetamol 500mg", nurse: "Sr. Mwangi", date: "2026-03-01", time: "9:15 AM" },
  { id: 2, student: "John Kamau", class: "Grade 7 West", complaint: "Stomach ache", treatment: "ORS + rest", nurse: "Sr. Mwangi", date: "2026-03-01", time: "10:30 AM" },
  { id: 3, student: "Amina Hassan", class: "Grade 9 East", complaint: "Minor cut on knee", treatment: "Cleaned & bandaged", nurse: "Sr. Achieng", date: "2026-03-01", time: "11:00 AM" },
  { id: 4, student: "David Ochieng", class: "Grade 10 West", complaint: "Fever (38.2°C)", treatment: "Paracetamol, rest, monitor", nurse: "Sr. Mwangi", date: "2026-02-28", time: "2:00 PM" },
];

const alerts = [
  { student: "Faith Njeri", condition: "Asthma", severity: "High", notes: "Has inhaler, avoid dusty areas" },
  { student: "Brian Kipchoge", condition: "Peanut allergy", severity: "Critical", notes: "EpiPen in clinic. No nuts." },
  { student: "Lucy Akinyi", condition: "Diabetes Type 1", severity: "High", notes: "Insulin schedule: before lunch" },
];

const medications = [
  { drug: "Paracetamol 500mg", stock: 200, dispensed: 45, reorderAt: 50, status: "OK" },
  { drug: "ORS Sachets", stock: 80, dispensed: 12, reorderAt: 20, status: "OK" },
  { drug: "Bandages (roll)", stock: 15, dispensed: 8, reorderAt: 10, status: "Low" },
  { drug: "Antiseptic Solution", stock: 5, dispensed: 3, reorderAt: 3, status: "Reorder" },
];

export default function ClinicModule() {
  const [search, setSearch] = useState("");

  return (
    <>
      <AppHeader title="School Clinic" subtitle="Student health management and visit tracking" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Heart className="w-8 h-8 text-destructive" /><div><p className="text-2xl font-bold">3</p><p className="text-xs text-muted-foreground">Visits Today</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Activity className="w-8 h-8 text-info" /><div><p className="text-2xl font-bold">1</p><p className="text-xs text-muted-foreground">In Sickbay</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="w-8 h-8 text-warning" /><div><p className="text-2xl font-bold">3</p><p className="text-xs text-muted-foreground">Medical Alerts</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Pill className="w-8 h-8 text-primary" /><div><p className="text-2xl font-bold">1</p><p className="text-xs text-muted-foreground">Low Stock Items</p></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="visits">
          <TabsList><TabsTrigger value="visits">Visit Log</TabsTrigger><TabsTrigger value="alerts">Medical Alerts</TabsTrigger><TabsTrigger value="medication">Medication Stock</TabsTrigger></TabsList>

          <TabsContent value="visits" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="relative w-80"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search visits..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" /></div>
              <Button size="sm"><Plus className="w-4 h-4 mr-1.5" />Log Visit</Button>
            </div>
            <Card className="shadow-card overflow-hidden">
              <Table>
                <TableHeader><TableRow><TableHead className="text-xs">DATE</TableHead><TableHead className="text-xs">TIME</TableHead><TableHead className="text-xs">STUDENT</TableHead><TableHead className="text-xs">CLASS</TableHead><TableHead className="text-xs">COMPLAINT</TableHead><TableHead className="text-xs">TREATMENT</TableHead><TableHead className="text-xs">NURSE</TableHead></TableRow></TableHeader>
                <TableBody>
                  {visits.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="text-sm">{v.date}</TableCell>
                      <TableCell className="text-sm">{v.time}</TableCell>
                      <TableCell className="text-sm font-medium">{v.student}</TableCell>
                      <TableCell className="text-sm">{v.class}</TableCell>
                      <TableCell className="text-sm">{v.complaint}</TableCell>
                      <TableCell className="text-sm">{v.treatment}</TableCell>
                      <TableCell className="text-sm">{v.nurse}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <div className="space-y-3">
              {alerts.map((a, i) => (
                <Card key={i} className="border-l-4 border-l-destructive">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{a.student}</p>
                      <p className="text-xs text-muted-foreground">{a.condition} — {a.notes}</p>
                    </div>
                    <Badge variant="destructive" className="text-xs">{a.severity}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="medication">
            <Card className="shadow-card overflow-hidden">
              <Table>
                <TableHeader><TableRow><TableHead className="text-xs">MEDICATION</TableHead><TableHead className="text-xs">IN STOCK</TableHead><TableHead className="text-xs">DISPENSED (TERM)</TableHead><TableHead className="text-xs">REORDER AT</TableHead><TableHead className="text-xs">STATUS</TableHead></TableRow></TableHeader>
                <TableBody>
                  {medications.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-medium">{m.drug}</TableCell>
                      <TableCell className="text-sm">{m.stock}</TableCell>
                      <TableCell className="text-sm">{m.dispensed}</TableCell>
                      <TableCell className="text-sm">{m.reorderAt}</TableCell>
                      <TableCell><Badge variant={m.status === "OK" ? "default" : m.status === "Low" ? "secondary" : "destructive"} className="text-xs">{m.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
