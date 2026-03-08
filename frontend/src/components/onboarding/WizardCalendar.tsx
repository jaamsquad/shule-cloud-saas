import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export default function WizardCalendar() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Academic Calendar</h2>
        <p className="text-muted-foreground mt-1">Set up your academic year and term dates.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Academic Year</Label>
          <Select defaultValue="2026">
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Number of Terms</Label>
          <Select defaultValue="3">
            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 Terms</SelectItem>
              <SelectItem value="3">3 Terms</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {[
          { term: "Term 1", start: "2026-01-06", end: "2026-04-04" },
          { term: "Term 2", start: "2026-05-05", end: "2026-08-01" },
          { term: "Term 3", start: "2026-09-01", end: "2026-11-20" },
        ].map(t => (
          <Card key={t.term} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-accent-foreground" />
                </div>
                <h3 className="font-heading font-semibold text-foreground">{t.term}</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" defaultValue={t.start} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">End Date</Label>
                  <Input type="date" defaultValue={t.end} className="h-9 text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
