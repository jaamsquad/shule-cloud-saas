/**
 * The school's configured grading, for any screen that shows grades or points.
 * Source of truth is the server (GET /grading/resolve → backend lib/grading.ts):
 * the class's grading template → class grading criteria → school grading criteria →
 * Curriculum Settings scale → KCSE 12-point default.
 *
 *   const g = useGrading(classId, className);   g.gradeOf(67).grade → "B"; g.gradeOf(67).points → 9
 *   const g = await fetchGrading(classId, className);   (outside React, e.g. print builders)
 */
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export type GradeBand = { grade: string; from: number; upto: number; points: number; remark: string };

// Same as the server default — only used until the school's scale has loaded.
export const DEFAULT_SCALE: GradeBand[] = [
    { grade: "A", from: 80, upto: 100, points: 12, remark: "EXCELLENT" }, { grade: "A-", from: 75, upto: 79, points: 11, remark: "V.GOOD" },
    { grade: "B+", from: 70, upto: 74, points: 10, remark: "GOOD" }, { grade: "B", from: 65, upto: 69, points: 9, remark: "GOOD" },
    { grade: "B-", from: 60, upto: 64, points: 8, remark: "GOOD" }, { grade: "C+", from: 55, upto: 59, points: 7, remark: "FAIR" },
    { grade: "C", from: 50, upto: 54, points: 6, remark: "FAIR" }, { grade: "C-", from: 45, upto: 49, points: 5, remark: "AVERAGE" },
    { grade: "D+", from: 40, upto: 44, points: 4, remark: "BELOW AVG" }, { grade: "D", from: 35, upto: 39, points: 3, remark: "WEAK" },
    { grade: "D-", from: 30, upto: 34, points: 2, remark: "WEAK" }, { grade: "E", from: 0, upto: 29, points: 1, remark: "POOR" },
];

/** The band a percentage falls in: the highest band whose lower bound it reaches (no gaps). */
export function gradeFromScale(scale: GradeBand[], pct: number): GradeBand {
    const sorted = [...scale].sort((a, b) => b.from - a.from);
    const p = Number(pct) || 0;
    return sorted.find(s => p >= s.from) || sorted[sorted.length - 1] || DEFAULT_SCALE[DEFAULT_SCALE.length - 1];
}
/** Mean grade from mean points. */
export function meanGradeFromScale(scale: GradeBand[], meanPoints: number): string {
    const byPts = [...scale].sort((a, b) => b.points - a.points);
    for (const s of byPts) if (meanPoints >= s.points - 0.5) return s.grade;
    return byPts[byPts.length - 1]?.grade || "-";
}

export type Grading = { scale: GradeBand[]; source: string; ready: boolean; gradeOf: (pct: number) => GradeBand; grade: (pct: number) => string; points: (pct: number) => number; meanGrade: (meanPoints: number) => string };
const make = (scale: GradeBand[], source: string, ready: boolean): Grading => ({
    scale, source, ready,
    gradeOf: pct => gradeFromScale(scale, pct),
    grade: pct => gradeFromScale(scale, pct).grade,
    points: pct => gradeFromScale(scale, pct).points,
    meanGrade: mp => meanGradeFromScale(scale, mp),
});

const load = async (classId?: string, className?: string) => (await api.get("/grading/resolve", { params: { ...(classId ? { classId } : {}), ...(className ? { className } : {}) } })).data as { scale: GradeBand[]; source: string };

export function useGrading(classId?: string | null, className?: string | null): Grading {
    const { data } = useQuery({ queryKey: ["grading_resolve", classId || "", className || ""], queryFn: () => load(classId || undefined, className || undefined), staleTime: 5 * 60_000 });
    return make(data?.scale?.length ? data.scale : DEFAULT_SCALE, data?.source || "default", !!data);
}

export async function fetchGrading(classId?: string, className?: string): Promise<Grading> {
    try { const d = await load(classId, className); return make(d.scale?.length ? d.scale : DEFAULT_SCALE, d.source, true); }
    catch { return make(DEFAULT_SCALE, "default", false); }
}
