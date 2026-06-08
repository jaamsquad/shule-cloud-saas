import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { 
    Award, CheckCircle2, ChevronDown, ClipboardList, 
    Eye, Loader2, Plus, Save, Settings, Trash2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface RateDomainProps {
    domain: 'AFFECTIVE' | 'PSYCHOMOTOR';
    title: string;
    subtitle: string;
}

export default function RateDomain({ domain, title, subtitle }: RateDomainProps) {
    const queryClient = useQueryClient();
    const [selectedYear, setSelectedYear] = useState('2026');
    const [selectedTerm, setSelectedTerm] = useState('Term 1');
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [entries, setEntries] = useState<any[]>([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isManageTraitsOpen, setIsManageTraitsOpen] = useState(false);

    // New trait form state
    const [newTrait, setNewTrait] = useState({
        name: '',
        category: 'Conduct',
        order: 1
    });

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

    const { data: traits = [] } = useQuery({
        queryKey: ['behaviour-traits', domain],
        queryFn: async () => {
            const res = await api.get(`/behaviour-traits?domain=${domain}`);
            return res.data.data || [];
        }
    });

    const { data: ratingScale } = useQuery({
        queryKey: ['rating-scale'],
        queryFn: async () => {
            const res = await api.get('/rating-scale');
            return res.data.data;
        }
    });

    const scaleType = ratingScale?.type || 'NUMERIC_5';

    // Mutations
    const saveRatingsMutation = useMutation({
        mutationFn: async (payload: any) => {
            await api.post('/behaviour-ratings/bulk', payload);
        },
        onSuccess: () => {
            toast.success("Ratings saved successfully!");
            setHasUnsavedChanges(false);
            queryClient.invalidateQueries({ queryKey: ['behaviour-ratings', selectedClass?._id, domain] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || "Failed to save ratings");
        }
    });

    const createTraitMutation = useMutation({
        mutationFn: async (payload: any) => {
            await api.post('/behaviour-traits', payload);
        },
        onSuccess: () => {
            toast.success("Trait added!");
            setNewTrait({ name: '', category: 'Conduct', order: traits.length + 1 });
            queryClient.invalidateQueries({ queryKey: ['behaviour-traits', domain] });
        }
    });

    const deleteTraitMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/behaviour-traits/${id}`);
        },
        onSuccess: () => {
            toast.success("Trait deleted!");
            queryClient.invalidateQueries({ queryKey: ['behaviour-traits', domain] });
        }
    });

    const loadStudentSheet = async () => {
        if (!selectedClass) return toast.error("Please select a class first");
        try {
            const res = await api.get(`/behaviour-ratings?class_id=${selectedClass._id}&academic_year_id=${selectedYear}&semester_id=${selectedTerm}&domain=${domain}`);
            setEntries(res.data.data || []);
            setHasUnsavedChanges(false);
            toast.success("Student ratings loaded");
        } catch (error) {
            toast.error("Failed to load student ratings");
        }
    };

    const handleRatingChange = (studentId: string, traitId: string, value: string) => {
        setHasUnsavedChanges(true);
        setEntries(prev => prev.map(entry => {
            if (entry.student_id === studentId) {
                return {
                    ...entry,
                    ratings: {
                        ...entry.ratings,
                        [traitId]: value === '' ? null : { rating: Number(value), grade: value }
                    }
                };
            }
            return entry;
        }));
    };

    const handleBulkSetColumn = (traitId: string, value: string) => {
        setHasUnsavedChanges(true);
        setEntries(prev => prev.map(entry => ({
            ...entry,
            ratings: {
                ...entry.ratings,
                [traitId]: value === '' ? null : { rating: Number(value), grade: value }
            }
        })));
    };

    const handleSaveRatings = () => {
        const records = entries.map(e => {
            const trait_ratings = Object.entries(e.ratings)
                .filter(([_, r]: any) => r !== null)
                .map(([traitId, r]: any) => ({
                    trait_id: traitId,
                    rating: r.rating
                }));

            return {
                student_id: e.student_id,
                trait_ratings
            };
        });

        saveRatingsMutation.mutate({
            academic_year_id: selectedYear,
            semester_id: selectedTerm,
            class_id: selectedClass._id,
            records
        });
    };

    const handleAddTrait = (e: React.FormEvent) => {
        e.preventDefault();
        createTraitMutation.mutate({
            ...newTrait,
            domain
        });
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <Eye className="w-8 h-8 text-indigo-600" />
                        {title}
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-2">
                        {subtitle}
                    </p>
                </div>
                <Dialog open={isManageTraitsOpen} onOpenChange={setIsManageTraitsOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="h-11 rounded-xl font-bold border-slate-200 text-slate-700 shadow-sm gap-2">
                            <Settings className="w-4 h-4" /> Manage Traits
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-3xl max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black">Configure {title} Traits</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 pt-4">
                            <form onSubmit={handleAddTrait} className="grid grid-cols-3 gap-3 items-end">
                                <div className="col-span-2 space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Trait Name</label>
                                    <Input required value={newTrait.name} onChange={e => setNewTrait(p => ({...p, name: e.target.value}))} placeholder="e.g. Collaboration" className="h-11 rounded-xl" />
                                </div>
                                <Button type="submit" className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold">
                                    Add Trait
                                </Button>
                            </form>

                            <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Current Traits</h4>
                                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white max-h-60 overflow-y-auto">
                                    {traits.map((t: any) => (
                                        <div key={t._id} className="flex items-center justify-between p-4 border-b border-slate-50 last:border-none">
                                            <span className="font-bold text-slate-800">{t.name}</span>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="text-rose-500 hover:bg-rose-50 rounded-lg h-9 w-9"
                                                onClick={() => deleteTraitMutation.mutate(t._id)}
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
                    <Button onClick={loadStudentSheet} disabled={!selectedClass} className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm">
                        Load Students
                    </Button>
                </div>
            </div>

            {/* Ratings Sheet */}
            {entries.length > 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-black text-slate-700 text-sm">Rating Sheet Summary</h3>
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
                                    {traits.map((t: any) => (
                                        <th key={t._id} className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest w-48">
                                            <div className="flex flex-col gap-2">
                                                <span>{t.name}</span>
                                                <select 
                                                    onChange={(e) => handleBulkSetColumn(t._id, e.target.value)}
                                                    className="h-8 border border-slate-200 rounded-lg px-2 text-[10px] font-bold text-slate-600 bg-white"
                                                >
                                                    <option value="">Bulk set...</option>
                                                    <option value="5">{scaleType === 'LETTER_5' ? 'A+' : '5'}</option>
                                                    <option value="4">{scaleType === 'LETTER_5' ? 'A' : '4'}</option>
                                                    <option value="3">{scaleType === 'LETTER_5' ? 'B' : '3'}</option>
                                                    <option value="2">{scaleType === 'LETTER_5' ? 'C' : '2'}</option>
                                                    <option value="1">{scaleType === 'LETTER_5' ? 'D' : '1'}</option>
                                                </select>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((e) => (
                                    <tr key={e.student_id} className="border-b border-slate-100 hover:bg-slate-50/30 transition-all">
                                        <td className="px-6 py-4 font-bold text-slate-800">{e.student_name}</td>
                                        <td className="px-6 py-4 font-semibold text-slate-500">{e.admission_no}</td>
                                        {traits.map((t: any) => {
                                            const studentRating = e.ratings[t._id]?.rating || '';
                                            return (
                                                <td key={t._id} className="px-6 py-4">
                                                    <select 
                                                        value={studentRating}
                                                        onChange={(ev) => handleRatingChange(e.student_id, t._id, ev.target.value)}
                                                        className="h-10 border border-slate-200 rounded-lg px-3 font-bold text-slate-700 bg-white w-32 focus:border-indigo-600"
                                                    >
                                                        <option value="">—</option>
                                                        <option value="5">{scaleType === 'LETTER_5' ? 'A+ (5)' : '5 - Excellent'}</option>
                                                        <option value="4">{scaleType === 'LETTER_5' ? 'A (4)' : '4 - Very Good'}</option>
                                                        <option value="3">{scaleType === 'LETTER_5' ? 'B (3)' : '3 - Good'}</option>
                                                        <option value="2">{scaleType === 'LETTER_5' ? 'C (2)' : '2 - Fair'}</option>
                                                        <option value="1">{scaleType === 'LETTER_5' ? 'D (1)' : '1 - Weak'}</option>
                                                    </select>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-6 border-t border-slate-100 flex justify-end">
                        <Button 
                            onClick={handleSaveRatings}
                            disabled={saveRatingsMutation.isPending}
                            className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold px-8 flex items-center gap-2 shadow-lg shadow-indigo-100"
                        >
                            {saveRatingsMutation.isPending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            Save Ratings
                        </Button>
                    </div>
                </div>
            ) : (
                selectedClass && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center space-y-4">
                        <ClipboardList className="w-12 h-12 text-slate-300 mx-auto" />
                        <h3 className="text-lg font-black text-slate-700">No ratings loaded</h3>
                        <p className="text-sm font-medium text-slate-500">Click "Load Students" to populate the ratings sheet.</p>
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
