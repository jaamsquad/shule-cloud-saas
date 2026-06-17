import { Award } from "lucide-react";
import CrudListPage from "../shared/CrudListPage";

export default function SportsPerformance() {
    return (
        <CrudListPage
            title="Sports Performance & Awards"
            subtitle="Track goals, medals, rankings and awards — shows on student profiles"
            icon={<Award className="w-6 h-6" />}
            endpoint="/sports-performance"
            queryKey="sports_performance"
            moduleKey="sports"
            addLabel="Add Achievement"
            fields={[
                { key: "studentName", label: "Student", type: "studentSelect", required: true },
                { key: "sportName", label: "Sport", type: "lookupSelect", lookupEndpoint: "/sports", lookupLabel: "name", placeholder: "Select sport…", required: true },
                { key: "achievement", label: "Achievement", required: true, placeholder: "Gold Medal / MVP" },
                { key: "metric", label: "Metric", type: "select", options: ["Goals", "Medal", "Ranking", "Award"] },
                { key: "value", label: "Value", placeholder: "e.g. 12 goals / Gold / 1st" },
                { key: "date", label: "Date", type: "date" },
            ]}
            columns={[
                { key: "date", label: "Date" },
                { key: "studentName", label: "Student" },
                { key: "sportName", label: "Sport" },
                { key: "achievement", label: "Achievement" },
                { key: "metric", label: "Metric" },
                { key: "value", label: "Value" },
            ]}
        />
    );
}
