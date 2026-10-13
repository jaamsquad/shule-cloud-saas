import { useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import { X, ExternalLink, FileText, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, Download } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
// Vite bundles the worker as a static asset and gives us its final URL — this is what
// lets PDF.js render pages on its own thread without a separate server/CDN dependency,
// so it works the same in the web app, the staff/student portals and the 360 mobile webview.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export const MAX_FILE_MB = 2;

/** Validate size (≤ maxMB) and read a file as a base64 data URL. */
export function readFileLimited(file: File, maxMB = MAX_FILE_MB): Promise<{ data: string; name: string; type: string }> {
    return new Promise((resolve, reject) => {
        if (file.size > maxMB * 1024 * 1024) { reject(new Error(`File is too large. Maximum ${maxMB}MB.`)); return; }
        const r = new FileReader();
        r.onerror = () => reject(new Error("Could not read the file"));
        r.onloadend = () => resolve({ data: r.result as string, name: file.name, type: file.type });
        r.readAsDataURL(file);
    });
}

const isPdf = (src?: string, name?: string) => (name || "").toLowerCase().endsWith(".pdf") || (src || "").startsWith("data:application/pdf") || /\.pdf(\?|#|$)/i.test(src || "");
const isImage = (src?: string, name?: string) => /^data:image\//.test(src || "") || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(name || src || "");

const dataUriToBytes = (dataUri: string): Uint8Array => {
    const base64 = dataUri.slice(dataUri.indexOf(",") + 1);
    const bin = atob(base64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
};

/** Pinch-to-zoom + double-tap-to-zoom on a scrollable surface — shared by the PDF and
 *  image viewers so both feel native on a phone without any extra library. */
function usePinchZoom(min = 0.5, max = 4) {
    const [scale, setScale] = useState(1);
    const pinch = useRef<{ dist: number; scale: number } | null>(null);
    const lastTap = useRef(0);
    const clamp = (s: number) => Math.min(max, Math.max(min, s));
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    const onTouchStart = (e: ReactTouchEvent) => {
        if (e.touches.length === 2) {
            pinch.current = { dist: dist(e.touches as any), scale };
        } else if (e.touches.length === 1) {
            const now = Date.now();
            if (now - lastTap.current < 300) setScale(s => clamp(s > 1 ? 1 : 2));
            lastTap.current = now;
        }
    };
    const onTouchMove = (e: ReactTouchEvent) => {
        if (e.touches.length === 2 && pinch.current) {
            e.preventDefault();
            const ratio = dist(e.touches as any) / pinch.current.dist;
            setScale(clamp(pinch.current.scale * ratio));
        }
    };
    const onTouchEnd = (e: ReactTouchEvent) => { if (e.touches.length < 2) pinch.current = null; };

    return { scale, setScale: (s: number) => setScale(clamp(s)), bind: { onTouchStart, onTouchMove, onTouchEnd } };
}

const ZoomBar = ({ scale, setScale, onReset }: { scale: number; setScale: (s: number) => void; onReset: () => void }) => (
    <div className="flex items-center gap-1 bg-black/60 rounded-full px-1.5 py-1">
        <button onClick={() => setScale(scale - 0.25)} className="w-7 h-7 rounded-full flex items-center justify-center text-white hover:bg-white/10"><ZoomOut className="w-3.5 h-3.5" /></button>
        <button onClick={onReset} className="text-[10px] font-bold text-white/80 w-10 text-center">{Math.round(scale * 100)}%</button>
        <button onClick={() => setScale(scale + 0.25)} className="w-7 h-7 rounded-full flex items-center justify-center text-white hover:bg-white/10"><ZoomIn className="w-3.5 h-3.5" /></button>
    </div>
);

/** Renders a PDF entirely in-app (canvas pages via PDF.js) — no external viewer/app is
 *  ever launched, which is what makes this reliable on a phone (mobile browsers often
 *  can't show a PDF inline in an <iframe> and instead bounce out to a separate app/tab). */
function PdfView({ src }: { src: string }) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const docRef = useRef<any>(null);
    const renderToken = useRef(0);
    const [numPages, setNumPages] = useState(0);
    const [page, setPage] = useState(1);
    const [fitWidth, setFitWidth] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { scale, setScale, bind } = usePinchZoom(0.5, 4);

    useEffect(() => {
        let cancelled = false;
        setLoading(true); setError(null); docRef.current = null;
        const source = src.startsWith("data:") ? { data: dataUriToBytes(src) } : { url: src };
        pdfjsLib.getDocument(source).promise.then((doc: any) => {
            if (cancelled) return;
            docRef.current = doc; setNumPages(doc.numPages); setPage(1); setLoading(false);
        }).catch(() => { if (!cancelled) { setError("Could not load this PDF."); setLoading(false); } });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    useEffect(() => {
        if (!docRef.current || !canvasRef.current) return;
        const myToken = ++renderToken.current;
        let renderTask: any = null;
        (async () => {
            const pdfPage = await docRef.current.getPage(page);
            if (myToken !== renderToken.current) return;
            const base = pdfPage.getViewport({ scale: 1 });
            const containerWidth = Math.max(240, (wrapRef.current?.clientWidth || 360) - 24);
            const fit = containerWidth / base.width;
            setFitWidth(fit);
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            const viewport = pdfPage.getViewport({ scale: fit * scale * dpr });
            const canvas = canvasRef.current; if (!canvas) return;
            canvas.width = viewport.width; canvas.height = viewport.height;
            canvas.style.width = `${viewport.width / dpr}px`; canvas.style.height = `${viewport.height / dpr}px`;
            const ctx = canvas.getContext("2d"); if (!ctx) return;
            renderTask = pdfPage.render({ canvasContext: ctx, viewport });
            await renderTask.promise.catch(() => {});
        })();
        return () => { try { renderTask?.cancel(); } catch { /* already done */ } };
    }, [page, scale, numPages]);

    if (error) return <PreviewFallback src={src} message={error} />;
    return (
        <div className="flex-1 min-h-0 flex flex-col bg-slate-200">
            <div ref={wrapRef} {...bind} className="flex-1 min-h-0 overflow-auto flex items-start justify-center p-3 touch-pan-y" style={{ touchAction: scale > 1 ? "none" : "pan-y" }}>
                {loading ? (
                    <div className="h-full flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : (
                    <canvas ref={canvasRef} className="shadow-md bg-white" />
                )}
            </div>
            {!loading && numPages > 0 && (
                <div className="flex items-center justify-center gap-3 py-2.5 px-3 bg-black/80 flex-wrap">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="w-8 h-8 rounded-full flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/10"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-[11px] font-bold text-white/90 tabular-nums">Page {page} / {numPages}</span>
                    <button onClick={() => setPage(p => Math.min(numPages, p + 1))} disabled={page >= numPages} className="w-8 h-8 rounded-full flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/10"><ChevronRight className="w-4 h-4" /></button>
                    <ZoomBar scale={scale} setScale={setScale} onReset={() => setScale(1)} />
                </div>
            )}
            <p className="sr-only">{fitWidth}</p>
        </div>
    );
}

/** Pinch/double-tap zoomable image, scrollable when zoomed in. */
function ImageView({ src, name }: { src: string; name?: string }) {
    const { scale, setScale, bind } = usePinchZoom(1, 5);
    return (
        <div {...bind} className="flex-1 min-h-0 overflow-auto bg-slate-900 flex items-center justify-center" style={{ touchAction: scale > 1 ? "none" : "pan-y" }}>
            <img src={src} alt={name} draggable={false} className="select-none transition-transform duration-75" style={{ maxWidth: scale <= 1 ? "100%" : "none", maxHeight: scale <= 1 ? "100%" : "none", transform: `scale(${scale})`, transformOrigin: "center" }} />
        </div>
    );
}

function PreviewFallback({ src, message }: { src: string; message?: string }) {
    return (
        <div className="flex-1 flex items-center justify-center text-center text-slate-500 text-sm p-8">
            <div>
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                {message || "Preview not available."} <a href={src} target="_blank" rel="noreferrer" className="underline font-bold">Open / download</a>.
            </div>
        </div>
    );
}

interface Props { open: boolean; onClose: () => void; src?: string; name?: string; title?: string }

export default function FileViewer({ open, onClose, src, name, title }: Props) {
    if (!open || !src) return null;
    const pdf = isPdf(src, name);
    const img = isImage(src, name);
    const external = !pdf && !img && /^https?:\/\//.test(src);

    return (
        <div className="fixed inset-0 bg-black/80 z-[300] flex flex-col sm:items-center sm:justify-center sm:p-4">
            <div className="bg-white w-full sm:max-w-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col flex-1 sm:flex-none" style={{ maxHeight: "100dvh", height: "100dvh" }}>
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50 shrink-0">
                    <p className="text-sm font-bold text-slate-700 truncate flex items-center gap-2 min-w-0"><FileText className="w-4 h-4 text-slate-400 shrink-0" /> <span className="truncate">{title || name || "Document"}</span></p>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <a href={src} download={name} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100" title="Download"><Download className="w-4 h-4" /></a>
                        <a href={src} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100" title="Open in a new tab"><ExternalLink className="w-4 h-4" /></a>
                        <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200"><X className="w-4 h-4" /></button>
                    </div>
                </div>
                {pdf ? <PdfView src={src} /> : img ? <ImageView src={src} name={name} /> : external ? (
                    <iframe title="document" src={src} className="w-full flex-1 min-h-0" style={{ border: 0 }} />
                ) : <PreviewFallback src={src} />}
            </div>
        </div>
    );
}
