import { Trophy } from "lucide-react";
import CrudListPage from "../shared/CrudListPage";

export default function SportsSetup() {
    return (
        <CrudListPage
            title="Sports Setup"
            subtitle="Create sports with coach, age group, capacity and fee"
            icon={<Trophy className="w-6 h-6" />}
            endpoint="/sports"
            queryKey="sports_list"
            addLabel="Add Sport"
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
    );
}
