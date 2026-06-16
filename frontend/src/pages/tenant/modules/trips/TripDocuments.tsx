import { FileText } from "lucide-react";
import CrudListPage from "../shared/CrudListPage";

export default function TripDocuments() {
    return (
        <CrudListPage
            title="Trip Documents"
            subtitle="Permission forms, risk assessments, itineraries & medical forms"
            icon={<FileText className="w-6 h-6" />}
            endpoint="/trip-documents"
            queryKey="trip_documents"
            moduleKey="trips"
            addLabel="Add Document"
            fields={[
                { key: "tripName", label: "Trip", required: true },
                { key: "type", label: "Document Type", type: "select", options: ["Permission Form", "Risk Assessment", "Itinerary", "Medical Form"], required: true },
                { key: "title", label: "Title", placeholder: "e.g. Consent Form v2" },
                { key: "url", label: "File URL / Link", placeholder: "https://…" },
            ]}
            columns={[
                { key: "tripName", label: "Trip" },
                { key: "type", label: "Type" },
                { key: "title", label: "Title" },
                { key: "url", label: "Link", render: (r) => r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="text-[#5C67F2] font-bold">Download</a> : "—" },
            ]}
        />
    );
}
