import { CalendarClock } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export interface TimetableData {
    timeSlots?: string[];
    grid?: Record<string, Record<string, { subject?: string; teacher?: string; room?: string; className?: string }>>;
}

export default function TimetableGrid({ data }: { data?: TimetableData }) {
    const slots = data?.timeSlots || [];
    const grid = data?.grid || {};

    if (slots.length === 0) {
        return (
            <div className="text-center py-10 text-slate-400">
                <CalendarClock className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">No timetable published yet.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
                <thead>
                    <tr>
                        <th className="border border-black/10 bg-[#159a52] text-white p-2">Day / Time</th>
                        {slots.map(s => (
                            <th key={s} className="border border-black/10 bg-[#159a52] text-white p-2 whitespace-nowrap">{s}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {DAYS.map(day => (
                        <tr key={day}>
                            <td className="border border-black/10 bg-[#f4efe2] font-bold text-slate-700 p-2">{day}</td>
                            {slots.map(slot => {
                                const cell = grid[day]?.[slot];
                                return (
                                    <td key={slot} className="border border-black/10 p-2 text-center align-top">
                                        {cell ? (
                                            <>
                                                <p className="font-bold text-slate-700">{cell.subject}</p>
                                                {cell.className && <p className="text-[10px] text-slate-500">{cell.className}</p>}
                                                {cell.teacher && <p className="text-[10px] text-slate-500">{cell.teacher}</p>}
                                                {cell.room && <p className="text-[10px] text-[#b08642]">{cell.room}</p>}
                                            </>
                                        ) : (
                                            <span className="text-slate-300">—</span>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
