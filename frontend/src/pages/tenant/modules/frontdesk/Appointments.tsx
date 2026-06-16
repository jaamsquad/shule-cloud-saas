import { CalendarClock } from "lucide-react";
import CrudListPage from "../shared/CrudListPage";

export default function Appointments() {
    return (
        <CrudListPage
            title="Appointment Booking"
            subtitle="Meetings with Principal, Deputy or teachers — confirmed at front desk"
            icon={<CalendarClock className="w-6 h-6" />}
            endpoint="/appointments"
            queryKey="appointments_list"
            addLabel="Book Appointment"
            fields={[
                { key: "visitorName", label: "Requested By", required: true },
                { key: "phone", label: "Phone" },
                { key: "with", label: "Meeting With", type: "select", options: ["Principal", "Deputy Principal", "Teacher", "Bursar", "Secretary"] },
                { key: "date", label: "Date", type: "date" },
                { key: "time", label: "Time", placeholder: "14:00" },
                { key: "purpose", label: "Purpose", type: "textarea" },
                { key: "status", label: "Status", type: "select", options: ["pending", "confirmed", "done"] },
            ]}
            columns={[
                { key: "date", label: "Date" },
                { key: "time", label: "Time" },
                { key: "visitorName", label: "Requested By" },
                { key: "with", label: "With" },
                { key: "status", label: "Status", render: (r) => <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${r.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : r.status === "done" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700"}`}>{r.status || "pending"}</span> },
            ]}
        />
    );
}
