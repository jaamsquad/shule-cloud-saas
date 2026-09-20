import { createContext, useContext, useMemo, useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { cbc, TermParams } from "./cbcApi";

// The term the CBC module is showing. Everyone starts on the CURRENT term — this lives in
// state, so each time the module is opened it resets to the current term. Admins can pick
// another term (or all terms) from the selector; everyone else is fixed to the current term.
//   value: ""  = current term (server default)  ·  "all"  ·  "<year>|<term>"
interface CbcTermCtx {
    value: string;
    params: TermParams;   // send with reads
    stamp: TermParams;    // add to new records (only when an admin picked a specific term)
    key: string;          // include in react-query keys so data refetches when the term changes
    label: string;
}
const Ctx = createContext<CbcTermCtx>({ value: "", params: {}, stamp: {}, key: "", label: "" });
export const useCbcTerm = () => useContext(Ctx);

export function CbcTermProvider({ children }: { children: ReactNode }) {
    const [value, setValue] = useState("");
    const { data } = useQuery({ queryKey: ["cbc_terms"], queryFn: cbc.terms });
    const terms = data?.terms || [];

    const ctx = useMemo<CbcTermCtx>(() => {
        if (value === "all") return { value, params: { term: "all" }, stamp: {}, key: "all", label: "All terms" };
        const picked = value ? terms.find(t => `${t.year}|${t.term}` === value) : null;
        if (picked) return { value, params: { term: picked.term, year: picked.year }, stamp: { term: picked.term, year: picked.year }, key: value, label: picked.label };
        return { value: "", params: {}, stamp: {}, key: "", label: data?.current?.label || "" };
    }, [value, terms, data?.current?.label]);

    return (
        <Ctx.Provider value={ctx}>
            <TermPicker terms={terms} canChoose={!!data?.canChoose} value={ctx.value} current={data?.current?.label || ""} onChange={setValue} />
            {children}
        </Ctx.Provider>
    );
}

function TermPicker({ terms, canChoose, value, current, onChange }: { terms: { term: string; year: string; label: string; isCurrent: boolean }[]; canChoose: boolean; value: string; current: string; onChange: (v: string) => void }) {
    if (!terms.length) return null;
    const cur = terms.find(t => t.isCurrent);
    return (
        <div className="flex items-center justify-end gap-2 -mt-2 mb-4">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            {canChoose ? (
                <select
                    value={value || (cur ? `${cur.year}|${cur.term}` : "all")}   // untouched = the current term
                    onChange={e => onChange(e.target.value)}
                    className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-[#7C3AED] cursor-pointer"
                >
                    {terms.map(t => <option key={`${t.year}|${t.term}`} value={`${t.year}|${t.term}`}>{t.label}{t.isCurrent ? " (Current)" : ""}</option>)}
                    <option value="all">All terms</option>
                </select>
            ) : (
                <span className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 flex items-center">{current || "Current term"}</span>
            )}
        </div>
    );
}
