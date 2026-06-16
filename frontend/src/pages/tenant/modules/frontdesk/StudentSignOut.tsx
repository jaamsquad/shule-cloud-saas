import { LogOut } from "lucide-react";
import CrudListPage from "../shared/CrudListPage";

export default function StudentSignOut() {
    return (
        <CrudListPage
            title="Student Sign Out"
            subtitle="Record students leaving school early — parent verification optional"
            icon={<LogOut className="w-6 h-6" />}
            endpoint="/student-signouts"
            queryKey="student_signouts"
            moduleKey="frontdesk"
            addLabel="Sign Out Student"
            fields={[
                { key: "studentName", label: "Student", type: "studentSelect", required: true, fillClassKey: "studentClass" },
                { key: "studentClass", label: "Class" },
                { key: "parentName", label: "Parent / Picking Person", required: true },
                { key: "reason", label: "Reason", placeholder: "Medical / Family" },
                { key: "date", label: "Date", type: "date" },
                { key: "timeOut", label: "Time Out", placeholder: "11:30" },
                { key: "otpVerified", label: "Parent OTP Verified", type: "select", options: ["Yes", "No"] },
            ]}
            columns={[
                { key: "studentName", label: "Student" },
                { key: "studentClass", label: "Class" },
                { key: "parentName", label: "Picked By" },
                { key: "reason", label: "Reason" },
                { key: "timeOut", label: "Time Out" },
                { key: "otpVerified", label: "OTP" },
            ]}
        />
    );
}
