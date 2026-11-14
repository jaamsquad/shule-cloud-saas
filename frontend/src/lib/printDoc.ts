import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { outputHtmlDoc, downloadHtmlAsPdf } from "@/lib/pdfDoc";

export interface SchoolBrand { name: string; logo: string; address: string; phone: string; email: string; signature: string; stamp: string; signerName: string; signerTitle: string; }

/** Real school branding for module prints/report headers (shares the top-header cache). */
export function useSchoolBrand(): SchoolBrand {
    const { data } = useQuery({
        queryKey: ["tenant_profile_global"],
        queryFn: async () => { const r = await api.get("/auth/tenant/profile"); return Array.isArray(r.data) ? r.data[0] : r.data; },
    });
    const s: any = data || {};
    return {
        name: s?.name || s?.instituteName || s?.schoolName || "School",
        logo: s?.logo || s?.schoolLogo || s?.image || "",
        address: [s?.address || s?.location, s?.city || s?.county].filter(Boolean).join(", "),
        phone: s?.phone || s?.contactPhone || s?.mobile || "",
        email: s?.email || s?.contactEmail || "",
        // the principal's / head teacher's signature and the school stamp (Institute Profile) — printed on letters, certificates and report cards
        signature: s?.principalSignature || "", stamp: s?.schoolStamp || "", signerName: s?.principalName || "", signerTitle: s?.principalTitle || "Principal",
    };
}

/** The branded header/table document shared by printBranded() and downloadBrandedPdf(). */
function brandedHtml(school: SchoolBrand, title: string, bodyHtml: string, accent: string): string {
    const contacts = [school.address, school.phone, school.email].filter(Boolean).join(" · ");
    return `<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      @page{margin:14mm}
      body{font-family:Arial,Helvetica,sans-serif;color:#1e293b}
      *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .h{display:flex;align-items:center;gap:14px;border-bottom:3px solid ${accent};padding-bottom:12px;margin-bottom:16px}
      .h img{height:54px;width:auto;object-fit:contain}
      .h h1{margin:0;font-size:20px;text-transform:uppercase;color:${accent}}
      .h .sub{font-size:11px;color:#64748b;margin-top:2px}
      .title{color:${accent};font-weight:700;font-size:14px;margin:0 0 8px}
      table{width:100%;border-collapse:collapse}
      th{background:${accent};color:#fff;padding:8px;text-align:left;font-size:11px}
      td{padding:7px 8px;border-bottom:1px solid #e2e8f0;font-size:12px}
      tfoot td,.tot{font-weight:900;border-top:2px solid ${accent}}
      .ft{margin-top:24px;text-align:right;font-size:10px;color:#94a3b8}
    </style></head><body>
      <div class="h">
        ${school.logo ? `<img src="${school.logo}" alt=""/>` : ""}
        <div><h1>${school.name}</h1>${contacts ? `<div class="sub">${contacts}</div>` : ""}</div>
      </div>
      <div class="title">${title}</div>
      ${bodyHtml}
      <div class="ft">Printed ${new Date().toLocaleString("en-GB")}</div>
      <script>window.onload=()=>window.print()</script>
    </body></html>`;
}

/**
 * Open a print window with a branded school header (logo + name + contacts),
 * the report title, and the supplied body HTML. `accent` themes the header/table.
 */
export function printBranded(school: SchoolBrand, title: string, bodyHtml: string, accent = "#1D4ED8") {
    // Desktop → print window; mobile app → real PDF saved & opened.
    void outputHtmlDoc(title, brandedHtml(school, title, bodyHtml, accent), { fileName: title });
}

/** Same branded document as printBranded(), but always saved straight to a PDF file (an explicit "Download PDF" button). */
export function downloadBrandedPdf(school: SchoolBrand, title: string, bodyHtml: string, accent = "#1D4ED8") {
    void downloadHtmlAsPdf(title, brandedHtml(school, title, bodyHtml, accent), title);
}
