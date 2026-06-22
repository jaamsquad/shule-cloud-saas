import { useState } from "react";
import { Home, Printer, Download, Search, GraduationCap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useItems } from "@/hooks/useItems";
import api from "@/lib/api";
import { openPrintDoc } from "@/lib/pdfDoc";

export default function PrintBasicList() {
    const [selectedClass, setSelectedClass] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    const { data: classes = [] } = useQuery({
        queryKey: ["classes"],
        queryFn: async () => { const r = await api.get("/academics/classes"); return r.data; },
    });

    const { items: students } = useItems("students");

    const { data: profileData } = useQuery({
        queryKey: ["tenant_profile_global"],
        queryFn: async () => {
            const r = await api.get("/auth/tenant/profile");
            return Array.isArray(r.data) ? r.data[0] : r.data;
        },
        staleTime: Infinity,
        gcTime: Infinity,
    });

    const instituteName = profileData?.name || "Institute Name";
    const instituteTarget = profileData?.targetLine || "";
    const institutePhone = profileData?.phone || "";
    const instituteAddress = profileData?.address || "";

    const filteredStudents = students?.filter((s: any) => {
        const matchesClass = selectedClass === 'all' || s.studentClass === selectedClass;
        const matchesSearch =
            s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.registrationNo.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesClass && matchesSearch;
    });

    // ─── PRINT FUNCTION ───────────────────────────────────────────────────────
    const printReport = () => {
        const printWindow = openPrintDoc();
        if (!printWindow) return;

        const logoHtml = profileData?.logo
            ? `<img src="${profileData.logo}" style="width:50px;height:50px;object-fit:contain;" />`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#5C67F2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`;

        const rowsHtml = (filteredStudents && filteredStudents.length > 0)
            ? filteredStudents.map((s: any, i: number) => `
                <tr>
                    <td>${i + 1}</td>
                    <td>${s.registrationNo}</td>
                    <td class="bold dark">${s.studentName}</td>
                    <td>${s.fatherName || '---'}</td>
                    <td><span class="badge">${s.studentClass}</span></td>
                    <td class="bold red">KES ${s.balance || 0}</td>
                </tr>`).join('')
            : `<tr><td colspan="6" class="empty">No records found for the selected criteria.</td></tr>`;

        const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = new Date().toLocaleTimeString();
        const classLabel = selectedClass === 'all' ? 'Universal' : selectedClass;
        const population = filteredStudents?.length || 0;

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Student List Report</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    width: 210mm;
    height: 297mm;
    background: white;
    font-family: 'Inter', Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 210mm;
    height: 297mm;
    padding: 14mm 12mm 12mm;
    display: flex;
    flex-direction: column;
    background: white;
    position: relative;
    overflow: hidden;
  }

  /* ── HEADER ── */
  .logo-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    margin-bottom: 14px;
  }
  .logo-box { width: 50px; height: 50px; display:flex; align-items:center; justify-content:center; margin-bottom: 10px; }
  .institute-name { font-size: 20px; font-weight: 900; color: #1e293b; letter-spacing: -0.5px; margin-bottom: 3px; }
  .institute-tagline { font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; }
  .institute-contact { font-size: 8.5px; color: #94a3b8; font-weight: 500; display: flex; gap: 8px; align-items: center; justify-content: center; }
  .sep { color: #cbd5e1; }

  .title-row {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 12px 0;
  }
  .divider { flex: 1; height: 1px; background: #e2e8f0; }
  .report-title { font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 3px; white-space: nowrap; }

  .meta-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 18px;
    padding: 10px 14px;
    border-top: 1px solid #f1f5f9;
    border-bottom: 1px solid #f1f5f9;
    margin-bottom: 18px;
  }
  .meta-item { display: flex; align-items: center; gap: 7px; }
  .meta-label { font-size: 7.5px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
  .meta-value { font-size: 10.5px; font-weight: 700; color: #1e293b; }
  .meta-sep { color: #e2e8f0; font-size: 14px; font-weight: 300; }

  /* ── TABLE ── */
  .table-wrap { flex: 1; overflow: hidden; }

  table { width: 100%; border-collapse: collapse; font-size: 9.5px; table-layout: fixed; }

  thead tr th {
    background-color: #1e293b !important;
    color: #fff !important;
    text-align: left;
    padding: 7px 10px;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 7.5px;
    letter-spacing: 1px;
  }

  tbody tr td {
    padding: 7px 10px;
    border-bottom: 1px solid #f1f5f9;
    color: #475569;
    font-size: 9.5px;
  }

  tbody tr:nth-child(even) td { background-color: #fafafa; }

  td.bold { font-weight: 700; }
  td.dark { color: #1e293b; }
  td.red { color: #ef4444; }
  td.empty { text-align: center; padding: 28px; color: #94a3b8; font-style: italic; }

  .badge {
    background: #eff6ff;
    color: #3b82f6;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 700;
    font-size: 7.5px;
  }

  /* ── FOOTER ── */
  .footer {
    position: absolute;
    bottom: 12mm;
    left: 12mm;
    right: 12mm;
  }
  .footer-top { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 6px; }
  .gen-info { font-size: 7.5px; color: #94a3b8; font-weight: 600; }
  .branding { font-size: 8.5px; font-weight: 900; color: #475569; text-align: right; margin: 0; }
  .branding .accent { color: #5C67F2; }
  .platform { font-size: 6px; color: #94a3b8; font-weight: 600; margin: 0; text-align: right; }
  .footer-line { height: 1px; background: #f1f5f9; margin-bottom: 5px; }
  .page-num { font-size: 7px; color: #cbd5e1; text-align: center; font-weight: 700; }

  /* ── PRINT ── */
  @page { size: A4 portrait; margin: 0; }
  @media print {
    html, body { width: 210mm; height: 297mm; }
    .page { box-shadow: none; }
    thead tr th { background-color: #1e293b !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tbody tr:nth-child(even) td { background-color: #fafafa !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .badge { background: #eff6ff !important; color: #3b82f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="logo-section">
    <div class="logo-box">${logoHtml}</div>
    <div class="institute-name">${instituteName}</div>
    ${instituteTarget ? `<div class="institute-tagline">${instituteTarget}</div>` : ''}
    <div class="institute-contact">
      ${institutePhone ? `<span>Tel: ${institutePhone}</span>` : ''}
      ${institutePhone && instituteAddress ? `<span class="sep">|</span>` : ''}
      ${instituteAddress ? `<span>${instituteAddress}</span>` : ''}
    </div>
  </div>

  <div class="title-row">
    <div class="divider"></div>
    <span class="report-title">Student List Report</span>
    <div class="divider"></div>
  </div>

  <div class="meta-bar">
    <div class="meta-item">
      <span class="meta-label">Class:</span>
      <span class="meta-value">${classLabel}</span>
    </div>
    <span class="meta-sep">|</span>
    <div class="meta-item">
      <span class="meta-label">Date:</span>
      <span class="meta-value">${dateStr}</span>
    </div>
    <span class="meta-sep">|</span>
    <div class="meta-item">
      <span class="meta-label">Population:</span>
      <span class="meta-value">${population} Students</span>
    </div>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th style="width:36px">SR</th>
          <th style="width:58px">ID</th>
          <th>Student Name</th>
          <th>Father / Guardian</th>
          <th style="width:76px">Class</th>
          <th style="width:88px">Balance</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  </div>

  <div class="footer">
    <div class="footer-top">
      <div class="gen-info">Official Academic Record &bull; ${timeStr}</div>
      <div>
        <p class="branding">SHULE<span class="accent">CLOUD</span> SYSTEMS</p>
        <p class="platform">Academic Management &amp; Student Information Portal</p>
      </div>
    </div>
    <div class="footer-line"></div>
    <p class="page-num">Page 1 of 1</p>
  </div>

</div>
</body>
</html>`;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();

        // Wait for fonts + images before printing
        const tryPrint = () => {
            const imgs = printWindow.document.querySelectorAll('img');
            const allReady = Array.from(imgs).every(img => img.complete && img.naturalHeight !== 0);
            if (allReady) {
                printWindow.focus();
                printWindow.print();
                // Close after print dialog is dismissed
                printWindow.onafterprint = () => printWindow.close();
            } else {
                setTimeout(tryPrint, 150);
            }
        };

        // Allow fonts to load (Inter from Google Fonts)
        setTimeout(tryPrint, 600);
    };
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col items-center overflow-y-auto">

            {/* Screen-only Controls */}
            <div className="w-full bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm no-print">
                <div className="flex items-center gap-4">
                    <div className="flex items-center text-sm font-bold text-gray-800">
                        <Home className="w-4 h-4 mr-2 text-[#5C67F2]" />
                        Report Builder <span className="mx-2 text-gray-300">/</span> Student List
                    </div>
                    <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="h-9 px-4 border border-gray-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#5C67F2] bg-gray-50"
                    >
                        <option value="all">All Classes</option>
                        {classes.map((cls: any) => (
                            <option key={cls._id} value={cls.name || cls.levelName}>{cls.name || cls.levelName}</option>
                        ))}
                    </select>
                    <div className="relative">
                        <input
                            type="text"
                            className="h-9 pl-9 pr-4 border border-gray-200 rounded-lg text-xs font-medium w-48 focus:outline-none focus:border-[#5C67F2]"
                            placeholder="Filter list..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="h-9 px-4 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center gap-2">
                        <Download className="w-3.5 h-3.5" /> CSV
                    </button>
                    <button
                        onClick={printReport}
                        className="h-9 px-6 bg-[#5C67F2] text-white rounded-lg text-xs font-bold hover:bg-[#4a54c4] flex items-center gap-2 shadow-lg shadow-indigo-200"
                    >
                        <Printer className="w-3.5 h-3.5" /> Print Report
                    </button>
                </div>
            </div>

            {/* A4 Preview on screen */}
            <div className="a4-container">
                <div id="print-document" className="a4-page">

                    <div className="report-header">
                        <div className="logo-section">
                            <div className="logo-box">
                                {profileData?.logo
                                    ? <img src={profileData.logo} alt="Logo" className="w-full h-full object-contain" />
                                    : <GraduationCap className="w-12 h-12 text-[#5C67F2]" />}
                            </div>
                            <h1 className="institute-name">{instituteName}</h1>
                            {instituteTarget && <p className="institute-tagline">{instituteTarget}</p>}
                            <div className="institute-contact">
                                {institutePhone && <span>Tel: {institutePhone}</span>}
                                {institutePhone && instituteAddress && <span className="sep">|</span>}
                                {instituteAddress && <span>{instituteAddress}</span>}
                            </div>
                        </div>

                        <div className="report-title-area">
                            <div className="title-divider"></div>
                            <h2 className="report-title">Student List Report</h2>
                            <div className="title-divider"></div>
                        </div>

                        <div className="meta-summary-horizontal">
                            <div className="meta-item">
                                <span className="label">CLASS:</span>
                                <span className="value">{selectedClass === 'all' ? 'Universal' : selectedClass}</span>
                            </div>
                            <div className="meta-sep">|</div>
                            <div className="meta-item">
                                <span className="label">DATE:</span>
                                <span className="value">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                            </div>
                            <div className="meta-sep">|</div>
                            <div className="meta-item">
                                <span className="label">POPULATION:</span>
                                <span className="value">{filteredStudents?.length || 0} Students</span>
                            </div>
                        </div>
                    </div>

                    <div className="report-content flex-1">
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>SR</th>
                                    <th style={{ width: '60px' }}>ID</th>
                                    <th>Student Name</th>
                                    <th>Father / Guardian</th>
                                    <th style={{ width: '80px' }}>Class</th>
                                    <th style={{ width: '90px' }}>Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents?.map((s: any, i: number) => (
                                    <tr key={s._id}>
                                        <td>{i + 1}</td>
                                        <td>{s.registrationNo}</td>
                                        <td className="font-bold text-slate-800">{s.studentName}</td>
                                        <td>{s.fatherName || '---'}</td>
                                        <td><span className="class-badge">{s.studentClass}</span></td>
                                        <td className="font-bold text-red-500">KES {s.balance || 0}</td>
                                    </tr>
                                ))}
                                {(!filteredStudents || filteredStudents.length === 0) && (
                                    <tr>
                                        <td colSpan={6} className="empty-row">No records found for the selected criteria.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="report-footer">
                        <div className="footer-top">
                            <div className="footer-left">
                                <p className="gen-info">Official Academic Record • {new Date().toLocaleTimeString()}</p>
                            </div>
                            <div className="footer-right">
                                <p className="branding">SHULE<span className="accent">CLOUD</span> SYSTEMS</p>
                                <p className="platform">Academic Management & Student Information Portal</p>
                            </div>
                        </div>
                        <div className="footer-line"></div>
                        <p className="page-number">Page 1 of 1</p>
                    </div>
                </div>
            </div>

            <style>{`
                .no-print { display: flex; }

                .a4-container {
                    padding: 40px 0;
                    display: flex;
                    justify-content: center;
                    width: 100%;
                }

                .a4-page {
                    width: 210mm;
                    height: 297mm;
                    background: white;
                    position: relative;
                    padding: 15mm 12mm;
                    box-sizing: border-box;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .logo-section { display:flex; flex-direction:column; align-items:center; text-align:center; margin-bottom:20px; }
                .logo-box { width:50px; height:50px; display:flex; align-items:center; justify-content:center; margin-bottom:12px; }
                .institute-name { font-size:22px; font-weight:900; color:#1e293b; letter-spacing:-0.5px; margin-bottom:2px; }
                .institute-tagline { font-size:10px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:2px; margin-bottom:6px; }
                .institute-contact { font-size:9px; color:#94a3b8; font-weight:500; display:flex; gap:8px; align-items:center; }
                .sep { color:#cbd5e1; }
                .report-title-area { display:flex; align-items:center; gap:15px; margin:15px 0; }
                .title-divider { flex:1; height:1px; background:linear-gradient(to right, transparent, #e2e8f0, transparent); }
                .report-title { font-size:12px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:3px; }
                .meta-summary-horizontal { display:flex; align-items:center; justify-content:center; gap:20px; margin-bottom:25px; padding:12px; border-top:1px solid #f1f5f9; border-bottom:1px solid #f1f5f9; }
                .meta-item { display:flex; align-items:center; gap:8px; }
                .meta-item .label { font-size:8px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; }
                .meta-item .value { font-size:11px; font-weight:700; color:#1e293b; }
                .meta-sep { color:#e2e8f0; font-weight:300; font-size:14px; }

                .report-table { width:100%; border-collapse:collapse; font-size:10px; table-layout:fixed; }
                .report-table th { background:#1e293b; color:white; text-align:left; padding:8px 12px; font-weight:700; text-transform:uppercase; font-size:8px; letter-spacing:1px; }
                .report-table td { padding:8px 12px; border-bottom:1px solid #f1f5f9; color:#475569; }
                .class-badge { background:#eff6ff; color:#3b82f6; padding:2px 6px; border-radius:4px; font-weight:700; font-size:8px; }
                .empty-row { text-align:center; padding:30px !important; color:#94a3b8; font-style:italic; }

                .report-footer { position:absolute; bottom:15mm; left:12mm; right:12mm; }
                .footer-top { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:8px; }
                .gen-info { font-size:8px; color:#94a3b8; font-weight:600; }
                .branding { font-size:9px; font-weight:900; color:#475569; text-align:right; margin:0; }
                .branding .accent { color:#5C67F2; }
                .platform { font-size:6px; color:#94a3b8; font-weight:600; margin:0; }
                .footer-line { height:1px; background:#f1f5f9; margin-bottom:6px; }
                .page-number { font-size:7px; color:#cbd5e1; text-align:center; font-weight:700; }

                @media print { .no-print { display:none !important; } }
            `}</style>
        </div>
    );
}