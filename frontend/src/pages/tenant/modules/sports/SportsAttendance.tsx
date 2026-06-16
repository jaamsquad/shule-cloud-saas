import { UserCheck } from "lucide-react";
import CrudListPage from "../shared/CrudListPage";

export default function SportsAttendance() {
    return (
        <CrudListPage
            title="Sports Attendance"
            subtitle="Coach records attendance per session — used for discipline & reports"
            icon={<UserCheck className="w-6 h-6" />}
            endpoint="/sports-attendance"
            queryKey="sports_attendance"
            moduleKey="sports"
            addLabel="Record Attendance"
            fields={[
                { key: "sportName", label: "Sport", required: true, placeholder: "Football" },
                { key: "date", label: "Date", type: "date", required: true },
                { key: "studentName", label: "Student", type: "studentSelect", required: true },
                { key: "status", label: "Status", type: "select", options: ["Present", "Absent"], required: true },
                { key: "remark", label: "Remark", placeholder: "Optional" },
            ]}
            columns={[
                { key: "date", label: "Date" },
                { key: "sportName", label: "Sport" },
                { key: "studentName", label: "Student" },
                { key: "status", label: "Status", render: (r) => <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${r.status === "Present" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{r.status}</span> },
                { key: "remark", label: "Remark" },
            ]}
        />
    );
}
