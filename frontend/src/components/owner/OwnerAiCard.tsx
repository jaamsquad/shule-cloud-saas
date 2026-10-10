import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, Loader2, Save, PlugZap, ExternalLink } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

// Owner portal → Settings: the AI assistant every school gets (Groq). The key is never
// sent back to the browser — leave the field blank to keep the saved one.
const MODELS = [
    { v: "llama-3.3-70b-versatile", t: "Llama 3.3 70B — best answers (recommended)" },
    { v: "llama-3.1-8b-instant", t: "Llama 3.1 8B — fastest, cheapest" },
    { v: "openai/gpt-oss-120b", t: "GPT-OSS 120B" },
    { v: "openai/gpt-oss-20b", t: "GPT-OSS 20B" },
];

export default function OwnerAiCard() {
    const qc = useQueryClient();
    const { data, isLoading } = useQuery<any>({ queryKey: ["owner_ai"], queryFn: async () => (await api.get("/owner/ai-settings")).data });
    const [f, setF] = useState<any>(null);
    const [busy, setBusy] = useState<"" | "save" | "test">("");
    useEffect(() => { if (data) setF({ enabled: data.enabled, apiKey: "", model: data.model, baseUrl: data.baseUrl, temperature: data.temperature, maxTokens: data.maxTokens, dailyLimit: data.dailyLimit }); }, [data]);

    const save = async () => {
        setBusy("save");
        try { await api.post("/owner/ai-settings", f); toast.success("AI settings saved"); setF({ ...f, apiKey: "" }); qc.invalidateQueries({ queryKey: ["owner_ai"] }); }
        catch (e: any) { toast.error(e.response?.data?.message || "Could not save"); }
        finally { setBusy(""); }
    };
    const test = async () => {
        setBusy("test");
        try { const r = await api.post("/owner/ai-settings/test", { apiKey: f.apiKey, model: f.model, baseUrl: f.baseUrl }); toast.success(r.data.message); }
        catch (e: any) { toast.error(e.response?.data?.message || "Connection failed"); }
        finally { setBusy(""); }
    };

    if (isLoading || !f) return <Card><CardContent className="p-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading AI settings…</CardContent></Card>;
    const input = "w-full h-10 px-3 rounded-md border border-input bg-background text-sm";
    const customModel = !MODELS.some(m => m.v === f.model);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> AI assistant (Groq)</CardTitle>
                <CardDescription>The chat assistant in the web app and ShuleCloud 360. It answers questions, drafts messages and reads live school data for admins and staff. Each school's administrator can still turn it off for their school.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                        <p className="text-sm font-semibold">Turn on for schools</p>
                        <p className="text-xs text-muted-foreground">{data.hasKey ? `Key saved (${data.keyHint})` : "Add a Groq API key to turn it on."}{data.schoolsOff ? ` · ${data.schoolsOff} school${data.schoolsOff === 1 ? "" : "s"} turned it off` : ""}</p>
                    </div>
                    <Switch checked={!!f.enabled} onCheckedChange={(v) => setF({ ...f, enabled: v })} />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                    <label className="text-xs text-muted-foreground space-y-1 sm:col-span-2"><span>Groq API key {data.hasKey && "— leave blank to keep the saved key"}</span>
                        <input type="password" autoComplete="off" placeholder={data.hasKey ? "••••••••••••" : "gsk_…"} value={f.apiKey} onChange={e => setF({ ...f, apiKey: e.target.value })} className={input} /></label>
                    <label className="text-xs text-muted-foreground space-y-1"><span>Model</span>
                        <select value={customModel ? "_custom" : f.model} onChange={e => setF({ ...f, model: e.target.value === "_custom" ? "" : e.target.value })} className={input}>
                            {MODELS.map(m => <option key={m.v} value={m.v}>{m.t}</option>)}
                            <option value="_custom">Other model…</option>
                        </select></label>
                    {customModel
                        ? <label className="text-xs text-muted-foreground space-y-1"><span>Model name</span><input value={f.model} onChange={e => setF({ ...f, model: e.target.value })} placeholder="e.g. llama-3.3-70b-versatile" className={input} /></label>
                        : <label className="text-xs text-muted-foreground space-y-1"><span>Daily limit per school (0 = no limit)</span><input type="number" min={0} value={f.dailyLimit} onChange={e => setF({ ...f, dailyLimit: e.target.value })} className={input} /></label>}
                    {customModel && <label className="text-xs text-muted-foreground space-y-1"><span>Daily limit per school (0 = no limit)</span><input type="number" min={0} value={f.dailyLimit} onChange={e => setF({ ...f, dailyLimit: e.target.value })} className={input} /></label>}
                    <label className="text-xs text-muted-foreground space-y-1"><span>Creativity (0 = precise, 1 = creative)</span>
                        <input type="number" min={0} max={1.5} step={0.1} value={f.temperature} onChange={e => setF({ ...f, temperature: e.target.value })} className={input} /></label>
                    <label className="text-xs text-muted-foreground space-y-1"><span>Longest answer (tokens)</span>
                        <input type="number" min={128} max={4096} step={64} value={f.maxTokens} onChange={e => setF({ ...f, maxTokens: e.target.value })} className={input} /></label>
                    <label className="text-xs text-muted-foreground space-y-1 sm:col-span-2"><span>API address (Groq by default; any OpenAI-compatible service works)</span>
                        <input value={f.baseUrl} onChange={e => setF({ ...f, baseUrl: e.target.value })} className={input} /></label>
                </div>

                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-1">
                    <span>Today: <b className="text-foreground">{data.today?.requests || 0}</b> questions</span>
                    <span><b className="text-foreground">{(data.today?.tokens || 0).toLocaleString()}</b> tokens</span>
                    <span><b className="text-foreground">{data.today?.schools || 0}</b> schools used it</span>
                    <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary font-semibold ml-auto">Get a Groq key <ExternalLink className="w-3 h-3" /></a>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" onClick={test} disabled={!!busy}>{busy === "test" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PlugZap className="w-4 h-4 mr-2" />} Test connection</Button>
                    <Button onClick={save} disabled={!!busy}>{busy === "save" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Save</Button>
                </div>
            </CardContent>
        </Card>
    );
}
