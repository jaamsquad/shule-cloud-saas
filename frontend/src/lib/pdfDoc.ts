// Central document output for prints / "view in PDF".
//
// Every report in the app builds a full HTML document string and historically did
//   window.open("", "_blank"); w.document.write(html); w.print();
// That popup+print path is unreliable inside the Android WebView (popups blocked,
// window.print() unimplemented, image-load races). So we funnel ALL of it through
// outputHtmlDoc():
//   • On desktop browsers → keep the familiar print window.
//   • Inside the mobile app → render the SAME html off-screen, rasterise it with
//     html2canvas-pro and build a real multi-page PDF with jsPDF, then trigger a
//     blob download. The native app's anchor-click bridge catches the blob and
//     saves + opens it in the device's PDF viewer.
//
// Because the three shared print libs and the inline report pages all route here,
// fixing this one file fixes printing across the whole app.

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";

/** True when running inside the ShuleCloud Android wrapper (custom UA marker). */
export function isMobileApp(): boolean {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    if (/ShuleCloudApp/i.test(ua)) return true;
    // Also treat a generic Android WebView (wv) as mobile, as a safety net.
    return /\bwv\b/.test(ua) && /Android/i.test(ua);
}

const slug = (s: string) =>
    (s || "document").replace(/[^a-z0-9._-]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "document";

/** Open the classic print window (desktop). The html should be a full document. */
function printInWindow(title: string, html: string) {
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) {
        // Popup blocked — last-resort same-tab print via a hidden iframe.
        printViaIframe(html);
        return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    // If the html doesn't auto-print itself, nudge it.
    if (!/window\.print\s*\(/.test(html)) {
        w.onload = () => { try { w.print(); } catch { /* noop */ } };
    }
}

/** Same-tab print fallback when popups are blocked (rarely needed on desktop). */
function printViaIframe(html: string) {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) { iframe.remove(); return; }
    doc.open(); doc.write(html); doc.close();
    iframe.onload = () => {
        try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch { /* noop */ }
        setTimeout(() => iframe.remove(), 60000);
    };
}

/** Trigger a blob download. The mobile app's bridge intercepts this anchor click,
 *  saves the file to Downloads and opens it in the device viewer. */
function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 4000);
}

/** Wait until all <img> in a root have loaded (or errored), so the snapshot isn't blank. */
async function waitForImages(root: HTMLElement, timeoutMs = 8000) {
    const imgs = Array.from(root.querySelectorAll("img"));
    if (!imgs.length) return;
    await Promise.race([
        Promise.all(
            imgs.map(img =>
                img.complete && img.naturalWidth > 0
                    ? Promise.resolve()
                    : new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res(); }),
            ),
        ),
        new Promise<void>(res => setTimeout(res, timeoutMs)),
    ]);
}

/** Detect landscape from a @page rule (e.g. timetables) so wide tables aren't clipped. */
function detectLandscape(html: string): boolean {
    return /@page[^}]*\blandscape\b/i.test(html) || /size:\s*[^;]*\blandscape\b/i.test(html);
}

/**
 * Render a full HTML document string to a real multi-page A4 PDF blob.
 * The html is mounted in an off-screen, fixed-width container so the canvas
 * snapshot is deterministic regardless of the device screen size.
 */
async function htmlToPdfBlob(html: string, landscape = false): Promise<Blob> {
    // A4 at ~96dpi: portrait ≈ 794px wide, landscape ≈ 1123px wide. Render at the
    // matching width so the layout (esp. wide timetable grids) isn't squashed.
    const RENDER_WIDTH = landscape ? 1123 : 794;
    const host = document.createElement("div");
    host.style.cssText =
        `position:fixed;left:-10000px;top:0;width:${RENDER_WIDTH}px;background:#fff;z-index:-1;`;
    // Strip <script> (e.g. the onload print trigger) and pull out the <body> contents.
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const styleMatches = html.match(/<style[\s\S]*?<\/style>/gi) || [];
    host.innerHTML =
        styleMatches.join("") +
        (bodyMatch ? bodyMatch[1] : html).replace(/<script[\s\S]*?<\/script>/gi, "");
    document.body.appendChild(host);

    try {
        await waitForImages(host);
        const canvas = await html2canvas(host, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#ffffff",
            windowWidth: RENDER_WIDTH,
        });

        const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true, orientation: landscape ? "landscape" : "portrait" });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgH = (canvas.height * pageW) / canvas.width; // full image height scaled to page width

        if (imgH <= pageH) {
            pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageW, imgH);
        } else {
            // Taller than one page → slice the canvas into page-height strips.
            const pxPerPage = Math.floor((canvas.width * pageH) / pageW);
            let rendered = 0;
            let first = true;
            while (rendered < canvas.height) {
                const sliceH = Math.min(pxPerPage, canvas.height - rendered);
                const slice = document.createElement("canvas");
                slice.width = canvas.width;
                slice.height = sliceH;
                const ctx = slice.getContext("2d")!;
                ctx.fillStyle = "#fff";
                ctx.fillRect(0, 0, slice.width, slice.height);
                ctx.drawImage(canvas, 0, rendered, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
                const sliceImgH = (sliceH * pageW) / canvas.width;
                if (!first) pdf.addPage();
                pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageW, sliceImgH);
                first = false;
                rendered += sliceH;
            }
        }
        return pdf.output("blob");
    } finally {
        host.remove();
    }
}

export interface OutputOpts {
    /** File base name (without extension) used when saving on mobile. */
    fileName?: string;
    /** Force a path regardless of platform: "print" or "pdf". */
    mode?: "auto" | "print" | "pdf";
    /** Force landscape PDF. When omitted, detected from the html's @page rule. */
    landscape?: boolean;
}

/**
 * The single entry point. Pass a FULL html document string (the same string the
 * report already builds for window.open). On desktop it prints; in the mobile app
 * it produces a real PDF and saves/opens it.
 */
export async function outputHtmlDoc(title: string, html: string, opts: OutputOpts = {}): Promise<void> {
    const mode = opts.mode || "auto";
    const wantPdf = mode === "pdf" || (mode === "auto" && isMobileApp());
    if (!wantPdf) { printInWindow(title, html); return; }

    try {
        const landscape = opts.landscape ?? detectLandscape(html);
        const blob = await htmlToPdfBlob(html, landscape);
        downloadBlob(blob, `${slug(opts.fileName || title)}.pdf`);
    } catch {
        // If rasterising fails for any reason, never leave the user stuck — print.
        printInWindow(title, html);
    }
}

/** Convenience: explicitly produce & download a PDF (used by "View/Download PDF" buttons). */
export async function downloadHtmlAsPdf(title: string, html: string, fileName?: string): Promise<void> {
    return outputHtmlDoc(title, html, { mode: "pdf", fileName });
}

/**
 * Drop-in replacement for `window.open("", "_blank")` used by the many report
 * pages that do: const w = openPrintDoc(); w.document.write(html); w.document.close();
 * (and often a w.onload print). It buffers the written HTML and, when the page
 * signals completion (document.close / print / a short tick), routes it through
 * outputHtmlDoc — so those pages get desktop-print + mobile-PDF for free with a
 * one-word change and no other edits.
 *
 * Returns an object that is truthy (so existing `if (!w) return` guards pass) and
 * exposes the small surface those pages use: document.write/.writeln/.close,
 * print(), focus(), onload, closed.
 */
export function openPrintDoc(opts: OutputOpts = {}) {
    let buffer = "";
    let done = false;
    let onload: null | (() => void) = null;

    const finish = () => {
        if (done) return;
        done = true;
        const html = buffer.trim();
        if (!html) return;
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const title = opts.fileName || (titleMatch ? titleMatch[1].trim() : "document");
        void outputHtmlDoc(title, html, { ...opts, fileName: opts.fileName || title });
    };

    const fakeDoc = {
        open() { /* noop */ },
        write(s: string) { buffer += s; },
        writeln(s: string) { buffer += s + "\n"; },
        close() {
            // Most callers write the whole document then close(); fire the page's
            // own onload (which may call print()) then output once.
            setTimeout(() => { try { onload?.(); } catch { /* noop */ } finish(); }, 0);
        },
    };

    const win = {
        document: fakeDoc,
        focus() { /* noop */ },
        print() { finish(); },     // page called w.print() directly
        close() { /* the visual window; nothing to close */ },
        closed: false,
        set onload(fn: (() => void) | null) { onload = fn; },
        get onload() { return onload; },
    };
    return win as unknown as Window;
}

/**
 * Snapshot an ALREADY-RENDERED on-page element to a PDF (mobile) or print the
 * page (desktop). Use for pages that render the document inline and call
 * window.print() directly (e.g. the portal timetable). On desktop we keep the
 * native print (it respects @media print). In the app we rasterise just the
 * element so the user gets a real, shareable PDF.
 */
export async function printElementToPdf(
    el: HTMLElement | null,
    title: string,
    opts: { fileName?: string; landscape?: boolean } = {},
): Promise<void> {
    if (!isMobileApp()) { try { window.print(); } catch { /* noop */ } return; }
    if (!el) { try { window.print(); } catch { /* noop */ } return; }
    try {
        const landscape = opts.landscape ?? el.scrollWidth > el.scrollHeight;
        await waitForImages(el);
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
        const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true, orientation: landscape ? "landscape" : "portrait" });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgH = (canvas.height * pageW) / canvas.width;
        if (imgH <= pageH) {
            pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageW, imgH);
        } else {
            const pxPerPage = Math.floor((canvas.width * pageH) / pageW);
            let rendered = 0, first = true;
            while (rendered < canvas.height) {
                const sliceH = Math.min(pxPerPage, canvas.height - rendered);
                const slice = document.createElement("canvas");
                slice.width = canvas.width; slice.height = sliceH;
                const ctx = slice.getContext("2d")!;
                ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, slice.width, slice.height);
                ctx.drawImage(canvas, 0, rendered, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
                if (!first) pdf.addPage();
                pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageW, (sliceH * pageW) / canvas.width);
                first = false; rendered += sliceH;
            }
        }
        downloadBlob(pdf.output("blob"), `${slug(opts.fileName || title)}.pdf`);
    } catch {
        try { window.print(); } catch { /* noop */ }
    }
}

/** Fetch an image URL and return a data: URI, so logos render in the canvas/PDF
 *  even when the source is cross-origin. Returns "" on failure (caller omits it). */
export async function toDataUrl(url?: string | null): Promise<string> {
    if (!url) return "";
    if (url.startsWith("data:")) return url;
    try {
        const res = await fetch(url, { mode: "cors" });
        const blob = await res.blob();
        return await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onloadend = () => resolve(String(r.result || ""));
            r.onerror = reject;
            r.readAsDataURL(blob);
        });
    } catch {
        return "";
    }
}
