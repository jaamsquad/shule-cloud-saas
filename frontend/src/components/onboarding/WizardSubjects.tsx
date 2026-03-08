import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";

const cbcSubjects = [
  { name: "Mathematics", category: "Core", strands: 5, selected: true },
  { name: "English", category: "Core", strands: 4, selected: true },
  { name: "Kiswahili", category: "Core", strands: 4, selected: true },
  { name: "Science & Technology", category: "Core", strands: 6, selected: true },
  { name: "Social Studies", category: "Core", strands: 4, selected: true },
  { name: "Christian Religious Education", category: "Optional", strands: 4, selected: true },
  { name: "Islamic Religious Education", category: "Optional", strands: 4, selected: false },
  { name: "Hindu Religious Education", category: "Optional", strands: 3, selected: false },
  { name: "Creative Arts & Sports", category: "Core", strands: 3, selected: true },
  { name: "Agriculture", category: "Optional", strands: 4, selected: true },
  { name: "Home Science", category: "Optional", strands: 3, selected: false },
  { name: "Computer Science", category: "Optional", strands: 4, selected: true },
  { name: "Business Studies", category: "Optional", strands: 3, selected: true },
  { name: "French", category: "Optional", strands: 3, selected: false },
  { name: "German", category: "Optional", strands: 3, selected: false },
  { name: "Arabic", category: "Optional", strands: 3, selected: false },
  { name: "Music", category: "Optional", strands: 3, selected: true },
  { name: "Art & Design", category: "Optional", strands: 3, selected: true },
  { name: "Physical & Health Education", category: "Core", strands: 3, selected: true },
];

export default function WizardSubjects() {
  const [subjects, setSubjects] = useState(cbcSubjects);

  const toggle = (idx: number) => {
    setSubjects(prev => prev.map((s, i) => i === idx ? { ...s, selected: !s.selected } : s));
  };

  const coreSubjects = subjects.filter(s => s.category === "Core");
  const optionalSubjects = subjects.filter(s => s.category === "Optional");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Learning Areas (CBC)</h2>
        <p className="text-muted-foreground mt-1">Select the CBC learning areas offered at your school. Core subjects are pre-selected.</p>
      </div>

      <div>
        <h3 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" /> Core Learning Areas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {coreSubjects.map((s, i) => {
            const globalIdx = subjects.indexOf(s);
            return (
              <label key={s.name} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                <Checkbox checked={s.selected} onCheckedChange={() => toggle(globalIdx)} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.strands} strands</p>
                </div>
                <Badge variant="default" className="text-xs">Core</Badge>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="font-heading font-semibold text-foreground mb-3">Optional Learning Areas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {optionalSubjects.map(s => {
            const globalIdx = subjects.indexOf(s);
            return (
              <label key={s.name} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                <Checkbox checked={s.selected} onCheckedChange={() => toggle(globalIdx)} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.strands} strands</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{subjects.filter(s => s.selected).length} of {subjects.length} learning areas selected</p>
    </div>
  );
}
