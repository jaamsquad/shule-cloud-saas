import { useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { PhoneOff, ChevronLeft, Wifi, Shield, User } from "lucide-react";

declare global {
    interface Window { JitsiMeetExternalAPI: any; }
}

export default function LiveRoom() {
    const { meetingId } = useParams<{ meetingId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<any>(null);

    const title    = searchParams.get("title") || "Live Class";
    // role: "moderator" (teacher/host) | "participant" | "viewer" (view-only student)
    const role     = searchParams.get("role") || "participant";
    const userName = searchParams.get("name") || (role === "moderator" ? "Teacher" : "Student");
    const isModerator = role === "moderator";
    const isViewer = role === "viewer" || searchParams.get("view") === "1";
    const roomName = `ShuleCloud-${meetingId}`;

    // Redirect back path depends on where they came from
    const returnPath = searchParams.get("return") || (
        role === "moderator" ? "/live"
        : searchParams.get("portal") === "student" ? "/student-portal/dashboard"
        : "/live"
    );

    useEffect(() => {
        const init = () => {
            if (!window.JitsiMeetExternalAPI || !containerRef.current) return;
            if (apiRef.current) { try { apiRef.current.dispose(); } catch (_) {} }

            apiRef.current = new window.JitsiMeetExternalAPI("meet.jit.si", {
                roomName,
                parentNode: containerRef.current,
                width: "100%",
                height: "100%",
                configOverwrite: {
                    startWithAudioMuted: !isModerator,
                    startWithVideoMuted: !isModerator,
                    // View-only students cannot turn on mic/camera or screen-share.
                    ...(isViewer ? {
                        disableInitialGUM: true,
                        readOnlyName: true,
                        startSilent: true,
                    } : {}),
                    enableClosePage: false,
                    disableDeepLinking: true,
                    prejoinPageEnabled: false,
                    // Moderator-specific settings
                    ...(isModerator ? {
                        startAsModerator: true,
                        enableLobbyChat: true,
                        disableInviteFunctions: false,
                    } : {
                        // Students wait for moderator
                        enableLobbyChat: false,
                    }),
                    toolbarButtons: isModerator
                        ? ["microphone","camera","closedcaptions","desktop","fullscreen","filmstrip","tileview","select-background","security","mute-everyone","hangup","chat","participants-pane","whiteboard","raisehand","recording"]
                        : isViewer
                            ? ["fullscreen","tileview","hangup","chat","raisehand"]
                            : ["microphone","camera","fullscreen","tileview","hangup","chat","raisehand"],
                },
                interfaceConfigOverwrite: {
                    SHOW_JITSI_WATERMARK: false,
                    SHOW_WATERMARK_FOR_GUESTS: false,
                    DEFAULT_REMOTE_DISPLAY_NAME: "Participant",
                    APP_NAME: "ShuleCloud Live",
                    NATIVE_APP_NAME: "ShuleCloud",
                    PROVIDER_NAME: "ShuleCloud",
                    DEFAULT_BACKGROUND: "#1a1a2e",
                    TOOLBAR_ALWAYS_VISIBLE: isModerator,
                },
                userInfo: {
                    displayName: userName,
                    // Prefix role for clarity
                    email: isModerator ? `moderator@shulecloud` : `student@shulecloud`,
                },
            });

            apiRef.current.on("readyToClose", () => navigate(returnPath));
            apiRef.current.on("videoConferenceLeft", () => navigate(returnPath));

            // Moderator: auto-grant moderator rights when participant joins
            if (isModerator) {
                apiRef.current.on("participantJoined", (e: any) => {
                    // Optionally auto-mute all incoming participants
                });
            }
        };

        if (window.JitsiMeetExternalAPI) {
            init();
        } else {
            const script = document.createElement("script");
            script.src = "https://meet.jit.si/external_api.js";
            script.async = true;
            script.onload = init;
            script.onerror = () => {
                if (containerRef.current) {
                    containerRef.current.innerHTML = `
                        <iframe
                            src="https://meet.jit.si/${roomName}#userInfo.displayName=${encodeURIComponent(userName)}"
                            allow="camera; microphone; fullscreen; display-capture; autoplay"
                            style="width:100%;height:100%;border:none;"
                            allowfullscreen
                        ></iframe>`;
                }
            };
            document.head.appendChild(script);
        }

        return () => {
            if (apiRef.current) { try { apiRef.current.dispose(); } catch (_) {} }
        };
    }, [roomName, isModerator, userName, navigate, returnPath]);

    const handleLeave = () => {
        if (apiRef.current) { try { apiRef.current.executeCommand("hangup"); } catch (_) {} }
        navigate(returnPath);
    };

    return (
        <div className="fixed inset-0 bg-[#1a1a2e] flex flex-col" style={{ zIndex: 9999 }}>
            {/* Header */}
            <div className="h-14 bg-black/50 backdrop-blur-md flex items-center justify-between px-6 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(returnPath)}
                        className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <p className="text-white font-black text-sm tracking-tight">{title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
                                Live · Room: {meetingId}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Role badge */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${isModerator ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"}`}>
                        {isModerator ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {isModerator ? "Host" : isViewer ? "View Only" : "Participant"} · {userName}
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                        <Wifi className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Connected</span>
                    </div>

                    <button onClick={handleLeave}
                        className="h-9 px-5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-rose-900/50">
                        <PhoneOff className="w-3.5 h-3.5" />
                        Leave
                    </button>
                </div>
            </div>

            {/* Jitsi frame */}
            <div ref={containerRef} className="flex-1 w-full overflow-hidden" />
        </div>
    );
}
