import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { X, Camera, ScanLine, SwitchCamera } from "lucide-react";

/**
 * Camera-based student card scanner. Reads the QR/barcode printed on a student's
 * card (which encodes their REGISTRATION NUMBER) and calls onScan with the raw
 * decoded text. The parent matches it to the roster and marks the student Present.
 *
 * A short cooldown prevents the same card firing repeatedly while it stays in view.
 */
export default function CardScanner({ onScan, onClose }: { onScan: (value: string) => void; onClose: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const controlsRef = useRef<IScannerControls | null>(null);
    const lastRef = useRef<{ value: string; at: number }>({ value: "", at: 0 });
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [deviceIndex, setDeviceIndex] = useState(0);
    const [error, setError] = useState("");
    const [lastHit, setLastHit] = useState("");

    // Enumerate cameras once (needs a permission grant, which start() triggers).
    useEffect(() => {
        let active = true;
        BrowserMultiFormatReader.listVideoInputDevices()
            .then((d) => { if (active) setDevices(d); })
            .catch(() => { /* enumerated after first start */ });
        return () => { active = false; };
    }, []);

    // (Re)start decoding whenever the chosen camera changes.
    useEffect(() => {
        const reader = new BrowserMultiFormatReader();
        let stopped = false;
        const deviceId = devices[deviceIndex]?.deviceId;

        reader.decodeFromVideoDevice(deviceId, videoRef.current!, (result) => {
            if (stopped || !result) return;
            const value = result.getText().trim();
            const now = Date.now();
            // Debounce: ignore the same value within 2.5s.
            if (value && !(lastRef.current.value === value && now - lastRef.current.at < 2500)) {
                lastRef.current = { value, at: now };
                setLastHit(value);
                onScan(value);
            }
        }).then((controls) => {
            if (stopped) { controls.stop(); return; }
            controlsRef.current = controls;
            // Cameras are known only after permission is granted — refresh the list.
            if (devices.length === 0) {
                BrowserMultiFormatReader.listVideoInputDevices().then(setDevices).catch(() => {});
            }
        }).catch((e) => {
            setError(e?.message || "Could not access the camera. Grant camera permission and use HTTPS.");
        });

        return () => { stopped = true; controlsRef.current?.stop(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deviceIndex, devices.length]);

    const switchCamera = () => { if (devices.length > 1) setDeviceIndex((i) => (i + 1) % devices.length); };

    return (
        <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-4 py-3 bg-[#0f5132] text-white">
                    <span className="font-black text-sm flex items-center gap-2"><Camera className="w-4 h-4" /> Scan Student Card</span>
                    <div className="flex items-center gap-2">
                        {devices.length > 1 && (
                            <button onClick={switchCamera} title="Switch camera" className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center"><SwitchCamera className="w-4 h-4" /></button>
                        )}
                        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center"><X className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="relative bg-black aspect-square">
                    <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                    {/* Aim reticle */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="w-2/3 aspect-square border-2 border-white/80 rounded-2xl relative">
                            <ScanLine className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto w-full h-8 text-emerald-400 opacity-70 animate-pulse" />
                        </div>
                    </div>
                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6 text-center">
                            <p className="text-rose-200 text-sm font-semibold">{error}</p>
                        </div>
                    )}
                </div>

                <div className="px-4 py-3 text-center">
                    <p className="text-xs text-slate-500">Point the camera at the QR/barcode on the student's card.</p>
                    {lastHit && <p className="text-[11px] font-bold text-emerald-600 mt-1">Last scanned: {lastHit}</p>}
                </div>
            </div>
        </div>
    );
}
