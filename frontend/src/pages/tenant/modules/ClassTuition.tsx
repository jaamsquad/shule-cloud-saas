import { Coins } from "lucide-react";
import { FeesPage } from "@/components/fees/FeesUI";
import ClassTuitionGrid from "@/components/fees/ClassTuitionGrid";

/** Fees → Class Tuition: termly tuition for each class, with a different price per term where needed. */
export default function ClassTuition() {
    return (
        <FeesPage title="Class Tuition Fees" subtitle="Termly tuition for each class — and a different price for Term 1, 2 or 3 where it changes. Fee structures and invoices use these amounts." icon={Coins}>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <ClassTuitionGrid />
            </div>
        </FeesPage>
    );
}
