import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { 
    Award, Printer, Search, Filter, GraduationCap, Calendar, 
    BookOpen, CheckCircle, UserCheck, ChevronRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { openPrintDoc } from "@/lib/pdfDoc";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

export default function StudentsReportCard() {
    const [selectedClass, setSelectedClass] = useState("");
    // Multiple exams can be combined (annual report). Empty = none selected.
    const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeReport, setActiveReport] = useState<any>(null);

    // Fetch tenant profile for institute name and logo
    const { data: profileData } = useQuery({
        queryKey: ["tenant_profile_global"],
        queryFn: async () => {
            const r = await api.get("/auth/tenant/profile");
            return Array.isArray(r.data) ? r.data[0] : r.data;
        },
        staleTime: Infinity,
        gcTime: Infinity,
    });

    // Fetch filter dropdowns
    const { data: classes = [] } = useQuery({
        queryKey: ["reports_shared_classes"],
        queryFn: async () => (await api.get("/reports/shared/classes")).data
    });

    const { data: exams = [] } = useQuery({
        queryKey: ["reports_shared_exams"],
        queryFn: async () => (await api.get("/reports/shared/exams")).data
    });

    // Fetch report cards data
    const { data: reportCards = [], isLoading } = useQuery({
        queryKey: ["reports_report_cards", selectedClass, selectedExamIds],
        queryFn: async () => {
            const res = await api.get("/reports/report-cards", {
                params: { class_id: selectedClass || undefined, exam_id: selectedExamIds.join(",") || undefined }
            });
            return res.data?.data || [];
        }
    });

    const filteredReports = reportCards.filter((r: any) => 
        r.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.admNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handlePrint = (report: any) => {
        const schoolLogo = profileData?.logo || "";
        const schoolName = profileData?.name || report.schoolName || 'ShuleCloud International Academy';
        const schoolAddress = [profileData?.address || profileData?.location, profileData?.city || profileData?.county, profileData?.phone, profileData?.email].filter(Boolean).join(" · ");
        const template = profileData?.reportTemplate || 'cherith_termly';

        const logoHtml = schoolLogo
            ? `<img src="${schoolLogo}" style="max-height: 75px; width: auto; object-fit: contain;" />`
            : `<div style="width: 60px; height: 60px; border-radius: 50%; background: #C2185B; color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; margin: 0 auto;">SC</div>`;

        const studentPhotoUrl = report.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80";
        const studentPhotoHtml = `<img src="${studentPhotoUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;" />`;

        let htmlContent = "";

        if (template === 'cherith_termly') {
            const subjectsRows = report.subjects.map((s: any) => {
                const numericScore = Number(s.score) || 0;
                const ca1 = Math.round((numericScore / 100) * 10);
                const ca2 = Math.round((numericScore / 100) * 10);
                const exam = Math.round((numericScore / 100) * 70);
                const total = ca1 + ca2 + exam;
                return `
                    <tr>
                        <td style="text-align: left; font-weight: 600; padding: 6px 8px;">${s.subjectName}</td>
                        <td style="text-align: center; padding: 6px;">${ca1}</td>
                        <td style="text-align: center; padding: 6px;">${ca2}</td>
                        <td style="text-align: center; padding: 6px;">${exam}</td>
                        <td style="text-align: center; font-weight: bold; background: #FDF2F8; color: #BE185D; padding: 6px;">${total}</td>
                        <td style="text-align: center; padding: 6px;">${total}</td>
                        <td style="text-align: center; padding: 6px;">${total}</td>
                        <td style="text-align: center; padding: 6px;">${total}</td>
                        <td style="text-align: center; font-weight: bold; padding: 6px;">${total}</td>
                        <td style="text-align: center; padding: 6px;">${s.grade === 'A' ? '5' : s.grade === 'B' ? '4' : '3'}</td>
                        <td style="text-align: center; font-weight: bold; color: #BE185D; padding: 6px;">${s.grade}</td>
                        <td style="text-align: left; padding: 6px 8px; font-style: italic;">${s.remarks || 'Good'}</td>
                    </tr>
                `;
            }).join("");

            htmlContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>${report.studentName} - Termly Performance Report Sheet</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
                        @page { size: A4 portrait; margin: 15mm; }
                        body { font-family: 'Inter', sans-serif; color: #1E293B; background: #fff; margin: 0; padding: 0; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .main-container { border: 2px solid #BE185D; padding: 20px; border-radius: 8px; }
                        .header-box { border-bottom: 2px solid #BE185D; padding-bottom: 15px; margin-bottom: 15px; display: flex; align-items: center; justify-content: space-between; }
                        .header-center { text-align: center; flex: 1; padding: 0 15px; }
                        .school-title { font-size: 24px; font-weight: 900; color: #BE185D; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
                        .school-motto { font-size: 11px; font-weight: 600; color: #475569; margin: 4px 0; }
                        .school-contact { font-size: 10px; color: #BE185D; font-weight: 700; }
                        .photo-box { width: 80px; height: 95px; border: 2px solid #CBD5E1; background: #F8FAFC; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: #94A3B8; text-align: center; border-radius: 4px; }
                        .report-title-bar { text-align: center; margin-bottom: 15px; }
                        .report-title { font-size: 16px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0; }
                        .student-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; background: #FDF2F8; padding: 12px; border-radius: 6px; border: 1px solid #FBCFE8; font-size: 11px; margin-bottom: 20px; }
                        .grid-item { display: flex; flex-direction: column; }
                        .grid-label { font-weight: 600; color: #9D174D; font-size: 9px; text-transform: uppercase; }
                        .grid-value { font-weight: 800; color: #1E293B; font-size: 12px; mt-0.5; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #CBD5E1; font-size: 10px; }
                        th { background: #BE185D; color: #fff; padding: 8px 6px; text-align: center; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; border: 1px solid #9D174D; }
                        td { border: 1px solid #CBD5E1; }
                        .bottom-grids { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; font-size: 10px; margin-bottom: 20px; }
                        .side-box { border: 1px solid #CBD5E1; border-radius: 6px; overflow: hidden; background: #F8FAFC; }
                        .side-title { background: #BE185D; color: white; font-weight: bold; padding: 6px 10px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
                        .side-row { display: flex; justify-content: space-between; padding: 6px 10px; border-bottom: 1px solid #E2E8F0; }
                        .side-row:last-child { border-bottom: none; }
                        .signatures { margin-top: 30px; padding-top: 15px; border-top: 2px solid #E2E8F0; display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; color: #334155; }
                        .sig-line { border-top: 1px solid #334155; width: 200px; padding-top: 4px; text-align: center; margin-top: 30px; }
                    </style>
                </head>
                <body>
                    <div class="main-container">
                        <div class="header-box">
                            <div>${logoHtml}</div>
                            <div class="header-center">
                                <h1 class="school-title">${schoolName}</h1>
                                <div class="school-motto">Behind Federal Agric Quarters, Kaduna State, Nigeria</div>
                                <div class="school-contact">Tel: 08034100041, 0803566CHER · Email: cherithschools@gmail.com</div>
                            </div>
                            <div class="photo-box" style="padding:0; overflow:hidden;">${studentPhotoHtml}</div>
                        </div>

                        <div class="report-title-bar">
                            <h2 class="report-title">TERMLY PERFORMANCE REPORT SHEET</h2>
                            <div class="student-grid">
                                <div class="grid-item"><span class="grid-label">Student's Name</span><span class="grid-value">${report.studentName}</span></div>
                                <div class="grid-item"><span class="grid-label">Admission No.</span><span class="grid-value">${report.admNo}</span></div>
                                <div class="grid-item"><span class="grid-label">Class / Grade</span><span class="grid-value">${report.className}</span></div>
                                <div class="grid-item"><span class="grid-label">Academic Session</span><span class="grid-value">${report.term} ${report.year}</span></div>
                                <div class="grid-item"><span class="grid-label">Subjects on Offer</span><span class="grid-value">${report.subjects?.length || 0}</span></div>
                                <div class="grid-item"><span class="grid-label">Total Marks</span><span class="grid-value">${report.totalMarks ?? 0}</span></div>
                                <div class="grid-item"><span class="grid-label">Average Mark</span><span class="grid-value">${report.meanScore ?? 0}%</span></div>
                                <div class="grid-item"><span class="grid-label">Position</span><span class="grid-value">${report.rank || '—'}</span></div>
                            </div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th style="text-align: left; width: 25%;">Cognitive Domain</th>
                                    <th>CA1<br/>(10)</th>
                                    <th>CA2<br/>(10)</th>
                                    <th>Exam<br/>(70)</th>
                                    <th>Total<br/>(100)</th>
                                    <th>1st Term<br/>(100)</th>
                                    <th>2nd Term<br/>(100)</th>
                                    <th>3rd Term<br/>(100)</th>
                                    <th>Average</th>
                                    <th>Rating</th>
                                    <th>Grade</th>
                                    <th style="text-align: left;">Remark</th>
                                </tr>
                            </thead>
                            <tbody>${subjectsRows}</tbody>
                        </table>

                        <div class="bottom-grids">
                            <div class="side-box">
                                <div class="side-title">Attendance Table</div>
                                <div class="side-row"><span>No. of Times School Opened</span><span style="font-weight:bold;">120</span></div>
                                <div class="side-row"><span>No. of Times Present</span><span style="font-weight:bold;">118</span></div>
                                <div class="side-row"><span>No. of Times Absent</span><span style="font-weight:bold;">2</span></div>
                            </div>
                            <div class="side-box">
                                <div class="side-title">Psychomotor Domain</div>
                                <div class="side-row"><span>Punctuality</span><span style="font-weight:bold;">5</span></div>
                                <div class="side-row"><span>Neatness</span><span style="font-weight:bold;">5</span></div>
                                <div class="side-row"><span>Politeness</span><span style="font-weight:bold;">4</span></div>
                                <div class="side-row"><span>Games / Sports</span><span style="font-weight:bold;">5</span></div>
                            </div>
                            <div class="side-box">
                                <div class="side-title">Affective Domain</div>
                                <div class="side-row"><span>Attentiveness</span><span style="font-weight:bold;">5</span></div>
                                <div class="side-row"><span>Reliability</span><span style="font-weight:bold;">4</span></div>
                                <div class="side-row"><span>Cooperation</span><span style="font-weight:bold;">5</span></div>
                                <div class="side-row"><span>Self Control</span><span style="font-weight:bold;">5</span></div>
                            </div>
                        </div>

                        <div style="background: #F8FAFC; border: 1px solid #CBD5E1; padding: 10px 15px; border-radius: 6px; font-size: 10px; font-weight: 600; text-align: center; margin-bottom: 20px;">
                            <span style="color: #BE185D; font-weight: bold; margin-right: 10px;">RATING KEY:</span> 5 = Excellent, 4 = Very Good, 3 = Good, 2 = Fair, 1 = Weak
                        </div>

                        <div class="signatures">
                            <div>
                                <div style="margin-bottom: 20px; font-weight: 600; font-style: italic;">Teacher's Comment: "${report.teacherRemarks || 'An outstanding performance this term. Keep it up!'}"</div>
                                <div class="sig-line">Class Teacher's Signature</div>
                            </div>
                            <div>
                                <div style="margin-bottom: 20px; font-weight: 600; font-style: italic;">Principal's Comment: "${report.principalRemarks || 'Excellent result. Promoted to the next class.'}"</div>
                                <div class="sig-line">Principal's Signature</div>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `;
        } else if (template === 'cbse_scholastic') {
            const scholasticRows = report.subjects.map((s: any) => {
                const numericScore = Number(s.score) || 0;
                const halfYearly = Math.round(numericScore * 0.6);
                const annual = Math.round(numericScore * 0.4);
                return `
                    <tr>
                        <td style="text-align: left; font-weight: 600; padding: 8px 12px;">${s.subjectName}</td>
                        <td style="text-align: center; padding: 8px;">${halfYearly}</td>
                        <td style="text-align: center; padding: 8px;">${annual}</td>
                        <td style="text-align: center; font-weight: bold; padding: 8px;">${numericScore}</td>
                        <td style="text-align: center; font-weight: bold; color: #1D4ED8; padding: 8px; background: #EFF6FF;">${s.grade}</td>
                    </tr>
                `;
            }).join("");

            htmlContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>${report.studentName} - CBSE Academic Report</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap');
                        @page { size: A4 portrait; margin: 15mm; }
                        body { font-family: 'Roboto', sans-serif; color: #1E293B; background: #fff; margin: 0; padding: 0; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .container { border: 4px solid #1E3A8A; padding: 25px; border-radius: 12px; }
                        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #1E3A8A; padding-bottom: 20px; margin-bottom: 20px; }
                        .logo-circle { width: 80px; height: 80px; border-radius: 50%; background: #1E3A8A; color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; text-align: center; }
                        .header-center { text-align: center; flex: 1; padding: 0 20px; }
                        .school-name { font-size: 26px; font-weight: 900; color: #1E3A8A; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
                        .affiliation { font-size: 12px; font-weight: 700; color: #475569; margin: 6px 0; }
                        .academic-session { font-size: 14px; font-weight: 800; color: #DC2626; text-transform: uppercase; }
                        .photo-box { width: 85px; height: 105px; border: 2px solid #94A3B8; background: #F8FAFC; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: #64748B; text-align: center; border-radius: 6px; }
                        .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #F8FAFC; padding: 18px; border-radius: 8px; border: 1px solid #E2E8F0; margin-bottom: 25px; font-size: 12px; }
                        .info-row { display: flex; align-items: center; }
                        .info-label { font-weight: 700; color: #64748B; width: 130px; text-transform: uppercase; font-size: 10px; }
                        .info-val { font-weight: 800; color: #0F172A; }
                        .section-title { font-size: 14px; font-weight: 800; color: #1E3A8A; text-transform: uppercase; margin-bottom: 10px; border-left: 4px solid #DC2626; padding-left: 10px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 1px solid #CBD5E1; font-size: 11px; }
                        th { background: #1E3A8A; color: #fff; padding: 10px 8px; text-align: center; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; border: 1px solid #172554; }
                        td { border: 1px solid #CBD5E1; }
                        .co-scholastic-th { background: #475569; color: white; padding: 8px; font-size: 10px; text-transform: uppercase; text-align: left; }
                        .footer-banner { background: #0F172A; color: white; text-align: center; padding: 14px; font-size: 13px; font-weight: bold; border-radius: 8px; margin-bottom: 30px; letter-spacing: 1px; }
                        .sig-grid { display: flex; justify-content: space-between; margin-top: 40px; font-size: 12px; font-weight: bold; color: #334155; }
                        .sig-box { text-align: center; width: 180px; border-top: 2px solid #334155; padding-top: 8px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div>${logoHtml}</div>
                            <div class="header-center">
                                <h1 class="school-name">${schoolName}</h1>
                                <div class="affiliation">Affiliated to CBSE Board · Affiliation No: 2512A45200</div>
                                <div class="academic-session">Academic Session : ${report.term} ${report.year}</div>
                            </div>
                            <div class="photo-box" style="padding:0; overflow:hidden;">${studentPhotoHtml}</div>
                        </div>

                        <div class="student-info">
                            <div class="info-row"><span class="info-label">Name of Student:</span><span class="info-val">${report.studentName}</span></div>
                            <div class="info-row"><span class="info-label">Roll No:</span><span class="info-val">N01</span></div>
                            <div class="info-row"><span class="info-label">Mother's Name:</span><span class="info-val">Mrs. Heena</span></div>
                            <div class="info-row"><span class="info-label">Admission No:</span><span class="info-val">${report.admNo}</span></div>
                            <div class="info-row"><span class="info-label">Father's Name:</span><span class="info-val">Mr. Rajbeer</span></div>
                            <div class="info-row"><span class="info-label">Class & Section:</span><span class="info-val">${report.className}</span></div>
                        </div>

                        <div class="section-title">Scholastic Areas</div>
                        <table>
                            <thead>
                                <tr>
                                    <th style="text-align: left; width: 40%;">Subject</th>
                                    <th>Term I<br/>(Half Yearly)</th>
                                    <th>Term II<br/>(Annual)</th>
                                    <th>Total<br/>(100)</th>
                                    <th>Overall<br/>Grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${scholasticRows}
                                <tr style="background: #F8FAFC; font-weight: bold; border-top: 2px solid #1E3A8A;">
                                    <td style="padding: 10px 12px; text-align: left;">SUMMARY / TOTAL</td>
                                    <td style="text-align: center; padding: 10px;">Attendance: 96%</td>
                                    <td style="text-align: center; padding: 10px;">Marks: ${report.totalMarks}</td>
                                    <td style="text-align: center; padding: 10px; color: #DC2626;">GPA: ${report.gpa}</td>
                                    <td style="text-align: center; padding: 10px; background: #DBEAFE; color: #1D4ED8;">PASS</td>
                                </tr>
                            </tbody>
                        </table>

                        <div class="section-title">Co-Scholastic Areas (3 Point Grading Scale A, B, C)</div>
                        <table>
                            <thead>
                                <tr>
                                    <th class="co-scholastic-th" style="width: 60%;">Activity / Evaluation Area</th>
                                    <th class="co-scholastic-th" style="text-align: center;">Term I Grade</th>
                                    <th class="co-scholastic-th" style="text-align: center;">Term II Grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td style="padding: 8px 12px; font-weight: 600;">Uniform & Turnout</td><td style="text-align:center; font-weight:bold;">A+</td><td style="text-align:center; font-weight:bold;">A</td></tr>
                                <tr><td style="padding: 8px 12px; font-weight: 600;">Co-curricular Activities</td><td style="text-align:center; font-weight:bold;">A</td><td style="text-align:center; font-weight:bold;">A+</td></tr>
                                <tr><td style="padding: 8px 12px; font-weight: 600;">Discipline & Conduct</td><td style="text-align:center; font-weight:bold;">A+</td><td style="text-align:center; font-weight:bold;">A+</td></tr>
                                <tr><td style="padding: 8px 12px; font-weight: 600;">Written & Presentation Skills</td><td style="text-align:center; font-weight:bold;">A</td><td style="text-align:center; font-weight:bold;">A</td></tr>
                                <tr><td style="padding: 8px 12px; font-weight: 600;">Speaking & Communication Skills</td><td style="text-align:center; font-weight:bold;">B+</td><td style="text-align:center; font-weight:bold;">A</td></tr>
                            </tbody>
                        </table>

                        <div class="footer-banner">
                            To Get This Exam Result Software Visit : www.shulecloud.com
                        </div>

                        <div class="sig-grid">
                            <div class="sig-box">Sign. of Class Teacher</div>
                            <div class="sig-box">Sign. of Principal</div>
                            <div class="sig-box">Sign. of Manager</div>
                        </div>
                    </div>
                </body>
                </html>
            `;
        } else if (template === 'tritriangle_modern') {
            const tableRows = report.subjects.map((s: any) => {
                const numericScore = Number(s.score) || 0;
                return `
                    <tr>
                        <td style="text-align: center; padding: 10px; font-weight: 700; color: #0284C7;">III</td>
                        <td style="text-align: left; padding: 10px 14px; font-weight: 600;">${s.subjectName}</td>
                        <td style="text-align: center; padding: 10px; color: #64748B;">100</td>
                        <td style="text-align: center; padding: 10px; color: #64748B;">50</td>
                        <td style="text-align: center; padding: 10px; font-weight: 800; color: #0F172A; background: #F0F9FF;">${numericScore}</td>
                    </tr>
                `;
            }).join("");

            htmlContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>${report.studentName} - TriTriangle Modern Report</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;800;900&display=swap');
                        @page { size: A4 portrait; margin: 15mm; }
                        body { font-family: 'Montserrat', sans-serif; color: #0F172A; background: #fff; margin: 0; padding: 0; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .container { border: 1px solid #E2E8F0; padding: 30px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
                        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #F1F5F9; padding-bottom: 25px; margin-bottom: 25px; }
                        .logo-mark { font-size: 42px; font-weight: 900; color: #0284C7; letter-spacing: -4px; line-height: 1; }
                        .header-title { text-align: right; }
                        .institute-name { font-size: 28px; font-weight: 900; color: #0F172A; letter-spacing: 2px; margin: 0; }
                        .institute-sub { font-size: 11px; font-weight: 700; color: #0284C7; text-transform: uppercase; letter-spacing: 4px; margin-top: 4px; }
                        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; background: #F8FAFC; padding: 22px; border-radius: 12px; margin-bottom: 30px; font-size: 12px; }
                        .info-item { display: flex; align-items: center; }
                        .info-label { font-weight: 600; color: #64748B; width: 140px; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; }
                        .info-val { font-weight: 800; color: #0F172A; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0; font-size: 11px; }
                        th { background: #0284C7; color: #fff; padding: 14px 10px; text-align: center; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; }
                        td { border-bottom: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0; }
                        .summary-th { background: #475569; color: white; padding: 12px; font-size: 10px; text-transform: uppercase; text-align: center; }
                        .disclaimer { font-size: 9px; color: #EF4444; line-height: 1.5; margin-bottom: 20px; font-weight: 600; }
                        .footer-bar { background: #DC2626; color: white; text-align: center; padding: 14px; font-size: 13px; font-weight: 800; border-radius: 8px; letter-spacing: 1px; display: flex; justify-content: space-around; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div style="max-width: 140px;">${logoHtml}</div>
                            <div class="header-title">
                                <h1 class="institute-name">${schoolName}</h1>
                                <div class="institute-sub">Institute of Management</div>
                            </div>
                        </div>

                        <div class="info-grid">
                            <div class="info-item"><span class="info-label">Student Name:</span><span class="info-val">${report.studentName}</span></div>
                            <div class="info-item"><span class="info-label">Date of Birth:</span><span class="info-val">24-05-2010</span></div>
                            <div class="info-item"><span class="info-label">Father Name:</span><span class="info-val">Sudhir Kumar</span></div>
                            <div class="info-item"><span class="info-label">Program:</span><span class="info-val">${report.className}</span></div>
                            <div class="info-item"><span class="info-label">Batch / Year:</span><span class="info-val">${report.term} ${report.year}</span></div>
                            <div class="info-item"><span class="info-label">Admission No:</span><span class="info-val">${report.admNo}</span></div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 15%;">Year / Term</th>
                                    <th style="text-align: left; width: 40%;">Subject</th>
                                    <th>Max Marks</th>
                                    <th>Min Marks</th>
                                    <th>Marks Obtained</th>
                                </tr>
                            </thead>
                            <tbody>${tableRows}</tbody>
                        </table>

                        <table>
                            <thead>
                                <tr>
                                    <th class="summary-th">Year / Term</th>
                                    <th class="summary-th">Total Obtained Marks</th>
                                    <th class="summary-th">Max Total Marks</th>
                                    <th class="summary-th">Result</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style="font-weight: bold; text-align: center;">
                                    <td style="padding: 12px;">Term I & II</td>
                                    <td style="padding: 12px; color: #0284C7; font-size: 14px;">${report.totalMarks}</td>
                                    <td style="padding: 12px; color: #64748B;">${report.subjects?.length ? report.subjects.length * 100 : 1000}</td>
                                    <td style="padding: 12px; background: #DCFCE7; color: #15803D; font-weight: 900;">PASSED</td>
                                </tr>
                            </tbody>
                        </table>

                        <div class="disclaimer">
                            DISCLAIMER (NOT OFFICIAL COPY): Neither webmaster nor Result Hosting is responsible for any inadvertent error that may have crept in the results being published on NET. The results published on net are immediate information for Students. This cannot be treated as original mark sheet. Original mark sheets will be issued by the Controller Of Examination office separately.
                        </div>

                        <div class="footer-bar">
                            <span>www.shulecloud.com</span>
                            <span>Powered By ShuleCloud</span>
                            <span>Whatsapp: +254 712 345 678</span>
                        </div>
                    </div>
                </body>
                </html>
            `;
        } else if (template === 'islamabad_bimonthly') {
            const tableRows = report.subjects.map((s: any) => {
                const numericScore = Number(s.score) || 0;
                const b1 = Math.round((numericScore / 100) * 10);
                const mid = Math.round((numericScore / 100) * 30);
                const b2 = Math.round((numericScore / 100) * 10);
                const final = Math.round((numericScore / 100) * 50);
                const total = b1 + mid + b2 + final;
                return `
                    <tr>
                        <td style="text-align: left; font-weight: 700; padding: 10px 14px;">${s.subjectName}</td>
                        <td style="text-align: center; padding: 10px;">${b1}.00</td>
                        <td style="text-align: center; padding: 10px;">${mid}.00</td>
                        <td style="text-align: center; padding: 10px;">${b2}.00</td>
                        <td style="text-align: center; padding: 10px;">${final}.00</td>
                        <td style="text-align: center; font-weight: bold; color: #047857; background: #ECFDF5; padding: 10px;">${total}.00</td>
                        <td style="text-align: center; font-weight: bold; color: #15803D; padding: 10px;">Pass</td>
                    </tr>
                `;
            }).join("");

            htmlContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>${report.studentName} - Islamabad Consolidated Report</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;600;700&display=swap');
                        @page { size: A4 portrait; margin: 20mm; }
                        body { font-family: 'Inter', sans-serif; color: #1E293B; background: #fff; margin: 0; padding: 0; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .container { padding: 10px; }
                        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #047857; padding-bottom: 25px; margin-bottom: 25px; }
                        .crest-box { width: 75px; height: 75px; border-radius: 50%; background: #047857; color: white; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: bold; }
                        .header-center { text-align: center; flex: 1; padding: 0 20px; }
                        .college-title { font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 900; color: #065F46; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
                        .report-sub { font-size: 14px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 1px; margin: 8px 0; text-decoration: underline; }
                        .class-bar { font-size: 15px; font-weight: 800; color: #0F172A; margin-top: 5px; }
                        .photo-box { width: 85px; height: 105px; border: 2px solid #CBD5E1; background: #F8FAFC; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: #64748B; text-align: center; border-radius: 6px; }
                        .student-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #F6FADF; padding: 20px; border-radius: 12px; border: 1px solid #D1FAE5; margin-bottom: 30px; font-size: 13px; }
                        .meta-line { display: flex; align-items: center; border-bottom: 1px solid #E2E8F0; pb-2; }
                        .meta-label { font-weight: 600; color: #047857; width: 140px; }
                        .meta-val { font-weight: 800; color: #0F172A; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 1px solid #CBD5E1; font-size: 11px; }
                        th { background: #047857; color: #fff; padding: 12px 8px; text-align: center; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; border: 1px solid #065F46; }
                        td { border: 1px solid #CBD5E1; }
                        .summary-banner { background: #F8FAFC; border: 2px solid #047857; padding: 18px; border-radius: 12px; display: flex; justify-content: space-around; font-size: 14px; font-weight: bold; color: #0F172A; margin-bottom: 40px; }
                        .highlight { color: #047857; font-size: 18px; font-weight: 900; }
                        .remarks-bar { font-size: 14px; font-weight: 700; color: #1E293B; margin-bottom: 50px; border-bottom: 2px solid #E2E8F0; padding-bottom: 10px; }
                        .sig-container { display: flex; justify-content: flex-end; gap: 60px; margin-top: 50px; font-size: 13px; font-weight: bold; color: #334155; }
                        .sig-block { text-align: center; width: 220px; border-top: 2px solid #334155; padding-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div>${logoHtml}</div>
                            <div class="header-center">
                                <h1 class="college-title">${schoolName}</h1>
                                <div class="report-sub">FINAL CONSOLIDATED REPORT CARD</div>
                                <div class="class-bar">Class: ${report.className} (${report.term} ${report.year})</div>
                            </div>
                            <div class="photo-box" style="padding:0; overflow:hidden;">${studentPhotoHtml}</div>
                        </div>

                        <div class="student-meta">
                            <div class="meta-line"><span class="meta-label">Student Name:</span><span class="meta-val">${report.studentName}</span></div>
                            <div class="meta-line"><span class="meta-label">Roll No:</span><span class="meta-val">5</span></div>
                            <div class="meta-line"><span class="meta-label">Father Name:</span><span class="meta-val">Ahmed Hassan</span></div>
                            <div class="meta-line"><span class="meta-label">Admission No:</span><span class="meta-val">${report.admNo}</span></div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th style="text-align: left; width: 30%;">Subject</th>
                                    <th>1st Bimonthly<br/>10%</th>
                                    <th>Mid Term<br/>30%</th>
                                    <th>2nd Bimonthly<br/>10%</th>
                                    <th>Final Term<br/>50%</th>
                                    <th>Total<br/>100%</th>
                                    <th>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>${tableRows}</tbody>
                        </table>

                        <div class="summary-banner">
                            <div>Overall Marks: <span class="highlight">${report.totalMarks} / ${report.subjects?.length ? report.subjects.length * 100 : 700}</span></div>
                            <div>Percentage: <span class="highlight">${report.meanScore ?? 0}%</span></div>
                            <div>Position: <span class="highlight">${report.rank || '—'}</span></div>
                        </div>

                        <div class="remarks-bar">
                            Remarks: <span style="color: #047857; font-weight: 900; text-transform: uppercase;">Promoted to Next Class</span>
                        </div>

                        <div class="sig-container">
                            <div class="sig-block">Class Incharge</div>
                            <div class="sig-block">Vice Principal</div>
                        </div>
                    </div>
                </body>
                </html>
            `;
        } else {
            // annual_split_panel — one column per included exam (no empty columns),
            // plus an Average column only when more than one exam is combined.
            const examList: any[] = report.examList && report.examList.length ? report.examList : [{ id: "_only", name: report.examName || "Marks" }];
            const showAvg = examList.length > 1;
            const examCols = examList.map(e => `<th>${e.name}</th>`).join("");
            const avgCol = showAvg ? `<th>Average</th>` : "";
            const blankCols = examList.map(() => `<td style="text-align: center; padding: 12px;">-</td>`).join("");

            const leftRows = report.subjects.map((s: any) => {
                const per = s.perExam || {};
                const cells = examList.map(e => {
                    const v = e.id === "_only" ? (s.scoreDisplay === "-" ? "-" : s.score) : (per[e.id] != null ? per[e.id] : "-");
                    return `<td style="text-align: center; padding: 10px;">${v}</td>`;
                }).join("");
                const avg = showAvg ? `<td style="text-align: center; font-weight: bold; color: #4F46E5; background: #EEF2FF; padding: 10px;">${s.scoreDisplay === "-" ? "-" : s.score}</td>` : "";
                return `
                    <tr>
                        <td style="text-align: left; font-weight: 600; padding: 10px 12px;">${s.subjectName}</td>
                        ${cells}
                        ${avg}
                    </tr>
                `;
            }).join("");

            // Real personality profile (behaviours module) + attendance.
            const personalityRows = (report.personality && report.personality.length)
                ? report.personality.map((p: any) => `<div class="panel-row"><span>${p.trait}</span><span style="font-weight:bold; color:#4F46E5;">${p.grade}</span></div>`).join("")
                : `<div class="panel-row" style="color:#94a3b8">No behaviour ratings recorded</div>`;
            const att = report.attendanceSummary || {};
            const attText = att.totalDays > 0 ? `${att.presentDays} / ${att.totalDays} Days Present (${att.percentage})` : "No attendance records";

            // ── Performance trend: compact F1T1.. table (columns) + SVG line graph ──
            const trend: { label: string; mean: number }[] = (report.trend && report.trend.length ? report.trend : []);
            let trendHtml = `<div style="padding:20px;text-align:center;color:#94a3b8;font-weight:600;font-size:11px">Not enough exam history to show a trend yet.</div>`;
            if (trend.length) {
                // Compact table — F1T1.. as columns, means in the row below.
                const headCells = trend.map(t => `<th style="background:#4F46E5;color:#fff;padding:6px 4px;font-size:9px;font-weight:800;text-align:center;border:1px solid #4338CA;white-space:nowrap">${t.label}</th>`).join("");
                const meanCells = trend.map(t => `<td style="padding:6px 4px;text-align:center;font-size:11px;font-weight:800;color:#0F172A;border:1px solid #E2E8F0">${t.mean}%</td>`).join("");
                const table = `<table style="width:100%;border-collapse:collapse;margin-bottom:10px"><thead><tr><th style="background:#475569;color:#fff;padding:6px 8px;font-size:9px;text-align:left">Exam</th>${headCells}</tr></thead><tbody><tr><td style="padding:6px 8px;font-size:9px;font-weight:700;color:#475569;border:1px solid #E2E8F0">Mean %</td>${meanCells}</tr></tbody></table>`;

                // Simple SVG line graph (no external libs — prints reliably).
                const W = 300, H = 110, padL = 24, padB = 18, padT = 8, padR = 8;
                const n = trend.length;
                const x = (i: number) => n <= 1 ? (padL + (W - padL - padR) / 2) : padL + (i * (W - padL - padR)) / (n - 1);
                const y = (v: number) => padT + (100 - Math.max(0, Math.min(100, v))) * (H - padT - padB) / 100;
                const pts = trend.map((t, i) => `${x(i)},${y(t.mean)}`).join(" ");
                const dots = trend.map((t, i) => `<circle cx="${x(i)}" cy="${y(t.mean)}" r="3" fill="#4F46E5" /><text x="${x(i)}" y="${y(t.mean) - 6}" font-size="8" fill="#0F172A" text-anchor="middle" font-weight="700">${t.mean}</text><text x="${x(i)}" y="${H - 4}" font-size="8" fill="#64748B" text-anchor="middle" font-weight="700">${t.label}</text>`).join("");
                const grid = [0, 25, 50, 75, 100].map(g => `<line x1="${padL}" y1="${y(g)}" x2="${W - padR}" y2="${y(g)}" stroke="#EEF2FF" stroke-width="1" /><text x="${padL - 4}" y="${y(g) + 3}" font-size="7" fill="#94A3B8" text-anchor="end">${g}</text>`).join("");
                const svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block">${grid}<polyline points="${pts}" fill="none" stroke="#4F46E5" stroke-width="2" />${dots}</svg>`;

                trendHtml = `${table}${svg}`;
            }

            htmlContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>${report.studentName} - Annual Split-Panel Report</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap');
                        @page { size: A4 portrait; margin: 15mm; }
                        body { font-family: 'Plus Jakarta Sans', sans-serif; color: #0F172A; background: #fff; margin: 0; padding: 0; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .container { border: 2px solid #4F46E5; padding: 25px; border-radius: 16px; }
                        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #E2E8F0; padding-bottom: 20px; margin-bottom: 25px; }
                        .crest { width: 70px; height: 70px; border-radius: 16px; background: #4F46E5; color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; }
                        .header-center { text-align: center; flex: 1; padding: 0 20px; }
                        .school-title { font-size: 28px; font-weight: 900; color: #0F172A; margin: 0; text-transform: uppercase; letter-spacing: 1.5px; }
                        .school-addr { font-size: 11px; font-weight: 600; color: #64748B; margin: 4px 0; }
                        .report-badge { display: inline-block; background: #4F46E5; color: white; font-weight: 800; font-size: 13px; px-6; py-1.5; border-radius: 20px; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px; }
                        .student-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; background: #F8FAFC; padding: 18px; border-radius: 12px; border: 1px solid #E2E8F0; margin-bottom: 30px; font-size: 12px; }
                        .bar-item { display: flex; flex-direction: column; }
                        .bar-label { font-weight: 600; color: #64748B; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
                        .bar-val { font-weight: 800; color: #0F172A; font-size: 14px; mt-1; }
                        .split-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 25px; }
                        table { width: 100%; border-collapse: collapse; border: 1px solid #CBD5E1; font-size: 11px; margin-bottom: 20px; }
                        th { background: #4F46E5; color: #fff; padding: 12px 10px; text-align: center; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; border: 1px solid #4338CA; }
                        td { border: 1px solid #CBD5E1; }
                        .panel-box { border: 1px solid #CBD5E1; border-radius: 12px; overflow: hidden; margin-bottom: 25px; background: #F8FAFC; }
                        .panel-title { background: #0F172A; color: white; font-weight: bold; padding: 10px 14px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
                        .panel-row { display: flex; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-size: 11px; }
                        .panel-row:last-child { border-bottom: none; }
                        .att-box { background: #EEF2FF; border: 2px solid #C7D2FE; padding: 16px; border-radius: 12px; text-align: center; font-size: 14px; font-weight: 800; color: #4F46E5; margin-bottom: 25px; }
                        .remarks-box { border: 1px solid #CBD5E1; padding: 18px; border-radius: 12px; background: #fff; font-size: 12px; line-height: 1.6; }
                        .remarks-head { font-weight: 800; color: #0F172A; margin-bottom: 6px; text-transform: uppercase; font-size: 11px; }
                        .sig-row { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; border-top: 2px solid #E2E8F0; font-size: 12px; font-weight: bold; color: #334155; }
                        .sig-col { text-align: center; width: 200px; border-top: 2px solid #334155; padding-top: 10px; margin-top: 40px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div>${logoHtml}</div>
                            <div class="header-center">
                                <h1 class="school-title">${schoolName}</h1>
                                <div class="school-addr">${schoolAddress || ""}</div>
                                <div class="report-badge">Annual Report Card</div>
                            </div>
                            <div class="crest" style="background: #0F172A;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
                        </div>

                        <div class="student-bar">
                            <div class="bar-item"><span class="bar-label">Admission No</span><span class="bar-val">${report.admNo}</span></div>
                            <div class="bar-item"><span class="bar-label">Name of the Student</span><span class="bar-val">${report.studentName}</span></div>
                            <div class="bar-item"><span class="bar-label">Position</span><span class="bar-val">${report.rank || "—"}</span></div>
                            <div class="bar-item"><span class="bar-label">Class & Stream</span><span class="bar-val">${report.className}</span></div>
                        </div>

                        <div class="split-grid">
                            <div>
                                <table>
                                    <thead>
                                        <tr>
                                            <th style="text-align: left; width: 40%;">Subjects</th>
                                            ${examCols}
                                            ${avgCol}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${leftRows}
                                        <tr style="background: #F8FAFC; font-weight: bold; border-top: 2px solid #4F46E5;">
                                            <td style="padding: 12px; text-align: left;">TOTAL MARKS</td>
                                            ${showAvg
                                                ? `${blankCols}<td style="text-align: center; padding: 12px; font-size: 13px; color: #4F46E5;">${report.totalMarks}</td>`
                                                : `<td style="text-align: center; padding: 12px; font-size: 13px; color: #4F46E5;">${report.totalMarks}</td>`}
                                        </tr>
                                        <tr style="background: #EEF2FF; font-weight: bold;">
                                            <td style="padding: 12px; text-align: left; color: #4F46E5;">PERCENTAGE / MEAN</td>
                                            ${showAvg
                                                ? `${blankCols}<td style="text-align: center; padding: 12px; font-size: 14px; color: #4F46E5;">${report.meanScore ?? 0}%</td>`
                                                : `<td style="text-align: center; padding: 12px; font-size: 14px; color: #4F46E5;">${report.meanScore ?? 0}%</td>`}
                                        </tr>
                                    </tbody>
                                </table>

                                <div class="panel-box" style="margin-bottom: 0;">
                                    <div class="panel-title" style="background: #4F46E5;">Performance Trend</div>
                                    <div style="padding: 12px 14px;">
                                        ${trendHtml}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div class="panel-box">
                                    <div class="panel-title">Personality Profile</div>
                                    ${personalityRows}
                                </div>

                                <div class="att-box">
                                    <div style="font-size: 10px; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 4px;">Attendance</div>
                                    ${attText}
                                </div>

                                <div class="remarks-box">
                                    <div class="remarks-head">Class Teacher's Remarks</div>
                                    <div style="color: #475569; font-style: italic;">${report.teacherRemarks ? `"${report.teacherRemarks}"` : "________________________________________"}</div>
                                </div>
                            </div>
                        </div>

                        <div class="sig-row">
                            <div class="sig-col">Class Teacher</div>
                            <div class="sig-col">Principal</div>
                            <div class="sig-col">Parent / Guardian</div>
                        </div>
                    </div>
                </body>
                </html>
            `;
        }

        const win = openPrintDoc();
        if (!win) { toast.error("Pop-up blocked"); return; }
        win.document.write(htmlContent);
        win.document.close();
        win.focus();
        setTimeout(() => {
            win.print();
        }, 250);
    };

    return (
        <div className="flex-1 bg-[#f8fafc] p-8 space-y-8 overflow-y-auto custom-scrollbar animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                        <Award className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Students Report Card</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Generate & Print Official Academic Transcripts</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 w-full md:w-auto">
                        <Search className="w-4 h-4 text-slate-400" />
                        <Input 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search student..." 
                            className="h-8 bg-transparent border-none shadow-none text-xs focus-visible:ring-0 px-1 w-full md:w-48"
                        />
                    </div>

                    <select 
                        value={selectedClass} 
                        onChange={e => setSelectedClass(e.target.value)}
                        className="h-11 px-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-indigo-500 transition-colors"
                    >
                        <option value="">All Classes</option>
                        {classes.map((c: any) => (
                            <option key={c._id} value={c.name}>{c.name}</option>
                        ))}
                    </select>

                    <select
                        value=""
                        onChange={e => { const id = e.target.value; if (id && !selectedExamIds.includes(id)) setSelectedExamIds([...selectedExamIds, id]); }}
                        className="h-11 px-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-indigo-500 transition-colors"
                    >
                        <option value="">+ Add exam…</option>
                        {exams.filter((e: any) => !selectedExamIds.includes(e._id)).map((e: any) => (
                            <option key={e._id} value={e._id}>{e.name}</option>
                        ))}
                    </select>

                    <Button
                        variant="outline"
                        className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white border-none font-bold text-xs gap-2 rounded-xl shadow-lg shadow-indigo-100"
                    >
                        <Filter className="w-4 h-4" /> {selectedExamIds.length > 1 ? "Annual Report" : "Filter Reports"}
                    </Button>
                </div>
            </div>

            {/* Selected exams (add one or more — multiple = combined Annual report) */}
            {selectedExamIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-slate-400 uppercase">{selectedExamIds.length > 1 ? "Annual (combined):" : "Exam:"}</span>
                    {selectedExamIds.map(id => {
                        const ex = exams.find((e: any) => e._id === id);
                        return (
                            <span key={id} className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 rounded-full pl-3 pr-2 py-1 text-xs font-bold">
                                {ex?.name || "Exam"}
                                <button onClick={() => setSelectedExamIds(selectedExamIds.filter(x => x !== id))} className="text-indigo-400 hover:text-indigo-700">×</button>
                            </span>
                        );
                    })}
                    <button onClick={() => setSelectedExamIds([])} className="text-xs font-bold text-slate-400 hover:text-rose-500">Clear</button>
                </div>
            )}

            {/* Prompt to pick an exam — marks/mean/rank are exam-specific */}
            {selectedExamIds.length === 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3 text-sm text-amber-700 font-bold">
                    Add one or more exams above to load real marks, mean scores and class ranks. Selecting several combines them into an annual report. Without an exam, no scores are shown.
                </div>
            )}

            {/* Content List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/75 border-b border-slate-100">
                        <TableRow className="h-12 hover:bg-transparent">
                            <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Student</TableHead>
                            <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Adm No</TableHead>
                            <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Class</TableHead>
                            <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">Exam</TableHead>
                            <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6 text-center">GPA / Mean</TableHead>
                            <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6 text-center">Rank</TableHead>
                            <TableHead className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6 text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Loading report cards...</TableCell></TableRow>
                        ) : filteredReports.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-400 font-bold text-xs uppercase tracking-widest">No report cards match your criteria</TableCell></TableRow>
                        ) : (
                            filteredReports.map((r: any) => (
                                <TableRow key={r.studentId} className="h-16 hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                    <TableCell className="px-6 font-bold text-slate-800 text-sm">{r.studentName}</TableCell>
                                    <TableCell className="px-6 font-mono text-xs text-slate-500 font-semibold">{r.admNo}</TableCell>
                                    <TableCell className="px-6 text-xs font-bold text-slate-600">{r.className}</TableCell>
                                    <TableCell className="px-6 text-xs font-semibold text-indigo-600">{r.examName}</TableCell>
                                    <TableCell className="px-6 text-center">
                                        <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-black text-xs px-2.5 py-1 rounded-lg shadow-none">
                                            {r.hasMarks ? `${r.meanScore}% · ${r.gpa}` : "No marks"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-6 text-center font-bold text-slate-700 text-xs">{r.rank}</TableCell>
                                    <TableCell className="px-6 text-right">
                                        <Button 
                                            onClick={() => handlePrint(r)}
                                            size="sm" 
                                            className="h-9 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200/60 font-bold text-xs gap-2 rounded-xl shadow-none"
                                        >
                                            <Printer className="w-4 h-4" /> Print PDF
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
