import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Wand2, Loader2, ArrowLeft, Printer, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { openPrintDoc } from "@/lib/pdfDoc";

/* ═══════════════════════════════════════════════════════════════════════════
   PRINT — Beautiful A4 question paper matching the modal preview exactly
   Opens in window.open(), triggers print, then closes.
═══════════════════════════════════════════════════════════════════════════ */
function printQuestionPaper(opts: {
    paper: any;
    profileData: any;
    sections: { sectionName: string; questions: any[] }[];
    hasSections: boolean;
}) {
    const { paper, profileData, sections } = opts;
    const schoolName = profileData?.name || "School Name";
    const schoolAddr = profileData?.address || "";
    const logoUrl = profileData?.logo || "";
    const academicYear = paper.academicYear || profileData?.academicYear || new Date().getFullYear();

    const logoHtml = logoUrl
        ? `<img src="${logoUrl}" style="width:56px;height:56px;object-fit:contain;border-radius:8px;" />`
        : `<div style="width:56px;height:56px;border-radius:12px;background:#EEF2FF;display:flex;align-items:center;justify-content:center;"><svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg></div>`;

    /* QR code placeholder — replace with real qrcode lib output if available */
    const qrHtml = `
        <div style="width:48px;height:48px;display:grid;grid-template-columns:1fr 1fr;gap:2px;opacity:.45;flex-shrink:0;">
            ${Array.from({ length: 4 }).map((_, i) => `
                <div style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:1.5px;">
                    ${Array.from({ length: 4 }).map(() => `<div style="background:#1e293b;border-radius:1px;"></div>`).join("")}
                </div>`).join("")}
        </div>`;

    /* Build section HTML */
    let globalQNum = 1;
    const sectionsHtml = sections.map(sec => {
        const secMarks = sec.questions.reduce((a, q) => a + (Number(q.marks) || 0), 0);
        const rowsHtml = sec.questions.map(q => {
            const qn = globalQNum++;
            const marks = Number(q.marks) || 0;
            const ansLines = Math.min(Math.max(Math.ceil(marks * 1.5), 3), 10);
            const linesHtml = Array.from({ length: ansLines })
                .map(() => `<div style="border-bottom:1px solid #e2e8f0;min-height:22px;margin:0 0 2px 0;"></div>`)
                .join("");
            return `
                <div style="margin-bottom:18px;">
                    <div style="display:flex;gap:10px;align-items:flex-start;">
                        <span style="font-weight:800;font-size:13px;color:#2D3A8C;min-width:28px;text-align:right;padding-top:1px;flex-shrink:0;">${qn}.</span>
                        <div style="flex:1;">
                            <div style="font-size:13px;color:#1e293b;line-height:1.55;margin-bottom:8px;">
                                ${q.questionText || ""}
                            </div>
                            <div style="margin-left:4px;">${linesHtml}</div>
                        </div>
                        <span style="font-weight:700;font-size:12px;color:#6366F1;white-space:nowrap;flex-shrink:0;padding-top:2px;">(${marks} ${marks === 1 ? "mark" : "marks"})</span>
                    </div>
                </div>`;
        }).join("");

        return `
            <div style="margin-bottom:8px;page-break-inside:avoid;">
                <div style="background:#EEF2FF;border-radius:6px;padding:9px 16px;display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;margin-top:20px;">
                    <span style="font-weight:900;font-size:13px;color:#2D3A8C;letter-spacing:.06em;text-transform:uppercase;">${sec.sectionName}</span>
                    <span style="font-weight:700;font-size:11px;color:#6366F1;">${sec.questions.length} QUESTION${sec.questions.length !== 1 ? "S" : ""} &nbsp;·&nbsp; ${secMarks} MARKS</span>
                </div>
                ${rowsHtml}
            </div>`;
    }).join("");

    const instrLines = (paper.instructions || "").split("\n").filter(Boolean)
        .map((l: string) => `<div style="font-size:12px;color:#334155;line-height:1.7;margin-left:16px;">${l}</div>`)
        .join("");

    const totalQs = sections.reduce((a, s) => a + s.questions.length, 0);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${paper.paperTitle || "Question Paper"}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');

  * { margin:0; padding:0; box-sizing:border-box; }

  @page {
    size: A4 portrait;
    margin: 14mm 16mm 14mm 16mm;
  }

  body {
    font-family: 'DM Sans', Arial, sans-serif;
    color: #1e293b;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-size: 13px;
    line-height: 1.5;
  }

  /* ── School header ────────────────────────────────── */
  .school-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 3px solid #2D3A8C;
  }

  .school-info { flex: 1; }
  .school-name {
    font-weight: 900;
    font-size: 16px;
    color: #2D3A8C;
    text-transform: uppercase;
    letter-spacing: .04em;
    line-height: 1.1;
  }
  .school-sub {
    font-size: 10.5px;
    color: #64748b;
    margin-top: 3px;
  }

  /* ── Title block ─────────────────────────────────── */
  .paper-title-block {
    text-align: center;
    padding: 18px 0 14px;
  }
  .paper-title {
    font-weight: 900;
    font-size: 20px;
    color: #1e293b;
    text-transform: uppercase;
    letter-spacing: .05em;
    line-height: 1.2;
  }
  .paper-meta {
    margin-top: 7px;
    font-size: 13px;
    font-weight: 700;
    color: #334155;
    letter-spacing: .04em;
  }
  .paper-meta span { margin: 0 18px; }

  /* ── Candidate info box ──────────────────────────── */
  .candidate-box {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 0;
    border: 2px solid #2D3A8C;
    border-radius: 6px;
    overflow: hidden;
    margin: 14px 0 18px;
  }
  .candidate-field {
    padding: 11px 16px;
    font-size: 12.5px;
    font-weight: 700;
    color: #2D3A8C;
  }
  .candidate-field:first-child {
    border-right: 2px solid #2D3A8C;
  }
  .candidate-dots {
    color: #94a3b8;
    font-weight: 400;
    letter-spacing: .5px;
  }

  /* ── Instructions ────────────────────────────────── */
  .instructions-block { margin-bottom: 14px; }
  .instructions-title {
    font-weight: 800;
    font-size: 12.5px;
    color: #1e293b;
    text-transform: uppercase;
    letter-spacing: .04em;
    text-decoration: underline;
    margin-bottom: 6px;
  }

  /* ── Divider ─────────────────────────────────────── */
  .divider {
    border: none;
    border-top: 1.5px solid #CBD5E1;
    margin: 12px 0;
  }
  .divider-dark {
    border-top-color: #2D3A8C;
    border-top-width: 2px;
  }

  /* ── Footer ──────────────────────────────────────── */
  .paper-footer {
    margin-top: 24px;
    padding-top: 8px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #94a3b8;
    font-weight: 500;
  }

  @media print {
    .page-break { page-break-before: always; }
  }
</style>
</head>
<body>

<!-- School Header -->
<div class="school-header">
  ${logoHtml}
  <div class="school-info">
    <div class="school-name">${schoolName}</div>
    <div class="school-sub">${schoolAddr}${schoolAddr && academicYear ? "  ·  " : ""}${academicYear ? `Academic Year: ${academicYear}` : ""}</div>
  </div>
  ${qrHtml}
</div>

<!-- Paper Title -->
<div class="paper-title-block">
  <div class="paper-title">${paper.paperTitle || "Question Paper"}</div>
  <div class="paper-meta">
    <span>TIME: ${paper.duration || 60} MINUTES</span>
    <span>TOTAL MARKS: ${paper.totalMarks || 100}</span>
    <span>${totalQs} QUESTIONS</span>
  </div>
</div>

<!-- Candidate Info Box -->
<div class="candidate-box">
  <div class="candidate-field">
    CANDIDATE NAME: <span class="candidate-dots">.....................................................................</span>
  </div>
  <div class="candidate-field">
    ADM NO: <span class="candidate-dots">................................................</span>
  </div>
</div>

<!-- Instructions -->
${instrLines ? `
<div class="instructions-block">
  <div class="instructions-title">Instructions to Candidates:</div>
  ${instrLines}
</div>` : ""}

<hr class="divider divider-dark" />

<!-- Sections + Questions -->
${sectionsHtml}

<!-- Footer -->
<div class="paper-footer">
  <span>${schoolName}</span>
  <span>${paper.paperTitle || "Question Paper"}  ·  ${academicYear}</span>
  <span>© ${new Date().getFullYear()}</span>
</div>

</body>
</html>`;

    const win = openPrintDoc();
    if (!win) { toast.error("Pop-up blocked — allow pop-ups and try again"); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.onload = () => { win.print(); };
}

/* ═══════════════════════════════════════════════════════════════════════════
   WORD EXPORT — Uses docx-js via a bundled inline script injected at runtime.
   Generates a proper .docx matching the print layout exactly.
   Falls back to a clean HTML blob if docx-js isn't available in browser.
═══════════════════════════════════════════════════════════════════════════ */
async function exportToWord(opts: {
    paper: any;
    profileData: any;
    sections: { sectionName: string; questions: any[] }[];
}) {
    const { paper, profileData, sections } = opts;
    const schoolName = profileData?.name || "School Name";
    const academicYear = paper.academicYear || profileData?.academicYear || new Date().getFullYear();
    const totalMarks = paper.totalMarks || 100;
    const duration = paper.duration || 60;

    toast.info("Preparing Word document…");

    try {
        /* ── Load docx from CDN ── */
        await new Promise<void>((resolve, reject) => {
            if ((window as any).docx) { resolve(); return; }
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/docx/8.5.0/docx.min.js";
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("Could not load docx.js"));
            document.head.appendChild(s);
        });

        const {
            Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
            AlignmentType, BorderStyle, WidthType, ShadingType, UnderlineType,
        } = (window as any).docx;

        const CW = 9026; // A4 content width in DXA (1" margins each side)
        const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
        const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
        const blueBorder = { style: BorderStyle.SINGLE, size: 6, color: "2D3A8C" };
        const blueBorders = { top: blueBorder, bottom: blueBorder, left: blueBorder, right: blueBorder };
        const thinGray = { style: BorderStyle.SINGLE, size: 2, color: "CBD5E1" };

        const sp = (pt = 80) => new Paragraph({ spacing: { before: pt, after: 0 }, children: [] });
        const hr = (color = "2D3A8C", sz = 6) => new Paragraph({
            spacing: { before: 60, after: 60 },
            border: { bottom: { style: BorderStyle.SINGLE, size: sz, color } }
        });

        /* School header table */
        const hdrTable = new Table({
            width: { size: CW, type: WidthType.DXA },
            columnWidths: [Math.round(CW * 0.78), Math.round(CW * 0.22)],
            rows: [new TableRow({
                children: [
                    new TableCell({
                        borders: noBorders,
                        width: { size: Math.round(CW * 0.78), type: WidthType.DXA },
                        margins: { top: 60, bottom: 60, left: 0, right: 120 },
                        children: [
                            new Paragraph({
                                spacing: { before: 0, after: 30 }, children: [
                                    new TextRun({ text: schoolName, bold: true, size: 30, font: "Arial", color: "2D3A8C", allCaps: true })
                                ]
                            }),
                            new Paragraph({
                                spacing: { before: 0, after: 0 }, children: [
                                    new TextRun({ text: `Academic Year: ${academicYear}`, size: 18, font: "Arial", color: "64748B" })
                                ]
                            }),
                        ]
                    }),
                    new TableCell({
                        borders: noBorders,
                        width: { size: Math.round(CW * 0.22), type: WidthType.DXA },
                        margins: { top: 60, bottom: 60, left: 80, right: 0 },
                        children: [new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [new TextRun({ text: "EXAM PAPER", bold: true, size: 18, font: "Arial", color: "94A3B8" })]
                        })]
                    }),
                ]
            })]
        });

        /* Title */
        const titlePara = new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 220, after: 80 },
            children: [new TextRun({ text: paper.paperTitle || "Question Paper", bold: true, size: 36, font: "Arial Black", color: "1E293B", allCaps: true })]
        });
        const metaPara = new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 180 },
            children: [
                new TextRun({ text: `TIME: ${duration} MINUTES`, bold: true, size: 23, font: "Arial", color: "1E293B" }),
                new TextRun({ text: "          ", size: 23 }),
                new TextRun({ text: `TOTAL MARKS: ${totalMarks}`, bold: true, size: 23, font: "Arial", color: "1E293B" }),
            ]
        });

        /* Candidate box */
        const candTable = new Table({
            width: { size: CW, type: WidthType.DXA },
            columnWidths: [Math.round(CW * 0.56), Math.round(CW * 0.44)],
            rows: [new TableRow({
                children: [
                    new TableCell({
                        borders: blueBorders,
                        shading: { fill: "F8FAFF", type: ShadingType.CLEAR },
                        width: { size: Math.round(CW * 0.56), type: WidthType.DXA },
                        margins: { top: 120, bottom: 120, left: 180, right: 120 },
                        children: [new Paragraph({
                            children: [
                                new TextRun({ text: "CANDIDATE NAME: ", bold: true, size: 22, font: "Arial", color: "2D3A8C" }),
                                new TextRun({ text: ".................................................................", size: 22, font: "Arial", color: "AAAAAA" }),
                            ]
                        })]
                    }),
                    new TableCell({
                        borders: blueBorders,
                        shading: { fill: "F8FAFF", type: ShadingType.CLEAR },
                        width: { size: Math.round(CW * 0.44), type: WidthType.DXA },
                        margins: { top: 120, bottom: 120, left: 180, right: 120 },
                        children: [new Paragraph({
                            children: [
                                new TextRun({ text: "ADM NO: ", bold: true, size: 22, font: "Arial", color: "2D3A8C" }),
                                new TextRun({ text: ".............................................", size: 22, font: "Arial", color: "AAAAAA" }),
                            ]
                        })]
                    }),
                ]
            })]
        });

        /* Instructions */
        const instrParas: any[] = [
            sp(140),
            new Paragraph({
                spacing: { before: 0, after: 80 }, children: [
                    new TextRun({
                        text: "INSTRUCTIONS TO CANDIDATES:", bold: true, size: 22, font: "Arial", color: "1E293B",
                        underline: { type: UnderlineType.SINGLE }
                    })
                ]
            }),
            ...(paper.instructions || "").split("\n").filter(Boolean).map((line: string) =>
                new Paragraph({
                    spacing: { before: 20, after: 20 },
                    indent: { left: 360 },
                    children: [new TextRun({ text: line, size: 21, font: "Arial", color: "334155" })]
                })
            ),
        ];

        /* Sections + Questions */
        const questionParas: any[] = [];
        let globalQNum = 1;

        sections.forEach((sec, si) => {
            const secMarks = sec.questions.reduce((a, q) => a + (Number(q.marks) || 0), 0);
            const secQCount = sec.questions.length;

            /* Section header */
            const secHdrTable = new Table({
                width: { size: CW, type: WidthType.DXA },
                columnWidths: [Math.round(CW * 0.6), Math.round(CW * 0.4)],
                rows: [new TableRow({
                    children: [
                        new TableCell({
                            borders: noBorders,
                            shading: { fill: "EEF2FF", type: ShadingType.CLEAR },
                            width: { size: Math.round(CW * 0.6), type: WidthType.DXA },
                            margins: { top: 100, bottom: 100, left: 180, right: 120 },
                            children: [new Paragraph({
                                children: [
                                    new TextRun({ text: sec.sectionName, bold: true, size: 24, font: "Arial", color: "2D3A8C", allCaps: true })
                                ]
                            })]
                        }),
                        new TableCell({
                            borders: noBorders,
                            shading: { fill: "EEF2FF", type: ShadingType.CLEAR },
                            width: { size: Math.round(CW * 0.4), type: WidthType.DXA },
                            margins: { top: 100, bottom: 100, left: 120, right: 180 },
                            children: [new Paragraph({
                                alignment: AlignmentType.RIGHT, children: [
                                    new TextRun({ text: `${secQCount} QUESTION${secQCount !== 1 ? "S" : ""}  ·  ${secMarks} MARKS`, bold: true, size: 18, font: "Arial", color: "6366F1" })
                                ]
                            })]
                        }),
                    ]
                })]
            });

            questionParas.push(sp(180));
            questionParas.push(secHdrTable);
            questionParas.push(sp(80));

            sec.questions.forEach(q => {
                const qNum = globalQNum++;
                const marks = Number(q.marks) || 0;
                const ansLines = Math.min(Math.max(Math.ceil(marks * 1.5), 3), 10);

                const qTable = new Table({
                    width: { size: CW, type: WidthType.DXA },
                    columnWidths: [440, CW - 440 - 860, 860],
                    rows: [new TableRow({
                        children: [
                            new TableCell({
                                borders: noBorders,
                                width: { size: 440, type: WidthType.DXA },
                                margins: { top: 60, bottom: 60, left: 0, right: 60 },
                                children: [new Paragraph({
                                    alignment: AlignmentType.RIGHT, children: [
                                        new TextRun({ text: `${qNum}.`, bold: true, size: 22, font: "Arial", color: "2D3A8C" })
                                    ]
                                })]
                            }),
                            new TableCell({
                                borders: noBorders,
                                width: { size: CW - 440 - 860, type: WidthType.DXA },
                                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                                children: [new Paragraph({
                                    spacing: { before: 0, after: 0 }, children: [
                                        new TextRun({ text: q.questionText || "", size: 22, font: "Arial", color: "1E293B" })
                                    ]
                                })]
                            }),
                            new TableCell({
                                borders: noBorders,
                                width: { size: 860, type: WidthType.DXA },
                                margins: { top: 60, bottom: 60, left: 60, right: 0 },
                                children: [new Paragraph({
                                    alignment: AlignmentType.RIGHT, children: [
                                        new TextRun({ text: `(${marks} ${marks === 1 ? "mark" : "marks"})`, bold: true, size: 20, font: "Arial", color: "6366F1" })
                                    ]
                                })]
                            }),
                        ]
                    })]
                });

                questionParas.push(qTable);

                // Answer lines
                for (let l = 0; l < ansLines; l++) {
                    questionParas.push(new Paragraph({
                        spacing: { before: 0, after: 0 },
                        indent: { left: 520 },
                        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "E2E8F0" } },
                        children: [new TextRun({ text: " ", size: 22, font: "Arial" })]
                    }));
                }
                questionParas.push(sp(80));
            });
        });

        /* Footer para */
        const footerPara = new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 0 },
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" } },
            children: [
                new TextRun({ text: schoolName, bold: true, size: 18, font: "Arial", color: "64748B" }),
                new TextRun({ text: "  ·  ", size: 18, font: "Arial", color: "CBD5E1" }),
                new TextRun({ text: `${paper.paperTitle || "Question Paper"}  ·  ${academicYear}`, size: 18, font: "Arial", color: "94A3B8" }),
            ]
        });

        const doc = new Document({
            styles: {
                default: { document: { run: { font: "Arial", size: 22, color: "1E293B" } } }
            },
            sections: [{
                properties: {
                    page: {
                        size: { width: 11906, height: 16838 },
                        margin: { top: 1008, right: 1008, bottom: 1008, left: 1008 }
                    }
                },
                children: [
                    hdrTable,
                    hr("2D3A8C", 8),
                    sp(60),
                    titlePara,
                    metaPara,
                    candTable,
                    ...instrParas,
                    hr("CBD5E1", 4),
                    ...questionParas,
                    sp(180),
                    hr("CBD5E1", 3),
                    footerPara,
                ]
            }]
        });

        const buffer = await Packer.toBuffer(doc);
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(paper.paperTitle || "question-paper").replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")}.docx`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Word document downloaded!");

    } catch (err: any) {
        console.error("Word export error:", err);
        toast.error("Word export failed — please try Print instead");
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   Helper: compile sections from form state
═══════════════════════════════════════════════════════════════════════════ */
function compileSections(allQuestions: any[], manualSelections: Record<string, number>, editedTexts: Record<string, string>, hasSections: boolean, sectionCount: number) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (hasSections) {
        const compiled = Array.from({ length: sectionCount }, (_, i) => ({
            sectionName: `Section ${alphabet[i]}`,
            questions: [] as any[]
        }));
        Object.entries(manualSelections).forEach(([qId, secIdx]) => {
            const q = allQuestions.find((bq: any) => bq._id === qId);
            if (q && secIdx >= 0 && secIdx < sectionCount) {
                compiled[secIdx].questions.push({
                    ...q,
                    questionText: editedTexts[q._id] !== undefined ? editedTexts[q._id] : q.questionText
                });
            }
        });
        return compiled.filter(s => s.questions.length > 0);
    } else {
        const qs: any[] = [];
        Object.entries(manualSelections).forEach(([qId, included]) => {
            if (included === 1) {
                const q = allQuestions.find((bq: any) => bq._id === qId);
                if (q) qs.push({ ...q, questionText: editedTexts[q._id] ?? q.questionText });
            }
        });
        return [{ sectionName: "GENERAL", questions: qs }];
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════════════════ */
export default function QuestionPaperForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEdit = Boolean(id && id !== "new");

    const [form, setForm] = useState({
        paperTitle: "", examId: "", classId: "", subjectId: "",
        duration: 120, instructions: "1. Answer all questions in Section A.\n2. Answer any two questions from Section B.\n3. Calculators are permitted.",
        totalMarks: 100, blueprint: []
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [hasSections, setHasSections] = useState(false);
    const [sectionCount, setSectionCount] = useState(2);
    const [manualSelections, setManualSelections] = useState<Record<string, number>>({});
    const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
    const [savedQuestions, setSavedQuestions] = useState<any[]>([]);

    const { data: profileData } = useQuery({
        queryKey: ["tenant_profile_global"],
        queryFn: async () => { const r = await api.get("/auth/tenant/profile"); return Array.isArray(r.data) ? r.data[0] : r.data; },
        staleTime: Infinity,
    });

    const { data: subjects = [] } = useQuery({ queryKey: ["subjects"], queryFn: async () => (await api.get("/subjects")).data || [] });
    const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: async () => (await api.get("/classes")).data || [] });
    const { data: exams = [] } = useQuery({ queryKey: ["exams"], queryFn: async () => (await api.get("/exams")).data || [] });

    const { data: bankQuestions = [] } = useQuery<any[]>({
        queryKey: ["bank_questions", form.subjectId, form.classId],
        queryFn: async () => {
            if (!form.subjectId || !form.classId) return [];
            return (await api.get(`/questions?subjectId=${form.subjectId}&classId=${form.classId}`)).data || [];
        }
    });

    const { isLoading: isLoadingPaper } = useQuery({
        queryKey: ["question_paper", id],
        queryFn: async () => { if (!isEdit) return null; return (await api.get(`/question-papers/${id}`)).data; },
        enabled: isEdit,
    });

    useEffect(() => {
        if (!isEdit && subjects.length && classes.length && exams.length && !form.subjectId) {
            setForm(f => ({ ...f, examId: exams[0]?._id || "", classId: classes[0]?._id || "", subjectId: subjects[0]?._id || "" }));
        }
    }, [subjects, classes, exams, isEdit, form.subjectId]);

    useEffect(() => {
        const fetchPaper = async () => {
            if (!isEdit) return;
            try {
                const paper = (await api.get(`/question-papers/${id}`)).data;
                setForm({ paperTitle: paper.paperTitle || "", examId: paper.examId || "", classId: paper.classId || "", subjectId: paper.subjectId || "", duration: paper.duration || 120, instructions: paper.instructions || "", totalMarks: paper.totalMarks || 100, blueprint: [] });
                if (paper.sections?.length) {
                    setHasSections(paper.sections.length > 1 || paper.sections[0].sectionName !== "General");
                    setSectionCount(Math.max(2, paper.sections.length));
                    const sel: Record<string, number> = {};
                    const txts: Record<string, string> = {};
                    const qs: any[] = [];
                    paper.sections.forEach((sec: any, idx: number) => {
                        sec.questions?.forEach((q: any) => {
                            sel[q._id] = paper.sections.length === 1 && sec.sectionName === "General" ? 1 : idx;
                            if (q.questionText) txts[q._id] = q.questionText;
                            qs.push(q);
                        });
                    });
                    setManualSelections(sel); setEditedTexts(txts); setSavedQuestions(qs);
                }
            } catch { toast.error("Failed to load paper"); }
        };
        fetchPaper();
    }, [isEdit, id]);

    const allQuestions = [...bankQuestions];
    savedQuestions.forEach(sq => { if (!allQuestions.find((q: any) => q._id === sq._id)) allQuestions.push(sq); });

    useEffect(() => {
        const sumMarks = Object.entries(manualSelections).reduce((acc, [qId, val]) => {
            if (val >= 0) { const q = allQuestions.find((bq: any) => bq._id === qId); return acc + (Number(q?.marks) || 0); }
            return acc;
        }, 0);
        if (sumMarks > 0) setForm(f => ({ ...f, totalMarks: sumMarks, duration: Math.ceil(sumMarks * 1.5) }));
    }, [manualSelections, bankQuestions, savedQuestions]);

    const generateMutation = useMutation({
        mutationFn: (data: any) => isEdit ? api.put(`/question-papers/${id}`, data) : api.post("/question-papers/generate", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["question_papers"] });
            toast.success(isEdit ? "Paper updated!" : "Paper generated!");
            navigate("/papers/create");
        },
    });

    const handleGenerate = () => {
        if (!form.paperTitle) { toast.error("Please enter a Paper Title"); return; }
        const sections = compileSections(allQuestions, manualSelections, editedTexts, hasSections, sectionCount);
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            generateMutation.mutate({ ...form, isManual: true, sections });
        }, 1500);
    };

    const handlePrint = () => {
        const sections = compileSections(allQuestions, manualSelections, editedTexts, hasSections, sectionCount);
        if (!sections.some(s => s.questions.length > 0)) { toast.error("Add at least one question before printing"); return; }
        printQuestionPaper({ paper: form, profileData, sections, hasSections });
    };

    const handleExportWord = () => {
        const sections = compileSections(allQuestions, manualSelections, editedTexts, hasSections, sectionCount);
        if (!sections.some(s => s.questions.length > 0)) { toast.error("Add at least one question before exporting"); return; }
        exportToWord({ paper: form, profileData, sections });
    };

    if (isLoadingPaper) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#f8fafc]">
                <Loader2 className="w-12 h-12 text-[#5C67F2] animate-spin" />
                <p className="mt-4 text-sm font-bold text-slate-500 uppercase tracking-widest">Loading Paper Details...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[#f8fafc] min-h-screen p-6 overflow-y-auto custom-scrollbar">
            <div className="max-w-5xl mx-auto">
                <Button variant="ghost" onClick={() => navigate("/papers/create")}
                    className="mb-6 h-10 px-4 rounded-xl font-bold text-slate-500 hover:text-slate-900">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Papers
                </Button>

                <div className="bg-white rounded-[3rem] shadow-xl p-10 border border-slate-50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-[#5C67F2]" />

                    <div className="mb-10 flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <h1 className="text-3xl font-black flex items-center gap-4 text-slate-900">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#5C67F2]">
                                    <Wand2 className="w-6 h-6" />
                                </div>
                                {isEdit ? "Edit Question Paper" : "Generate Question Paper"}
                            </h1>
                            <p className="text-sm font-medium text-slate-500 mt-2 ml-16">Configure blueprint requirements, mark distributions, and difficulty balances.</p>
                        </div>

                        {/* Print + Word export buttons */}
                        <div className="flex gap-2 items-center flex-wrap">
                            <button onClick={handlePrint}
                                className="group relative bg-white hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 h-11 px-5 rounded-xl font-bold flex items-center gap-2 transition-all text-sm border border-gray-200 hover:border-indigo-300 shadow-sm hover:shadow-md">
                                <Printer className="w-4 h-4 transition-transform group-hover:scale-110" />
                                Print / PDF
                                <span className="absolute -top-2 -right-2 text-[9px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-full tracking-wide">A4</span>
                            </button>
                            <button onClick={handleExportWord}
                                className="group relative bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-700 h-11 px-5 rounded-xl font-bold flex items-center gap-2 transition-all text-sm border border-gray-200 hover:border-blue-300 shadow-sm hover:shadow-md">
                                <FileText className="w-4 h-4 transition-transform group-hover:scale-110" />
                                Export Word
                                <span className="absolute -top-2 -right-2 text-[9px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded-full tracking-wide">.docx</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Row 1 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-500">Paper Title *</Label>
                                <input placeholder="e.g. End of Term 1 Mathematics Examination"
                                    value={form.paperTitle} onChange={e => setForm({ ...form, paperTitle: e.target.value })}
                                    className="w-full h-14 rounded-2xl bg-slate-50 border-none font-bold px-6 shadow-none text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#5C67F2]" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-500">Associated Examination</Label>
                                <Select value={form.examId} onValueChange={v => setForm({ ...form, examId: v })}>
                                    <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none font-bold px-6 shadow-none text-sm text-slate-700">
                                        <SelectValue placeholder="Select Exam" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-border/50 shadow-2xl">
                                        {exams.map((ex: any) => <SelectItem key={ex._id} value={ex._id} className="font-bold text-xs">{ex.title || ex.examTitle || "General Exam"}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Row 2 */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                            {[
                                { label: "Subject Assignment", key: "subjectId", items: subjects, getName: (s: any) => s.name || s.subjectName },
                                { label: "Class Assignment", key: "classId", items: classes, getName: (c: any) => c.levelName || c.name },
                            ].map(({ label, key, items, getName }) => (
                                <div key={key} className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-500">{label}</Label>
                                    <Select value={(form as any)[key]} onValueChange={v => setForm({ ...form, [key]: v })}>
                                        <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none font-bold px-6 shadow-none text-sm text-slate-700">
                                            <SelectValue placeholder={`Select ${label.split(" ")[0]}`} />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/50 shadow-2xl">
                                            {items.map((item: any) => <SelectItem key={item._id} value={item._id} className="font-bold text-xs">{getName(item)}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-500">Duration (Mins)</Label>
                                <input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: parseInt(e.target.value) || 120 })}
                                    className="w-full h-14 rounded-2xl bg-slate-50 border-none font-bold px-6 shadow-none text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#5C67F2]" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-500">Total Marks</Label>
                                <input type="number" value={form.totalMarks} onChange={e => setForm({ ...form, totalMarks: parseInt(e.target.value) || 100 })}
                                    className="w-full h-14 rounded-2xl bg-slate-50 border-none font-bold px-6 shadow-none text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#5C67F2]" />
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-500">Examination Instructions</Label>
                            <Textarea value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })}
                                className="min-h-[120px] rounded-[2rem] bg-slate-50 border-none focus-visible:ring-2 focus-visible:ring-[#5C67F2] p-6 font-bold leading-relaxed shadow-none text-sm text-slate-700" />
                        </div>

                        {/* Question bank selector */}
                        <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100">
                            <div className="flex flex-col gap-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-xs font-black uppercase tracking-widest text-slate-500 block">Manual Question Selection</Label>
                                        <p className="text-xs font-bold text-slate-400 mt-1">Pick questions from the bank and assign to sections.</p>
                                    </div>
                                    <div className="flex items-center gap-4 bg-white p-2.5 rounded-2xl shadow-sm border border-slate-100">
                                        <Label className="text-xs font-bold ml-2">Has Sections?</Label>
                                        <Switch checked={hasSections} onCheckedChange={setHasSections} />
                                    </div>
                                </div>

                                {hasSections && (
                                    <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm w-max">
                                        <Label className="text-xs font-bold">Number of Sections (A, B, C...):</Label>
                                        <input type="number" min="1" max="5" value={sectionCount}
                                            onChange={e => setSectionCount(parseInt(e.target.value) || 1)}
                                            className="w-24 h-10 rounded-xl bg-slate-50 border-none font-bold text-center outline-none" />
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {allQuestions.length === 0 ? (
                                    <div className="p-12 text-center text-slate-400 font-bold text-sm bg-white rounded-[2rem] border border-dashed border-slate-200">
                                        No questions found in the bank for this subject and class.
                                    </div>
                                ) : allQuestions.map((q: any) => (
                                    <div key={q._id} className="p-6 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-4 group">
                                        <div className="text-sm font-medium text-slate-700 leading-relaxed outline-none hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#5C67F2] p-3 -m-3 rounded-xl transition-all border border-transparent hover:border-slate-200"
                                            contentEditable suppressContentEditableWarning
                                            onBlur={e => setEditedTexts(prev => ({ ...prev, [q._id]: e.currentTarget.innerHTML }))}
                                            dangerouslySetInnerHTML={{ __html: editedTexts[q._id] !== undefined ? editedTexts[q._id] : q.questionText }}
                                        />
                                        <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-50">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg">{q.marks} Marks · {q.difficulty}</span>
                                            <div className="flex items-center gap-2">
                                                {hasSections ? (
                                                    <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                                                        <button onClick={() => setManualSelections(prev => ({ ...prev, [q._id]: -1 }))}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${manualSelections[q._id] === undefined || manualSelections[q._id] === -1 ? "bg-white shadow-sm text-rose-500" : "text-slate-500 hover:text-slate-700"}`}>
                                                            Exclude
                                                        </button>
                                                        {Array.from({ length: sectionCount }).map((_, i) => (
                                                            <button key={i} onClick={() => setManualSelections(prev => ({ ...prev, [q._id]: i }))}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${manualSelections[q._id] === i ? "bg-[#5C67F2] shadow-sm text-white" : "text-slate-500 hover:text-slate-700"}`}>
                                                                Sec {"ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i]}
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                                                        <button onClick={() => setManualSelections(prev => ({ ...prev, [q._id]: -1 }))}
                                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${manualSelections[q._id] === undefined || manualSelections[q._id] === -1 ? "bg-white shadow-sm text-rose-500" : "text-slate-500 hover:text-slate-700"}`}>
                                                            Exclude
                                                        </button>
                                                        <button onClick={() => setManualSelections(prev => ({ ...prev, [q._id]: 1 }))}
                                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${manualSelections[q._id] === 1 ? "bg-[#5C67F2] shadow-sm text-white" : "text-slate-500 hover:text-slate-700"}`}>
                                                            Include
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between gap-4 pt-6 border-t border-slate-100">
                            <div className="flex gap-2">
                                {/* Secondary print/word buttons also at bottom */}
                                <button onClick={handlePrint}
                                    className="group relative bg-white hover:bg-indigo-50 text-gray-600 hover:text-indigo-700 h-11 px-4 rounded-xl font-bold flex items-center gap-2 text-sm border border-gray-200 hover:border-indigo-300 transition-all shadow-sm">
                                    <Printer className="w-4 h-4" /> Print
                                </button>
                                <button onClick={handleExportWord}
                                    className="group relative bg-white hover:bg-blue-50 text-gray-600 hover:text-blue-700 h-11 px-4 rounded-xl font-bold flex items-center gap-2 text-sm border border-gray-200 hover:border-blue-300 transition-all shadow-sm">
                                    <FileText className="w-4 h-4" /> Word
                                </button>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => navigate("/papers/create")}
                                    className="h-14 px-8 rounded-2xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50">
                                    Cancel
                                </Button>
                                <Button onClick={handleGenerate} disabled={isGenerating || generateMutation.isPending}
                                    className="h-14 px-10 rounded-2xl font-black shadow-xl shadow-indigo-100 bg-[#5C67F2] hover:bg-[#4a54c4] text-white tracking-wide">
                                    {isGenerating || generateMutation.isPending
                                        ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> GENERATING...</>
                                        : isEdit ? "SAVE CHANGES" : "GENERATE PAPER"
                                    }
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
