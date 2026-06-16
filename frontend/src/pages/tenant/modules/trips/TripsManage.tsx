import { MapPin } from "lucide-react";
import CrudListPage from "../shared/CrudListPage";

export default function TripsManage() {
    return (
        <CrudListPage
            title="Create / Manage Trips"
            subtitle="Trips & excursions with fee, capacity and consent settings"
            icon={<MapPin className="w-6 h-6" />}
            endpoint="/trips"
            queryKey="trips_list"
            moduleKey="trips"
            addLabel="Create Trip"
            fields={[
                { key: "name", label: "Trip Name", required: true, placeholder: "Nairobi National Park Visit" },
                { key: "destination", label: "Destination", placeholder: "Nairobi National Park" },
                { key: "date", label: "Date", type: "date" },
                { key: "fee", label: "Fee (KES)", type: "number", placeholder: "2500" },
                { key: "capacity", label: "Capacity", type: "number", placeholder: "100" },
                { key: "description", label: "Description / Objectives", type: "textarea", placeholder: "Wildlife Educational Tour" },
                { key: "targetClasses", label: "Target Classes", type: "classMultiSelect" },
                { key: "consentRequired", label: "Consent Required", type: "select", options: ["Yes", "No"] },
                { key: "feeMode", label: "Fee Mode", type: "select", options: ["Optional Payment", "Add To Fee Structure"] },
            ]}
            columns={[
                { key: "name", label: "Trip" },
                { key: "destination", label: "Destination" },
                { key: "date", label: "Date" },
                { key: "fee", label: "Fee", render: (r) => `KSh ${Number(r.fee || 0).toLocaleString()}` },
                { key: "capacity", label: "Capacity" },
                { key: "consentRequired", label: "Consent" },
            ]}
        />
    );
}
