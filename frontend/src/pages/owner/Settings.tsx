import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ShieldCheck, AlertCircle } from "lucide-react";

export default function OwnerSettings() {
    const queryClient = useQueryClient();

    const { data: settings, isLoading } = useQuery({
        queryKey: ["owner-settings"],
        queryFn: async () => {
            const res = await api.get("/owner/settings");
            return res.data;
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.patch("/owner/settings", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["owner-settings"] });
            toast.success("Settings updated");
        }
    });

    if (isLoading) return <div className="p-6">Loading settings...</div>;

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-heading font-bold">Global System Settings</h1>
                <p className="text-muted-foreground">Configure global platform behavior and security policies.</p>
            </div>

            <div className="grid gap-6 max-w-2xl">
                <Card className={settings?.maintenanceMode ? "border-destructive bg-destructive/5" : ""}>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <CardTitle className="flex items-center gap-2">
                                    <ShieldCheck className={`w-5 h-5 ${settings?.maintenanceMode ? 'text-destructive' : 'text-success'}`} />
                                    Maintenance Mode
                                </CardTitle>
                                <CardDescription>
                                    When enabled, all school portals will display a maintenance message.
                                </CardDescription>
                            </div>
                            <Switch
                                checked={settings?.maintenanceMode}
                                onCheckedChange={(checked) => updateMutation.mutate({ maintenanceMode: checked })}
                            />
                        </div>
                    </CardHeader>
                    {settings?.maintenanceMode && (
                        <CardContent>
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <p>System is currently blocking tenant traffic. Portal owners can still access their dashboards.</p>
                            </div>
                        </CardContent>
                    )}
                </Card>
            </div>
        </div>
    );
}
