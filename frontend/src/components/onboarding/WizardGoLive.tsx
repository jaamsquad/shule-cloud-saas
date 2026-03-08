import { Check, Circle, AlertCircle, Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const checklist = [
  { label: "School profile completed", done: true },
  { label: "School branding uploaded", done: true },
  { label: "Academic calendar configured", done: true },
  { label: "Classes & streams created", done: true },
  { label: "CBC learning areas selected", done: true },
  { label: "Roles enabled", done: true },
  { label: "Fee structure configured", done: true },
  { label: "Staff imported/invited", done: false, optional: true },
  { label: "Students admitted", done: false, optional: true },
];

export default function WizardGoLive() {
  const required = checklist.filter(c => !c.optional);
  const requiredDone = required.filter(c => c.done).length;
  const allRequiredDone = requiredDone === required.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl gradient-gold flex items-center justify-center mx-auto mb-4">
          <Rocket className="w-8 h-8 text-secondary-foreground" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Ready to Launch!</h2>
        <p className="text-muted-foreground mt-1">Review your setup checklist before going live.</p>
      </div>

      <Card className="shadow-card max-w-md mx-auto">
        <CardContent className="p-5 space-y-3">
          {checklist.map(item => (
            <div key={item.label} className="flex items-center gap-3">
              {item.done ? (
                <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-success" />
                </div>
              ) : item.optional ? (
                <div className="w-6 h-6 rounded-full bg-warning/10 flex items-center justify-center">
                  <Circle className="w-3.5 h-3.5 text-warning" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                </div>
              )}
              <span className={`text-sm ${item.done ? "text-foreground" : "text-muted-foreground"}`}>
                {item.label}
                {item.optional && <span className="text-xs text-muted-foreground ml-1">(optional)</span>}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">
          {allRequiredDone
            ? "All required steps are complete. You're ready to go live!"
            : `${requiredDone}/${required.length} required steps complete.`
          }
        </p>
        <p className="text-xs text-muted-foreground">Your school portal will be live at <span className="font-mono text-primary">kingshigh.app.shulecloud.co.ke</span></p>
      </div>
    </div>
  );
}
