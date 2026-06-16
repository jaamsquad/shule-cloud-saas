import { CalendarClock } from "lucide-react";
import CrudListPage from "../shared/CrudListPage";

export default function SecretaryMeetings() {
    return (
        <CrudListPage
            title="Meeting Management"
            subtitle="Staff, board and PTA meetings"
            icon={<CalendarClock className="w-6 h-6" />}
            endpoint="/secretary-meetings"
            queryKey="secretary_meetings"
            moduleKey="secretary"
            addLabel="Schedule Meeting"
            fields={[
                { key: "title", label: "Title", required: true, placeholder: "Term 1 Staff Meeting" },
                { key: "type", label: "Type", type: "select", options: ["Staff Meeting", "Board Meeting", "PTA Meeting"] },
                { key: "date", label: "Date", type: "date" },
                { key: "time", label: "Time", placeholder: "10:00" },
                { key: "venue", label: "Venue", placeholder: "Boardroom" },
                { key: "agenda", label: "Agenda", type: "textarea" },
                { key: "status", label: "Status", type: "select", options: ["scheduled", "done", "cancelled"] },
            ]}
            columns={[
                { key: "date", label: "Date" },
                { key: "time", label: "Time" },
                { key: "title", label: "Title" },
                { key: "type", label: "Type" },
                { key: "venue", label: "Venue" },
                { key: "status", label: "Status" },
            ]}
        />
    );
}
