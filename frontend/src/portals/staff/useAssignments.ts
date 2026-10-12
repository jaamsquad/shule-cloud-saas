import { useQuery } from "@tanstack/react-query";
import { staffApi } from "./staffApi";

export interface Assignment { classId: string; className: string; subject: string; subjectId?: string }

// The (class, subject) pairs this teacher is assigned to + classes they head.
export function useAssignments() {
    return useQuery({
        queryKey: ["staff_assignments"],
        queryFn: async () => {
            const r = await staffApi.get("/staff-portal/assignments");
            return r.data as { assignments: Assignment[]; classTeacherOf: { classId: string; className: string }[] };
        },
        retry: false,
    });
}

export const pairKey = (a: { className: string; subject: string; subjectId?: string }) => `${a.className}|||${a.subject}|||${a.subjectId || ""}`;
export const parsePair = (key: string) => {
    const [className, subject, subjectId] = key.split("|||");
    return { className, subject, subjectId: subjectId || "" };
};
