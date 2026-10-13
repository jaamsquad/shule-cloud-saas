import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, Loader2, Save, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Owner portal → Settings: the Google Cloud OAuth client every school's "Connect Google
// Calendar" button uses. The client secret is never sent back to the browser — leave the
// field blank to keep the saved one.
export default function OwnerCalendarCard() {
    const qc = useQueryClient();
    const { data, isLoading } = useQuery<any>({ queryKey: ["owner_calendar"], queryFn: async () => (await api.get("/owner/calendar-settings")).data });
    const [f, setF] = useState<any>(null);
    const [busy, setBusy] = useState(false);
    useEffect(() => { if (data) setF({ clientId: data.clientId || "", clientSecret: "", redirectUri: data.redirectUri || "" }); }, [data]);

    const save = async () => {
        setBusy(true);
        try { await api.post("/owner/calendar-settings", f); toast.success("Google Calendar settings saved"); setF({ ...f, clientSecret: "" }); qc.invalidateQueries({ queryKey: ["owner_calendar"] }); }
        catch (e: any) { toast.error(e.response?.data?.message || "Could not save"); }
        finally { setBusy(false); }
    };

    if (isLoading || !f) return <Card><CardContent className="p-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading Google Calendar settings…</CardContent></Card>;
    const input = "w-full h-10 px-3 rounded-md border border-input bg-background text-sm";

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarDays className="w-5 h-5 text-primary" /> Google Calendar</CardTitle>
                <CardDescription>The OAuth client every school's "Connect Google Calendar" button uses to sync school events to an admin's Google Calendar. Create it once in Google Cloud Console (APIs &amp; Services → Credentials → OAuth client ID, type Web application) and paste the values here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                        {data.configured
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            : <XCircle className="w-4 h-4 text-amber-500 shrink-0" />}
                        <div>
                            <p className="text-sm font-semibold">{data.configured ? "Configured — schools can connect Google Calendar" : "Not configured yet"}</p>
                            <p className="text-xs text-muted-foreground">{data.hasSecret ? `Client secret saved (${data.secretHint})` : "Add a client ID, secret and redirect URI to turn this on."}</p>
                        </div>
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                    <label className="text-xs text-muted-foreground space-y-1"><span>Client ID</span>
                        <input value={f.clientId} onChange={e => setF({ ...f, clientId: e.target.value })} placeholder="xxxxxxxx.apps.googleusercontent.com" className={input} /></label>
                    <label className="text-xs text-muted-foreground space-y-1"><span>Client secret {data.hasSecret && "— leave blank to keep the saved one"}</span>
                        <input type="password" autoComplete="off" placeholder={data.hasSecret ? "••••••••••••" : "GOCSPX-…"} value={f.clientSecret} onChange={e => setF({ ...f, clientSecret: e.target.value })} className={input} /></label>
                    <label className="text-xs text-muted-foreground space-y-1 sm:col-span-2"><span>Redirect URI — must match an "Authorized redirect URI" in the Google Cloud OAuth client exactly</span>
                        <input value={f.redirectUri} onChange={e => setF({ ...f, redirectUri: e.target.value })} placeholder="https://api.yourschool.com/api/v1/calendar/google/callback" className={input} /></label>
                </div>

                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-1">
                    <span>Required scopes: <code className="text-foreground">openid email https://www.googleapis.com/auth/calendar.events</code></span>
                    <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary font-semibold ml-auto">Google Cloud Console <ExternalLink className="w-3 h-3" /></a>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                    <Button onClick={save} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Save</Button>
                </div>
            </CardContent>
        </Card>
    );
}
