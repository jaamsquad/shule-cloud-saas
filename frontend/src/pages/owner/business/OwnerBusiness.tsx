import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Receipt, FileSignature, Building2 } from "lucide-react";
import { DocType, ACCENT } from "./bizShared";
import { DocList, DocDetail } from "./DocViews";
import { InvoiceQuoteEditor, ContractEditor } from "./DocEditor";
import CompanySettings from "./CompanySettings";

type Sub = DocType | "company";
type View = { mode: "list" } | { mode: "new" } | { mode: "view"; id: string } | { mode: "edit"; id: string };

const SUBS: { key: Sub; label: string; icon: any }[] = [
    { key: "quote", label: "Quotations", icon: FileText },
    { key: "invoice", label: "Invoices", icon: Receipt },
    { key: "contract", label: "Contracts", icon: FileSignature },
    { key: "company", label: "Company details", icon: Building2 },
];

/** Owner portal → Business: quotations, invoices and contracts ShuleCloud issues to schools. */
export default function OwnerBusiness() {
    const qc = useQueryClient();
    const [sub, setSub] = useState<Sub>("quote");
    const [view, setView] = useState<View>({ mode: "list" });
    const go = (s: Sub) => { setSub(s); setView({ mode: "list" }); };
    const done = (doc: any) => { qc.invalidateQueries({ queryKey: ["biz_docs"] }); qc.invalidateQueries({ queryKey: ["biz_doc"] }); setView({ mode: "view", id: doc._id }); };
    const openDoc = (type: DocType, id: string) => { setSub(type); setView({ mode: "view", id }); };

    return (
        <div className="space-y-5">
            {/* Sub tabs */}
            <div className="flex flex-wrap gap-2 print:hidden">
                {SUBS.map(s => (
                    <button key={s.key} onClick={() => go(s.key)} className={`h-10 px-4 rounded-xl text-sm font-bold flex items-center gap-2 border transition-colors ${sub === s.key ? "text-white border-transparent" : "bg-white text-slate-600 border-slate-200 hover:border-[#534AB7]"}`} style={sub === s.key ? { background: ACCENT } : {}}>
                        <s.icon className="w-4 h-4" /> {s.label}
                    </button>
                ))}
            </div>

            {sub === "company" ? <CompanySettings /> : view.mode === "list" ? (
                <DocList type={sub} onNew={() => setView({ mode: "new" })} onOpen={id => setView({ mode: "view", id })} />
            ) : view.mode === "view" ? (
                <DocDetail id={view.id} type={sub} onBack={() => setView({ mode: "list" })} onEdit={() => setView({ mode: "edit", id: view.id })} onOpen={openDoc} />
            ) : sub === "contract" ? (
                <ContractEditor id={view.mode === "edit" ? view.id : undefined} onDone={done} onCancel={() => setView(view.mode === "edit" ? { mode: "view", id: view.id } : { mode: "list" })} />
            ) : (
                <InvoiceQuoteEditor type={sub} id={view.mode === "edit" ? view.id : undefined} onDone={done} onCancel={() => setView(view.mode === "edit" ? { mode: "view", id: view.id } : { mode: "list" })} />
            )}
        </div>
    );
}
