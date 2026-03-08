import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Bell } from "lucide-react";

export default function OwnerAnnouncements() {
    const { data: announcements = [], isLoading } = useQuery({
        queryKey: ["owner-announcements"],
        queryFn: async () => {
            const res = await api.get("/owner/announcements");
            return res.data;
        }
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-heading font-bold">Platform Announcements</h1>
                    <p className="text-muted-foreground">Broadcast messages to all schools or specific tenants.</p>
                </div>
                <Button><Plus className="w-4 h-4 mr-2" /> New Broadcast</Button>
            </div>

            <div className="grid gap-4">
                {isLoading ? (
                    <p>Loading...</p>
                ) : announcements.length === 0 ? (
                    <Card>
                        <CardContent className="py-10 text-center text-muted-foreground">
                            <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No active announcements broadcasted.</p>
                        </CardContent>
                    </Card>
                ) : (
                    announcements.map((a: any) => (
                        <Card key={a.id}>
                            <CardHeader>
                                <CardTitle>{a.title}</CardTitle>
                                <p className="text-sm text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</p>
                            </CardHeader>
                            <CardContent>
                                <p>{a.content}</p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
