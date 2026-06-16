import { useEffect, useRef, useState } from "react";
import { CameraOff } from "lucide-react";

/** Scans QR / barcodes from the device camera using the native BarcodeDetector API. */
export default function CameraScanner({ onScan }: { onScan: (code: string) => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState("");
    const last = useRef<{ code: string; t: number }>({ code: "", t: 0 });

    useEffect(() => {
        let stream: MediaStream | null = null;
        let raf = 0;
        let stopped = false;
        const Detector = (window as any).BarcodeDetector;

        const run = async () => {
            if (!Detector) { setError("Camera scanning isn't supported on this browser. Use a USB scanner or type the code."); return; }
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
                if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => { }); }
                const detector = new Detector({ formats: ["qr_code", "code_128", "ean_13", "ean_8", "code_39", "codabar", "upc_a", "data_matrix"] });
                const tick = async () => {
                    if (stopped || !videoRef.current) return;
                    try {
                        const codes = await detector.detect(videoRef.current);
                        if (codes?.length) {
                            const val = String(codes[0].rawValue || "").trim();
                            const now = Date.now();
                            if (val && (val !== last.current.code || now - last.current.t > 2500)) {
                                last.current = { code: val, t: now };
                                onScan(val);
                            }
                        }
                    } catch { /* frame not ready */ }
                    raf = requestAnimationFrame(tick);
                };
                raf = requestAnimationFrame(tick);
            } catch { setError("Could not access the camera. Check permissions."); }
        };
        run();
        return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach(t => t.stop()); };
    }, [onScan]);

    if (error) return <div className="text-center text-xs text-amber-600 font-bold py-8 flex flex-col items-center gap-2"><CameraOff className="w-8 h-8" />{error}</div>;
    return (
        <div className="relative rounded-2xl overflow-hidden bg-slate-900">
            <video ref={videoRef} className="w-full aspect-video object-cover" muted playsInline />
            <div className="absolute inset-0 m-8 border-2 border-emerald-400/70 rounded-xl pointer-events-none" />
            <p className="absolute bottom-2 inset-x-0 text-center text-[10px] font-black text-white/80 uppercase tracking-widest">Point the card's barcode/QR at the camera</p>
        </div>
    );
}
