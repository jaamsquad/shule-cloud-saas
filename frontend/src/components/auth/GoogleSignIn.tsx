import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

// "Continue with Google" using Google Identity Services. The owner sets the client id in
// the owner portal; when it is not set this renders nothing. `onCredential` receives the
// Google ID token, which the server verifies with Google.

declare global { interface Window { google?: any } }

let gisPromise: Promise<void> | null = null;
function loadGis(): Promise<void> {
    if (window.google?.accounts?.id) return Promise.resolve();
    if (gisPromise) return gisPromise;
    gisPromise = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.async = true; s.defer = true;
        s.onload = () => resolve();
        s.onerror = () => { gisPromise = null; reject(new Error("Could not load Google sign-in")); };
        document.head.appendChild(s);
    });
    return gisPromise;
}

export function useGoogleConfig() {
    return useQuery<{ enabled: boolean; clientId: string; twoFactorMode: string }>({
        queryKey: ["google_auth_config"],
        queryFn: async () => (await api.get("/auth/google/config")).data,
        staleTime: 10 * 60 * 1000,
        retry: false,
    });
}

export default function GoogleSignIn({ onCredential, text = "continue_with", width = 320, disabled }: {
    onCredential: (credential: string) => void;
    text?: "continue_with" | "signin_with" | "signup_with";
    width?: number;
    disabled?: boolean;
}) {
    const { data: cfg } = useGoogleConfig();
    const box = useRef<HTMLDivElement>(null);
    const cb = useRef(onCredential);
    cb.current = onCredential;
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!cfg?.enabled || !cfg.clientId || !box.current) return;
        let alive = true;
        loadGis().then(() => {
            if (!alive || !box.current || !window.google?.accounts?.id) return;
            window.google.accounts.id.initialize({
                client_id: cfg.clientId,
                callback: (r: any) => r?.credential && cb.current(r.credential),
                ux_mode: "popup",
                auto_select: false,
            });
            box.current.innerHTML = "";
            window.google.accounts.id.renderButton(box.current, { theme: "outline", size: "large", shape: "pill", text, width, logo_alignment: "left" });
        }).catch(() => alive && setFailed(true));
        return () => { alive = false; };
    }, [cfg?.enabled, cfg?.clientId, text, width]);

    if (!cfg?.enabled || !cfg.clientId) return null;
    if (failed) return <p className="text-[11px] text-gray-400 text-center">Google sign-in could not load. Check your connection.</p>;
    return <div className={`flex justify-center min-h-[44px] ${disabled ? "pointer-events-none opacity-50" : ""}`} ref={box} />;
}
