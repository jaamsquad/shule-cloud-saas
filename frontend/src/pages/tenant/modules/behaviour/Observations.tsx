import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { 
    BookOpen, CheckCircle, ClipboardList, Loader2, Plus, 
    Sparkles, Trash2, Users 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function Observations() {
    const queryClient = useQueryClient();
    const [selectedYear, setSelectedYear] = useState('2026');
    const [selectedTerm, setSelectedTerm] = useState('Term 1');
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [entries, setEntries] = useState<any[]>([]);
    const [isPhrasesOpen, setIsPhrasesOpen] = useState(false);
    const [newPhrase, setNewPhrase] = useState('');
    const [savingStates, setSavingStates] = useState<Record<string, 'idle' | 'saving' | 'saved'>>({});

    // References to textareas for phrase insertion
    const activeTextareaRef = useRef<{ studentId: string; field: string; element: HTMLTextAreaElement } | null>(null);

    // Queries
    const { data: classes = [] } = useQuery({
        queryKey: ['classes'],
        queryFn: async () => (await api.get('/academics/classes')).data || []
    });

    // Auto-select first class when loaded
    React.useEffect(() => {
        if (classes.length > 0 && !selectedClass) {
            setSelectedClass(classes[0]);
        }
    }, [classes, selectedClass]);

    const { data: phrases = [] } = useQuery({
        queryKey: ['observation-phrases'],
        queryFn: async () => {
            const res = await api.get('/observation-phrases');
            return res.data.data || [];
        }
    });

    // Mutations
    const saveObservationMutation = useMutation({
        mutationFn: async (payload: any) => {
            await api.post('/observations/bulk', payload);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || "Autosave failed");
        }
    });

    const createPhraseMutation = useMutation({
        mutationFn: async (text: string) => {
            await api.post('/observation-phrases', { text });
        },
        onSuccess: () => {
            toast.success("Phrase added!");
            setNewPhrase('');
            queryClient.invalidateQueries({ queryKey: ['observation-phrases'] });
        }
    });

    const deletePhraseMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/observation-phrases/${id}`);
        },
        onSuccess: () => {
            toast.success("Phrase deleted!");
            queryClient.invalidateQueries({ queryKey: ['observation-phrases'] });
        }
    });

    const loadObservations = async () => {
        if (!selectedClass) return toast.error("Please select a class first");
        try {
            const res = await api.get(`/observations?class_id=${selectedClass._id}&academic_year_id=${selectedYear}&semester_id=${selectedTerm}`);
            setEntries(res.data.data || []);
            toast.success("Observations loaded");
        } catch (error) {
            toast.error("Failed to load observations");
        }
    };

    const handleBlur = (studentId: string, field: string, value: string) => {
        const studentKey = `${studentId}_${field}`;
        setSavingStates(prev => ({ ...prev, [studentKey]: 'saving' }));

        // Upsert observation for this single student
        const record = entries.find(e => e.student_id === studentId);
        if (!record) return;

        saveObservationMutation.mutate({
            academic_year_id: selectedYear,
            semester_id: selectedTerm,
            class_id: selectedClass._id,
            records: [{
                student_id: studentId,
                class_teacher_remark: field === 'class_teacher_remark' ? value : record.class_teacher_remark,
                counsellor_note: field === 'counsellor_note' ? value : record.counsellor_note,
                principal_remark: field === 'principal_remark' ? value : record.principal_remark
            }]
        }, {
            onSuccess: () => {
                setSavingStates(prev => ({ ...prev, [studentKey]: 'saved' }));
                setTimeout(() => {
                    setSavingStates(prev => ({ ...prev, [studentKey]: 'idle' }));
                }, 2000);
            }
        });
    };

    const handleTextareaChange = (studentId: string, field: string, value: string) => {
        setEntries(prev => prev.map(entry => {
            if (entry.student_id === studentId) {
                return { ...entry, [field]: value };
            }
            return entry;
        }));
    };

    const handleInsertPhrase = (phraseText: string) => {
        if (!activeTextareaRef.current) {
            return toast.info("Click into a remark textarea first to choose where to insert the phrase.");
        }

        const { studentId, field, element } = activeTextareaRef.current;
        const start = element.selectionStart;
        const end = element.selectionEnd;
        const text = element.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);
        
        // Append space dynamically if needed
        const newText = before + (before.endsWith(' ') || before === '' ? '' : ' ') + phraseText + (after.startsWith(' ') || after === '' ? '' : ' ') + after;

        handleTextareaChange(studentId, field, newText);
        
        // Focus back
        setTimeout(() => {
            element.focus();
            const newCursorPos = start + phraseText.length + 1;
            element.setSelectionRange(newCursorPos, newCursorPos);
            // Trigger autosave
            handleBlur(studentId, field, newText);
        }, 50);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <BookOpen className="w-8 h-8 text-indigo-600" />
                        Observation Diary
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-2">
                        Record detailed qualitative observations. Text updates auto-save on field blur.
                    </p>
                </div>

                <Dialog open={isPhrasesOpen} onOpenChange={setIsPhrasesOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 shadow-sm gap-2">
                            <Sparkles className="w-4 h-4" /> Canned Phrases
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-3xl max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black">Observation Remarks Phrases</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 pt-4">
                            <form onSubmit={(e) => { e.preventDefault(); createPhraseMutation.mutate(newPhrase); }} className="grid grid-cols-3 gap-3 items-end">
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">New Phrase Option</label>
                                    <Input required value={newPhrase} onChange={e => setNewPhrase(e.target.value)} placeholder="e.g. Excellent progress this term" className="h-11 rounded-xl" />
                                </div>
                                <Button type="submit" className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold">
                                    Add Phrase
                                </Button>
                            </form>

                            <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Manage Phrases</h4>
                                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white max-h-60 overflow-y-auto">
                                    {phrases.map((p: any) => (
                                        <div key={p._id} className="flex items-center justify-between p-4 border-b border-slate-50 last:border-none">
                                            <span className="font-bold text-slate-700 text-sm">{p.text}</span>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="text-rose-500 hover:bg-rose-50 rounded-lg h-9 w-9"
                                                onClick={() => deletePhraseMutation.mutate(p._id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Academic Year</label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-slate-700"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="2026" className="font-bold">2026</SelectItem>
                            <SelectItem value="2025" className="font-bold">2025</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Term / Semester</label>
                    <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-slate-700"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="Term 1" className="font-bold">Term 1</SelectItem>
                            <SelectItem value="Term 2" className="font-bold">Term 2</SelectItem>
                            <SelectItem value="Term 3" className="font-bold">Term 3</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Select Class</label>
                    <Select value={selectedClass?._id || ""} onValueChange={(val) => setSelectedClass(classes.find((c: any) => c._id === val))}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-slate-700">
                            <SelectValue placeholder="Select Class" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {classes.map((c: any) => (
                                <SelectItem key={c._id} value={c._id} className="font-bold">{c.levelName || c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-end">
                    <Button onClick={loadObservations} disabled={!selectedClass} className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm">
                        Load Students
                    </Button>
                </div>
            </div>

            {/* Observations Grid Layout */}
            {entries.length > 0 ? (
                <div className="flex gap-8">
                    {/* Left List of Students & Editor */}
                    <div className="flex-1 space-y-6">
                        {entries.map((e) => (
                            <div key={e.student_id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div>
                                        <h3 className="font-black text-slate-800 text-base">{e.student_name}</h3>
                                        <p className="text-xs font-bold text-slate-400">Admission No: {e.admission_no}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1.5 relative">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Class Teacher Remark</label>
                                            {savingStates[`${e.student_id}_class_teacher_remark`] === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                                            {savingStates[`${e.student_id}_class_teacher_remark`] === 'saved' && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 animate-bounce" />}
                                        </div>
                                        <textarea 
                                            value={e.class_teacher_remark}
                                            onFocus={(ev) => activeTextareaRef.current = { studentId: e.student_id, field: 'class_teacher_remark', element: ev.target }}
                                            onChange={(ev) => handleTextareaChange(e.student_id, 'class_teacher_remark', ev.target.value)}
                                            onBlur={(ev) => handleBlur(e.student_id, 'class_teacher_remark', ev.target.value)}
                                            placeholder="Write class teacher comments..."
                                            className="w-full h-24 border border-slate-200 rounded-xl p-3 font-medium text-sm text-slate-700 bg-slate-50/30 focus:bg-white focus:border-indigo-600 focus:outline-none resize-none"
                                        />
                                    </div>

                                    <div className="space-y-1.5 relative">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Counsellor Notes</label>
                                            {savingStates[`${e.student_id}_counsellor_note`] === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                                            {savingStates[`${e.student_id}_counsellor_note`] === 'saved' && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 animate-bounce" />}
                                        </div>
                                        <textarea 
                                            value={e.counsellor_note}
                                            onFocus={(ev) => activeTextareaRef.current = { studentId: e.student_id, field: 'counsellor_note', element: ev.target }}
                                            onChange={(ev) => handleTextareaChange(e.student_id, 'counsellor_note', ev.target.value)}
                                            onBlur={(ev) => handleBlur(e.student_id, 'counsellor_note', ev.target.value)}
                                            placeholder="Write counsellor notes..."
                                            className="w-full h-24 border border-slate-200 rounded-xl p-3 font-medium text-sm text-slate-700 bg-slate-50/30 focus:bg-white focus:border-indigo-600 focus:outline-none resize-none"
                                        />
                                    </div>

                                    <div className="space-y-1.5 relative">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Principal Remarks</label>
                                            {savingStates[`${e.student_id}_principal_remark`] === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                                            {savingStates[`${e.student_id}_principal_remark`] === 'saved' && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 animate-bounce" />}
                                        </div>
                                        <textarea 
                                            value={e.principal_remark}
                                            onFocus={(ev) => activeTextareaRef.current = { studentId: e.student_id, field: 'principal_remark', element: ev.target }}
                                            onChange={(ev) => handleTextareaChange(e.student_id, 'principal_remark', ev.target.value)}
                                            onBlur={(ev) => handleBlur(e.student_id, 'principal_remark', ev.target.value)}
                                            placeholder="Write principal comments..."
                                            className="w-full h-24 border border-slate-200 rounded-xl p-3 font-medium text-sm text-slate-700 bg-slate-50/30 focus:bg-white focus:border-indigo-600 focus:outline-none resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right Canned Phrases Helper Panel */}
                    <div className="w-[300px] shrink-0 space-y-4">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm sticky top-8">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-indigo-600" /> Insert Quick Phrase
                            </h3>
                            <p className="text-xs font-medium text-slate-400 leading-relaxed mb-4">
                                Click any active text field, then click a phrase below to insert it directly.
                            </p>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {phrases.map((phrase: any) => (
                                    <button 
                                        key={phrase._id}
                                        onClick={() => handleInsertPhrase(phrase.text)}
                                        className="w-full text-left p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-indigo-50 hover:border-indigo-100 text-xs font-bold text-slate-700 transition-all leading-normal"
                                    >
                                        {phrase.text}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                selectedClass && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center space-y-4">
                        <Users className="w-12 h-12 text-slate-300 mx-auto" />
                        <h3 className="text-lg font-black text-slate-700">No observations loaded</h3>
                        <p className="text-sm font-medium text-slate-500">Click "Load Students" to populate the diary entries.</p>
                    </div>
                )
            )}
        </div>
    );
}

// Custom wrapper to keep select happy
function Select({ children, value, onValueChange }: any) {
    return (
        <select value={value} onChange={e => onValueChange(e.target.value)} className="w-full h-11 border border-slate-200 rounded-xl px-4 font-bold text-slate-700 bg-white">
            {children}
        </select>
    );
}
function SelectTrigger({ children }: any) { return children; }
function SelectValue({ placeholder }: any) { 
    return placeholder ? <option value="" disabled>{placeholder}</option> : null; 
}
function SelectContent({ children }: any) { return children; }
function SelectItem({ value, children }: any) {
    return <option value={value}>{children}</option>;
}
