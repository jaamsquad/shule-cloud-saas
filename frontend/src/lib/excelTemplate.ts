/**
 * Styled Excel import templates (students, employees …): a coloured header row, drop-down lists
 * where a column has fixed choices, an empty data area (no demo rows) and a Guide sheet that
 * explains the colours and lists what each column accepts.
 *
 *   indigo header  = required        slate header = optional        orange header = pick from the drop-down
 */
export interface TemplateColumn {
    header: string;              // must match what the importer reads
    required?: boolean;
    options?: string[];          // → drop-down list
    strict?: boolean;            // drop-down only accepts listed values (default true)
    text?: boolean;              // keep as text (phone / ID numbers, dates typed as YYYY-MM-DD)
    hint?: string;               // shown as a note on the header and on the Guide sheet
    width?: number;
}

const COLORS = { required: "FF4338CA", optional: "FF64748B", dropdown: "FFEA580C" };
const DATA_ROWS = 500;

export async function downloadStyledTemplate(opts: { fileName: string; sheetName: string; columns: TemplateColumn[]; title?: string }) {
    const ExcelJS: any = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "ShuleCloud"; wb.created = new Date();

    const ws = wb.addWorksheet(opts.sheetName, { views: [{ state: "frozen", ySplit: 1 }] });
    const guide = wb.addWorksheet("Guide");
    const lists = wb.addWorksheet("Lists", { state: "hidden" });

    // Lists sheet: one column per drop-down
    let listCol = 0;
    const listRef: Record<string, string> = {};
    opts.columns.forEach(c => {
        if (!c.options?.length) return;
        listCol++;
        c.options.forEach((o, i) => { lists.getCell(i + 1, listCol).value = o; });
        const L = colLetter(listCol);
        listRef[c.header] = `Lists!$${L}$1:$${L}$${c.options.length}`;
    });

    opts.columns.forEach((c, i) => {
        const col = i + 1;
        const dropdown = !!c.options?.length;
        const wsCol = ws.getColumn(col);
        wsCol.width = c.width || Math.max(16, Math.min(30, c.header.length + 6));

        const h = ws.getCell(1, col);
        h.value = c.header;
        h.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
        h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: dropdown ? COLORS.dropdown : c.required ? COLORS.required : COLORS.optional } };
        h.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        h.border = { top: { style: "thin", color: { argb: "FFFFFFFF" } }, bottom: { style: "medium", color: { argb: "FF1E1B4B" } }, left: { style: "thin", color: { argb: "FFFFFFFF" } }, right: { style: "thin", color: { argb: "FFFFFFFF" } } };
        const tip = [c.required ? "Required." : "Optional.", dropdown ? "Choose from the list." : "", c.hint || ""].filter(Boolean).join(" ");
        h.note = { texts: [{ text: tip }], margins: { insetmode: "auto" } };

        for (let r = 2; r <= DATA_ROWS; r++) {
            const cell = ws.getCell(r, col);
            if (c.text) cell.numFmt = "@";
            cell.border = { bottom: { style: "hair", color: { argb: "FFCBD5E1" } }, right: { style: "hair", color: { argb: "FFE2E8F0" } } };
            if (dropdown) cell.dataValidation = {
                type: "list", allowBlank: true, formulae: [listRef[c.header]], showErrorMessage: true,
                errorStyle: c.strict === false ? "warning" : "stop", errorTitle: c.header, error: `Please choose a ${c.header.toLowerCase()} from the list.`,
            };
        }
    });
    ws.getRow(1).height = 32;

    // Guide sheet
    guide.columns = [{ width: 30 }, { width: 14 }, { width: 70 }];
    guide.mergeCells("A1:C1");
    const t = guide.getCell("A1");
    t.value = opts.title || `${opts.sheetName} import — how to fill this sheet`;
    t.font = { size: 15, bold: true, color: { argb: "FFFFFFFF" } }; t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E1B4B" } }; t.alignment = { vertical: "middle", indent: 1 };
    guide.getRow(1).height = 30;
    guide.getCell("A3").value = "Header colours"; guide.getCell("A3").font = { bold: true };
    ([["Required", COLORS.required, "Must be filled in for every row."], ["Optional", COLORS.optional, "Can be left blank."], ["Drop-down", COLORS.dropdown, "Click the cell and pick a value from the list."]] as const).forEach(([n, c, d], i) => {
        const r = 4 + i; const a = guide.getCell(r, 1);
        a.value = n; a.font = { bold: true, color: { argb: "FFFFFFFF" } }; a.fill = { type: "pattern", pattern: "solid", fgColor: { argb: c } }; a.alignment = { horizontal: "center" };
        guide.getCell(r, 3).value = d;
    });
    guide.getCell("A8").value = "Rules"; guide.getCell("A8").font = { bold: true };
    ["Do not rename or reorder the column headers.", "Dates are typed as YYYY-MM-DD (for example 2026-01-05).", "Start typing your records on row 2 — the sample rows are intentionally empty.", "You can review every row before anything is saved."].forEach((s, i) => { guide.getCell(9 + i, 1).value = `• ${s}`; });

    const top = 14;
    ["Column", "Type", "What it accepts"].forEach((n, i) => {
        const c = guide.getCell(top, i + 1); c.value = n; c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
    });
    opts.columns.forEach((c, i) => {
        const r = top + 1 + i, dropdown = !!c.options?.length;
        const a = guide.getCell(r, 1); a.value = c.header; a.font = { bold: true, color: { argb: dropdown ? COLORS.dropdown : c.required ? COLORS.required : COLORS.optional } };
        guide.getCell(r, 2).value = dropdown ? "Drop-down" : c.required ? "Required" : "Optional";
        const desc = dropdown ? `One of: ${c.options!.slice(0, 12).join(", ")}${c.options!.length > 12 ? ` … (${c.options!.length} choices in the list)` : ""}` : (c.hint || "");
        guide.getCell(r, 3).value = desc; guide.getCell(r, 3).alignment = { wrapText: true, vertical: "top" };
        [1, 2, 3].forEach(k => { guide.getCell(r, k).border = { bottom: { style: "hair", color: { argb: "FFCBD5E1" } } }; });
    });

    const buf: ArrayBuffer = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a"); a.href = url; a.download = opts.fileName; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function colLetter(n: number) { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
