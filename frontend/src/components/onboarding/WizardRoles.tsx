import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

const defaultRoles = [
  { name: "Head Teacher", permissions: 42, enabled: true, builtin: true },
  { name: "Deputy Academics", permissions: 35, enabled: true, builtin: true },
  { name: "Deputy Administration", permissions: 30, enabled: true, builtin: true },
  { name: "HOD", permissions: 25, enabled: true, builtin: true },
  { name: "Teacher", permissions: 18, enabled: true, builtin: true },
  { name: "Class Teacher", permissions: 22, enabled: true, builtin: true },
  { name: "Exams Officer", permissions: 15, enabled: true, builtin: true },
  { name: "Bursar", permissions: 12, enabled: true, builtin: true },
  { name: "Librarian", permissions: 8, enabled: true, builtin: true },
  { name: "School Nurse", permissions: 6, enabled: true, builtin: true },
  { name: "ICT Admin", permissions: 20, enabled: true, builtin: true },
  { name: "Security/Gate", permissions: 4, enabled: false, builtin: true },
  { name: "Parent", permissions: 5, enabled: true, builtin: true },
  { name: "Student", permissions: 4, enabled: true, builtin: true },
];

export default function WizardRoles() {
  const [roles, setRoles] = useState(defaultRoles);

  const toggle = (idx: number) => {
    setRoles(prev => prev.map((r, i) => i === idx ? { ...r, enabled: !r.enabled } : r));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Roles & Permissions</h2>
        <p className="text-muted-foreground mt-1">Enable the roles your school needs. You can customize permissions later.</p>
      </div>

      <div className="space-y-2">
        {roles.map((role, i) => (
          <div key={role.name} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center">
                <Shield className="w-4 h-4 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{role.name}</p>
                <p className="text-xs text-muted-foreground">{role.permissions} default permissions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {role.builtin && <Badge variant="outline" className="text-xs">Built-in</Badge>}
              <Switch checked={role.enabled} onCheckedChange={() => toggle(i)} />
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">{roles.filter(r => r.enabled).length} roles enabled</p>
    </div>
  );
}
