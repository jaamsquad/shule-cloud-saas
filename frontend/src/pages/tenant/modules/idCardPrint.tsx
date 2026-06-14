// Shared print stylesheet for ID-card pages. When the user hits "Print",
// only the #id-card-print container is shown — no sidebar, header or buttons —
// with each card kept intact (never split across pages) and colours preserved.
export function IdCardPrintStyle() {
  return (
    <style>{`
@media print {
  @page { margin: 10mm; }
  html, body { background: #ffffff !important; }
  /* Hide the whole app… */
  body * { visibility: hidden !important; }
  /* …then reveal only the cards. */
  #id-card-print, #id-card-print * { visibility: visible !important; }
  #id-card-print {
    position: absolute !important;
    left: 0; top: 0; width: 100%;
    display: flex !important;
    flex-wrap: wrap;
    gap: 8mm;
    justify-content: center;
    align-content: flex-start;
  }
  #id-card-print > * {
    margin: 0 !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  /* Print a single card only */
  body.print-single #id-card-print > *:not(.print-target) { display: none !important; }
  /* Flat, crisp cards on paper */
  #id-card-print .group {
    box-shadow: 0 0 0 1px #e5e7eb !important;
    transform: none !important;
  }
  /* Force background colours / gradients to print */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
    `}</style>
  );
}
