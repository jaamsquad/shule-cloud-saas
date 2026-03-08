import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, UserPlus, Mail, Plus, X } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StaffInvite {
  name: string;
  email: string;
  role: string;
}

export default function WizardStaff() {
  const [invites, setInvites] = useState<StaffInvite[]>([
    { name: "", email: "", role: "Teacher" },
  ]);

  const addRow = () => setInvites(prev => [...prev, { name: "", email: "", role: "Teacher" }]);
  const removeRow = (i: number) => setInvites(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Staff Import / Invite</h2>
        <p className="text-muted-foreground mt-1">Add your staff manually or import from a CSV file.</p>
      </div>

      <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground">Import from CSV</p>
        <p className="text-xs text-muted-foreground mt-1">Upload a CSV with columns: Name, Email, Phone, Role, Department</p>
        <Button variant="outline" size="sm" className="mt-3">Download Template</Button>
      </div>

      <div className="relative flex items-center py-2">
        <div className="flex-1 border-t border-border" />
        <span className="px-3 text-xs text-muted-foreground">or invite manually</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-4 space-y-3">
          {invites.map((inv, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4 space-y-1">
                {i === 0 && <Label className="text-xs">Full Name</Label>}
                <Input
                  value={inv.name}
                  onChange={e => setInvites(prev => prev.map((v, vi) => vi === i ? { ...v, name: e.target.value } : v))}
                  placeholder="Mr. James Ochieng"
                  className="h-9 text-sm"
                />
              </div>
              <div className="col-span-4 space-y-1">
                {i === 0 && <Label className="text-xs">Email</Label>}
                <Input
                  type="email"
                  value={inv.email}
                  onChange={e => setInvites(prev => prev.map((v, vi) => vi === i ? { ...v, email: e.target.value } : v))}
                  placeholder="james@school.ac.ke"
                  className="h-9 text-sm"
                />
              </div>
              <div className="col-span-3 space-y-1">
                {i === 0 && <Label className="text-xs">Role</Label>}
                <Select
                  value={inv.role}
                  onValueChange={val => setInvites(prev => prev.map((v, vi) => vi === i ? { ...v, role: val } : v))}
                >
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Head Teacher">Head Teacher</SelectItem>
                    <SelectItem value="Deputy">Deputy Head</SelectItem>
                    <SelectItem value="HOD">HOD</SelectItem>
                    <SelectItem value="Teacher">Teacher</SelectItem>
                    <SelectItem value="Bursar">Bursar</SelectItem>
                    <SelectItem value="Librarian">Librarian</SelectItem>
                    <SelectItem value="Nurse">Nurse</SelectItem>
                    <SelectItem value="ICT Admin">ICT Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => removeRow(i)} disabled={invites.length === 1}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="w-3 h-3 mr-1" /> Add Staff
          </Button>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Staff will receive an email invitation to set up their accounts.</p>
    </div>
  );
}
