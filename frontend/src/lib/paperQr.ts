import QRCode from "qrcode";
import api from "@/lib/api";

export interface PaperQrInput { paperId?: string; title?: string; subject?: string; className?: string; studentName?: string; admNo?: string }

/** A signed "scan to verify with the school" link for a printed paper, as a QR image (data URL).
 * Returns "" if it can't be made — the paper then prints without a QR. */
export async function paperQr(p: PaperQrInput): Promise<string> {
    try {
        const url = (await api.post("/qp/verify-link", p)).data?.url;
        return url ? await QRCode.toDataURL(url, { margin: 1, width: 160 }) : "";
    } catch { return ""; }
}
