import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Users } from "lucide-react";

interface ClassItem {
  name: string;
  streams: string[];
}

const defaultClasses: ClassItem[] = [
  { name: "Form 1", streams: ["A", "B", "C"] },
  { name: "Form 2", streams: ["A", "B", "C"] },
  { name: "Form 3", streams: ["A", "B"] },
  { name: "Form 4", streams: ["A", "B"] },
];

export default function WizardClasses() {
  const [classes, setClasses] = useState<ClassItem[]>(defaultClasses);
  const [newStream, setNewStream] = useState<Record<number, string>>({});

  const addStream = (idx: number) => {
    const val = newStream[idx]?.trim();
    if (!val) return;
    setClasses(prev => prev.map((c, i) => i === idx ? { ...c, streams: [...c.streams, val] } : c));
    setNewStream(prev => ({ ...prev, [idx]: "" }));
  };

  const removeStream = (classIdx: number, streamIdx: number) => {
    setClasses(prev => prev.map((c, i) => i === classIdx ? { ...c, streams: c.streams.filter((_, si) => si !== streamIdx) } : c));
  };

  const addClass = () => {
    setClasses(prev => [...prev, { name: `Form ${prev.length + 1}`, streams: ["A"] }]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Classes & Streams</h2>
        <p className="text-muted-foreground mt-1">Define your classes and streams. You can adjust these later.</p>
      </div>

      <div className="space-y-3">
        {classes.map((cls, ci) => (
          <Card key={ci} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center">
                  <Users className="w-4 h-4 text-accent-foreground" />
                </div>
                <Input
                  value={cls.name}
                  onChange={e => setClasses(prev => prev.map((c, i) => i === ci ? { ...c, name: e.target.value } : c))}
                  className="h-8 w-32 font-medium"
                />
                <span className="text-xs text-muted-foreground">{cls.streams.length} streams</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {cls.streams.map((s, si) => (
                  <Badge key={si} variant="secondary" className="gap-1 pr-1">
                    {cls.name} {s}
                    <button onClick={() => removeStream(ci, si)} className="ml-1 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="New stream (e.g. D)"
                  className="h-8 w-40 text-sm"
                  value={newStream[ci] || ""}
                  onChange={e => setNewStream(prev => ({ ...prev, [ci]: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && addStream(ci)}
                />
                <Button variant="outline" size="sm" onClick={() => addStream(ci)}>
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="outline" onClick={addClass}>
        <Plus className="w-4 h-4 mr-2" /> Add Class Level
      </Button>
    </div>
  );
}
