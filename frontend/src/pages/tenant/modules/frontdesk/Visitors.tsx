import { DoorOpen } from "lucide-react";
import CrudListPage from "../shared/CrudListPage";

export default function Visitors() {
    return (
        <CrudListPage
            title="Visitor Management"
            subtitle="Capture visitor details and generate a badge"
            icon={<DoorOpen className="w-6 h-6" />}
            endpoint="/visitors"
            queryKey="visitors_list"
            moduleKey="frontdesk"
            addLabel="Sign In Visitor"
            fields={[
                { key: "name", label: "Visitor Name", required: true },
                { key: "idNumber", label: "ID Number" },
                { key: "phone", label: "Phone" },
                { key: "visiting", label: "Person Visiting", placeholder: "Principal" },
                { key: "purpose", label: "Purpose", placeholder: "Meeting / Delivery / Emergency" },
                { key: "date", label: "Date", type: "date" },
                { key: "timeIn", label: "Time In", placeholder: "09:15" },
                { key: "timeOut", label: "Time Out", placeholder: "10:00" },
            ]}
            columns={[
                { key: "name", label: "Visitor" },
                { key: "idNumber", label: "ID" },
                { key: "phone", label: "Phone" },
                { key: "visiting", label: "Visiting" },
                { key: "purpose", label: "Purpose" },
                { key: "timeIn", label: "In" },
                { key: "timeOut", label: "Out" },
            ]}
        />
    );
}
