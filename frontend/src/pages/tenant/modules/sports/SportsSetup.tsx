import { useState } from "react";
import { Trophy, UserPlus, Award } from "lucide-react";
import CrudListPage from "../shared/CrudListPage";
import { useModuleCrud } from "@/contexts/PermissionsContext";
import { AddStudentsModal, SportCertificatesModal } from "./SportTools";

export default function SportsSetup() {
    const canAdd = useModuleCrud("sports").canCreate;
    const canCert = useModuleCrud("certificates").canCreate;
    const [adding, setAdding] = useState<any>(null);
    const [certFor, setCertFor] = useState<any>(null);
    return (
        <>
        <CrudListPage
            title="Sports Setup"
            subtitle="Create sports with coach, age group, capacity and fee"
            icon={<Trophy className="w-6 h-6" />}
            endpoint="/sports"
            queryKey="sports_list"
            moduleKey="sports"
            addLabel="Add Sport"
            rowActions={(row) => <>
                {canAdd && (
                    <button onClick={() => setAdding(row)} title="Add students" className="h-7 px-2 rounded-lg bg-[#5C67F2]/10 hover:bg-[#5C67F2]/20 text-[#5C67F2] text-[11px] font-bold flex items-center gap-1">
                        <UserPlus className="w-3.5 h-3.5" /> Students
                    </button>
                )}
                {canCert && (
                    <button onClick={() => setCertFor(row)} title="Certificates for participants" className="h-7 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 text-[11px] font-bold flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" /> Certificates
                    </button>
                )}
            </>}
            fields={[
                { key: "name", label: "Sport Name", required: true, placeholder: "Football" },
                { key: "coach", label: "Coach", placeholder: "Mr. Hassan" },
                { key: "gender", label: "Gender", type: "select", options: ["Boys", "Girls", "Mixed"] },
                { key: "ageGroup", label: "Age Group", placeholder: "U15" },
                { key: "capacity", label: "Capacity", type: "number", placeholder: "50" },
                { key: "fee", label: "Fee (KES)", type: "number", placeholder: "3000" },
                { key: "term", label: "Term", type: "select", options: ["Term 1", "Term 2", "Term 3"] },
                { key: "schedule", label: "Schedule", placeholder: "Mon & Wed 4pm" },
            ]}
            columns={[
                { key: "name", label: "Sport" },
                { key: "coach", label: "Coach" },
                { key: "gender", label: "Gender" },
                { key: "ageGroup", label: "Age" },
                { key: "capacity", label: "Capacity" },
                { key: "fee", label: "Fee", render: (r) => `KSh ${Number(r.fee || 0).toLocaleString()}` },
                { key: "term", label: "Term" },
            ]}
        />
        {adding && <AddStudentsModal sport={adding} onClose={() => setAdding(null)} />}
        {certFor && <SportCertificatesModal sport={certFor} onClose={() => setCertFor(null)} />}
        </>
    );
}
