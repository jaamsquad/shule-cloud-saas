import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { liveClass } from "@/lib/liveClassApi";
import { toast } from "sonner";

declare global {
  interface Window { JitsiMeetExternalAPI: any }
}

/**
 * In-app meeting room. Resolves the join info from the backend (provider-agnostic):
 *  - Jitsi → mounts the Jitsi external-API iframe in-app.
 *  - BigBlueButton → redirects the iframe to the signed BBB join URL.
 * On leave, reports back to record attendance.
 */
export default function MeetingRoom() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const role = params.get("role") === "moderator" ? "moderator" : "attendee";
  const name = params.get("name") || "Participant";
  const returnPath = params.get("return") || (role === "moderator" ? "/live-classes" : "/lms");

  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const leave = () => { liveClass.leave(id!, { displayName: name }).catch(() => {}); navigate(returnPath); };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const action = role === "moderator" ? liveClass.start(id!) : liveClass.join(id!, { displayName: name, role });
        const info: any = await action;
        if (cancelled) return;

        if (info.embed === "jitsi") {
          mountJitsi(info);
        } else if (info.joinUrl) {
          // BigBlueButton (or any redirect provider) — load it in the iframe.
          if (containerRef.current) {
            containerRef.current.innerHTML = `<iframe allow="camera; microphone; fullscreen; display-capture; autoplay" style="width:100%;height:100%;border:0" src="${info.joinUrl}"></iframe>`;
          }
          setLoading(false);
        } else {
          setError("The meeting could not be opened.");
          setLoading(false);
        }
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.response?.data?.message || "Could not join the class.");
        setLoading(false);
      }
    })();
    return () => { cancelled = true; try { apiRef.current?.dispose(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const mountJitsi = (info: { roomName: string; domain: string; jwt?: string }) => {
    const start = () => {
      if (!window.JitsiMeetExternalAPI || !containerRef.current) return;
      apiRef.current = new window.JitsiMeetExternalAPI(info.domain, {
        roomName: info.roomName,
        parentNode: containerRef.current,
        jwt: info.jwt,
        userInfo: { displayName: name },
        configOverwrite: { startWithAudioMuted: role !== "moderator", prejoinPageEnabled: false, disableDeepLinking: true },
        interfaceConfigOverwrite: { MOBILE_APP_PROMO: false },
      });
      apiRef.current.addEventListener("videoConferenceLeft", leave);
      apiRef.current.addEventListener("readyToClose", leave);
      setLoading(false);
    };
    if (window.JitsiMeetExternalAPI) start();
    else {
      const s = document.createElement("script");
      s.src = `https://${info.domain}/external_api.js`;
      s.onload = start;
      s.onerror = () => { setError("Could not load the meeting engine."); setLoading(false); };
      document.body.appendChild(s);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[300] flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1333] text-white">
        <button onClick={leave} className="flex items-center gap-2 text-sm font-bold"><ArrowLeft className="w-4 h-4" /> Leave</button>
        <span className="text-xs text-white/60">{role === "moderator" ? "Hosting" : "In class"} · {name}</span>
      </div>
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
            <Loader2 className="w-8 h-8 animate-spin" /> <span className="text-sm">Connecting to the class…</span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
            <p className="text-sm text-rose-300">{error}</p>
            <button onClick={() => navigate(returnPath)} className="px-5 py-2 rounded-full bg-white/10 text-sm font-bold">Go back</button>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
