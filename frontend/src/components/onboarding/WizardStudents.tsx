import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, UserPlus, Plus, X } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StudentRow {
  name: string;
  class: string;
  gender: string;
  guardian: string;
}

export default function WizardStudents() {
  const [students, setStudents] = useState<StudentRow[]>([
    { name: "", class: "Form 1A", gender: "Male", guardian: "" },
  ]);

  const addRow = () => setStudents(prev => [...prev, { name: "", class: "Form 1A", gender: "Male", guardian: "" }]);
  const removeRow = (i: number) => setStudents(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Student Admission</h2>
        <p className="text-muted-foreground mt-1">Import your first batch of students or add them manually.</p>
      </div>

      <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">Import from CSV / Excel</p>
        <p className="text-xs text-muted-foreground mt-1">Upload with columns: Name, Class, Gender, DOB, Guardian Name, Guardian Phone</p>
        <Button variant="outline" size="sm" className="mt-3">Download Template</Button>
      </div>

      <div className="relative flex items-center py-2">
        <div className="flex-1 border-t border-border" />
        <span className="px-3 text-xs text-muted-foreground">or add manually</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4 space-y-3">
          {students.map((s, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-3 space-y-1">
                {i === 0 && <Label className="text-xs">Student Name</Label>}
                <Input value={s.name} onChange={e => setStudents(prev => prev.map((v, vi) => vi === i ? { ...v, name: e.target.value } : v))} placeholder="Jane Wanjiku" className="h-9 text-sm" />
              </div>
              <div className="col-span-2 space-y-1">
                {i === 0 && <Label className="text-xs">Class</Label>}
                <Select value={s.class} onValueChange={val => setStudents(prev => prev.map((v, vi) => vi === i ? { ...v, class: val } : v))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Form 1A", "Form 1B", "Form 1C", "Form 2A", "Form 2B", "Form 2C", "Form 3A", "Form 3B", "Form 4A", "Form 4B"].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                {i === 0 && <Label className="text-xs">Gender</Label>}
                <Select value={s.gender} onValueChange={val => setStudents(prev => prev.map((v, vi) => vi === i ? { ...v, gender: val } : v))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4 space-y-1">
                {i === 0 && <Label className="text-xs">Guardian Name</Label>}
                <Input value={s.guardian} onChange={e => setStudents(prev => prev.map((v, vi) => vi === i ? { ...v, guardian: e.target.value } : v))} placeholder="Mary Mwangi" className="h-9 text-sm" />
              </div>
              <div className="col-span-1">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeRow(i)} disabled={students.length === 1}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="w-3 h-3 mr-1" /> Add Student
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Admission numbers will be auto-generated. You can always add more students later.</p>
    </div>
  );
}
