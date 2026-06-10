import { X, ExternalLink, FileText } from "lucide-react";

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

const isPdf = (src?: string, name?: string) => (name || "").toLowerCase().endsWith(".pdf") || (src || "").startsWith("data:application/pdf");
const isImage = (src?: string, name?: string) => /^data:image\//.test(src || "") || /\.(png|jpe?g|gif|webp|bmp)$/i.test(name || "");

interface Props { open: boolean; onClose: () => void; src?: string; name?: string; title?: string }

export default function FileViewer({ open, onClose, src, name, title }: Props) {
    if (!open || !src) return null;
    const pdf = isPdf(src, name);
    const img = isImage(src, name);
    const external = /^https?:\/\//.test(src);

    return (
        <div className="fixed inset-0 bg-black/70 z-[300] flex flex-col items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-lg shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "92vh" }}>
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                    <p className="text-sm font-bold text-slate-700 truncate flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400" /> {title || name || "Document"}</p>
                    <div className="flex items-center gap-2">
                        <a href={src} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-white">
                            <ExternalLink className="w-3.5 h-3.5" /> Open
                        </a>
                        <button onClick={onClose} className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><X className="w-4 h-4" /></button>
                    </div>
                </div>
                <div className="flex-1 bg-slate-100 overflow-auto flex items-center justify-center" style={{ minHeight: "60vh" }}>
                    {img ? (
                        <img src={src} alt={name} className="max-w-full max-h-full object-contain" />
                    ) : (pdf || external) ? (
                        <iframe title="document" src={src} className="w-full h-full" style={{ border: 0, minHeight: "70vh" }} />
                    ) : (
                        <div className="text-center text-slate-500 text-sm p-8">
                            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                            Preview not available. <a href={src} target="_blank" rel="noreferrer" className="underline font-bold">Open / download</a>.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
