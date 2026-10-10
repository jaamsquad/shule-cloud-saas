import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange } from "lucide-react";
import api from "@/lib/api";
import { FSelect } from "./FeesUI";

// Academic year + term, defaulting to the current (active) session.
export function useTerms(opts: { allowAll?: boolean } = {}) {
    const { data: years = [], isLoading: ly } = useQuery<any[]>({
        queryKey: ["v2_academic_years"],
        queryFn: async () => { const r = await api.get("/v2/academic-years"); return Array.isArray(r.data) ? r.data : (r.data?.data || []); },
    });
    const { data: terms = [], isLoading: lt } = useQuery<any[]>({
        queryKey: ["v2_terms"],
        queryFn: async () => { const r = await api.get("/v2/terms"); return Array.isArray(r.data) ? r.data : (r.data?.data || []); },
    });
    const [yearId, setYearId] = useState("");
    const [termId, setTermId] = useState("");
    const sortedYears = useMemo(() => [...years].sort((a, b) => Number(b.year || 0) - Number(a.year || 0)), [years]);
    const termsOfYear = useMemo(() => terms.filter((t: any) => String(t.academicYearId) === String(yearId)).sort((a: any, b: any) => Number(a.termNumber || 0) - Number(b.termNumber || 0) || String(a.name).localeCompare(String(b.name))), [terms, yearId]);

    useEffect(() => {
        if (yearId || !sortedYears.length) return;
        const y = sortedYears.find((y: any) => y.isActive) || sortedYears[0];
        setYearId(String(y._id));
    }, [sortedYears, yearId]);
    useEffect(() => {
        if (!yearId) return;
        if (termId === "" && opts.allowAll && termsOfYear.length === 0) return;
        if (termId && (termId === "all" || termsOfYear.some((t: any) => String(t._id) === termId))) return;
        const t = termsOfYear.find((t: any) => t.isActive) || termsOfYear[0];
        setTermId(t ? String(t._id) : (opts.allowAll ? "all" : ""));
    }, [yearId, termsOfYear]); // eslint-disable-line react-hooks/exhaustive-deps

    const year = sortedYears.find((y: any) => String(y._id) === yearId);
    const term = termsOfYear.find((t: any) => String(t._id) === termId);
    const yearLabel = year ? (year.name || `Academic Year ${year.year}`) : "";
    return {
        years: sortedYears, terms: termsOfYear, yearId, termId, year, term, loading: ly || lt,
        setYearId: (v: string) => { setYearId(v); setTermId(""); }, setTermId,
        label: [term?.name || (termId === "all" ? "All terms" : ""), year ? (year.year || yearLabel) : ""].filter(Boolean).join(" · "),
        isCurrent: !!(year?.isActive && (term?.isActive || termId === "all")),
    };
}

export function TermPicker({ t, allowAll, compact }: { t: ReturnType<typeof useTerms>; allowAll?: boolean; compact?: boolean }) {
    if (!t.loading && t.years.length === 0) {
        return <a href="/academics/periods" className="h-10 px-3 inline-flex items-center rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">No academic year yet — create one in Learning Periods →</a>;
    }
    return (
        <div className={`flex items-center gap-2 ${compact ? "" : "flex-wrap"}`}>
            <CalendarRange className="w-4 h-4 text-[#5C67F2] shrink-0 hidden sm:block" />
            <FSelect value={t.yearId} onChange={e => t.setYearId(e.target.value)} className="!w-auto min-w-[150px]">
                {t.years.map((y: any) => <option key={y._id} value={y._id}>{y.name || `Academic Year ${y.year}`}{y.isActive ? " (current)" : ""}</option>)}
            </FSelect>
            <FSelect value={t.termId} onChange={e => t.setTermId(e.target.value)} className="!w-auto min-w-[130px]" disabled={!t.terms.length && !allowAll}>
                {allowAll && <option value="all">All terms</option>}
                {!t.terms.length && !allowAll && <option value="">No terms for this year</option>}
                {t.terms.map((x: any) => <option key={x._id} value={x._id}>{x.name}{x.isActive ? " (current)" : ""}</option>)}
            </FSelect>
        </div>
    );
}
