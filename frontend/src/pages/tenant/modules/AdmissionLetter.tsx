import { Home, Printer, Search, Loader2, User, GraduationCap } from "lucide-react";
import { useState } from "react";
import { useItems } from "@/hooks/useItems";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export default function AdmissionLetter() {
    const { items: students, isLoading } = useItems("students");
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredStudents = students?.filter((s: any) =>
        s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.registrationNo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const student = students?.find((s: any) => s._id === selectedStudentId);

    const { data: rulesData } = useQuery({
        queryKey: ["rules_regulations"],
        queryFn: async () => {
            const r = await api.get("/rules_regulations");
            return r.data?.[0] || null;
        },
    });

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
    const instituteTarget = profileData?.targetLine || "Education for Excellence";
    const institutePhone = profileData?.phone || "";
    const instituteAddress = profileData?.address || "";
    const instituteWebsite = profileData?.website || "";
    const instituteEmail = profileData?.email || "";
    const instituteLogo = profileData?.logo;
    const rulesContent = rulesData?.content || "1. Students must maintain discipline at all times.\n2. Regular attendance is mandatory.\n3. Respect for teachers and peers is expected.";

    // ─── PRINT FUNCTION ──────────────────────────────────────────────────────
    const printAdmissionLetter = () => {
        if (!student) return;

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) return;

        const logoHtml = instituteLogo
            ? `<img src="${instituteLogo}" style="width:96px;height:96px;object-fit:contain;" />`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#5C67F2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`;

        const avatarHtml = student.avatar
            ? `<img src="${student.avatar}" style="width:100%;height:100%;object-fit:cover;" />`
            : `<div style="width:100%;height:100%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;">
                 <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
               </div>`;

        const field = (label: string, value: string, blue = false) => `
            <div style="display:flex;flex-direction:column;gap:2px;">
                <span style="font-size:8px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">${label}</span>
                <div style="display:flex;align-items:center;gap:5px;">
                    <span style="color:#e2e8f0;font-weight:700;font-size:10px;">↳</span>
                    <span style="font-size:11.5px;font-weight:900;letter-spacing:-0.3px;color:${blue ? '#5C67F2' : '#334155'};">${value || '---'}</span>
                </div>
            </div>`;

        const rulesEscaped = rulesContent
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\n/g, '<br/>');

        const dateStr = new Date().toLocaleDateString('en-GB');
        const serialNo = `#${student._id.slice(-6).toUpperCase()}`;
        const admDate = student.admissionDate || new Date().toLocaleDateString();
        const username = student.registrationNo;
        const password = `shule@${student.registrationNo}`;

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Admission Letter — ${student.studentName}</title>
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
    padding: 14mm 12mm 10mm;
    display: flex;
    flex-direction: column;
    background: white;
    position: relative;
    overflow: hidden;
  }

  /* header */
  .school-header { text-align:center; margin-bottom:18px; }
  .logo-box { width:96px; height:96px; display:flex; align-items:center; justify-content:center; margin:0 auto 10px; }
  .school-name { font-size:22px; font-weight:900; color:#1e293b; text-transform:uppercase; letter-spacing:-0.5px; }
  .school-tagline { font-size:9px; font-weight:700; color:#5C67F2; margin-top:3px; letter-spacing:3px; text-transform:uppercase; opacity:0.8; }
  .school-contacts { display:flex; justify-content:center; align-items:center; gap:12px; margin-top:8px; font-size:8.5px; font-weight:600; color:#94a3b8; }
  .dot { width:3px; height:3px; background:#e2e8f0; border-radius:50%; }

  /* title band */
  .title-band { display:flex; align-items:center; gap:14px; margin-bottom:18px; }
  .band-line { flex:1; height:1px; background:#f1f5f9; }
  .band-text { font-size:12px; font-weight:900; color:#1e293b; text-transform:uppercase; letter-spacing:4px; white-space:nowrap; border-top:2px solid #f1f5f9; border-bottom:2px solid #f1f5f9; padding:5px 18px; }

  /* top info row */
  .top-row { display:flex; gap:20px; margin-bottom:18px; }
  .avatar-box { width:130px; height:130px; border:2px solid #f1f5f9; border-radius:20px; overflow:hidden; flex-shrink:0; }
  .fields-grid { flex:1; display:grid; grid-template-columns:1fr 1fr; gap:12px 24px; }

  /* section divider */
  .section-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px 36px; margin-bottom:16px; border-top:1px solid #f8fafc; padding-top:14px; }

  /* rules */
  .rules-title { font-size:9px; font-weight:900; color:#1e293b; text-transform:uppercase; letter-spacing:2px; border-bottom:1px solid #f1f5f9; padding-bottom:6px; margin-bottom:8px; }
  .rules-body { font-size:9px; color:#64748b; line-height:1.7; }

  /* signatures */
  .sigs { display:flex; justify-content:space-between; align-items:flex-end; padding:0 8px; margin-top:auto; margin-bottom:36px; }
  .sig-item { display:flex; flex-direction:column; align-items:center; }
  .sig-line { width:160px; border-bottom:2px dotted #cbd5e1; margin-bottom:6px; }
  .sig-line.short { width:110px; text-align:center; font-size:9px; color:#94a3b8; font-weight:700; padding-bottom:4px; }
  .sig-label { font-size:7.5px; font-weight:900; color:#64748b; text-transform:uppercase; letter-spacing:2px; }

  /* footer */
  .print-footer { position:absolute; bottom:8mm; left:12mm; right:12mm; border-top:1px solid #f1f5f9; padding-top:8px; display:flex; justify-content:space-between; align-items:flex-end; }
  .footer-left { font-size:7px; font-weight:700; color:#cbd5e1; text-transform:uppercase; letter-spacing:3px; }
  .footer-right { text-align:right; }
  .footer-brand { font-size:9px; font-weight:900; color:#64748b; letter-spacing:-0.3px; }
  .footer-brand span { color:#5C67F2; }
  .footer-sub { font-size:6px; color:#cbd5e1; font-weight:700; text-transform:uppercase; letter-spacing:1px; }

  @page { size: A4 portrait; margin: 0; }
  @media print {
    html, body { width: 210mm; height: 297mm; }
    .page { box-shadow: none; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="school-header">
    <div class="logo-box">${logoHtml}</div>
    <div class="school-name">${instituteName}</div>
    <div class="school-tagline">" ${instituteTarget} "</div>
    <div class="school-contacts">
      ${institutePhone ? `<span>+ ${institutePhone}</span><span class="dot"></span>` : ''}
      ${instituteWebsite ? `<span>${instituteWebsite}</span><span class="dot"></span>` : ''}
      ${instituteEmail ? `<span>${instituteEmail}</span>` : ''}
    </div>
  </div>

  <div class="title-band">
    <div class="band-line"></div>
    <div class="band-text">Admission Letter</div>
    <div class="band-line"></div>
  </div>

  <div class="top-row">
    <div class="avatar-box">${avatarHtml}</div>
    <div class="fields-grid">
      ${field('Serial No', serialNo)}
      ${field('Date of Birth', student.dob)}
      ${field('Date of Admission', admDate)}
      ${field('Registration No', student.registrationNo, true)}
      ${field('Student Name', student.studentName, true)}
      ${field('Gender', student.gender)}
      ${field('Class', student.studentClass, true)}
      ${field('Username', username)}
      ${field('Password', password)}
    </div>
  </div>

  <div class="section-grid">
    ${field('Father Name', student.fatherName)}
    ${field('Mother Name', student.motherName)}
    ${field('Father Mobile', student.fatherPhone)}
    ${field('Religion', student.religion)}
    ${field('Address', student.address)}
    ${field('Blood Group', student.bloodGroup)}
  </div>

  <div style="flex:1;overflow:hidden;">
    <div class="rules-title">Rules and Regulations</div>
    <div class="rules-body">${rulesEscaped}</div>
  </div>

  <div class="sigs">
    <div class="sig-item">
      <div class="sig-line"></div>
      <span class="sig-label">Signature of Authority</span>
    </div>
    <div class="sig-item">
      <div class="sig-line short">${dateStr}</div>
      <span class="sig-label">Date</span>
    </div>
    <div class="sig-item">
      <div class="sig-line"></div>
      <span class="sig-label">Institute Stamp</span>
    </div>
  </div>

  <div class="print-footer">
    <div class="footer-left">ShuleCloud Academic Record</div>
    <div class="footer-right">
      <div class="footer-brand">SHULE<span>CLOUD</span> SYSTEMS</div>
      <div class="footer-sub">Digital School Management Platform</div>
    </div>
  </div>

</div>
</body>
</html>`;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();

        const tryPrint = () => {
            const imgs = printWindow.document.querySelectorAll('img');
            const allReady = Array.from(imgs).every(img => img.complete && img.naturalHeight !== 0);
            if (allReady) {
                printWindow.focus();
                printWindow.print();
                printWindow.onafterprint = () => printWindow.close();
            } else {
                setTimeout(tryPrint, 150);
            }
        };
        setTimeout(tryPrint, 600);
    };
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="flex-1 bg-[#f3f4f6] min-h-screen flex flex-col items-center overflow-y-auto">
            {/* Breadcrumb */}
            <div className="w-full bg-white border-b border-gray-100 px-6 py-4 flex items-center shadow-sm z-10 no-print">
                <span className="font-bold text-gray-800 text-sm mr-2">Students</span>
                <span className="text-gray-300 mx-2">|</span>
                <Home className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-500 font-medium text-sm">- Admission Letter</span>
            </div>

            <div className="p-6 flex flex-col items-center w-full">
                {isLoading ? (
                    <div className="flex flex-col items-center gap-4 py-20 mt-20">
                        <Loader2 className="w-12 h-12 animate-spin text-[#5C67F2]" />
                        <p className="text-slate-400 font-bold animate-pulse">Initializing Admission Portal...</p>
                    </div>
                ) : !student ? (
                    /* ── Search Panel ── */
                    <div className="w-full max-w-[600px] mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500 no-print">
                        <div className="text-center mb-10">
                            <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-[#5C67F2]">
                                <Search className="w-10 h-10" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 mb-2">Admission Letter</h2>
                            <p className="text-slate-400 font-medium">Search for a student to generate their official admission confirmation</p>
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                <Search className="w-5 h-5 text-slate-300 group-focus-within:text-[#5C67F2] transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-16 pl-14 pr-6 bg-white border-2 border-slate-100 rounded-[1.5rem] focus:outline-none focus:border-[#5C67F2] text-slate-700 font-bold shadow-sm transition-all text-lg placeholder:text-slate-200"
                                placeholder="Enter Name or Registration Number..."
                            />
                        </div>

                        {searchTerm && (
                            <div className="mt-6 bg-white border border-slate-100 rounded-[1.5rem] overflow-hidden shadow-xl animate-in fade-in slide-in-from-top-2">
                                {filteredStudents.length > 0 ? (
                                    <div className="max-h-[400px] overflow-y-auto">
                                        {filteredStudents.map((s: any) => (
                                            <button
                                                key={s._id}
                                                onClick={() => setSelectedStudentId(s._id)}
                                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-indigo-50 text-[#5C67F2] rounded-xl flex items-center justify-center font-black">
                                                        {s.studentName[0]}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="font-black text-slate-800 text-sm leading-tight">{s.studentName}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{s.registrationNo} • {s.studentClass}</p>
                                                    </div>
                                                </div>
                                                <div className="text-[10px] font-black text-[#5C67F2] uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
                                                    Generate →
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-10 text-center text-slate-400 font-bold">
                                        No students found matching your search.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    /* ── Letter Preview ── */
                    <div className="flex flex-col items-center w-full animate-in fade-in zoom-in duration-500 py-10">
                        <button
                            onClick={() => { setSelectedStudentId(null); setSearchTerm(""); }}
                            className="mb-8 px-8 py-2.5 bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 rounded-full text-xs font-black transition-all flex items-center gap-2 shadow-sm no-print"
                        >
                            ← BACK TO SEARCH
                        </button>

                        {/* A4 Screen Preview */}
                        <div id="admission-letter" className="a4-page">
                            <div className="text-center mb-10">
                                <div className="flex justify-center mb-4">
                                    <div className="w-24 h-24 flex items-center justify-center">
                                        {instituteLogo
                                            ? <img src={instituteLogo} alt="Logo" className="w-full h-full object-contain" />
                                            : <GraduationCap className="w-16 h-16 text-[#5C67F2]" />}
                                    </div>
                                </div>
                                <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">{instituteName}</h1>
                                <p className="text-[10px] font-black text-[#5C67F2] mt-1 tracking-[0.2em] uppercase opacity-70">
                                    " {instituteTarget} "
                                </p>
                                <div className="flex justify-center items-center gap-4 mt-4 text-[9px] font-bold text-slate-400">
                                    {institutePhone && <span>+ {institutePhone}</span>}
                                    {institutePhone && <span className="w-1 h-1 bg-slate-200 rounded-full inline-block"></span>}
                                    {instituteWebsite && <span>{instituteWebsite}</span>}
                                    {instituteWebsite && <span className="w-1 h-1 bg-slate-200 rounded-full inline-block"></span>}
                                    {instituteEmail && <span>{instituteEmail}</span>}
                                </div>
                            </div>

                            <div className="text-center mb-10">
                                <div className="inline-block px-10 py-1.5 border-y-2 border-slate-100">
                                    <h2 className="text-xl font-black text-slate-800 tracking-[0.2em] uppercase">Admission Letter</h2>
                                </div>
                            </div>

                            <div className="flex gap-12 mb-10">
                                <div className="w-40 h-40 bg-slate-50 border-2 border-slate-100 rounded-3xl overflow-hidden flex-shrink-0">
                                    {student.avatar
                                        ? <img src={student.avatar} alt="" className="w-full h-full object-cover" />
                                        : <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300"><User className="w-16 h-16" /></div>}
                                </div>
                                <div className="flex-1 grid grid-cols-2 gap-y-4 gap-x-8">
                                    <LetterField label="Serial No" value={`#${student._id.slice(-6).toUpperCase()}`} />
                                    <LetterField label="Date Of Birth" value={student.dob} />
                                    <LetterField label="Date of Admission" value={student.admissionDate || new Date().toLocaleDateString()} />
                                    <LetterField label="Registration No" value={student.registrationNo} isBlue />
                                    <LetterField label="Student Name" value={student.studentName} isBlue />
                                    <LetterField label="Gender" value={student.gender} />
                                    <LetterField label="Class" value={student.studentClass} isBlue />
                                    <LetterField label="Username" value={student.registrationNo} />
                                    <LetterField label="Password" value={`shule@${student.registrationNo}`} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-x-12 gap-y-6 mb-10 border-t border-slate-50 pt-8">
                                <div className="space-y-4">
                                    <LetterField label="Father Name" value={student.fatherName} />
                                    <LetterField label="Father Mobile" value={student.fatherPhone} />
                                    <LetterField label="Address" value={student.address} />
                                </div>
                                <div className="space-y-4">
                                    <LetterField label="Mother Name" value={student.motherName} />
                                    <LetterField label="Religion" value={student.religion} />
                                    <LetterField label="Blood Group" value={student.bloodGroup} />
                                </div>
                            </div>

                            <div className="flex-1">
                                <h3 className="text-xs font-black text-slate-800 mb-3 border-b border-gray-100 pb-2 uppercase tracking-wider">Rules And Regulations:</h3>
                                <div className="text-[10px] text-slate-500 leading-relaxed whitespace-pre-line">
                                    {rulesContent}
                                </div>
                            </div>

                            <div className="mt-auto mb-20 flex justify-between items-end px-4">
                                <div className="flex flex-col items-center">
                                    <div className="w-48 border-b-2 border-dotted border-slate-300 mb-3"></div>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">Signature of Authority</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="w-32 border-b-2 border-dotted border-slate-300 mb-3 text-center text-[10px] text-slate-400 font-bold">
                                        {new Date().toLocaleDateString('en-GB')}
                                    </div>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">Date</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="w-48 border-b-2 border-dotted border-slate-300 mb-3"></div>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.15em]">Institute Stamp</span>
                                </div>
                            </div>

                            <div className="absolute bottom-[8mm] left-[12mm] right-[12mm]">
                                <div className="pt-3 border-t border-slate-100 flex justify-between items-end">
                                    <p className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.2em]">SHULECLOUD ACADEMIC RECORD</p>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 tracking-tight">SHULE<span className="text-[#5C67F2]">CLOUD</span> SYSTEMS</p>
                                        <p className="text-[7px] text-slate-300 font-bold uppercase tracking-tighter">Digital School Management Platform</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Print Button */}
                        <button
                            onClick={printAdmissionLetter}
                            className="mt-10 h-12 px-12 bg-[#5C67F2] hover:bg-[#4a54c4] text-white font-black rounded-full shadow-xl shadow-indigo-200 flex items-center gap-3 transition-all text-sm tracking-widest hover:scale-105 no-print"
                        >
                            <Printer className="w-5 h-5" /> PRINT ADMISSION LETTER
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                .a4-page {
                    width: 210mm;
                    height: 297mm;
                    background: white;
                    position: relative;
                    padding: 15mm 12mm;
                    box-sizing: border-box;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                @media print { .no-print { display: none !important; } }
            `}</style>
        </div>
    );
}

function LetterField({ label, value, isBlue }: { label: string; value: string; isBlue?: boolean }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-slate-400 tracking-tight uppercase">{label}</span>
            <div className="flex items-center gap-1.5">
                <span className="text-slate-200 font-bold text-[11px] leading-none">↳</span>
                <span className={`text-[12px] font-black tracking-tight leading-none ${isBlue ? 'text-[#5C67F2]' : 'text-slate-700'}`}>
                    {value || "---"}
                </span>
            </div>
        </div>
    );
}