import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Crosshair, X, Check } from "lucide-react";

// Leaflet's default PNG marker icons break under bundlers; use a lightweight
// div-based pin instead so no image assets are needed.
const pinIcon = L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-100%)"><svg width="30" height="42" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#5C67F2"/><circle cx="12" cy="12" r="5" fill="#fff"/></svg></div>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
});

function ClickCapture({ onPick }: { onPick: (lat: number, lng: number) => void }) {
    useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
    return null;
}

// Recenters the map when the value changes (e.g. "use my location").
function Recenter({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    map.setView([lat, lng], map.getZoom());
    return null;
}

interface Props {
    lat: number | null;
    lng: number | null;
    onChange: (lat: number, lng: number) => void;
    /** Optional label shown above the map. */
    label?: string;
    height?: number;
}

/** An inline OpenStreetMap picker: click the map (or use current location) to set
 *  a coordinate. Keyless — uses OSM tiles, no API key or billing. */
export default function MapPicker({ lat, lng, onChange, label, height = 260 }: Props) {
    // Default view: Nairobi, until a point is chosen.
    const center: [number, number] = [lat ?? -1.2921, lng ?? 36.8219];
    const [locating, setLocating] = useState(false);

    const useMyLocation = () => {
        if (!navigator.geolocation) return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => { onChange(pos.coords.latitude, pos.coords.longitude); setLocating(false); },
            () => setLocating(false),
            { enableHighAccuracy: true, timeout: 8000 },
        );
    };

    return (
        <div>
            {label && <p className="text-[11px] font-bold text-slate-600 mb-1">{label}</p>}
            <div className="rounded-xl overflow-hidden border border-slate-200 relative" style={{ height }}>
                <MapContainer center={center} zoom={lat != null ? 15 : 12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
                    <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ClickCapture onPick={onChange} />
                    {lat != null && lng != null && <Marker position={[lat, lng]} icon={pinIcon} />}
                    {lat != null && lng != null && <Recenter lat={lat} lng={lng} />}
                </MapContainer>
                <button type="button" onClick={useMyLocation}
                    className="absolute z-[1000] bottom-3 right-3 h-9 px-3 rounded-lg bg-white shadow border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <Crosshair className={`w-3.5 h-3.5 ${locating ? "animate-spin" : ""}`} /> My location
                </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {lat != null && lng != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Click the map to set the location"}
            </p>
        </div>
    );
}

/** A small button that opens the picker in a modal — handy inline in forms/rows. */
export function MapPickerButton({ lat, lng, onChange, title = "Pick location" }: Props & { title?: string }) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<{ lat: number | null; lng: number | null }>({ lat, lng });
    const has = lat != null && lng != null;
    return (
        <>
            <button type="button" onClick={() => { setDraft({ lat, lng }); setOpen(true); }}
                title={title}
                className={`h-10 px-2.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 ${has ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>
                <MapPin className="w-3.5 h-3.5" /> {has ? "Set" : "Pin"}
            </button>
            {open && (
                <div className="fixed inset-0 z-[300] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                            <h3 className="font-black text-slate-800 text-sm">{title}</h3>
                            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-4">
                            <MapPicker lat={draft.lat} lng={draft.lng} onChange={(la, ln) => setDraft({ lat: la, lng: ln })} height={320} />
                        </div>
                        <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-100">
                            <button onClick={() => setOpen(false)} className="h-9 px-4 rounded-lg border border-slate-200 text-slate-500 text-xs font-bold">Cancel</button>
                            <button onClick={() => { if (draft.lat != null && draft.lng != null) onChange(draft.lat, draft.lng); setOpen(false); }}
                                className="h-9 px-4 rounded-lg bg-[#5C67F2] text-white text-xs font-bold flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Use this location</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
