import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { GraduationCap, Upload, CheckCircle2, Loader2, FileText, X } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { currentTenantSubdomain } from "@/lib/portal";

const BLUE = "#2563EB", NAVY = "#0B1B34", TEAL = "#10B981";

export default function PublicApplication() {
  const subdomain = currentTenantSubdomain() || "";
  const [submitted, setSubmitted] = useState<any>(null);
  const [form, setForm] = useState({
    applicantName: "", dob: "", gender: "Male", classApplied: "", previousSchool: "",
    parentName: "", contactPhone: "", contactEmail: "", address: "", notes: "",
    documentName: "", document: "",
  });

  const { data: school } = useQuery({
    queryKey: ["public_apply_school", subdomain],
    queryFn: async () => (await api.get(`/public/apply/${subdomain}`)).data,
    enabled: !!subdomain,
    retry: false,
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/(image\/|application\/pdf)/.test(file.type)) { toast.error("Only image or PDF files are allowed"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => setForm(f => ({ ...f, document: String(reader.result), documentName: file.name }));
    reader.readAsDataURL(file);
  };

  const submit = useMutation({
    mutationFn: async () => (await api.post(`/public/apply/${subdomain}`, form)).data,
    onSuccess: (d: any) => setSubmitted(d),
    onError: (e: any) => toast.error(e.response?.data?.message || "Submission failed"),
  });

  const doSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.applicantName.trim() || !form.contactPhone.trim()) { toast.error("Name and contact phone are required"); return; }
    submit.mutate();
  };

  if (!subdomain) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-center px-6">
      <div><p className="text-lg font-black" style={{ color: NAVY }}>Open this page on a school's address</p><p className="text-slate-500 text-sm mt-1">e.g. yourschool.shulecloud.com/application</p></div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10 max-w-md text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-white" style={{ background: TEAL }}><CheckCircle2 className="w-8 h-8" /></div>
        <h1 className="text-2xl font-black mb-2" style={{ color: NAVY }}>Application received!</h1>
        <p className="text-slate-500 text-sm">Your application to <b>{school?.name}</b> has been submitted.</p>
        <p className="mt-3 text-sm font-bold" style={{ color: BLUE }}>Reference: {submitted.applicationNo}</p>
        <p className="text-xs text-slate-400 mt-4">The school will review your application and get back to you.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 text-white overflow-hidden" style={{ background: BLUE }}>
            {school?.logo ? <img src={school.logo} alt="" className="w-full h-full object-cover" /> : <GraduationCap className="w-8 h-8" />}
          </div>
          <h1 className="text-3xl font-black" style={{ color: NAVY }}>{school?.name || "School"}</h1>
          <p className="text-slate-500 text-sm mt-1">Student Application Form</p>
        </div>

        <form onSubmit={doSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-7 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Applicant Full Name *"><input required value={form.applicantName} onChange={e => set("applicantName", e.target.value)} className={inp} /></Field>
            <Field label="Date of Birth"><input type="date" value={form.dob} onChange={e => set("dob", e.target.value)} className={inp} /></Field>
            <Field label="Gender"><select value={form.gender} onChange={e => set("gender", e.target.value)} className={inp}><option>Male</option><option>Female</option></select></Field>
            <Field label="Class Applying For">
              {school?.classes?.length ? (
                <select value={form.classApplied} onChange={e => set("classApplied", e.target.value)} className={inp}><option value="">— Select —</option>{school.classes.map((c: string) => <option key={c} value={c}>{c}</option>)}</select>
              ) : <input value={form.classApplied} onChange={e => set("classApplied", e.target.value)} placeholder="e.g. Form 1" className={inp} />}
            </Field>
            <Field label="Previous School"><input value={form.previousSchool} onChange={e => set("previousSchool", e.target.value)} className={inp} /></Field>
            <Field label="Parent / Guardian Name"><input value={form.parentName} onChange={e => set("parentName", e.target.value)} className={inp} /></Field>
            <Field label="Contact Phone *"><input required value={form.contactPhone} onChange={e => set("contactPhone", e.target.value)} placeholder="07XX XXX XXX" className={inp} /></Field>
            <Field label="Contact Email"><input type="email" value={form.contactEmail} onChange={e => set("contactEmail", e.target.value)} className={inp} /></Field>
          </div>
          <Field label="Home Address"><input value={form.address} onChange={e => set("address", e.target.value)} className={inp} /></Field>
          <Field label="Notes"><textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} className={inp + " py-2"} /></Field>

          {/* Supporting document */}
          <Field label="Supporting Document (image or PDF, max 5MB)">
            {form.document ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 h-11">
                <FileText className="w-4 h-4 text-[#2563EB]" /><span className="text-xs font-bold text-slate-600 flex-1 truncate">{form.documentName}</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, document: "", documentName: "" }))} className="text-slate-400 hover:text-rose-500"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <label className="flex items-center gap-2 bg-slate-50 border border-dashed border-slate-300 rounded-xl px-4 h-11 cursor-pointer hover:border-[#2563EB] text-slate-500 text-xs font-bold">
                <Upload className="w-4 h-4" /> Upload birth certificate / report card…
                <input type="file" accept="image/*,application/pdf" onChange={onFile} className="hidden" />
              </label>
            )}
          </Field>

          <button type="submit" disabled={submit.isPending} className="w-full h-12 inline-flex items-center justify-center gap-2 font-bold text-white rounded-xl shadow-lg disabled:opacity-50" style={{ background: BLUE }}>
            {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Submit Application
          </button>
        </form>
        <p className="text-center text-[11px] text-slate-400 mt-4">Powered by EduPoa · ShuleCloud</p>
      </div>
    </div>
  );
}

const inp = "w-full h-11 px-4 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#2563EB]";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-bold text-slate-600 mb-1.5">{label}</label>{children}</div>;
}
