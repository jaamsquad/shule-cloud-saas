import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, Loader2, Save, ExternalLink } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

// Owner portal → Settings: how every school signs in (emailed codes + Continue with Google).
const MODES = [
    { v: "off", t: "Off", d: "Password only. Nobody is asked for a code." },
    { v: "optional", t: "Optional", d: "Each admin or staff member can turn it on in Account Settings." },
    { v: "required", t: "Required for admins", d: "Every sign-in to the admin app needs an emailed code." },
];

export default function OwnerSchoolAuthCard() {
    const qc = useQueryClient();
    const { data, isLoading } = useQuery<any>({ queryKey: ["owner_school_auth"], queryFn: async () => (await api.get("/owner/school-auth")).data });
    const [f, setF] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    useEffect(() => { if (data) setF({ twoFactorMode: data.twoFactorMode, otpMinutes: data.otpMinutes, trustDays: data.trustDays, googleEnabled: data.googleEnabled, googleClientId: data.googleClientId, googleExtraClientIds: (data.googleExtraClientIds || []).join("\n") }); }, [data]);

    const save = async () => {
        setSaving(true);
        try { await api.post("/owner/school-auth", f); toast.success("Sign-in security saved"); qc.invalidateQueries({ queryKey: ["owner_school_auth"] }); }
        catch (e: any) { toast.error(e.response?.data?.message || "Could not save"); }
        finally { setSaving(false); }
    };

    if (isLoading || !f) return <Card><CardContent className="p-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading sign-in security…</CardContent></Card>;
    const input = "w-full h-10 px-3 rounded-md border border-input bg-background text-sm";

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary" /> School sign-in security</CardTitle>
                <CardDescription>Two-step sign-in with an emailed code, and “Continue with Google” for every school user (web, teacher portal and teacher app).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <p className="text-sm font-semibold">Two-step sign-in (email code)</p>
                    <div className="grid sm:grid-cols-3 gap-2">
                        {MODES.map(m => (
                            <button key={m.v} type="button" onClick={() => setF({ ...f, twoFactorMode: m.v })}
                                className={`text-left rounded-lg border p-3 transition-colors ${f.twoFactorMode === m.v ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"}`}>
                                <p className="text-sm font-semibold">{m.t}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{m.d}</p>
                            </button>
                        ))}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 pt-1">
                        <label className="text-xs text-muted-foreground space-y-1"><span>Code valid for (minutes)</span>
                            <input type="number" min={3} max={30} value={f.otpMinutes} onChange={e => setF({ ...f, otpMinutes: e.target.value })} className={input} /></label>
                        <label className="text-xs text-muted-foreground space-y-1"><span>Remember a device for (days, 0 = never)</span>
                            <input type="number" min={0} max={90} value={f.trustDays} onChange={e => setF({ ...f, trustDays: e.target.value })} className={input} /></label>
                    </div>
                    <p className="text-xs text-muted-foreground">Codes are sent from each school's own email settings, or from Company email when a school has none.</p>
                </div>

                <div className="space-y-3 border-t pt-5">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-semibold">Continue with Google</p>
                            <p className="text-xs text-muted-foreground">People link their Google account once from their profile, then sign in with one click.</p>
                        </div>
                        <Switch checked={!!f.googleEnabled} onCheckedChange={v => setF({ ...f, googleEnabled: v })} />
                    </div>
                    <label className="block text-xs text-muted-foreground space-y-1"><span>OAuth Web client ID</span>
                        <input value={f.googleClientId} onChange={e => setF({ ...f, googleClientId: e.target.value })} placeholder="1234567890-abc.apps.googleusercontent.com" className={`${input} font-mono`} /></label>
                    <label className="block text-xs text-muted-foreground space-y-1"><span>Other client IDs allowed (Android / iOS apps, one per line — optional)</span>
                        <textarea rows={2} value={f.googleExtraClientIds} onChange={e => setF({ ...f, googleExtraClientIds: e.target.value })} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono" /></label>
                    <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                        <p className="font-semibold text-foreground">Setting up Google</p>
                        <p>1. In Google Cloud Console → APIs & Services → Credentials, create an <b>OAuth client ID</b> of type <b>Web application</b>.</p>
                        <p>2. Under <b>Authorised JavaScript origins</b> add every school address (e.g. https://*.yourdomain — add each school domain) and the teacher portal address.</p>
                        <p>3. For the teacher app, also create an <b>Android</b> client (package + SHA-1). The app uses the Web client ID above as its server client ID.</p>
                        <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary font-semibold">Open Google Cloud credentials <ExternalLink className="w-3 h-3" /></a>
                    </div>
                    {data?.stats && <p className="text-xs text-muted-foreground">{data.stats.linkedUsers} admin account(s) have linked Google · {data.stats.enabledUsers} turned on two-step sign-in.</p>}
                </div>

                <div className="flex justify-end">
                    <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Save</Button>
                </div>
            </CardContent>
        </Card>
    );
}
