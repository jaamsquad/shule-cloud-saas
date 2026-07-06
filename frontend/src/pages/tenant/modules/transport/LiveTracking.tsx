import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Bus, MapPin, Loader2, RefreshCw, Gauge, BatteryMedium, Clock, Navigation,
    Phone, User, Circle, ExternalLink, Route as RouteIcon, AlertTriangle,
} from "lucide-react";
import api from "@/lib/api";

// Relative "time ago" for last-seen.
const ago = (iso: string | null) => {
    if (!iso) return "never";
    const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
};
const kmh = (mps: number | null) => (mps == null ? "—" : `${Math.round(mps * 3.6)} km/h`);
const fmtTime = (iso: any) => (iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—");

export default function LiveTracking() {
    const [selected, setSelected] = useState<string | null>(null);

    // Bus list — refetches every 10s so the map/table stay live.
    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ["transport_live_buses"],
        queryFn: async () => (await api.get("/transport/live/buses")).data,
        refetchInterval: 10_000,
    });
    const buses: any[] = data?.buses || [];
    const active = buses.find((b) => b.busId === selected) || null;

    // Trail for the selected bus (path + location log).
    const { data: trailData } = useQuery({
        queryKey: ["transport_live_trail", selected],
        enabled: !!selected,
        refetchInterval: 10_000,
        queryFn: async () => (await api.get(`/transport/live/trail/${selected}`, { params: { limit: 300 } })).data,
    });
    const trail: any[] = trailData?.trail || [];

    // Safety alerts (SOS + incidents) and the trip activity log.
    const { data: alertsData } = useQuery({
        queryKey: ["transport_alerts"],
        queryFn: async () => (await api.get("/transport/alerts")).data,
        refetchInterval: 15_000,
    });
    const alerts: any[] = alertsData?.alerts || [];
    const { data: tripsData } = useQuery({
        queryKey: ["transport_trips"],
        queryFn: async () => (await api.get("/transport/live/trips")).data,
        refetchInterval: 15_000,
    });
    const trips: any[] = Array.isArray(tripsData) ? tripsData : [];

    const onlineCount = useMemo(() => buses.filter((b) => b.online).length, [buses]);

    // Keyless OpenStreetMap embed centered on the bus (no API key, no billing).
    // A small bbox around the point gives a street-level view with a marker.
    const mapSrc = active?.lat != null && active?.lng != null
        ? (() => {
            const d = 0.006; // ~600m half-box
            const bbox = `${active.lng - d},${active.lat - d},${active.lng + d},${active.lat + d}`;
            return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${active.lat},${active.lng}`;
        })()
        : null;

    return (
        <div className="flex-1 bg-[#f4f7f6] min-h-screen p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-[#5C67F2] rounded-2xl flex items-center justify-center text-white"><MapPin className="w-5 h-5" /></div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800">Live Bus Tracking</h1>
                            <p className="text-xs text-slate-500">Real-time location of your school buses</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                            <Circle className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500" /> {onlineCount} online
                        </span>
                        <button onClick={() => refetch()} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-bold flex items-center gap-1.5">
                            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-24 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-[#5C67F2]" /></div>
                ) : buses.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center">
                        <Bus className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm font-bold text-slate-500">No buses have reported a location yet.</p>
                        <p className="text-xs text-slate-400 mt-1">Buses appear here once a driver starts a trip in the ShuleCloud Driver app.</p>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Bus list */}
                        <div className="space-y-3">
                            {buses.map((b) => (
                                <button key={b.busId} onClick={() => setSelected(b.busId)}
                                    className={`w-full text-left bg-white rounded-2xl border p-4 shadow-sm transition-all ${active?.busId === b.busId ? "border-[#5C67F2] ring-1 ring-[#5C67F2]/30" : "border-slate-100 hover:border-slate-300"}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-black text-slate-800 flex items-center gap-2">
                                            <Bus className="w-4 h-4 text-[#5C67F2]" /> {b.routeName}
                                        </span>
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${b.online ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                            <Circle className={`w-2 h-2 ${b.online ? "fill-emerald-500 text-emerald-500" : "fill-slate-400 text-slate-400"}`} /> {b.online ? "Online" : "Offline"}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 space-y-0.5">
                                        {b.busPlate && <p className="flex items-center gap-1.5"><RouteIcon className="w-3 h-3" /> {b.busPlate}</p>}
                                        {b.driverName && <p className="flex items-center gap-1.5"><User className="w-3 h-3" /> {b.driverName}{b.coDriver ? ` · ${b.coDriver}` : ""}</p>}
                                        <p className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Last seen {ago(b.lastSeen)}</p>
                                        {(b.studentCount > 0 || (b.stops?.length ?? 0) > 0) && (
                                            <p className="text-slate-400">{b.studentCount || 0} students · {(b.stops?.length ?? 0)} stops</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 text-[11px] font-bold">
                                        <span className="flex items-center gap-1 text-slate-600"><Gauge className="w-3 h-3" /> {kmh(b.speed)}</span>
                                        {b.battery != null && <span className="flex items-center gap-1 text-slate-600"><BatteryMedium className="w-3 h-3" /> {b.battery}%</span>}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Detail + map + trail */}
                        <div className="lg:col-span-2 space-y-4">
                            {!active ? (
                                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 text-center text-slate-400">
                                    <MapPin className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                    <p className="text-sm font-semibold">Select a bus to see its live position &amp; trail</p>
                                </div>
                            ) : (
                                <>
                                    {/* Live position card */}
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                                            <h3 className="font-black text-slate-800 flex items-center gap-2"><Navigation className="w-4 h-4 text-[#5C67F2]" /> {active.routeName}</h3>
                                            {active.lat != null && (
                                                <a href={`https://www.openstreetmap.org/?mlat=${active.lat}&mlon=${active.lng}#map=16/${active.lat}/${active.lng}`} target="_blank" rel="noreferrer"
                                                    className="text-[11px] font-bold text-[#5C67F2] flex items-center gap-1">Open in Maps <ExternalLink className="w-3 h-3" /></a>
                                            )}
                                        </div>
                                        {mapSrc ? (
                                            <iframe title="Bus location" src={mapSrc} className="w-full h-72 border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                                        ) : (
                                            <div className="h-72 flex items-center justify-center text-slate-400 text-sm">No location reported yet for this bus.</div>
                                        )}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100 border-t border-slate-100 text-center">
                                            <Stat label="Speed" value={kmh(active.speed)} icon={<Gauge className="w-3.5 h-3.5" />} />
                                            <Stat label="Battery" value={active.battery != null ? `${active.battery}%` : "—"} icon={<BatteryMedium className="w-3.5 h-3.5" />} />
                                            <Stat label="Last seen" value={ago(active.lastSeen)} icon={<Clock className="w-3.5 h-3.5" />} />
                                            <Stat label="Status" value={active.online ? "Online" : "Offline"} icon={<Circle className="w-3.5 h-3.5" />} />
                                        </div>
                                    </div>

                                    {/* Driver + coords */}
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 grid sm:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Driver</p>
                                            <p className="font-bold text-slate-700 flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /> {active.driverName || "—"}</p>
                                            {active.driverPhone && <a href={`tel:${active.driverPhone}`} className="text-[12px] text-[#5C67F2] font-bold flex items-center gap-1.5 mt-1"><Phone className="w-3 h-3" /> {active.driverPhone}</a>}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Coordinates</p>
                                            <p className="font-mono text-[12px] text-slate-600">{active.lat != null ? `${active.lat.toFixed(5)}, ${active.lng.toFixed(5)}` : "—"}</p>
                                            {active.busPlate && <p className="text-[12px] text-slate-500 mt-1">Plate: <b>{active.busPlate}</b></p>}
                                        </div>
                                    </div>

                                    {/* Location trail / log */}
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                                            <h3 className="font-black text-slate-800 text-sm">Location Trail</h3>
                                            <span className="text-[11px] text-slate-400">{trail.length} points</span>
                                        </div>
                                        {trail.length === 0 ? (
                                            <p className="py-10 text-center text-slate-400 text-sm">No trail recorded yet.</p>
                                        ) : (
                                            <div className="max-h-72 overflow-y-auto">
                                                <table className="w-full text-xs">
                                                    <thead className="bg-slate-50 text-slate-500 sticky top-0">
                                                        <tr>
                                                            <th className="text-left px-4 py-2 font-black">Time</th>
                                                            <th className="text-left px-3 py-2 font-black">Location</th>
                                                            <th className="text-center px-3 py-2 font-black">Speed</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {trail.slice().reverse().map((p, i) => (
                                                            <tr key={i} className="border-t border-slate-50">
                                                                <td className="px-4 py-2 text-slate-500">{fmtTime(p.at)}</td>
                                                                <td className="px-3 py-2 font-mono text-slate-600">{p.lat?.toFixed(5)}, {p.lng?.toFixed(5)}</td>
                                                                <td className="px-3 py-2 text-center text-slate-600">{kmh(p.speed)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Safety alerts (SOS + incidents) + trip activity log */}
                <div className="grid lg:grid-cols-2 gap-6 mt-6">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-black text-slate-800 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-500" /> Safety Alerts</h3>
                            {alerts.length > 0 && <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{alerts.length}</span>}
                        </div>
                        {alerts.length === 0 ? (
                            <p className="py-8 text-center text-slate-400 text-sm">No SOS or incidents reported.</p>
                        ) : (
                            <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                                {alerts.map((a) => (
                                    <div key={a.id} className="px-5 py-3 flex items-start gap-3">
                                        <span className={`mt-0.5 text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${a.kind === "sos" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{a.kind === "sos" ? "SOS" : "Incident"}</span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-slate-700">{a.driverName || "Driver"}{a.routeName ? ` · ${a.routeName}` : ""}</p>
                                            <p className="text-[12px] text-slate-500">{a.description}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{fmtTime(a.at)} · {ago(a.at)}{a.lat ? " · " : ""}
                                                {a.lat != null && <a href={`https://www.openstreetmap.org/?mlat=${a.lat}&mlon=${a.lng}#map=16/${a.lat}/${a.lng}`} target="_blank" rel="noreferrer" className="text-[#5C67F2] font-bold">view location</a>}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100">
                            <h3 className="font-black text-slate-800 text-sm flex items-center gap-2"><Navigation className="w-4 h-4 text-[#5C67F2]" /> Trip Activity</h3>
                        </div>
                        {trips.length === 0 ? (
                            <p className="py-8 text-center text-slate-400 text-sm">No trips recorded yet.</p>
                        ) : (
                            <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                                {trips.map((t) => (
                                    <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-700 truncate">{t.driverName || "Driver"}{t.routeName ? ` · ${t.routeName}` : ""}</p>
                                            <p className="text-[10px] text-slate-400">Started {fmtTime(t.startedAt)}{t.endedAt ? ` · Ended ${fmtTime(t.endedAt)}` : ""}</p>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${t.state === "started" ? "bg-emerald-100 text-emerald-700" : t.state === "paused" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{t.state}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
    return (
        <div className="py-3">
            <p className="text-[9px] font-black uppercase tracking-wide text-slate-400 flex items-center justify-center gap-1">{icon} {label}</p>
            <p className="font-black text-slate-700 text-sm mt-0.5">{value}</p>
        </div>
    );
}
