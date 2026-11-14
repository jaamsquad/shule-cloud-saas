import { Fragment, useState } from "react";
import { Plus, Edit, Trash2, CheckCircle, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const emptyForm = { subjectId: "", label: "", outOf: "", ratio: "" };

export default function SubjectPapers() {
    const [showAdd, setShowAdd] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [addForSubjectId, setAddForSubjectId] = useState<string>("");
    const [form, setForm] = useState(emptyForm);

    const queryClient = useQueryClient();

    const { data: subjects = [] } = useQuery({
        queryKey: ["subjects-list"],
        queryFn: async () => (await api.get("/academics/subjects")).data,
    });

    const { data: papers = [], isLoading } = useQuery({
        queryKey: ["subject-papers"],
        queryFn: async () => (await api.get("/academics/subject-papers")).data,
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["subject-papers"] });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/academics/subject-papers", data),
        onSuccess: () => {
            invalidate();
            setShowAdd(false);
            setForm(emptyForm);
            toast.success("Subject paper added");
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/academics/subject-papers/${id}`, data),
        onSuccess: () => {
            invalidate();
            setEditing(null);
            toast.success("Subject paper updated");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/academics/subject-papers/${id}`),
        onSuccess: () => {
            invalidate();
            toast.success("Subject paper removed");
        },
    });

    const openAdd = (subjectId: string) => {
        setAddForSubjectId(subjectId);
        setForm({ ...emptyForm, subjectId });
        setShowAdd(true);
    };

    const openEdit = (paper: any) => {
        setEditing(paper);
        setForm({
            subjectId: paper.subjectId,
            label: paper.label,
            outOf: String(paper.outOf ?? ""),
            ratio: String(paper.ratio ?? ""),
        });
    };

    const closeDialog = () => {
        setShowAdd(false);
        setEditing(null);
        setForm(emptyForm);
    };

    const handleSave = () => {
        const data = {
            subjectId: form.subjectId,
            label: form.label.trim(),
            outOf: Number(form.outOf),
            ratio: Number(form.ratio),
        };
        if (!data.subjectId || !data.label || !data.outOf || !data.ratio) {
            toast.error("Please fill in all fields");
            return;
        }
        if (editing) updateMutation.mutate({ id: editing._id, data });
        else createMutation.mutate(data);
    };

    const papersBySubject = (subjectId: string) =>
        papers
            .filter((p: any) => p.subjectId === subjectId)
            .sort((a: any, b: any) => (a.label || "").localeCompare(b.label || "", undefined, { numeric: true }));

    return (
        <div className="flex-1 bg-white overflow-hidden flex flex-col p-8 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-sm bg-gray-50 flex items-center justify-center border border-gray-100 shadow-sm">
                        <LayoutGrid className="w-4 h-4 text-gray-400" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-800 tracking-tight">Subject Paper Ratios</h1>
                </div>
            </div>

            <div className="border border-gray-100 rounded-sm shadow-sm overflow-hidden bg-white">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow className="h-10 hover:bg-gray-50/50 border-b border-gray-100">
                            <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black border-r last:border-r-0 w-10">#</TableHead>
                            <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black border-r last:border-r-0">Subject</TableHead>
                            <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black border-r last:border-r-0">Papers</TableHead>
                            <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black border-r last:border-r-0">Paper Out Of</TableHead>
                            <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black border-r last:border-r-0">Ratio</TableHead>
                            <TableHead className="font-black text-[10px] uppercase h-10 px-8 text-black text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-10 opacity-50 text-[11px] font-black uppercase tracking-[0.2em] italic">Loading subject papers...</TableCell></TableRow>
                        ) : subjects.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-10 opacity-30 text-[11px] font-black uppercase tracking-[0.2em]">No subjects found</TableCell></TableRow>
                        ) : (
                            subjects.map((subject: any, idx: number) => {
                                const subjectPapers = papersBySubject(subject._id);
                                const rowSpan = subjectPapers.length + 1; // + the "Add" row
                                return (
                                    <Fragment key={subject._id}>
                                        {subjectPapers.length === 0 ? (
                                            <TableRow key={subject._id} className="border-b border-gray-50 h-14 font-medium text-[13px] text-gray-600">
                                                <TableCell className="px-8 border-r last:border-r-0">{idx + 1}</TableCell>
                                                <TableCell className="px-8 border-r last:border-r-0 font-bold text-slate-800">{subject.name}</TableCell>
                                                <TableCell colSpan={3} className="px-8 border-r last:border-r-0 text-gray-400 italic text-[12px]">No papers configured</TableCell>
                                                <TableCell className="px-8 text-right">
                                                    <Button onClick={() => openAdd(subject._id)} variant="link" size="sm" className="h-7 px-0 text-[11px] font-bold text-emerald-600 gap-1.5">
                                                        <Plus className="w-3" /> Add Subject Paper
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            subjectPapers.map((paper: any, pIdx: number) => (
                                                <TableRow key={paper._id} className="border-b border-gray-50 h-14 font-medium text-[13px] text-gray-600">
                                                    {pIdx === 0 && (
                                                        <>
                                                            <TableCell rowSpan={rowSpan} className="px-8 border-r last:border-r-0 align-top pt-4">{idx + 1}</TableCell>
                                                            <TableCell rowSpan={rowSpan} className="px-8 border-r last:border-r-0 align-top pt-4 font-bold text-slate-800">{subject.name}</TableCell>
                                                        </>
                                                    )}
                                                    <TableCell className="px-8 border-r last:border-r-0">{paper.label}</TableCell>
                                                    <TableCell className="px-8 border-r last:border-r-0">{paper.outOf}</TableCell>
                                                    <TableCell className="px-8 border-r last:border-r-0">{paper.ratio}</TableCell>
                                                    <TableCell className="px-8 text-right">
                                                        <div className="flex gap-1 justify-end">
                                                            <Button onClick={() => openEdit(paper)} variant="outline" size="sm" className="h-7 px-3 text-[10px] font-bold text-gray-500 border-gray-200 gap-1.5 rounded-sm hover:bg-sky-50 transition-all uppercase tracking-wider"><Edit className="w-3" /> Edit</Button>
                                                            <Button onClick={() => deleteMutation.mutate(paper._id)} variant="outline" size="sm" className="h-7 px-3 text-[10px] font-bold text-gray-500 border-gray-200 gap-1.5 rounded-sm hover:bg-rose-50 hover:text-rose-600 transition-all uppercase tracking-wider"><Trash2 className="w-3" /> Delete</Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                        {subjectPapers.length > 0 && (
                                            <TableRow key={`${subject._id}-add`} className="border-b border-gray-100 h-10">
                                                <TableCell colSpan={4} className="px-8 border-r last:border-r-0" />
                                                <TableCell colSpan={2} className="px-8 text-right">
                                                    <Button onClick={() => openAdd(subject._id)} variant="link" size="sm" className="h-7 px-0 text-[11px] font-bold text-emerald-600 gap-1.5">
                                                        <Plus className="w-3" /> Add Subject Paper
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={showAdd || !!editing} onOpenChange={(v) => { if (!v) closeDialog(); }}>
                <DialogContent className="p-0 border-0 overflow-hidden rounded-sm max-w-md shadow-2xl">
                    <DialogHeader className="bg-[#10b981] p-4 text-white flex-row items-center gap-2 space-y-0">
                        <div className="bg-white/20 p-2 rounded-full shrink-0">
                            <Edit className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <DialogTitle className="text-[15px] font-black uppercase tracking-wider leading-none">Subject Paper Details</DialogTitle>
                            <DialogDescription className="text-white/60 text-[10px] font-medium uppercase tracking-tight mt-1 opacity-100">
                                {editing ? "Update subject paper" : "Add a new paper to this subject"}
                            </DialogDescription>
                        </div>
                    </DialogHeader>
                    <div className="p-10 space-y-6 bg-white">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</Label>
                            <select
                                className="w-full h-11 px-3 bg-slate-50/30 border border-gray-200 rounded-sm text-[13px] outline-none font-bold text-slate-700 disabled:opacity-60"
                                value={form.subjectId}
                                disabled={!!editing}
                                onChange={e => setForm({ ...form, subjectId: e.target.value })}
                            >
                                <option value="">Select subject...</option>
                                {subjects.map((s: any) => (
                                    <option key={s._id} value={s._id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paper Name</Label>
                            <Input className="h-11 border-gray-200 rounded-sm bg-slate-50/30 font-bold" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="e.g. Paper 1" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paper Out Of</Label>
                                <Input type="number" className="h-11 border-gray-200 rounded-sm bg-slate-50/30 font-bold" value={form.outOf} onChange={e => setForm({ ...form, outOf: e.target.value })} placeholder="e.g. 100" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ratio</Label>
                                <Input type="number" className="h-11 border-gray-200 rounded-sm bg-slate-50/30 font-bold" value={form.ratio} onChange={e => setForm({ ...form, ratio: e.target.value })} placeholder="e.g. 1" />
                            </div>
                        </div>
                    </div>
                    <div className="p-6 bg-slate-50 flex gap-4 border-t border-slate-100">
                        <Button onClick={handleSave} className="flex-1 h-11 bg-[#10b981] hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[11px] gap-2 shadow-sm shadow-emerald-500/10"><CheckCircle className="w-4" /> Save</Button>
                        <Button onClick={closeDialog} variant="outline" className="flex-1 h-11 border-gray-300 font-bold text-slate-600 gap-2 hover:bg-white transition-all uppercase tracking-widest text-[11px]">Cancel</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
