import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import api from "@/lib/api";

export type Contact = { id: string; name: string; role: string; phone?: string; email?: string; meta?: string };

/**
 * Searchable picker for sending to ONE person (a specific teacher, parent or
 * student). `channel` decides whether we surface phone (sms/whatsapp) or email.
 * Calls back with the chosen contact; the parent reads contact.phone/email.
 */
export function ContactPicker({
  channel, value, onChange,
}: { channel: "sms" | "whatsapp" | "email"; value: Contact | null; onChange: (c: Contact | null) => void }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [open, setOpen] = useState(false);
  const needEmail = channel === "email";

  const { data: contacts = [], isFetching } = useQuery({
    queryKey: ["comm_contacts", q, type],
    queryFn: async () => (await api.get("/communications/contacts", { params: { q, type } })).data as Contact[],
    enabled: open && (q.length > 0 || type !== "all"),
  });

  const usable = contacts.filter(c => (needEmail ? c.email : c.phone));

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border border-[#5C67F2] bg-indigo-50/60">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{value.name} <span className="text-xs font-normal text-slate-400">· {value.role}</span></p>
          <p className="text-xs text-slate-500 truncate">{needEmail ? value.email : value.phone}{value.meta ? ` · ${value.meta}` : ""}</p>
        </div>
        <button onClick={() => onChange(null)} className="text-slate-400 hover:text-rose-600 flex-shrink-0"><X className="w-4 h-4" /></button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
            placeholder="Search a person by name…" className="w-full h-10 pl-9 pr-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#5C67F2]" />
        </div>
        <select value={type} onChange={e => setType(e.target.value)} className="h-10 px-2 border border-slate-200 rounded-lg text-sm text-slate-600">
          <option value="all">Anyone</option>
          <option value="students">Students</option>
          <option value="parents">Parents</option>
          <option value="teachers">Teachers</option>
          <option value="staff">Staff</option>
        </select>
      </div>

      {open && (q.length > 0 || type !== "all") && (
        <div className="border border-slate-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-slate-50">
          {isFetching ? (
            <p className="text-xs text-slate-400 px-3 py-3">Searching…</p>
          ) : usable.length === 0 ? (
            <p className="text-xs text-slate-400 px-3 py-3">No matching {needEmail ? "people with an email" : "people with a phone number"}.</p>
          ) : usable.map(c => (
            <button key={c.id} onClick={() => { onChange(c); setOpen(false); setQ(""); }}
              className="w-full text-left px-3 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{c.name} <span className="text-xs font-normal text-slate-400">· {c.role}</span></p>
                <p className="text-xs text-slate-400 truncate">{needEmail ? c.email : c.phone}{c.meta ? ` · ${c.meta}` : ""}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
