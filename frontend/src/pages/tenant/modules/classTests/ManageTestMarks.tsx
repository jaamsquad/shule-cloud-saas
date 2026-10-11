import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useGrading } from '@/lib/grading';
import { toast } from 'sonner';
import { 
    Calculator, CheckCircle2, ChevronDown, ClipboardList, 
    FileText, Loader2, Plus, Save, Search, Trash2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function ManageTestMarks() {
    const queryClient = useQueryClient();
    const [selectedYear, setSelectedYear] = useState('2026');
    const [selectedTerm, setSelectedTerm] = useState('Term 1');
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [selectedSubject, setSelectedSubject] = useState<any>(null);
    const [selectedTest, setSelectedTest] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    
    // New test form state
    const [newTest, setNewTest] = useState({
        name: '',
        type: 'CAT',
        total_marks: 30,
        date: new Date().toISOString().split('T')[0],
        description: ''
    });

    // Configured grading for the test's class (class template → class/school criteria → settings).
    const grading = useGrading(selectedTest?.class_id || selectedClass?._id, selectedClass?.name || selectedClass?.levelName);

    // Student entries state
    const [entries, setEntries] = useState<any[]>([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Queries
    const { data: classes = [] } = useQuery({
        queryKey: ['classes'],
        queryFn: async () => {
            const res = await api.get('/academics/classes');
            return res.data || [];
        }
    });

    const { data: subjects = [] } = useQuery({
        queryKey: ['subjects'],
        queryFn: async () => {
            const res = await api.get('/subjects');
            return res.data || [];
        }
    });

    const { data: periods = [] } = useQuery<any[]>({
        queryKey: ['periods'],
        queryFn: async () => {
            const res = await api.get('/academics/periods');
            return res.data || [];
        }
    });

    // Auto-select current/active period as the default term and academic year
    React.useEffect(() => {
        if (periods.length > 0) {
            const current = periods.find((p: any) => p.isCurrent) || periods[0];
            if (current) {
                if (current.academicYear) setSelectedYear(current.academicYear);
                if (current.label) setSelectedTerm(current.label);
            }
        }
    }, [periods]);

    // Auto-select first class when loaded
    React.useEffect(() => {
        if (classes.length > 0 && !selectedClass) {
            setSelectedClass(classes[0]);
        }
    }, [classes, selectedClass]);

    // Auto-select first subject when loaded
    React.useEffect(() => {
        if (subjects.length > 0 && !selectedSubject) {
            setSelectedSubject(subjects[0]);
        }
    }, [subjects, selectedSubject]);

    const { data: tests = [], isLoading: isLoadingTests } = useQuery({
        queryKey: ['class-tests', selectedClass?._id, selectedSubject?._id, selectedYear, selectedTerm],
        queryFn: async () => {
            if (!selectedClass || !selectedSubject) return [];
            const res = await api.get(`/class-tests?class_id=${selectedClass._id}&subject_id=${selectedSubject._id}&academic_year_id=${selectedYear}&semester_id=${selectedTerm}`);
            return res.data.data || [];
        },
        enabled: !!selectedClass && !!selectedSubject
    });

    // Auto-select first test when loaded
    React.useEffect(() => {
        if (tests.length > 0) {
            setSelectedTest(tests[0]);
        } else {
            setSelectedTest(null);
        }
    }, [tests]);

    // Mutations
    const createTestMutation = useMutation({
        mutationFn: async (payload: any) => {
            const res = await api.post('/class-tests', payload);
            return res.data.data;
        },
        onSuccess: (data) => {
            toast.success("New test created!");
            setIsCreateOpen(false);
            queryClient.invalidateQueries({ queryKey: ['class-tests', selectedClass?._id, selectedSubject?._id] });
            setSelectedTest(data);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || "Failed to create test");
        }
    });

    const deleteTestMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/class-tests/${id}`);
        },
        onSuccess: () => {
            toast.success("Test deleted successfully!");
            setSelectedTest(null);
            setEntries([]);
            queryClient.invalidateQueries({ queryKey: ['class-tests', selectedClass?._id, selectedSubject?._id] });
        }
    });

    const saveMarksMutation = useMutation({
        mutationFn: async (payload: any) => {
            await api.post(`/class-tests/${selectedTest._id}/marks/bulk`, payload);
        },
        onSuccess: () => {
            toast.success("Marks saved successfully!");
            setHasUnsavedChanges(false);
            queryClient.invalidateQueries({ queryKey: ['test-marks', selectedTest?._id] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || "Failed to save marks");
        }
    });

    const loadStudents = async () => {
        if (!selectedTest) return toast.error("Please select a test first");
        try {
            const res = await api.get(`/class-tests/${selectedTest._id}/marks`);
            setEntries(res.data.data || []);
            setHasUnsavedChanges(false);
            toast.success("Student list loaded");
        } catch (error) {
            toast.error("Failed to load students");
        }
    };

    const handleMarkChange = (studentId: string, value: string) => {
        setHasUnsavedChanges(true);
        setEntries(prev => prev.map(entry => {
            if (entry.student_id === studentId) {
                const marksObtained = value === '' ? '' : Number(value);
                const isOutOfRange = marksObtained !== '' && marksObtained > selectedTest.total_marks;
                
                // Client-side quick grade mapping
                // (configured scale for the test's class; the server decides the saved grade)
                let grade = '';
                if (marksObtained !== '') {
                    const pct = (Number(marksObtained) / selectedTest.total_marks) * 100;
                    grade = grading.grade(pct);
                }

                return {
                    ...entry,
                    isOutOfRange,
                    mark: {
                        ...entry.mark,
                        marks_obtained: marksObtained,
                        grade
                    }
                };
            }
            return entry;
        }));
    };

    const handleRemarkChange = (studentId: string, value: string) => {
        setHasUnsavedChanges(true);
        setEntries(prev => prev.map(entry => {
            if (entry.student_id === studentId) {
                return {
                    ...entry,
                    mark: {
                        ...entry.mark,
                        remarks: value
                    }
                };
            }
            return entry;
        }));
    };

    const handleSaveMarks = () => {
        const invalid = entries.some(e => e.isOutOfRange);
        if (invalid) {
            return toast.error("Some entries exceed the total marks allowed!");
        }

        const records = entries
            .filter(e => e.mark?.marks_obtained !== undefined && e.mark?.marks_obtained !== '')
            .map(e => ({
                student_id: e.student_id,
                marks_obtained: Number(e.mark.marks_obtained),
                remarks: e.mark.remarks || ''
            }));

        if (records.length === 0) {
            return toast.error("No marks entered to save");
        }

        saveMarksMutation.mutate({ records });
    };

    const handleCreateTest = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClass || !selectedSubject) return toast.error("Select Class and Subject first");
        createTestMutation.mutate({
            ...newTest,
            class_id: selectedClass._id,
            subject_id: selectedSubject._id,
            academic_year_id: selectedYear,
            semester_id: selectedTerm
        });
    };

    const handleBulkSetAll = (val: string) => {
        setHasUnsavedChanges(true);
        setEntries(prev => prev.map(entry => ({
            ...entry,
            isOutOfRange: Number(val) > selectedTest.total_marks,
            mark: {
                ...entry.mark,
                marks_obtained: val === '' ? '' : Number(val)
            }
        })));
    };

    const filteredEntries = entries.filter(e => 
        e.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.admission_no.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const uniqueYears = periods.length > 0 
        ? Array.from(new Set(periods.map((p: any) => p.academicYear))).filter(Boolean) as string[]
        : ["2026", "2025"];
    
    const uniqueTerms = periods.length > 0 
        ? Array.from(new Set(periods.map((p: any) => p.label))).filter(Boolean) as string[]
        : ["Term 1", "Term 2", "Term 3"];

    const setupReady = selectedClass && selectedSubject;

    return (
        <div className="w-full max-w-7xl mx-auto p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <FileText className="w-8 h-8 text-indigo-600" />
                        Manage Test Marks
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-2">
                        Create class tests and record performance marks per student.
                    </p>
                </div>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Academic Year</label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-slate-700"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {uniqueYears.map((year) => (
                                <SelectItem key={year} value={year} className="font-bold">{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Term / Semester</label>
                    <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-slate-700"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {uniqueTerms.map((term) => (
                                <SelectItem key={term} value={term} className="font-bold">{term}</SelectItem>
                            ))}
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

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Select Subject</label>
                    <Select value={selectedSubject?._id || ""} onValueChange={(val) => setSelectedSubject(subjects.find((s: any) => s._id === val))}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-slate-700">
                            <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {subjects.map((s: any) => (
                                <SelectItem key={s._id} value={s._id} className="font-bold">{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Select Test</label>
                    <div className="flex gap-2">
                        <Select value={selectedTest?._id || ""} onValueChange={(val) => setSelectedTest(tests.find((t: any) => t._id === val))}>
                            <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-slate-700 flex-1">
                                <SelectValue placeholder="Choose Test" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {tests.map((t: any) => (
                                    <SelectItem key={t._id} value={t._id} className="font-bold">{t.name} ({t.total_marks} Marks)</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button disabled={!setupReady} className="h-11 w-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white p-0">
                                    <Plus className="w-5 h-5" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-3xl">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-black">Create New Test</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreateTest} className="space-y-4 pt-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Test Name</label>
                                        <Input required value={newTest.name} onChange={e => setNewTest(p => ({...p, name: e.target.value}))} placeholder="e.g. Pop Quiz 1" className="h-11 rounded-xl" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Test Type</label>
                                            <select value={newTest.type} onChange={e => setNewTest(p => ({...p, type: e.target.value}))} className="w-full h-11 border border-slate-200 rounded-xl px-3 font-medium text-slate-700 bg-white">
                                                <option>CAT</option>
                                                <option>Quiz</option>
                                                <option>Assignment</option>
                                                <option>Mid-Term</option>
                                                <option>End-Term</option>
                                                <option>Project</option>
                                                <option>Oral</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Total Marks</label>
                                            <Input type="number" required value={newTest.total_marks} onChange={e => setNewTest(p => ({...p, total_marks: Number(e.target.value)}))} className="h-11 rounded-xl" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Test Date</label>
                                        <Input type="date" required value={newTest.date} onChange={e => setNewTest(p => ({...p, date: e.target.value}))} className="h-11 rounded-xl" />
                                    </div>
                                    <Button type="submit" className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold mt-2">
                                        Create & Start Entry
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            {/* Test Action Panel */}
            {selectedTest && (
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button onClick={loadStudents} className="h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-6">
                            Load Student Sheet
                        </Button>
                        <div className="h-4 w-px bg-slate-300" />
                        <span className="text-sm font-bold text-slate-600">Total Marks: <span className="text-indigo-600">{selectedTest.total_marks}</span></span>
                        <span className="text-sm font-bold text-slate-600">Date: <span className="text-slate-900">{new Date(selectedTest.date).toLocaleDateString()}</span></span>
                    </div>

                    <div className="flex items-center gap-3">
                        <Input 
                            type="number" 
                            placeholder="Set all to..." 
                            className="w-32 h-11 rounded-xl bg-white border-slate-200 font-bold" 
                            onChange={(e) => handleBulkSetAll(e.target.value)}
                        />
                        <Button 
                            variant="destructive" 
                            size="icon" 
                            className="h-11 w-11 rounded-xl"
                            onClick={() => {
                                if (confirm("Are you sure you want to delete this test? All marks data will be lost.")) {
                                    deleteTestMutation.mutate(selectedTest._id);
                                }
                            }}
                        >
                            <Trash2 className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Marks Sheet Table */}
            {entries.length > 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="relative w-72">
                            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                            <Input 
                                placeholder="Search student name..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-10 h-11 rounded-xl bg-slate-50 border-none font-medium" 
                            />
                        </div>

                        {hasUnsavedChanges && (
                            <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider animate-pulse">
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                Unsaved changes present
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Student</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Admission No</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest w-40">Marks Obtained</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest w-24">Grade</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEntries.map((e) => (
                                    <tr key={e.student_id} className="border-b border-slate-100 hover:bg-slate-50/30 transition-all">
                                        <td className="px-6 py-4 font-bold text-slate-800">{e.student_name}</td>
                                        <td className="px-6 py-4 font-semibold text-slate-500">{e.admission_no}</td>
                                        <td className="px-6 py-4">
                                            <Input 
                                                type="number"
                                                value={e.mark?.marks_obtained ?? ''}
                                                onChange={(ev) => handleMarkChange(e.student_id, ev.target.value)}
                                                className={`h-10 rounded-lg w-28 font-bold border transition-all ${e.isOutOfRange ? 'border-red-500 bg-red-50 text-red-700 focus:border-red-500' : 'border-slate-200'}`}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-md text-xs font-black bg-indigo-50 text-indigo-700`}>
                                                {e.mark?.grade || '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Input 
                                                value={e.mark?.remarks || ''}
                                                onChange={(ev) => handleRemarkChange(e.student_id, ev.target.value)}
                                                placeholder="e.g. Great progress"
                                                className="h-10 rounded-lg max-w-md border-slate-200"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-6 border-t border-slate-100 flex justify-end">
                        <Button 
                            onClick={handleSaveMarks}
                            disabled={saveMarksMutation.isPending}
                            className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold px-8 flex items-center gap-2 shadow-lg shadow-indigo-100"
                        >
                            {saveMarksMutation.isPending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            Save Test Marks
                        </Button>
                    </div>
                </div>
            ) : (
                setupReady && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center space-y-4">
                        <Calculator className="w-12 h-12 text-slate-300 mx-auto" />
                        <h3 className="text-lg font-black text-slate-700">No test loaded</h3>
                        <p className="text-sm font-medium text-slate-500">Choose an existing test or create a new test, then click "Load Student Sheet".</p>
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
