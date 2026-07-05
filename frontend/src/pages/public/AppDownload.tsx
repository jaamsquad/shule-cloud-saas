import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, QrCode, Smartphone } from "lucide-react";
import { NAVY, TEAL } from "./MarketingChrome";

// The two downloadable Android apps. QR codes are generated from these exact URLs.
export const APPS = {
    school: {
        name: "ShuleCloud School App",
        tagline: "Parents, students & staff — everything on the go.",
        url: "https://github.com/Muzamilafey/mandera-soft-pos-releases/releases/download/cloud-app/app-release.apk",
    },
    sms: {
        name: "ShuleCloud SMS Gateway",
        tagline: "Turn an Android phone into your school's SMS gateway.",
        url: "https://github.com/Muzamilafey/mandera-soft-pos-releases/releases/download/sms-app/shulecloud-sms.apk",
    },
} as const;

// True on phones/tablets — those get a straight download button (no point showing a
// QR to scan with the same device). Desktops get a button AND a scannable QR.
const useIsMobile = () => {
    const [mobile, setMobile] = useState(false);
    useEffect(() => {
        const ua = navigator.userAgent || "";
        const byUA = /Android|iPhone|iPad|iPod|Windows Phone|Mobile/i.test(ua);
        const byWidth = window.matchMedia("(max-width: 767px)").matches;
        setMobile(byUA || byWidth);
    }, []);
    return mobile;
};

// Generates a QR data-URL for any text (offline, no external service).
const useQr = (text: string) => {
    const [src, setSrc] = useState("");
    useEffect(() => {
        let active = true;
        QRCode.toDataURL(text, { width: 240, margin: 1, color: { dark: NAVY, light: "#ffffff" } })
            .then((d) => { if (active) setSrc(d); })
            .catch(() => { if (active) setSrc(""); });
        return () => { active = false; };
    }, [text]);
    return src;
};

function AppCard({ app, accent }: { app: { name: string; tagline: string; url: string }; accent: string }) {
    const isMobile = useIsMobile();
    const qr = useQr(app.url);
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="relative bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col transition-shadow hover:shadow-lg"
        >
            <div className="flex items-center gap-3 mb-2">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: accent }}>
                    <Smartphone className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-black text-base leading-tight" style={{ color: NAVY }}>{app.name}</h3>
                    <p className="text-xs text-slate-500">{app.tagline}</p>
                </div>
            </div>

            <a
                href={app.url}
                download
                className="mt-4 inline-flex items-center justify-center gap-2 px-5 py-3 font-bold text-white rounded-lg transition-transform hover:-translate-y-0.5"
                style={{ background: accent }}
            >
                <Download className="w-4 h-4" /> Download APK
            </a>

            {/* Desktop only: show a hint, and reveal a scannable QR on hover. On mobile
                the QR is pointless (same device), so we hide it entirely. */}
            {!isMobile && (
                <>
                    <p className="mt-3 text-[11px] font-bold text-slate-400 flex items-center justify-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5" /> Hover to scan with your phone
                    </p>
                    <div
                        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-3 z-20 transition-all duration-200 ${hovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
                    >
                        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-3 w-max">
                            {qr
                                ? <img src={qr} alt={`QR to download ${app.name}`} className="w-40 h-40" />
                                : <div className="w-40 h-40 flex items-center justify-center text-slate-300"><QrCode className="w-10 h-10" /></div>}
                            <p className="text-center text-[10px] font-black uppercase tracking-wide mt-1.5" style={{ color: accent }}>Scan to download</p>
                            {/* little pointer */}
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-3 h-3 bg-white border-r border-b border-slate-100 rotate-45 -mt-1.5" />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default function AppDownloadSection() {
    return (
        <section className="max-w-5xl mx-auto px-6 py-16">
            <div className="text-center mb-10">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide px-3 py-1.5 rounded-full mb-4" style={{ background: "#e6f4ee", color: TEAL }}>
                    <Smartphone className="w-3.5 h-3.5" /> Mobile Apps
                </span>
                <h2 className="text-3xl md:text-4xl font-black mb-2" style={{ color: NAVY, fontFamily: "'Poppins', sans-serif" }}>Get the Apps</h2>
                <p className="text-slate-500 max-w-xl mx-auto">Download the ShuleCloud Android apps. On a computer, hover a card to reveal a QR code you can scan with your phone.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
                <AppCard app={APPS.school} accent={TEAL} />
                <AppCard app={APPS.sms} accent={NAVY} />
            </div>
        </section>
    );
}
