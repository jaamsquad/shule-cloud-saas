import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

/**
 * The words the school uses, from the curricula that are switched on (Settings → Curriculum).
 * With only CBC on the whole system says Learning Area / Assessment / Grade; with only 8-4-4 on, Subject / Exam / Form.
 * When both are on the neutral words are used (each class still gets its own curriculum's words where the server provides them).
 */
export function useTerminology() {
    const { data = [] } = useQuery<any[]>({
        queryKey: ["curricula_active"],
        staleTime: 60_000,
        queryFn: async () => { try { const r = await api.get("/curricula/active"); return Array.isArray(r.data) ? r.data : []; } catch { return []; } },
    });
    const sole = data.length === 1 ? data[0] : null;
    const t = sole?.terminology || {};
    const subject = t.subject || "Subject", assessment = t.assessment || "Exam";
    return {
        single: !!sole, competency: sole?.assessmentMode === "competency", levelPrefix: sole?.levelPrefix || "",
        subject, subjects: t.subjectPlural || "Subjects", assessment, assessments: t.assessmentPlural || "Exams", score: t.score || "Marks", grade: t.grade || "Grade",
        /** the sidebar's fixed labels, in the school's words */
        label(text: string): string {
            if (!sole) return text;
            return ({
                "Subjects": t.subjectPlural, "New Subject": `New ${subject}`, "Exams": t.assessmentPlural, "Create New Exam": `Create New ${assessment}`,
            } as Record<string, string | undefined>)[text] || text;
        },
    };
}
