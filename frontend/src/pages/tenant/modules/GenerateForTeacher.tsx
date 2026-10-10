import { useState, useEffect } from "react";
import { Loader2, BookOpen, Clock, Coffee, Printer } from "lucide-react";
import { useItems } from "@/hooks/useItems";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { outputHtmlDoc } from "@/lib/pdfDoc";

/* ─── Subject colour palette ─────────────────────────────────────────────── */
const PALETTE = [
    "#4F46E5", "#0891B2", "#059669", "#D97706", "#DC2626",
    "#7C3AED", "#DB2777", "#65A30D", "#EA580C", "#0284C7",
];
const subjectColor = (idx: number) => PALETTE[idx % PALETTE.length];
const getClassName = (c: any) => c ? (c.levelName ? `${c.levelName} ${c.streamName !== 'General' && c.streamName ? c.streamName : ''}`.trim() : (c.name || "Class")) : "";

/* ─── Print helper ──────────────────────────────────────────────────────────
   Builds a self-contained A4-landscape HTML document and opens it in a new
   window, then calls window.print() once it has fully loaded.              */
function printTeacherTimetable(opts: {
    teacherName: string;
    timetableName: string;
    schoolName?: string;
    schoolLogo?: string;
    academicYear?: string;
    semester?: string;
    days: string[];
    periods: any[];
    getSlot: (day: string, periodId: string) => any;
    subjects: any[];
    classes: any[];
    rooms: any[];
    totalPeriods: number;
    freePeriods: number;
    workloadHours: number;
}) {
    const {
        teacherName, timetableName, schoolName = "School Name", schoolLogo = "",
        academicYear = "2024/2025", semester = "Term 1",
        days, periods, getSlot, subjects, classes, rooms,
        totalPeriods, freePeriods, workloadHours,
    } = opts;

    const logoHtml = schoolLogo
        ? `<img src="${schoolLogo}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;" />`
        : `<span style="display:inline-flex;"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 22v-4a2 2 0 1 0-4 0v4"/><path d="m18 10 3.447 1.724a1 1 0 0 1 .553.894V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7.382a1 1 0 0 1 .553-.894L6 10"/><path d="M18 5v17"/><path d="m4 6 8-4 8 4"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/></svg></span>`;

    const DAY_LABELS: Record<string, string> = {
        MON: "Monday", TUE: "Tuesday", WED: "Wednesday",
        THU: "Thursday", FRI: "Friday", SAT: "Saturday", SUN: "Sunday",
    };

    /* Unique subjects this teacher teaches */
    const taughtSubjectIds = new Set<string>();
    periods.forEach((p: any) => {
        if (p.type === "BREAK") return;
        days.forEach(d => {
            const slot = getSlot(d, p._id);
            if (slot?.subjectId) taughtSubjectIds.add(slot.subjectId);
        });
    });
    const taughtSubjects = subjects.filter((s: any) => taughtSubjectIds.has(s._id));

    /* Build table rows */
    const periodHeaders = periods.map(p => `
      <th class="period-header">
        <span class="period-name">${p.name}</span>
        <span class="period-time">${p.start_time} – ${p.end_time}</span>
      </th>`).join("");

    const rowsHtml = days.map((day, di) => {
        const cells = periods.map((p: any, pi: number) => {
            if (p.type === "BREAK") {
                if (di === 0) {
                    return `<td class="break-cell bg-amber-50" rowspan="${days.length}"><div style="writing-mode: vertical-lr; margin: auto; text-orientation: mixed;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-bottom:4px;"><path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/></svg> ${p.name}</div></td>`;
                }
                return "";
            }

            // Check if second half
            if (pi > 0 && periods[pi - 1].type !== "BREAK") {
                const prevSlot = getSlot(day, periods[pi - 1]._id);
                const currSlot = getSlot(day, p._id);
                if (prevSlot && currSlot && prevSlot.subjectId === currSlot.subjectId && prevSlot.classId === currSlot.classId) {
                    return ""; // Skip rendering td entirely for the second half
                }
            }

            // Check if first half
            let isFirstHalfOfDouble = false;
            if (pi < periods.length - 1 && periods[pi + 1].type !== "BREAK") {
                const currSlot = getSlot(day, p._id);
                const nextSlot = getSlot(day, periods[pi + 1]._id);
                if (currSlot && nextSlot && currSlot.subjectId === nextSlot.subjectId && currSlot.classId === nextSlot.classId) {
                    isFirstHalfOfDouble = true;
                }
            }

            const slot = getSlot(day, p._id);
            const sub = subjects?.find((s: any) => s._id === slot?.subjectId);
            const cls = classes?.find((c: any) => c._id === slot?.classId);
            const rmObj = rooms?.find((r: any) => r._id === slot?.roomId) || classes?.find((c: any) => c._id === slot?.roomId);
            const rmName = getClassName(rmObj);
            const color = sub ? subjectColor(subjects.indexOf(sub)) : "#94A3B8";
            const fullClassName = cls ? `${cls.levelName} ${cls.streamName !== 'General' && cls.streamName ? cls.streamName : ''}`.trim() : "Class";

            if (!slot) {
                return `<td class="slot-cell empty-cell"><span class="free-label">Free</span></td>`;
            }

            const displaySubject = isFirstHalfOfDouble ? `Double ${sub?.name || sub?.subjectName || "Subject"}` : (sub?.name || sub?.subjectName || "Subject");

            return `
        <td class="slot-cell" ${isFirstHalfOfDouble ? 'colspan="2"' : ''}>
          <div class="slot-card" style="border-left-color:${color}; background:${color}12;">
            <div class="slot-subject" style="color:${color}">${displaySubject}</div>
            <div class="slot-class">${fullClassName}</div>
            ${rmName !== fullClassName ? `<div class="slot-room">${rmName}</div>` : ""}
          </div>
        </td>`;
        }).join("");

        return `
      <tr class="${di % 2 === 0 ? "row-even" : "row-odd"}">
        <td class="day-cell">
          <span class="day-name">${DAY_LABELS[day] || day}</span>
        </td>
        ${cells}
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${teacherName} — Teacher Timetable</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

  * { margin:0; padding:0; box-sizing:border-box; }

  @page {
    size: A4 landscape;
    margin: 10mm 12mm 10mm 12mm;
  }

  body {
    font-family: 'DM Sans', sans-serif;
    background: #fff;
    color: #0F172A;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-size: 11px;
  }

  /* ── Header ───────────────────────────────────────── */
  .page-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 2.5px solid #4F46E5;
    text-align: center;
  }

  .school-logo {
    width: 44px; height: 44px;
    border-radius: 10px;
    background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 20px; font-weight: 700; flex-shrink: 0;
  }

  .header-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .school-name {
    font-size: 8px; font-weight: 600;
    letter-spacing: .12em; text-transform: uppercase; color: #6366F1;
  }

  .tt-title {
    font-size: 18px; font-weight: 700;
    color: #0F172A; letter-spacing: -.3px; line-height: 1;
  }

  .tt-sub { font-size: 9px; color: #64748B; font-weight: 400; margin-top: 3px; }

  /* ── Workload + Legend bar ────────────────────────── */
  .info-bar {
    display: flex;
    gap: 16px;
    margin-bottom: 8px;
    align-items: center;
    justify-content: space-between;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 6px 12px;
  }

  .simple-stats {
    display: flex;
    gap: 16px;
    font-size: 10px;
    color: #334155;
    align-items: center;
  }

  .simple-stats span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .stat-spacer { flex: 1; }

  .legend {
    display: flex; flex-wrap: wrap; gap: 8px;
    align-items: center; justify-content: flex-end;
  }

  .legend-item {
    display: flex; align-items: center; gap: 4px;
    font-size: 8.5px; color: #475569; font-weight: 500;
  }

  .legend-dot {
    width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0;
  }

  /* ── Table ────────────────────────────────────────── */
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }

  thead tr { background: #4F46E5; }

  .period-header {
    width: 72px; padding: 7px 6px; text-align: left;
    font-size: 7.5px; font-weight: 700; letter-spacing: .1em;
    text-transform: uppercase; color: #fff;
  }

  .day-header {
    padding: 7px 4px; text-align: center;
    font-size: 8.5px; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase; color: #fff;
  }

  .row-even td { background: #FAFAFE; }
  .row-odd  td { background: #FFFFFF; }

  .period-cell {
    width: 72px; padding: 4px 6px;
    border-right: 2px solid #E2E8F0;
    vertical-align: middle;
    background: #F1F5F9 !important;
    border-bottom: 1px solid #E2E8F0;
  }

  .period-name  { display: block; font-weight: 700; font-size: 9px; color: #334155; }
  .period-time  { display: block; font-size: 7.5px; color: #94A3B8; font-family: 'DM Mono', monospace; margin-top: 1px; }

  .break-row td { background: #FFFBEB !important; border-bottom: 1px solid #FDE68A; }
  .break-cell   {
    text-align: center; font-size: 8px; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase; color: #D97706; padding: 5px;
  }

  .slot-cell {
    padding: 3px; border: 1px solid #E2E8F0;
    vertical-align: top; height: 54px;
  }

  .empty-cell { text-align: center; vertical-align: middle; }
  .free-label { font-size: 7.5px; color: #CBD5E1; font-style: italic; letter-spacing: .06em; }

  .slot-card {
    height: 100%; border-left: 3px solid; border-radius: 4px;
    padding: 3px 5px; display: flex; flex-direction: column; justify-content: space-between;
  }

  .slot-subject {
    font-weight: 700; font-size: 9px; line-height: 1.2;
    overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  }

  .slot-class {
    font-size: 8px; color: #334155; font-weight: 600;
    overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  }

  .slot-room {
    font-size: 7.5px; color: #94A3B8;
    font-family: 'DM Mono', monospace; font-weight: 500;
  }

  /* ── Footer ───────────────────────────────────────── */
  .page-footer {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 8px; padding-top: 6px; border-top: 1px solid #E2E8F0;
  }

  .footer-left  { font-size: 7.5px; color: #94A3B8; }
  .footer-stamp { font-size: 7.5px; color: #CBD5E1; font-style: italic; }
  .footer-right { font-size: 7.5px; color: #94A3B8; font-family: 'DM Mono', monospace; }
</style>
</head>
<body>

<!-- Header -->
<div class="page-header">
  <div class="school-logo">${logoHtml}</div>
  <div class="header-center">
    <span class="school-name">${schoolName}</span>
    <span class="tt-title">${teacherName} — Teaching Timetable</span>
    <span class="tt-sub">${timetableName} &nbsp;|&nbsp; ${semester} &nbsp;|&nbsp; Academic Year: ${academicYear} &nbsp;|&nbsp; Printed: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
  </div>
</div>

<!-- Workload + Legend bar -->
<div class="info-bar">
  <div class="simple-stats">
    <span><strong>Lessons:</strong> ${totalPeriods}</span>
    <span><strong>Hrs / Week:</strong> ${workloadHours.toFixed(1)}</span>
    <span><strong>Free Slots:</strong> ${freePeriods > 0 ? freePeriods : 0}</span>
    <span><strong>Subjects:</strong> ${taughtSubjects.length}</span>
  </div>
  <div class="stat-spacer"></div>
  <div class="legend">
    ${taughtSubjects.slice(0, 8).map((s: any) => `
      <div class="legend-item">
        <div class="legend-dot" style="background:${subjectColor(subjects.indexOf(s))}"></div>
        ${s.name || s.subjectName}
      </div>`).join("")}
  </div>
</div>

<!-- Timetable grid -->
<table>
  <thead>
    <tr>
      <th class="period-header">Day</th>
      ${periodHeaders}
    </tr>
  </thead>
  <tbody>${rowsHtml}</tbody>
</table>

<!-- Footer -->
<div class="page-footer">
  <span class="footer-left">Teacher: <strong>${teacherName}</strong> &nbsp;·&nbsp; ${timetableName}</span>
  <span class="footer-stamp">Generated by School Timetable System</span>
  <span class="footer-right">Page 1 of 1</span>
</div>

</body>
</html>`;

    /* Desktop → print window; mobile app → real landscape PDF saved & opened. */
    void outputHtmlDoc(`Timetable — ${teacherName}`, html, {
        fileName: `Timetable-${teacherName}`,
        landscape: true,
    });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════════════════ */
export default function GenerateForTeacher() {
    const { data: profileData } = useQuery({
        queryKey: ["tenant_profile_global"],
        queryFn: async () => {
            const r = await api.get("/auth/tenant/profile");
            return Array.isArray(r.data) ? r.data[0] : r.data;
        },
        staleTime: Infinity,
        gcTime: Infinity,
    });

    const { items: timetables } = useItems("timetables");
    const { items: classes } = useItems("classes");
    const { items: periods } = useItems("timetable_periods");
    const { items: staff } = useItems("staff");
    const { items: subjects } = useItems("subjects");
    const { items: rooms } = useItems("rooms");
    const { items: slots } = useItems("timetable_slots");

    const [selectedTeacherId, setSelectedTeacherId] = useState("");
    const [selectedTimetableId, setSelectedTimetableId] = useState("");

    const activeWeekdays = ["MON", "TUE", "WED", "THU", "FRI"];
    const sortedPeriods = [...(periods || [])].sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));

    useEffect(() => {
        if (timetables?.length) setSelectedTimetableId(timetables[0]._id);
        if (staff?.length) setSelectedTeacherId(staff[0]._id);
    }, [timetables, staff]);

    const getSlotFor = (day: string, periodId: string) =>
        slots?.find((s: any) =>
            s.timetableId === selectedTimetableId &&
            s.teacherId === selectedTeacherId &&
            s.day === day &&
            s.periodId === periodId
        );

    /* ── Workload metrics ─────────────────────────────────────────────── */
    const teacherSlots = slots?.filter((s: any) => s.timetableId === selectedTimetableId && s.teacherId === selectedTeacherId) || [];
    const totalPeriods = teacherSlots.length;
    const lessonPeriodCount = sortedPeriods.filter((p: any) => p.type !== "BREAK").length;
    const freePeriods = Math.max(0, lessonPeriodCount * activeWeekdays.length - totalPeriods);
    const workloadHours = totalPeriods * 0.75;

    /* Unique subjects this teacher is assigned */
    const taughtSubjectIds = new Set(teacherSlots.map((s: any) => s.subjectId));
    const taughtSubjects = (subjects || []).filter((s: any) => taughtSubjectIds.has(s._id));

    const handlePrint = () => {
        const teacher = staff?.find((s: any) => s._id === selectedTeacherId);
        const tt = timetables?.find((t: any) => t._id === selectedTimetableId);
        printTeacherTimetable({
            teacherName: teacher?.name || teacher?.employeeName || "Teacher",
            timetableName: tt?.name || "Timetable",
            schoolName: profileData?.name || "School Name",
            schoolLogo: profileData?.logo || "",
            academicYear: tt?.academicYear || "2024/2025",
            semester: tt?.semester || "Term 1",
            days: activeWeekdays,
            periods: sortedPeriods,
            getSlot: getSlotFor,
            subjects: subjects || [],
            classes: classes || [],
            rooms: rooms || [],
            totalPeriods,
            freePeriods,
            workloadHours,
        });
    };

    /* ── Render ───────────────────────────────────────────────────────── */
    return (
        <div className="max-w-6xl mx-auto space-y-6">

            {/* Controls */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end justify-between">
                <div className="flex gap-4 items-end flex-wrap">
                    <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Timetable</label>
                        <select value={selectedTimetableId} onChange={e => setSelectedTimetableId(e.target.value)}
                            className="h-11 px-3 border border-gray-200 rounded-lg text-sm bg-white min-w-[200px]">
                            {timetables?.map((t: any) => <option key={t._id} value={t._id}>{t.name} ({t.status})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Teacher</label>
                        <select value={selectedTeacherId} onChange={e => setSelectedTeacherId(e.target.value)}
                            className="h-11 px-3 border border-gray-200 rounded-lg text-sm bg-white min-w-[200px]">
                            {staff?.map((s: any) => <option key={s._id} value={s._id}>{s.name || s.employeeName}</option>)}
                        </select>
                    </div>
                </div>

                {/* Print button — matches GenerateForClass style */}
                <button onClick={handlePrint}
                    className="group relative bg-white hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 h-11 px-5 rounded-xl font-bold flex items-center gap-2 transition-all text-sm border border-gray-200 hover:border-indigo-300 shadow-sm hover:shadow-md">
                    <Printer className="w-4 h-4 transition-transform group-hover:scale-110" />
                    Print / PDF
                    <span className="absolute -top-2 -right-2 text-[9px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-full tracking-wide">A4</span>
                </button>
            </div>

            {/* Workload Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { icon: <BookOpen className="w-5 h-5" />, bg: "bg-indigo-50", text: "text-[#5C67F2]", label: "Lessons Scheduled", value: `${totalPeriods} periods` },
                    { icon: <Clock className="w-5 h-5" />, bg: "bg-amber-50", text: "text-amber-500", label: "Active Hours / Week", value: `${workloadHours.toFixed(1)} hrs` },
                    { icon: <Coffee className="w-5 h-5" />, bg: "bg-emerald-50", text: "text-emerald-500", label: "Free Periods", value: `${freePeriods} periods` },
                    { icon: <BookOpen className="w-5 h-5" />, bg: "bg-violet-50", text: "text-violet-500", label: "Subjects Taught", value: `${taughtSubjects.length} subjects` },
                ].map(({ icon, bg, text, label, value }) => (
                    <div key={label} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className={`w-11 h-11 ${bg} ${text} rounded-xl flex items-center justify-center flex-shrink-0`}>{icon}</div>
                        <div>
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{label}</p>
                            <h4 className="text-lg font-extrabold text-gray-800 mt-0.5 leading-tight">{value}</h4>
                        </div>
                    </div>
                ))}
            </div>

            {/* Timetable Grid */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-center border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-500 font-bold">
                                <th className="p-4 w-32 border-r border-gray-100 text-left">Day</th>
                                {sortedPeriods.map((p: any) => (
                                    <th key={p._id} className="p-4 min-w-[160px] border-r border-gray-100 last:border-0">
                                        <div className="font-extrabold text-xs text-gray-800">{p.name}</div>
                                        <div className="text-[10px] text-gray-400 font-medium mt-0.5">{p.start_time} – {p.end_time}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {activeWeekdays.map((day: string, di: number) => (
                                <tr key={day} className="border-b border-gray-50 last:border-0">
                                    <td className="p-4 border-r border-gray-100 bg-gray-50/50 text-left font-extrabold text-xs text-gray-800 uppercase tracking-wider">
                                        {{ MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday", FRI: "Friday" }[day] || day}
                                    </td>
                                    {sortedPeriods.map((p: any, pi: number) => {
                                        if (p.type === "BREAK") {
                                            if (di === 0) {
                                                return (
                                                    <td key={p._id} rowSpan={activeWeekdays.length} className="bg-amber-50/40 text-amber-600 font-bold text-xs uppercase tracking-widest text-center select-none p-4 border-r border-gray-50 align-middle">
                                                        <div className="flex items-center justify-center h-full w-full" style={{ writingMode: "vertical-lr", textOrientation: "mixed" }}>
                                                            <Coffee className="w-3.5 h-3.5 mb-1" /> {p.name}
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            return null;
                                        }

                                        if (pi > 0 && sortedPeriods[pi - 1].type !== "BREAK") {
                                            const prevSlot = getSlotFor(day, sortedPeriods[pi - 1]._id);
                                            const currSlot = getSlotFor(day, p._id);
                                            if (prevSlot && currSlot && prevSlot.subjectId === currSlot.subjectId && prevSlot.classId === currSlot.classId) {
                                                return null;
                                            }
                                        }

                                        let isFirstHalfOfDouble = false;
                                        if (pi < sortedPeriods.length - 1 && sortedPeriods[pi + 1].type !== "BREAK") {
                                            const currSlot = getSlotFor(day, p._id);
                                            const nextSlot = getSlotFor(day, sortedPeriods[pi + 1]._id);
                                            if (currSlot && nextSlot && currSlot.subjectId === nextSlot.subjectId && currSlot.classId === nextSlot.classId) {
                                                isFirstHalfOfDouble = true;
                                            }
                                        }

                                        const slot = getSlotFor(day, p._id);
                                        const sub = subjects?.find((s: any) => s._id === slot?.subjectId);
                                        const cls = classes?.find((c: any) => c._id === slot?.classId);
                                        const rmObj = rooms?.find((r: any) => r._id === slot?.roomId) || classes?.find((c: any) => c._id === slot?.roomId);
                                        const rmName = getClassName(rmObj);
                                        const color = sub ? subjectColor(subjects!.indexOf(sub)) : "#5C67F2";
                                        const fullClassName = cls ? `${cls.levelName} ${cls.streamName !== 'General' && cls.streamName ? cls.streamName : ''}`.trim() : "Class";

                                        const displaySubject = isFirstHalfOfDouble ? `Double ${sub?.name || sub?.subjectName || "Subject"}` : (sub?.name || sub?.subjectName || "Subject");

                                        return (
                                            <td key={p._id} className="p-2 border-r border-gray-50 last:border-0 relative group h-28" colSpan={isFirstHalfOfDouble ? 2 : 1}>
                                                {slot ? (
                                                    <div className="h-full w-full rounded-xl p-2.5 flex flex-col justify-between text-left transition-all group-hover:shadow-sm"
                                                        style={{ backgroundColor: color + "14", borderTop: `1px solid ${color}30`, borderRight: `1px solid ${color}30`, borderBottom: `1px solid ${color}30`, borderLeft: `3.5px solid ${color}` }}>
                                                        <div>
                                                            <div className="font-bold text-xs truncate" style={{ color }}>{displaySubject}</div>
                                                            <div className="text-[10px] text-gray-700 font-semibold truncate mt-0.5">{fullClassName}</div>
                                                        </div>
                                                        {rmName !== fullClassName ? (
                                                            <span className="text-[9px] font-bold text-gray-400 bg-white/70 px-1.5 py-0.5 rounded-md border border-gray-100 self-start">
                                                                {rmName || "Room"}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-gray-200 text-lg select-none">—</div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
