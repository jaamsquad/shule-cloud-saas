import { FileText } from "lucide-react";
import CrudListPage from "../shared/CrudListPage";

// Opens uploaded data-URI files (or plain URLs) in a new tab.
function DownloadLink({ url, name }: { url: string; name?: string }) {
    const open = () => {
        if (url.startsWith("data:")) {
            const w = window.open();
            if (w) w.document.write(`<iframe src="${url}" style="border:0;width:100%;height:100%" title="${name || "file"}"></iframe>`);
        } else {
            window.open(url, "_blank", "noopener");
        }
    };
    return <button onClick={open} className="text-[#5C67F2] font-bold">View / Download</button>;
}

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
                { key: "tripName", label: "Trip", type: "lookupSelect", lookupEndpoint: "/trips", lookupLabel: "name", placeholder: "Select trip…", required: true },
                { key: "type", label: "Document Type", type: "select", options: ["Permission Form", "Risk Assessment", "Itinerary", "Medical Form"], required: true },
                { key: "title", label: "Title", placeholder: "e.g. Consent Form v2" },
                { key: "url", label: "Upload File", type: "file", accept: ".pdf,.doc,.docx,image/*", fileNameKey: "fileName" },
            ]}
            columns={[
                { key: "tripName", label: "Trip" },
                { key: "type", label: "Type" },
                { key: "title", label: "Title" },
                { key: "url", label: "File", render: (r) => r.url ? <DownloadLink url={r.url} name={r.fileName || r.title} /> : "—" },
            ]}
        />
    );
}
