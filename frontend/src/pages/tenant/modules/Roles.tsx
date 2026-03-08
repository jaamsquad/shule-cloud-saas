import AppHeader from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Shield, Plus } from "lucide-react";

const roles = [
  { name: "Head Teacher", users: 1, permissions: 42, custom: false },
  { name: "Deputy Academics", users: 1, permissions: 35, custom: false },
  { name: "Teacher", users: 52, permissions: 18, custom: false },
  { name: "Bursar", users: 2, permissions: 12, custom: false },
  { name: "Librarian", users: 1, permissions: 8, custom: false },
  { name: "School Nurse", users: 1, permissions: 6, custom: true },
  { name: "Class Teacher", users: 16, permissions: 22, custom: true },
  { name: "Parent", users: 890, permissions: 5, custom: false },
  { name: "Student", users: 1247, permissions: 4, custom: false },
];

export default function Roles() {
  return (
    <>
      <AppHeader title="Roles & Access Control" subtitle="Manage roles and permissions" />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="flex justify-end">
          <Button size="sm"><Plus className="w-4 h-4 mr-1.5" /> Create Role</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => (
            <Card key={role.name} className="shadow-card hover:shadow-card-hover transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
                      <Shield className="w-4 h-4 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{role.name}</p>
                      {role.custom && <span className="text-xs text-primary">Custom</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-6 text-sm">
                  <div>
                    <p className="text-lg font-bold text-foreground">{role.users}</p>
                    <p className="text-xs text-muted-foreground">Users</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{role.permissions}</p>
                    <p className="text-xs text-muted-foreground">Permissions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
