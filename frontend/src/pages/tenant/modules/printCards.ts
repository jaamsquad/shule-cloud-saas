// Robust ID-card printing — shared by the Student and Staff ID pages.
//
// Approach: render ONLY the cards (no sidebar, navbar, buttons or any other UI) into a
// full standalone HTML document string, then hand it to outputHtmlDoc() — the same print
// pipeline every other report in this app (report cards, dossiers, timetables, ...)
// already uses successfully: a real popup window on desktop (falling back to a hidden
// iframe only if the popup is blocked), or a rendered PDF download inside the mobile app.
// An earlier version of this file rolled its own hidden-iframe-only print path, which
// proved unreliable in some desktop builds — reusing the proven shared pipeline fixes that.
import { outputHtmlDoc } from "@/lib/pdfDoc";

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

/** Build a full standalone document of just the cards and hand it to the shared
 *  print/PDF pipeline. Resolves once that pipeline has finished (the print dialog has
 *  opened, or the PDF has been handed off on mobile), so callers can show a spinner. */
function printNodes(cards: HTMLElement[], title = "ID Cards", layout: PrintLayout = {}): Promise<void> {
    if (!cards.length) { alert("No cards available to print."); return Promise.resolve(); }
    const L = { ...DEFAULT_LAYOUT, ...layout };

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

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
        ${collectStyles()}
        <style>${buildPrintCss(L)}</style>
        </head><body>${sheet.outerHTML}</body></html>`;

    return outputHtmlDoc(title, html, { landscape: L.orientation === "landscape" });
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
