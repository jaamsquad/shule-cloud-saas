import QRCode from "qrcode";
import api from "@/lib/api";

export interface ReportQrInput { studentId: string; className?: string; term?: string; year?: string; exam?: string; average?: number | null; grade?: string }

/** A signed verification link for a report card, as a QR image (data URL). Returns "" if it can't be made — the card then prints without a QR. */
export async function reportQr(p: ReportQrInput): Promise<string> {
    try {
        if (!p.studentId) return "";
        const url = (await api.post("/reports/verify-link", p)).data?.url;
        return url ? await QRCode.toDataURL(url, { margin: 1, width: 200 }) : "";
    } catch { return ""; }
}
