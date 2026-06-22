import { useState, useEffect, useRef } from "react";
import { Play, Download, Lock, Unlock, Edit3, Loader2, Calendar, Plus, Printer, ArrowRight } from "lucide-react";
import { useItems } from "@/hooks/useItems";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { outputHtmlDoc } from "@/lib/pdfDoc";

/* ─── Subject colour palette ────────────────────────────────────────────── */
const PALETTE = [
    "#4F46E5", "#0891B2", "#059669", "#D97706", "#DC2626",
    "#7C3AED", "#DB2777", "#65A30D", "#EA580C", "#0284C7",
];
const subjectColor = (idx: number) => PALETTE[idx % PALETTE.length];

/* ─── Print helper ────────────────────────────────────────────────────────
   Injects a <style> tag scoped to @media print so the rest of the app
   is untouched. Removed automatically after printing.                    */
function printTimetable(opts: {
    className: string;
    timetableName: string;
    schoolName?: string;
    schoolLogo?: string;
    academicYear?: string;
    semester?: string;
    days: string[];
    periods: any[];
    getSlot: (day: string, periodId: string) => any;
    subjects: any[];
    staff: any[];
    rooms: any[];
}) {
    const { className, timetableName, schoolName = "School Name", schoolLogo = "", academicYear = "2024/2025", semester = "Term 1", days, periods, getSlot, subjects, staff, rooms } = opts;

    const logoHtml = schoolLogo
        ? `<img src="${schoolLogo}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;" />`
        : `<span style="font-size:20px;">🏫</span>`;

    const DAY_LABELS: Record<string, string> = {
        MON: "Monday", TUE: "Tuesday", WED: "Wednesday",
        THU: "Thursday", FRI: "Friday", SAT: "Saturday", SUN: "Sunday",
    };

    /* Build table rows HTML */
    const periodHeaders = periods.map(p => `
      <th class="period-header">
        <span class="period-name">${p.name}</span>
        <span class="period-time">${p.start_time} – ${p.end_time}</span>
      </th>`).join("");

    const rowsHtml = days.map((day, di) => {
        const cells = periods.map((p: any, pi: number) => {
            if (p.type === "BREAK") {
                if (di === 0) {
                    return `<td class="break-cell bg-amber-50" rowspan="${days.length}"><div style="writing-mode: vertical-lr; margin: auto; text-orientation: mixed;">☕ ${p.name}</div></td>`;
                }
                return "";
            }

            // Check if second half
            if (pi > 0 && periods[pi - 1].type !== "BREAK") {
                const prevSlot = getSlot(day, periods[pi - 1]._id);
                const currSlot = getSlot(day, p._id);
                if (prevSlot && currSlot && prevSlot.subjectId === currSlot.subjectId && prevSlot.teacherId === currSlot.teacherId) {
                    return "";
                }
            }

            // Check if first half
            let isFirstHalfOfDouble = false;
            if (pi < periods.length - 1 && periods[pi + 1].type !== "BREAK") {
                const currSlot = getSlot(day, p._id);
                const nextSlot = getSlot(day, periods[pi + 1]._id);
                if (currSlot && nextSlot && currSlot.subjectId === nextSlot.subjectId && currSlot.teacherId === nextSlot.teacherId) {
                    isFirstHalfOfDouble = true;
                }
            }

            const slot = getSlot(day, p._id);
            const sub = subjects?.find((s: any) => s._id === slot?.subjectId);
            const tea = staff?.find((s: any) => s._id === slot?.teacherId);
            const rm = rooms?.find((r: any) => r._id === slot?.roomId) || classes?.find((c: any) => c._id === slot?.roomId);
            const color = sub ? subjectColor(subjects.indexOf(sub)) : "#94A3B8";
            const baseSubName = sub?.name || sub?.subjectName || "";
            const subName = isFirstHalfOfDouble ? `Double ${baseSubName}` : baseSubName;
            const teaName = tea?.name || tea?.employeeName || "";
            const rmName = rm ? (rm.name || `${rm.levelName || ''} ${rm.streamName !== 'General' && rm.streamName ? rm.streamName : ''}`.trim() || "") : "";

            if (!slot) {
                return `<td class="slot-cell empty-cell"><span class="free-label">Free</span></td>`;
            }
            return `
        <td class="slot-cell" ${isFirstHalfOfDouble ? 'colspan="2"' : ''}>
          <div class="slot-card" style="border-left-color:${color}; background:${color}12;">
            <div class="slot-subject" style="color:${color}">${subName}</div>
            <div class="slot-teacher">${teaName}</div>
            <div class="slot-room">${rmName}</div>
            ${slot.isLocked ? `<div class="slot-locked">🔒 Locked</div>` : ""}
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

    /* Count stats */
    const totalSlots = periods.filter((p: any) => p.type !== "BREAK").length * days.length;
    const filledSlots = periods.reduce((acc: number, p: any) => {
        if (p.type === "BREAK") return acc;
        return acc + days.filter(d => !!getSlot(d, p._id)).length;
    }, 0);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${className} Timetable – ${timetableName}</title>
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

  /* ── Header ─────────────────────────────────────────── */
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
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 20px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .header-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  .school-name {
    font-size: 8px;
    font-weight: 600;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: #6366F1;
  }

  .tt-title {
    font-size: 18px;
    font-weight: 700;
    color: #0F172A;
    letter-spacing: -.3px;
    line-height: 1;
  }

  .tt-sub {
    font-size: 9px;
    color: #64748B;
    font-weight: 400;
    margin-top: 1px;
  }

  .header-meta {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 2px;
  }

  .meta-pill {
    font-size: 8px;
    font-weight: 600;
    letter-spacing: .08em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 20px;
    background: #EEF2FF;
    color: #4338CA;
  }

  .meta-date {
    font-size: 8px;
    color: #94A3B8;
    font-family: 'DM Mono', monospace;
  }

  /* ── Stats bar ──────────────────────────────────────── */
  .stats-bar {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .stat-box {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 4px 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-value {
    font-size: 13px;
    font-weight: 700;
    color: #4F46E5;
  }

  .stat-label {
    font-size: 7.5px;
    font-weight: 600;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #94A3B8;
  }

  .stat-spacer { flex: 1; }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 8px;
    color: #475569;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  /* ── Table ──────────────────────────────────────────── */
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  thead tr {
    background: #4F46E5;
  }

  .period-header {
    width: 72px;
    padding: 7px 6px;
    text-align: left;
    font-size: 7.5px;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: #fff;
    border-radius: 4px 0 0 0;
  }

  .day-header {
    padding: 7px 4px;
    text-align: center;
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: #fff;
  }

  /* Rows */
  .row-even td { background: #FAFAFE; }
  .row-odd  td { background: #FFFFFF; }

  .period-cell {
    width: 72px;
    padding: 4px 6px;
    border-right: 2px solid #E2E8F0;
    vertical-align: middle;
    background: #F1F5F9 !important;
    border-bottom: 1px solid #E2E8F0;
  }

  .period-name {
    display: block;
    font-weight: 700;
    font-size: 9px;
    color: #334155;
  }

  .period-time {
    display: block;
    font-size: 7.5px;
    color: #94A3B8;
    font-family: 'DM Mono', monospace;
    margin-top: 1px;
  }

  /* Break row */
  .break-row td {
    background: #FFFBEB !important;
    border-bottom: 1px solid #FDE68A;
  }

  .break-cell {
    text-align: center;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: #D97706;
    padding: 5px;
  }

  /* Slot cells */
  .slot-cell {
    padding: 3px;
    border: 1px solid #E2E8F0;
    vertical-align: top;
    height: 54px;
  }

  .empty-cell {
    text-align: center;
    vertical-align: middle;
  }

  .free-label {
    font-size: 7.5px;
    color: #CBD5E1;
    font-style: italic;
    letter-spacing: .06em;
  }

  .slot-card {
    height: 100%;
    border-left: 3px solid;
    border-radius: 4px;
    padding: 3px 5px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .slot-subject {
    font-weight: 700;
    font-size: 9px;
    line-height: 1.2;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .slot-teacher {
    font-size: 8px;
    color: #475569;
    font-weight: 500;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .slot-room {
    font-size: 7.5px;
    color: #94A3B8;
    font-family: 'DM Mono', monospace;
    font-weight: 500;
  }

  .slot-locked {
    font-size: 7px;
    color: #94A3B8;
    margin-top: 1px;
  }

  /* ── Footer ─────────────────────────────────────────── */
  .page-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid #E2E8F0;
  }

  .footer-left {
    font-size: 7.5px;
    color: #94A3B8;
  }

  .footer-right {
    font-size: 7.5px;
    color: #94A3B8;
    font-family: 'DM Mono', monospace;
  }

  .footer-stamp {
    font-size: 7.5px;
    color: #CBD5E1;
    font-style: italic;
  }
</style>
</head>
<body>

<!-- ── Header ─────────────────────────────────────────── -->
<div class="page-header">
  <div class="school-logo">${logoHtml}</div>
  <div class="header-center">
    <span class="school-name">${schoolName}</span>
    <span class="tt-title">${className} — Weekly Timetable</span>
    <span class="tt-sub">${timetableName} &nbsp;·&nbsp; ${semester} &nbsp;·&nbsp; ${academicYear}</span>
  </div>
  <div class="header-meta">
    <span class="meta-pill">${semester}</span>
    <span class="meta-pill" style="background:#F0FDF4;color:#166534;">${academicYear}</span>
    <span class="meta-date">Printed: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
  </div>
</div>

<!-- ── Stats bar ─────────────────────────────────────── -->
<div class="stats-bar">
  <div class="stat-box">
    <span class="stat-value">${filledSlots}</span>
    <span class="stat-label">Lessons</span>
  </div>
  <div class="stat-box">
    <span class="stat-value">${totalSlots - filledSlots}</span>
    <span class="stat-label">Free Slots</span>
  </div>
  <div class="stat-box">
    <span class="stat-value">${days.length}</span>
    <span class="stat-label">Days/Week</span>
  </div>
  <div class="stat-box">
    <span class="stat-value">${periods.filter((p: any) => p.type !== "BREAK").length}</span>
    <span class="stat-label">Periods/Day</span>
  </div>
  <div class="stat-spacer"></div>
  <div class="legend">
    ${subjects.slice(0, 8).map((s: any, i: number) => `
      <div class="legend-item">
        <div class="legend-dot" style="background:${subjectColor(i)}"></div>
        ${s.name || s.subjectName}
      </div>`).join("")}
  </div>
</div>

<!-- ── Timetable grid ────────────────────────────────── -->
<table>
  <thead>
    <tr>
      <th class="period-header">Day</th>
      ${periodHeaders}
    </tr>
  </thead>
  <tbody>
    ${rowsHtml}
  </tbody>
</table>

<!-- ── Footer ────────────────────────────────────────── -->
<div class="page-footer">
  <span class="footer-left">Class: <strong>${className}</strong> &nbsp;·&nbsp; ${timetableName}</span>
  <span class="footer-stamp">Generated by School Timetable System</span>
  <span class="footer-right">Page 1 of 1</span>
</div>

</body>
</html>`;

    /* Desktop → print window; mobile app → real landscape PDF saved & opened. */
    void outputHtmlDoc(`Timetable — ${className}`, html, {
        fileName: `Timetable-${className}`,
        landscape: true,
    });
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Component
══════════════════════════════════════════════════════════════════════════ */
export default function GenerateForClass() {
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
    const { items: slots, createItem, updateItem, deleteItem, isLoading: loadingSlots } = useItems("timetable_slots");

    const activeWeekdays = ["MON", "TUE", "WED", "THU", "FRI"];
    const sortedPeriods = [...(periods || [])].sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));

    const [selectedClassId, setSelectedClassId] = useState("");
    const [selectedTimetableId, setSelectedTimetableId] = useState("");
    const [generating, setGenerating] = useState(false);

    const [overrideSlot, setOverrideSlot] = useState<any>(null);
    const [overrideForm, setOverrideForm] = useState({ subjectId: "", teacherId: "", roomId: "" });

    const currentPeriodIndex = overrideSlot ? sortedPeriods.findIndex((p: any) => p._id === overrideSlot.periodId) : -1;
    
    // Find the next academic period on the day (skipping breaks)
    let nextPeriod = null;
    if (currentPeriodIndex !== -1) {
        for (let i = currentPeriodIndex + 1; i < sortedPeriods.length; i++) {
            if (sortedPeriods[i].type !== "BREAK") {
                nextPeriod = sortedPeriods[i];
                break;
            }
        }
    }

    const classHasSlot = nextPeriod && slots?.some((s: any) => 
        s.timetableId === selectedTimetableId && 
        s.classId === selectedClassId && 
        s.day === overrideSlot?.day && 
        s.periodId === nextPeriod._id
    );

    const teacherHasSlot = nextPeriod && overrideSlot?.slot?.teacherId && slots?.some((s: any) => 
        s.timetableId === selectedTimetableId && 
        s.day === overrideSlot?.day && 
        s.periodId === nextPeriod._id && 
        s.teacherId === overrideSlot.slot.teacherId
    );

    const roomHasSlot = nextPeriod && overrideSlot?.slot?.roomId && slots?.some((s: any) => 
        s.timetableId === selectedTimetableId && 
        s.day === overrideSlot?.day && 
        s.periodId === nextPeriod._id && 
        s.roomId === overrideSlot.slot.roomId
    );

    const isNextPeriodFree = nextPeriod && !classHasSlot && !teacherHasSlot && !roomHasSlot;

    let extendButtonText = "Can't Extend";
    if (!nextPeriod) {
        extendButtonText = "End of Day";
    } else if (classHasSlot) {
        extendButtonText = `Class Occupied`;
    } else if (teacherHasSlot) {
        extendButtonText = "Teacher Busy";
    } else if (roomHasSlot) {
        extendButtonText = "Room Occupied";
    } else {
        extendButtonText = `Extend to ${nextPeriod.name}`;
    }

    const firstFreePeriodOnDay = overrideSlot ? sortedPeriods.find((p: any) => {
        if (p.type === "BREAK" || p._id === overrideSlot.periodId) return false;
        
        // 1. Is the class free?
        const classOccupied = slots?.some((s: any) => 
            s.timetableId === selectedTimetableId && 
            s.classId === selectedClassId && 
            s.day === overrideSlot?.day && 
            s.periodId === p._id
        );
        if (classOccupied) return false;

        // 2. Is the teacher free?
        if (overrideSlot.slot?.teacherId) {
            const teacherOccupied = slots?.some((s: any) => 
                s.timetableId === selectedTimetableId && 
                s.day === overrideSlot?.day && 
                s.periodId === p._id && 
                s.teacherId === overrideSlot.slot.teacherId
            );
            if (teacherOccupied) return false;
        }

        // 3. Is the room free?
        if (overrideSlot.slot?.roomId) {
            const roomOccupied = slots?.some((s: any) => 
                s.timetableId === selectedTimetableId && 
                s.day === overrideSlot?.day && 
                s.periodId === p._id && 
                s.roomId === overrideSlot.slot.roomId
            );
            if (roomOccupied) return false;
        }

        return true;
    }) : null;

    const handleExtend = async () => {
        if (!overrideSlot?.slot || !nextPeriod) return;
        try {
            await createItem({
                timetableId: selectedTimetableId,
                classId: selectedClassId,
                periodId: nextPeriod._id,
                day: overrideSlot.day,
                subjectId: overrideSlot.slot.subjectId,
                teacherId: overrideSlot.slot.teacherId,
                roomId: overrideSlot.slot.roomId,
                isLocked: false
            });
            toast.success("Session extended to next slot successfully!");
            setOverrideSlot(null);
        } catch {
            toast.error("Failed to extend session");
        }
    };

    const handleMove = async () => {
        if (!overrideSlot?.slot || !firstFreePeriodOnDay) return;
        try {
            await updateItem({
                id: overrideSlot.slot._id,
                periodId: firstFreePeriodOnDay._id
            });
            toast.success(`Session moved to ${firstFreePeriodOnDay.name} successfully!`);
            setOverrideSlot(null);
        } catch {
            toast.error("Failed to move session");
        }
    };



    useEffect(() => {
        if (timetables?.length) setSelectedTimetableId(timetables[0]._id);
        if (classes?.length) setSelectedClassId(classes[0]._id);
    }, [timetables, classes]);

    const getSlotFor = (day: string, periodId: string) =>
        slots?.find((s: any) =>
            s.timetableId === selectedTimetableId &&
            s.classId === selectedClassId &&
            s.day === day &&
            s.periodId === periodId
        );

    const handleGenerate = async () => {
        if (!selectedTimetableId || !selectedClassId) {
            toast.error("Please select a timetable and a class first"); return;
        }
        setGenerating(true);
        try {
            const classSlots = slots?.filter((s: any) => s.timetableId === selectedTimetableId && s.classId === selectedClassId) || [];
            for (const s of classSlots) await deleteItem(s._id);

            if (subjects?.length && staff?.length && rooms?.length) {
                const currentClass = classes?.find((c: any) => c._id === selectedClassId);
                const fullClassName = currentClass ? `${currentClass.levelName || ''} ${currentClass.streamName !== 'General' && currentClass.streamName ? currentClass.streamName : ''}`.trim() || currentClass.name : "";
                const assignedSubjectIds = new Set(
                    currentClass?.subjects?.map((s: any) => s.subjectId) || []
                );

                const activeSubjects = subjects.filter((sub: any) => 
                    assignedSubjectIds.has(sub._id) &&
                    staff.some((s: any) => s.specializedSubjects?.includes(sub._id))
                );

                if (activeSubjects.length === 0) {
                    toast.error("No subjects assigned to this class have specialized teachers assigned yet. Please assign subjects to the class and specialized subjects to staff first.");
                    setGenerating(false);
                    return;
                }

                for (const p of sortedPeriods) {
                    if (p.type === "BREAK") continue;
                    for (const day of activeWeekdays) {
                        if (Math.random() > 0.2) {
                            const sub = activeSubjects[Math.floor(Math.random() * activeSubjects.length)];
                            const specialized = staff.filter((s: any) => s.specializedSubjects?.includes(sub._id));
                            const tea = specialized[Math.floor(Math.random() * specialized.length)];
                            let rm = rooms?.find((r: any) => r.name?.toLowerCase() === fullClassName.toLowerCase());
                            const targetRoomId = rm ? rm._id : selectedClassId;
                            await createItem({ timetableId: selectedTimetableId, classId: selectedClassId, periodId: p._id, day, subjectId: sub._id, teacherId: tea._id, roomId: targetRoomId, isLocked: false });
                        }
                    }
                }
                toast.success("Timetable generated!");
            } else {
                toast.error("Ensure subjects, staff, and rooms exist before generating.");
            }
        } catch { toast.error("Generation failed"); }
        finally { setGenerating(false); }
    };

    const toggleLockSlot = async (slot: any) => {
        try {
            await updateItem({ id: slot._id, isLocked: !slot.isLocked });
            toast.success(slot.isLocked ? "Slot unlocked" : "Slot locked");
        } catch { toast.error("Failed to update slot"); }
    };

    const handleOverrideClick = (day: string, periodId: string, slot?: any) => {
        setOverrideSlot({ day, periodId, slot });
        setOverrideForm({ subjectId: slot?.subjectId || "", teacherId: slot?.teacherId || "", roomId: slot?.roomId || "" });
    };

    const saveOverride = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!overrideSlot) return;
        try {
            const { day, periodId, slot } = overrideSlot;
            if (slot) {
                await updateItem({ id: slot._id, ...overrideForm });
            } else {
                await createItem({ timetableId: selectedTimetableId, classId: selectedClassId, periodId, day, ...overrideForm, isLocked: false, isManualOverride: true });
            }
            toast.success("Slot updated");
            setOverrideSlot(null);
        } catch { toast.error("Failed to save slot"); }
    };

    const handlePrint = () => {
        const cls = classes?.find((c: any) => c._id === selectedClassId);
        const tt = timetables?.find((t: any) => t._id === selectedTimetableId);
        
        const fullClassName = cls ? `${cls.levelName} ${cls.streamName !== 'General' && cls.streamName ? cls.streamName : ''}`.trim() : "Class";

        printTimetable({
            className: fullClassName,
            timetableName: tt?.name || "Timetable",
            schoolName: profileData?.name || "School Name",
            schoolLogo: profileData?.logo || "",
            academicYear: tt?.academicYear || "2024/2025",
            semester: tt?.semester || "Term 1",
            days: activeWeekdays,
            periods: sortedPeriods,
            getSlot: getSlotFor,
            subjects: subjects || [],
            staff: staff || [],
            rooms: rooms || [],
        });
    };

    /* ── Render ──────────────────────────────────────────────────────── */
    return (
        <div className="max-w-6xl mx-auto space-y-6">

            {/* ── Controls bar ────────────────────────────────────────── */}
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
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Class</label>
                        <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
                            className="h-11 px-3 border border-gray-200 rounded-lg text-sm bg-white min-w-[200px]">
                            {classes?.map((c: any) => {
                                const fullClassName = c.levelName ? `${c.levelName} ${c.streamName !== 'General' && c.streamName ? c.streamName : ''}`.trim() : (c.name || "Class");
                                return <option key={c._id} value={c._id}>{fullClassName}</option>;
                            })}
                        </select>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={handleGenerate} disabled={generating}
                        className="bg-[#5C67F2] hover:bg-[#4b54db] disabled:opacity-75 text-white h-11 px-6 rounded-xl font-bold flex items-center gap-2 transition-colors text-sm shadow-md">
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        Generate Timetable
                    </button>

                    {/* ── Beautiful Print button ─────────────────────────── */}
                    <button onClick={handlePrint}
                        className="group relative bg-white hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 h-11 px-5 rounded-xl font-bold flex items-center gap-2 transition-all text-sm border border-gray-200 hover:border-indigo-300 shadow-sm hover:shadow-md">
                        <Printer className="w-4 h-4 transition-transform group-hover:scale-110" />
                        Print / PDF
                        <span className="absolute -top-2 -right-2 text-[9px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-full tracking-wide">A4</span>
                    </button>
                </div>
            </div>

            {/* ── Timetable Grid ──────────────────────────────────────── */}
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
                                                            ☕ {p.name}
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            return null;
                                        }

                                        if (pi > 0 && sortedPeriods[pi - 1].type !== "BREAK") {
                                            const prevSlot = getSlotFor(day, sortedPeriods[pi - 1]._id);
                                            const currSlot = getSlotFor(day, p._id);
                                            if (prevSlot && currSlot && prevSlot.subjectId === currSlot.subjectId && prevSlot.teacherId === currSlot.teacherId) {
                                                return null;
                                            }
                                        }

                                        let isFirstHalfOfDouble = false;
                                        if (pi < sortedPeriods.length - 1 && sortedPeriods[pi + 1].type !== "BREAK") {
                                            const currSlot = getSlotFor(day, p._id);
                                            const nextSlot = getSlotFor(day, sortedPeriods[pi + 1]._id);
                                            if (currSlot && nextSlot && currSlot.subjectId === nextSlot.subjectId && currSlot.teacherId === nextSlot.teacherId) {
                                                isFirstHalfOfDouble = true;
                                            }
                                        }

                                        const slot = getSlotFor(day, p._id);
                                        const sub = subjects?.find((s: any) => s._id === slot?.subjectId);
                                        const tea = staff?.find((s: any) => s._id === slot?.teacherId);
                                        const rmObj = rooms?.find((r: any) => r._id === slot?.roomId) || classes?.find((c: any) => c._id === slot?.roomId);
                                        const rmName = rmObj ? (rmObj.name || `${rmObj.levelName || ''} ${rmObj.streamName !== 'General' && rmObj.streamName ? rmObj.streamName : ''}`.trim() || "Room") : "Room";
                                        const color = sub ? subjectColor(subjects!.indexOf(sub)) : "#5C67F2";
                                        const baseSubName = sub?.name || sub?.subjectName || "Subject";
                                        const subName = isFirstHalfOfDouble ? `Double ${baseSubName}` : baseSubName;

                                        return (
                                            <td key={p._id} className="p-2 border-r border-gray-50 last:border-0 relative group h-28" colSpan={isFirstHalfOfDouble ? 2 : 1}>
                                                {slot ? (
                                                    <div className="h-full w-full rounded-xl p-2.5 flex flex-col justify-between text-left relative overflow-hidden transition-all group-hover:shadow-sm"
                                                        style={{ backgroundColor: color + "14", borderTop: `1px solid ${color}30`, borderRight: `1px solid ${color}30`, borderBottom: `1px solid ${color}30`, borderLeft: `3.5px solid ${color}` }}>
                                                        <div>
                                                            <div className="font-bold text-xs truncate" style={{ color }}>{subName}</div>
                                                            <div className="text-[10px] text-gray-500 font-medium truncate mt-0.5">{tea?.name || tea?.employeeName || "Teacher"}</div>
                                                        </div>
                                                        <div className="flex justify-between items-end mt-1">
                                                            <span className="text-[9px] font-bold text-gray-400 bg-white/70 px-1.5 py-0.5 rounded-md border border-gray-100">
                                                                {rmName}
                                                            </span>
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => toggleLockSlot(slot)}
                                                                    className="p-1 hover:bg-white/80 rounded-md text-gray-400 hover:text-gray-700 transition-colors">
                                                                    {slot.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                                                </button>
                                                                <button onClick={() => handleOverrideClick(day, p._id, slot)}
                                                                    className="p-1 hover:bg-white/80 rounded-md text-gray-400 hover:text-gray-700 transition-colors">
                                                                    <Edit3 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {slot.isLocked && (
                                                            <div className="absolute top-1.5 right-1.5">
                                                                <Lock className="w-2.5 h-2.5 text-gray-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <button onClick={() => handleOverrideClick(day, p._id)}
                                                        className="h-full w-full border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-300 hover:border-[#5C67F2] hover:text-[#5C67F2] hover:bg-indigo-50/30 transition-all">
                                                        <Plus className="w-4 h-4" />
                                                    </button>
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

            {/* ── Override Modal ──────────────────────────────────────── */}
            {overrideSlot && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-[#5C67F2]" /> Manual Override Slot
                            </h3>
                            <button onClick={() => setOverrideSlot(null)} className="text-2xl leading-none text-gray-400 hover:text-gray-700">&times;</button>
                        </div>
                        <form onSubmit={saveOverride} className="p-6 space-y-4">
                            {[
                                { 
                                    label: "Subject", 
                                    key: "subjectId", 
                                    items: (() => {
                                        const currentClass = classes?.find((c: any) => c._id === selectedClassId);
                                        const assignedSubjectIds = new Set(currentClass?.subjects?.map((s: any) => s.subjectId) || []);
                                        return subjects?.filter((sub: any) => 
                                            assignedSubjectIds.has(sub._id) && 
                                            staff.some((s: any) => s.specializedSubjects?.includes(sub._id))
                                        );
                                    })(), 
                                    getName: (s: any) => s.name || s.subjectName 
                                },
                                { 
                                    label: "Teacher", 
                                    key: "teacherId", 
                                    items: overrideForm.subjectId && staff.some((s: any) => s.specializedSubjects?.includes(overrideForm.subjectId))
                                        ? staff.filter((s: any) => s.specializedSubjects?.includes(overrideForm.subjectId))
                                        : staff, 
                                    getName: (s: any) => s.name || s.employeeName 
                                },
                                { label: "Class Room", key: "roomId", items: rooms, getName: (r: any) => `${r.name} (${r.type})` },
                            ].map(({ label, key, items, getName }) => {
                                const hasSpecializedTeachers = key === "teacherId" && overrideForm.subjectId && staff.some((s: any) => s.specializedSubjects?.includes(overrideForm.subjectId));
                                return (
                                    <div key={key}>
                                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{label}</label>
                                        <select required value={(overrideForm as any)[key]}
                                            onChange={e => setOverrideForm({ ...overrideForm, [key]: e.target.value })}
                                            className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:border-[#5C67F2] outline-none text-sm bg-white">
                                            <option value="" disabled>Select {label}</option>
                                            {items?.map((item: any) => <option key={item._id} value={item._id}>{getName(item)}</option>)}
                                        </select>
                                        {key === "teacherId" && overrideForm.subjectId && !hasSpecializedTeachers && (
                                            <p className="text-[10px] text-amber-500 font-bold mt-1">⚠️ No teachers are specialized in this subject yet. Showing all staff.</p>
                                        )}
                                        {key === "teacherId" && overrideForm.subjectId && hasSpecializedTeachers && (
                                            <p className="text-[10px] text-emerald-600 font-bold mt-1">✓ Showing only teachers specialized in this subject.</p>
                                        )}
                                    </div>
                                );
                            })}
                            {overrideSlot.slot && (
                                <div className="border-t border-gray-100 pt-4 space-y-3">
                                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Quick Adjustments</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            disabled={!isNextPeriodFree}
                                            onClick={handleExtend}
                                            className="h-10 px-3 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:hover:bg-indigo-50 text-[#5C67F2] font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> 
                                            {extendButtonText}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!firstFreePeriodOnDay}
                                            onClick={handleMove}
                                            className="h-10 px-3 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <ArrowRight className="w-3.5 h-3.5" /> 
                                            {firstFreePeriodOnDay ? `Move to ${firstFreePeriodOnDay.name}` : "No Free Slots"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
                                <button type="button" onClick={() => setOverrideSlot(null)}
                                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-lg">Cancel</button>
                                <button type="submit"
                                    className="bg-[#5C67F2] hover:bg-[#4b54db] text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
