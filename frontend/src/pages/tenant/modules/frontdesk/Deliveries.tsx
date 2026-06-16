import { Package } from "lucide-react";
import CrudListPage from "../shared/CrudListPage";

export default function Deliveries() {
    return (
        <CrudListPage
            title="Delivery Register"
            subtitle="Track books, supplies and parcels received at reception"
            icon={<Package className="w-6 h-6" />}
            endpoint="/deliveries"
            queryKey="deliveries_list"
            addLabel="Log Delivery"
            fields={[
                { key: "item", label: "Item", required: true, placeholder: "Textbooks / Parcel" },
                { key: "type", label: "Type", type: "select", options: ["Books", "Supplies", "Parcel", "Other"] },
                { key: "from", label: "From / Courier" },
                { key: "receivedBy", label: "Received By" },
                { key: "date", label: "Date", type: "date" },
                { key: "notes", label: "Notes", type: "textarea" },
            ]}
            columns={[
                { key: "date", label: "Date" },
                { key: "item", label: "Item" },
                { key: "type", label: "Type" },
                { key: "from", label: "From" },
                { key: "receivedBy", label: "Received By" },
            ]}
        />
    );
}
