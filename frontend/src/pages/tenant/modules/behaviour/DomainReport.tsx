import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { 
    Award, BarChart2, BookOpen, ChevronDown, Download, 
    FileText, GraduationCap, Percent, Printer, Sparkles, TrendingUp, Users 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DomainReportProps {
    domain: 'AFFECTIVE' | 'PSYCHOMOTOR';
    title: string;
    subtitle: string;
}

export default function DomainReport({ domain, title, subtitle }: DomainReportProps) {
    const [selectedYear, setSelectedYear] = useState('2026');
    const [selectedTerm, setSelectedTerm] = useState('Term 1');
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'student_name', direction: 'asc' });

    // Metadata queries
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

    // Report data query
    const { data: reportData, isLoading } = useQuery({
        queryKey: ['behaviour-report', selectedClass?._id, selectedYear, selectedTerm, domain],
        queryFn: async () => {
            if (!selectedClass) return null;
            const res = await api.get(`/reports/behaviour/domain?class_id=${selectedClass._id}&academic_year_id=${selectedYear}&semester_id=${selectedTerm}&domain=${domain}`);
            return res.data.data;
        },
        enabled: !!selectedClass
    });

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handlePrint = () => {
        window.print();
    };

    const summary = reportData?.summary;
    const traits = reportData?.traits || [];
    const students = reportData?.students || [];

    const sortedStudents = [...students].sort((a: any, b: any) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (sortConfig.key === 'average_rating') {
            aVal = a.average_rating;
            bVal = b.average_rating;
        }

        if (typeof aVal === 'string') {
            return sortConfig.direction === 'asc' 
                ? aVal.localeCompare(bVal) 
                : bVal.localeCompare(aVal);
        }
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });

    const getGradeBadgeClass = (avg: number) => {
        if (avg >= 4.5) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        if (avg >= 3.5) return 'bg-blue-50 text-blue-700 border-blue-100';
        if (avg >= 2.5) return 'bg-amber-50 text-amber-700 border-amber-100';
        return 'bg-rose-50 text-rose-700 border-rose-100';
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 print:p-0">
            <div className="flex items-center justify-between print:hidden">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-indigo-600" />
                        {title} Report
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-2">
                        {subtitle}
                    </p>
                </div>
                {students.length > 0 && (
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="h-11 rounded-xl font-bold border-slate-200 text-slate-700 shadow-sm gap-2">
                            <Download className="w-4 h-4" /> Export Sheet
                        </Button>
                        <Button 
                            onClick={handlePrint}
                            className="group relative bg-white hover:bg-indigo-50 text-indigo-700 h-11 px-5 rounded-xl font-bold flex items-center gap-2 transition-all text-sm border border-indigo-200 hover:border-indigo-300 shadow-sm hover:shadow-md"
                        >
                            <Printer className="w-4 h-4" /> Print Report
                        </Button>
                    </div>
                )}
            </div>

            {/* School Header for Print Mode Only */}
            <div className="hidden print:block border-b-2 border-slate-900 pb-6 mb-8 text-center">
                <h1 className="text-3xl font-black uppercase text-slate-900">ShuleCloud Institutional Academy</h1>
                <p className="text-sm font-bold text-slate-600 uppercase tracking-widest mt-1">Official {title} Domain Report</p>
                <div className="grid grid-cols-3 gap-4 mt-6 text-xs font-bold text-slate-500 uppercase">
                    <div>Class: {selectedClass?.name}</div>
                    <div>Term: {selectedTerm} ({selectedYear})</div>
                    <div>Domain: {domain}</div>
                </div>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm print:hidden">
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
                    <Button onClick={handlePrint} disabled={!selectedClass} className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm">
                        Print Class Sheet
                    </Button>
                </div>
            </div>

            {summary && (
                <>
                    {/* Analytics Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Class Average Rating</span>
                            <div className="flex items-baseline justify-between mt-2">
                                <span className="text-3xl font-black text-slate-800">{summary.class_avg_rating} / 5</span>
                                <GraduationCap className="w-5 h-5 text-slate-300" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Students Rated</span>
                            <div className="flex items-baseline justify-between mt-2">
                                <span className="text-3xl font-black text-slate-800">{summary.students_rated}</span>
                                <Users className="w-5 h-5 text-slate-300" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-32 col-span-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Best Performing Student</span>
                            <div className="flex flex-col mt-2">
                                <span className="text-2xl font-black text-emerald-600">{summary.best_student?.avg_rating || '—'}</span>
                                <span className="text-[10px] font-bold text-slate-400 truncate">{summary.best_student?.student_name || 'None'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Report Table */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th onClick={() => handleSort('student_name')} className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none">Student <ChevronDown className="inline w-3 h-3 ml-0.5" /></th>
                                        <th onClick={() => handleSort('admission_no')} className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none">Admission No <ChevronDown className="inline w-3 h-3 ml-0.5" /></th>
                                        {traits.map((t: any) => (
                                            <th key={t._id} className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">{t.name}</th>
                                        ))}
                                        <th onClick={() => handleSort('average_rating')} className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none">Average <ChevronDown className="inline w-3 h-3 ml-0.5" /></th>
                                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Overall Conduct</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedStudents.map((s: any) => (
                                        <tr key={s.student_id} className="border-b border-slate-100 hover:bg-slate-50/30 transition-all">
                                            <td className="px-6 py-4 font-bold text-slate-800">{s.student_name}</td>
                                            <td className="px-6 py-4 font-semibold text-slate-500">{s.admission_no}</td>
                                            {traits.map((t: any) => (
                                                <td key={t._id} className="px-6 py-4 font-bold text-slate-700">
                                                    {s.ratings[t._id]?.rating || '—'}
                                                </td>
                                            ))}
                                            <td className="px-6 py-4 font-black text-slate-900">{s.average_rating}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-black border ${getGradeBadgeClass(s.average_rating)}`}>
                                                    {s.overall_grade}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {!selectedClass && (
                <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center space-y-4 print:hidden">
                    <TrendingUp className="w-12 h-12 text-slate-300 mx-auto" />
                    <h3 className="text-lg font-black text-slate-700">Choose class to view reports</h3>
                    <p className="text-sm font-medium text-slate-500">Pick academic details and select class from filters row.</p>
                </div>
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
