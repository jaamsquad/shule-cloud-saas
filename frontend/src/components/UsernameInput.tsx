import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import api from "@/lib/api";

interface Props {
    value: string;
    onChange: (v: string) => void;
    excludeId: string;
    excludeType: "student" | "staff" | "parent";
    placeholder?: string;
    className?: string;
}

/**
 * A username input that shows real-time availability status.
 * Each instance is independent and debounces the API check by 500ms.
 */
export default function UsernameInput({ value, onChange, excludeId, excludeType, placeholder, className }: Props) {
    const [status, setStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
    const [message, setMessage] = useState("");
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!value || value.length < 2) { setStatus("idle"); setMessage(""); return; }

        setStatus("checking");
        if (debounce.current) clearTimeout(debounce.current);

        debounce.current = setTimeout(async () => {
            try {
                const r = await api.get("/auth/check-username", {
                    params: { username: value, excludeId, excludeType },
                });
                if (r.data.available) {
                    setStatus("ok");
                    setMessage("Available");
                } else {
                    setStatus("taken");
                    setMessage(r.data.message || "Already taken");
                }
            } catch {
                setStatus("idle");
                setMessage("");
            }
        }, 500);

        return () => { if (debounce.current) clearTimeout(debounce.current); };
    }, [value, excludeId, excludeType]);

    const borderColor =
        status === "ok" ? "border-emerald-400 focus:border-emerald-500" :
        status === "taken" ? "border-rose-400 focus:border-rose-500" :
        "border-slate-200 focus:border-[#5C67F2]";

    return (
        <div className="space-y-0.5">
            <div className="relative">
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder || "Set username..."}
                    className={`w-full h-9 px-3 pr-8 border rounded-xl focus:outline-none text-xs font-bold text-slate-700 transition-colors ${borderColor} ${className || ""}`}
                />
                {/* Status icon */}
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    {status === "checking" && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                    {status === "ok"       && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    {status === "taken"    && <XCircle className="w-3.5 h-3.5 text-rose-500" />}
                </div>
            </div>
            {/* Inline message */}
            {status === "taken" && (
                <p className="text-[9px] font-black text-rose-500 uppercase tracking-wide flex items-center gap-1 pl-1">
                    ✕ {message}
                </p>
            )}
            {status === "ok" && (
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-wide flex items-center gap-1 pl-1">
                    ✓ {message}
                </p>
            )}
        </div>
    );
}
