import { UserCheck } from "lucide-react";
import CrudListPage from "../shared/CrudListPage";

export default function TripAttendance() {
    return (
        <CrudListPage
            title="Trip Attendance"
            subtitle="Travel-day register — mark each participant present/absent"
            icon={<UserCheck className="w-6 h-6" />}
            endpoint="/trip-attendance"
            queryKey="trip_attendance"
            addLabel="Record Attendance"
            fields={[
                { key: "tripName", label: "Trip", required: true },
                { key: "date", label: "Date", type: "date", required: true },
                { key: "studentName", label: "Student", required: true },
                { key: "status", label: "Status", type: "select", options: ["Present", "Absent"], required: true },
                { key: "checkIn", label: "Check-in Time", placeholder: "07:30" },
            ]}
            columns={[
                { key: "date", label: "Date" },
                { key: "tripName", label: "Trip" },
                { key: "studentName", label: "Student" },
                { key: "status", label: "Status", render: (r) => <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${r.status === "Present" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{r.status}</span> },
                { key: "checkIn", label: "Check-in" },
            ]}
        />
    );
}
