// Robust ID-card printing — shared by the Student and Staff ID pages.
//
// Approach: instead of fighting the live DOM with @media-print visibility hacks
// (which leave artifacts and print before images load), we render ONLY the cards
// into a hidden same-origin <iframe>, copy the page's stylesheets so the cards look
// identical, wait for every image (logos, QR codes, barcodes) to finish loading,
// then call print() on the iframe and clean up. No sidebar, navbar, buttons or any
// other UI is included — only the cards. Works in Chrome, Edge and Firefox, and in
// the in-app WebView (no popup window, so no popup blockers).

/** Collect the current document's CSS (inline <style> + linked stylesheets) so the
 *  cloned cards keep their exact look. We inline rules where readable and fall back
 *  to <link> tags for cross-origin sheets the browser won't let us read. */
function collectStyles(): string {
    let css = "";
    const links: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
        try {
            const rules = (sheet as CSSStyleSheet).cssRules;
            for (const rule of Array.from(rules)) css += rule.cssText + "\n";
        } catch {
            // Cross-origin sheet — can't read its rules; re-link it instead.
            if (sheet.href) links.push(`<link rel="stylesheet" href="${sheet.href}">`);
        }
    }
    // Also carry over any <style> tags (Vite injects component styles as these).
    for (const tag of Array.from(document.querySelectorAll("style"))) css += tag.textContent + "\n";
    return links.join("\n") + `<style>${css}</style>`;
}

export interface PrintLayout {
    orientation?: "portrait" | "landscape";
    columns?: number;     // cards across the page
    gapMm?: number;       // gap between cards (mm)
    marginMm?: number;    // page margin (mm)
    scale?: number;       // shrink/grow cards to fit (1 = 100%)
}
const DEFAULT_LAYOUT: Required<PrintLayout> = { orientation: "portrait", columns: 2, gapMm: 8, marginMm: 10, scale: 1 };

/** Print-specific layout built from the chosen options. Cards never split a page. */
function buildPrintCss(L: Required<PrintLayout>): string {
    return `
  @page { size: A4 ${L.orientation}; margin: ${L.marginMm}mm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
  html, body { background: #fff !important; margin: 0; padding: 0; }
  .print-sheet {
    display: grid;
    grid-template-columns: repeat(${L.columns}, 1fr);
    gap: ${L.gapMm}mm;
    justify-items: center; align-content: flex-start;
    padding: 2mm;
  }
  .print-sheet > * {
    margin: 0 !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
    ${L.scale !== 1 ? `transform: scale(${L.scale}); transform-origin: top center;` : ""}
  }
  /* Strip on-screen-only effects so cards sit flat & crisp on paper. */
  .print-sheet * { animation: none !important; transition: none !important; }
  .print-sheet .group { box-shadow: 0 0 0 1px #e5e7eb !important; ${L.scale === 1 ? "transform: none !important;" : ""} }
  /* Hide any control overlays (per-card print buttons, hover actions). */
  .print-sheet [data-no-print], .print-sheet .print\\:hidden { display: none !important; }
  /* Hide photo-upload affordances (the camera icon overlays) and file inputs. */
  .print-sheet label:has(input[type="file"]),
  .print-sheet input[type="file"],
  .print-sheet button { display: none !important; }
`;
}

/** Wait until every <img> inside a root has loaded (or errored), so nothing prints blank. */
function waitForImages(root: ParentNode, timeoutMs = 8000): Promise<void> {
    const imgs = Array.from(root.querySelectorAll("img"));
    if (!imgs.length) return Promise.resolve();
    return Promise.race([
        Promise.all(imgs.map(img =>
            img.complete && img.naturalWidth > 0
                ? Promise.resolve()
                : new Promise<void>(res => { img.addEventListener("load", () => res(), { once: true }); img.addEventListener("error", () => res(), { once: true }); }),
        )).then(() => undefined),
        new Promise<void>(res => setTimeout(res, timeoutMs)),
    ]);
}

/** Build the hidden iframe, drop the cards in, wait for images, print, then remove.
 *  Resolves once the print dialog has actually been invoked (images loaded), so callers
 *  can show a spinner that lasts exactly as long as the real wait. */
function printNodes(cards: HTMLElement[], title = "ID Cards", layout: PrintLayout = {}): Promise<void> {
    if (!cards.length) { alert("No cards available to print."); return Promise.resolve(); }
    const L = { ...DEFAULT_LAYOUT, ...layout };

    // A 0×0 iframe can make some Chromium builds compute a zero-size print viewport (a blank
    // or missing print job) — give it a real off-screen size instead so the content always
    // has somewhere to lay out before print() is called.
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:fixed;left:-10000px;top:0;width:1000px;height:1400px;border:0;visibility:hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) { iframe.remove(); alert("Could not open the print view."); return Promise.resolve(); }

    const sheet = document.createElement("div");
    sheet.className = "print-sheet";
    cards.forEach(c => {
        const clone = c.cloneNode(true) as HTMLElement;
        // Strip interactive/upload affordances from the clone (camera icons, file
        // inputs, buttons) so they never appear on the printed card.
        clone.querySelectorAll('[data-no-print], button, input[type="file"]').forEach(el => el.remove());
        clone.querySelectorAll("label").forEach(l => { if (l.querySelector('input[type="file"]')) l.remove(); });
        // Drop images that have no usable source (they'd print as a broken icon).
        clone.querySelectorAll("img").forEach(img => { const s = img.getAttribute("src") || ""; if (!s || s === "#" || s.startsWith("data:,")) img.remove(); });
        sheet.appendChild(clone);
    });

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
        ${collectStyles()}
        <style>${buildPrintCss(L)}</style>
        </head><body></body></html>`);
    doc.body.appendChild(sheet);
    doc.close();

    // Print only after images (logos/QR/barcodes) have loaded — never blank pages.
    return waitForImages(doc).then(() => {
        const win = iframe.contentWindow!;
        win.focus();
        win.print();
        // Clean up shortly after the print dialog is dismissed.
        const cleanup = () => setTimeout(() => iframe.remove(), 500);
        win.addEventListener("afterprint", cleanup, { once: true });
        setTimeout(cleanup, 60000); // safety net if afterprint never fires
    });
}

/**
 * Print every card matched by `selector` (e.g. ".id-card" inside the grid).
 * Excludes elements flagged with [data-no-print]. Resolves once the print dialog
 * has opened — await it to drive a "preparing to print…" spinner.
 */
export function printAllCards(selector: string, layout: PrintLayout = {}): Promise<void> {
    const cards = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(el => !el.hasAttribute("data-no-print"));
    return printNodes(cards, "ID Cards", layout);
}

/** How many cards a given selector currently has (for the modal's summary). */
export function countCards(selector: string): number {
    return Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(el => !el.hasAttribute("data-no-print")).length;
}

/**
 * Print a single card. Pass the card element itself, or any element inside it —
 * we walk up to the nearest `.id-card`. Resolves once the print dialog has opened.
 */
export function printSingleCard(elementInsideCard: HTMLElement | null, layout: PrintLayout = {}): Promise<void> {
    if (!elementInsideCard) { alert("No card to print."); return Promise.resolve(); }
    const card = elementInsideCard.closest<HTMLElement>(".id-card") || elementInsideCard;
    return printNodes([card], "ID Card", { columns: 1, ...layout });
}
