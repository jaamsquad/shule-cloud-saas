// Blank-form generator: a saved form is a definition (sections of fields). One A4
// renderer turns any definition into a print-ready blank form with the school logo
// and details as automatic header defaults. Print / Download PDF only for now.

import type { SchoolBrand } from "@/lib/printDoc";

export type FieldType =
    | "text"        // single labelled line for a short answer
    | "lines"       // multiple ruled lines for a longer handwritten answer
    | "checkbox"    // a label with a set of tick boxes (options)
    | "signature"   // a signature line + caption
    | "photo"       // a passport-photo placeholder box
    | "section"     // a section heading (no input)
    | "date"        // a labelled date line (dd / mm / yyyy)
    | "spacer";     // blank vertical space

export interface FormField {
    id: string;
    type: FieldType;
    label: string;
    options?: string[];   // for checkbox
    lines?: number;       // for "lines" (how many ruled lines) / spacer height
    span?: 1 | 2;         // 1 = half width, 2 = full width
    required?: boolean;
}

export interface FormTemplate {
    _id?: string;
    name: string;
    title: string;           // printed document title
    description?: string;
    reference?: string;      // optional reference number label
    version?: string;
    revision?: string;
    showPhoto?: boolean;     // header passport photo box
    footerNote?: string;
    fields: FormField[];
    layout?: FormLayout;     // page positioning / spacing controls
    createdAt?: string;
    updatedAt?: string;
}

export interface FormLayout {
    headerAlign?: "left" | "center" | "right";   // school name/contacts alignment
    logoPosition?: "left" | "center" | "right";  // where the logo sits in the header
    photoPosition?: "left" | "right";            // which side the header photo box sits
    margin?: number;                              // page margin in mm (all sides)
    columnGap?: number;                           // horizontal gap between field columns (px)
    rowGap?: number;                              // vertical gap between rows (px)
    columns?: 1 | 2;                              // field grid columns
}

export const DEFAULT_LAYOUT: Required<FormLayout> = {
    headerAlign: "left", logoPosition: "left", photoPosition: "right",
    margin: 14, columnGap: 18, rowGap: 12, columns: 2,
};

export const FIELD_LABELS: Record<FieldType, string> = {
    text: "Short answer line",
    lines: "Multi-line answer",
    checkbox: "Checkboxes",
    signature: "Signature line",
    photo: "Photo placeholder",
    section: "Section heading",
    date: "Date line",
    spacer: "Blank space",
};

export const uid = () => Math.random().toString(36).slice(2, 9);

export function newField(type: FieldType): FormField {
    const base: FormField = { id: uid(), type, label: "", span: 2 };
    switch (type) {
        case "text": return { ...base, label: "Label", span: 1 };
        case "date": return { ...base, label: "Date", span: 1 };
        case "lines": return { ...base, label: "Details", lines: 3 };
        case "checkbox": return { ...base, label: "Choose", options: ["Option 1", "Option 2"] };
        case "signature": return { ...base, label: "Signature", span: 1 };
        case "photo": return { ...base, label: "Affix Photo", span: 1 };
        case "section": return { ...base, label: "Section" };
        case "spacer": return { ...base, label: "", lines: 2 };
        default: return base;
    }
}

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Render one field to print HTML (cells flow in a 2-column grid; span=2 = full row). */
function renderField(f: FormField): string {
    const colSpan = f.span === 1 ? "grid-column: span 1;" : "grid-column: 1 / -1;";
    switch (f.type) {
        case "section":
            return `<div style="grid-column:1 / -1;margin:10px 0 2px;border-bottom:1.5px solid #1e293b;padding-bottom:3px;font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:.5px;color:#1e293b">${esc(f.label)}</div>`;
        case "spacer":
            return `<div style="grid-column:1 / -1;height:${(f.lines || 2) * 10}px"></div>`;
        case "text":
            return `<div style="${colSpan}"><div style="font-size:10px;font-weight:700;color:#334155;margin-bottom:2px">${esc(f.label)}${f.required ? ' *' : ''}</div><div style="border-bottom:1px solid #475569;height:20px"></div></div>`;
        case "date":
            return `<div style="${colSpan}"><div style="font-size:10px;font-weight:700;color:#334155;margin-bottom:2px">${esc(f.label)}${f.required ? ' *' : ''}</div><div style="display:flex;gap:6px;align-items:flex-end"><span style="border-bottom:1px solid #475569;width:34px;height:18px;display:inline-block"></span><span style="font-size:9px;color:#94a3b8">D&nbsp;D</span><span style="border-bottom:1px solid #475569;width:34px;height:18px;display:inline-block"></span><span style="font-size:9px;color:#94a3b8">M&nbsp;M</span><span style="border-bottom:1px solid #475569;width:54px;height:18px;display:inline-block"></span><span style="font-size:9px;color:#94a3b8">Y&nbsp;Y&nbsp;Y&nbsp;Y</span></div></div>`;
        case "lines": {
            const n = Math.max(1, f.lines || 3);
            const rows = Array.from({ length: n }).map(() => `<div style="border-bottom:1px solid #94a3b8;height:22px"></div>`).join("");
            return `<div style="${colSpan}"><div style="font-size:10px;font-weight:700;color:#334155;margin-bottom:4px">${esc(f.label)}${f.required ? ' *' : ''}</div>${rows}</div>`;
        }
        case "checkbox": {
            const opts = (f.options || []).map(o => `<label style="display:inline-flex;align-items:center;gap:5px;margin-right:18px;font-size:10px;color:#334155"><span style="width:13px;height:13px;border:1.4px solid #475569;display:inline-block;border-radius:2px"></span>${esc(o)}</label>`).join("");
            return `<div style="${colSpan}"><div style="font-size:10px;font-weight:700;color:#334155;margin-bottom:4px">${esc(f.label)}${f.required ? ' *' : ''}</div><div style="display:flex;flex-wrap:wrap;row-gap:6px">${opts}</div></div>`;
        }
        case "signature":
            return `<div style="${colSpan};margin-top:6px"><div style="border-bottom:1px solid #475569;height:30px"></div><div style="font-size:10px;font-weight:700;color:#334155;margin-top:3px">${esc(f.label)}</div></div>`;
        case "photo":
            return `<div style="${colSpan}"><div style="width:110px;height:130px;border:1.4px dashed #94a3b8;border-radius:4px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:9px;color:#94a3b8;font-weight:700">${esc(f.label) || "AFFIX<br/>PHOTO"}</div></div>`;
        default:
            return "";
    }
}

/** Build the full A4 HTML document for a template, with the school header defaults. */
export function renderFormHtml(t: FormTemplate, school: SchoolBrand): string {
    const L = { ...DEFAULT_LAYOUT, ...(t.layout || {}) };
    const contacts = [school.address, school.phone, school.email].filter(Boolean).map(esc).join(" &middot; ");
    const logoImg = school.logo ? `<img src="${school.logo}" style="height:60px;width:auto;object-fit:contain" />` : "";
    const photoBox = t.showPhoto
        ? `<div style="width:90px;height:108px;border:1.4px dashed #94a3b8;border-radius:4px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:9px;color:#94a3b8;font-weight:700;flex:0 0 auto">AFFIX<br/>PHOTO</div>`
        : "";

    // School-info block, aligned per layout.
    const infoBlock = `<div style="flex:1;text-align:${L.headerAlign}">
        <h1>${esc(school.name)}</h1>
        ${contacts ? `<div class="sub">${contacts}</div>` : ""}
      </div>`;
    // Logo cell only when not centered (centered logo is placed inside the info flow).
    const logoCell = logoImg ? `<div style="flex:0 0 auto">${logoImg}</div>` : "";

    // Header layout: order logo / info / photo per the chosen positions.
    let headerInner: string;
    if (L.logoPosition === "center") {
        headerInner = `<div style="flex:1;text-align:center">${logoImg}<h1>${esc(school.name)}</h1>${contacts ? `<div class="sub">${contacts}</div>` : ""}</div>`;
        headerInner = L.photoPosition === "left" ? `${photoBox}${headerInner}` : `${headerInner}${photoBox}`;
    } else {
        const left = L.logoPosition === "left" ? logoCell : "";
        const right = L.logoPosition === "right" ? logoCell : "";
        const parts = [left, infoBlock, right].filter(Boolean);
        headerInner = L.photoPosition === "left" ? `${photoBox}${parts.join("")}` : `${parts.join("")}${photoBox}`;
    }

    const meta = [
        t.reference ? `Ref: ${esc(t.reference)}` : "",
        t.version ? `Version: ${esc(t.version)}` : "",
        t.revision ? `Rev: ${esc(t.revision)}` : "",
        `Issued: ${new Date().toLocaleDateString("en-GB")}`,
    ].filter(Boolean).join(" &nbsp;|&nbsp; ");

    const gridCols = L.columns === 1 ? "1fr" : "1fr 1fr";
    const body = `<div style="display:grid;grid-template-columns:${gridCols};gap:${L.rowGap}px ${L.columnGap}px">${t.fields.map(renderField).join("")}</div>`;

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(t.title || t.name)}</title>
    <style>
      @page { size: A4 portrait; margin: ${L.margin}mm; }
      *{ -webkit-print-color-adjust:exact; print-color-adjust:exact; box-sizing:border-box; }
      body{ font-family: Arial, Helvetica, sans-serif; color:#1e293b; margin:0; font-size:11px; }
      .hdr{ display:flex; align-items:flex-start; gap:14px; border-bottom:2.5px solid #1e293b; padding-bottom:10px; }
      .hdr h1{ margin:0; font-size:19px; text-transform:uppercase; letter-spacing:.5px; }
      .hdr .sub{ font-size:10px; color:#64748b; margin-top:2px; }
      .title{ text-align:center; font-size:15px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin:14px 0 4px; }
      .meta{ text-align:center; font-size:9.5px; color:#64748b; margin-bottom:14px; }
      .ft{ position:fixed; bottom:6mm; left:${L.margin}mm; right:${L.margin}mm; display:flex; justify-content:space-between; font-size:9px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:4px; }
    </style></head>
    <body>
      <div class="hdr">${headerInner}</div>
      <div class="title">${esc(t.title || t.name)}</div>
      ${meta ? `<div class="meta">${meta}</div>` : ""}
      ${t.description ? `<div style="font-size:10px;color:#475569;margin-bottom:12px">${esc(t.description)}</div>` : ""}
      ${body}
      <div class="ft">
        <span>${esc(t.footerNote || school.name)}</span>
        <span>${esc(t.name)}</span>
        <span>Page 1</span>
      </div>
      <script>window.onload=()=>window.print()</script>
    </body></html>`;
}
