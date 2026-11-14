import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";

/**
 * Real-time username uniqueness checker.
 * Debounces the API call and returns availability status.
 *
 * @param username  The username to check
 * @param excludeId The ID of the current record (exclude from conflict check)
 * @param excludeType  'student' | 'staff' | 'parent'
 * @param enabled  Whether to run the check (skip when empty or unchanged)
 */
export function useUsernameCheck(
    username: string,
    excludeId: string,
    excludeType: "student" | "staff" | "parent",
    enabled = true
) {
    const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
    const [message, setMessage] = useState<string>("");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!enabled || !username || username.length < 2) {
            setStatus("idle");
            setMessage("");
            return;
        }

        setStatus("checking");

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            try {
                const r = await api.get("/auth/check-username", {
                    params: { username, excludeId, excludeType },
                });
                if (r.data.available) {
                    setStatus("available");
                    setMessage("Username is available");
                } else {
                    setStatus("taken");
                    setMessage(r.data.message || "Username is already taken");
                }
            } catch (_) {
                setStatus("idle");
                setMessage("");
            }
        }, 500);

        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [username, excludeId, excludeType, enabled]);

    return { status, message };
}
