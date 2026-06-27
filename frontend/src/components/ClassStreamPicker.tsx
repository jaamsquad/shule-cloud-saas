import { useQuery } from "@tanstack/react-query";

// Shared class + stream picker. Class (Form 1 / Grade 7) and Stream (East /
// South) are SEPARATE. Reads the v2 classes/streams model (single source of
// truth). onChange returns { classId, className, streamId, streamName, fullName }.
export interface ClassStreamValue {
    classId?: string; className?: string;
    streamId?: string; streamName?: string; fullName?: string;
}

export default function ClassStreamPicker({
    value, onChange, className = "", required = false, allowAllStreams = false,
}: {
    value: ClassStreamValue;
    onChange: (v: ClassStreamValue) => void;
    className?: string;
    required?: boolean;
    allowAllStreams?: boolean;   // show an "All streams" option (for filters)
}) {
    const { data: classes = [] } = useQuery<any[]>({ queryKey: ["v2_classes"], queryFn: async () => (await (await import("@/lib/api")).default.get("/v2/classes")).data || [] });
    const { data: streams = [] } = useQuery<any[]>({
        queryKey: ["v2_streams", value.classId],
        enabled: !!value.classId,
        queryFn: async () => (await (await import("@/lib/api")).default.get("/v2/streams", { params: { classId: value.classId } })).data || [],
    });

    const cls = classes.find((c: any) => String(c._id) === String(value.classId));

    const setClass = (cid: string) => {
        const c = classes.find((x: any) => String(x._id) === cid);
        onChange({ classId: cid, className: c?.name || "", streamId: "", streamName: "", fullName: c?.name || "" });
    };
    const setStream = (sid: string) => {
        const s = streams.find((x: any) => String(x._id) === sid);
        onChange({
            classId: value.classId, className: cls?.name || "",
            streamId: sid, streamName: s?.name || "",
            fullName: s ? (s.fullName || `${cls?.name || ""} ${s.name}`.trim()) : (cls?.name || ""),
        });
    };

    return (
        <div className={`grid grid-cols-2 gap-2 ${className}`}>
            <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Class {required && "*"}</label>
                <select value={value.classId || ""} onChange={e => setClass(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#5C67F2]">
                    <option value="">— Class —</option>
                    {classes.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase">Stream {required && !allowAllStreams && "*"}</label>
                <select value={value.streamId || ""} onChange={e => setStream(e.target.value)} disabled={!value.classId} className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white disabled:bg-slate-50 focus:outline-none focus:border-[#5C67F2]">
                    <option value="">{allowAllStreams ? "All streams" : "— Stream —"}</option>
                    {streams.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
            </div>
        </div>
    );
}
