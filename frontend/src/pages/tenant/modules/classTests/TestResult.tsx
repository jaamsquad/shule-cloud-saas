import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { 
    Award, BarChart2, BookOpen, ChevronDown, Download, 
    FileText, GraduationCap, Percent, Printer, TrendingUp, Users 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function TestResult() {
    const [selectedYear, setSelectedYear] = useState('2026');
    const [selectedTerm, setSelectedTerm] = useState('Term 1');
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [selectedSubject, setSelectedSubject] = useState<any>(null);
    const [selectedTest, setSelectedTest] = useState<any>(null);
    const [selectedStudentHistory, setSelectedStudentHistory] = useState<any>(null);
    
    // Sort configuration
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'rank', direction: 'asc' });

    // Metadata queries
    const { data: classes = [] } = useQuery({
        queryKey: ['classes'],
        queryFn: async () => (await api.get('/academics/classes')).data || []
    });

    const { data: subjects = [] } = useQuery({
        queryKey: ['subjects'],
        queryFn: async () => (await api.get('/subjects')).data || []
    });

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

    const { data: tests = [] } = useQuery({
        queryKey: ['class-tests', selectedClass?._id, selectedSubject?._id],
        queryFn: async () => {
            if (!selectedClass || !selectedSubject) return [];
            const res = await api.get(`/class-tests?class_id=${selectedClass._id}&subject_id=${selectedSubject._id}`);
            return res.data.data || [];
        },
        enabled: !!selectedClass && !!selectedSubject
    });

    // Auto-select first test when loaded
    React.useEffect(() => {
        if (tests.length > 0 && !selectedTest) {
            setSelectedTest(tests[0]);
        }
    }, [tests, selectedTest]);

    // Test results/analytics query
    const { data: resultsData, isLoading: isLoadingResults } = useQuery({
        queryKey: ['test-results', selectedTest?._id],
        queryFn: async () => {
            if (!selectedTest) return null;
            const res = await api.get(`/class-tests/${selectedTest._id}/results`);
            return res.data.data;
        },
        enabled: !!selectedTest
    });

    const studentHistoryQuery = useQuery({
        queryKey: ['student-history', selectedStudentHistory?.student_id],
        queryFn: async () => {
            if (!selectedStudentHistory) return [];
            // Mock test history list since the model requires a schema we'll adapt. 
            // In a production context, this would hit /students/:student_id/test-history.
            return [
                { test_name: "Quiz 1", subject_name: "Mathematics", date: "2026-02-10", marks_obtained: 18, total_marks: 20, percentage: 90, grade: "A+", rank: 2 },
                { test_name: "Mid-Term Test", subject_name: "Mathematics", date: "2026-03-15", marks_obtained: 42, total_marks: 50, percentage: 84, grade: "A", rank: 4 }
            ];
        },
        enabled: !!selectedStudentHistory
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

    const analytics = resultsData?.analytics;
    const distribution = resultsData?.distribution || [];
    const results = resultsData?.results || [];

    const sortedResults = [...results].sort((a: any, b: any) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (typeof aVal === 'string') {
            return sortConfig.direction === 'asc' 
                ? aVal.localeCompare(bVal) 
                : bVal.localeCompare(aVal);
        }
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Row color helper per grade
    const getRowColorClass = (grade: string) => {
        if (grade.startsWith('A')) return 'bg-emerald-50/30 text-emerald-800 border-emerald-100 hover:bg-emerald-50/50';
        if (grade.startsWith('B')) return 'bg-blue-50/30 text-blue-800 border-blue-100 hover:bg-blue-50/50';
        if (grade.startsWith('C')) return 'bg-amber-50/30 text-amber-800 border-amber-100 hover:bg-amber-50/50';
        if (grade.startsWith('D')) return 'bg-orange-50/30 text-orange-800 border-orange-100 hover:bg-orange-50/50';
        return 'bg-rose-50/30 text-rose-800 border-rose-100 hover:bg-rose-50/50';
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 print:p-0">
            <div className="flex items-center justify-between print:hidden">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-indigo-600" />
                        Test Results & Analytics
                    </h1>
                    <p className="text-sm font-medium text-slate-500 mt-2">
                        Analyze class test rankings, distribution score ranges, and export records.
                    </p>
                </div>
                {results.length > 0 && (
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="h-11 rounded-xl font-bold border-slate-200 text-slate-700 shadow-sm gap-2">
                            <Download className="w-4 h-4" /> Export Excel
                        </Button>
                        <Button 
                            onClick={handlePrint}
                            className="group relative bg-white hover:bg-indigo-50 text-indigo-700 h-11 px-5 rounded-xl font-bold flex items-center gap-2 transition-all text-sm border border-indigo-200 hover:border-indigo-300 shadow-sm hover:shadow-md"
                        >
                            <Printer className="w-4 h-4" /> Print Results
                            <span className="absolute -top-2 -right-2 text-[9px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-full tracking-wide shadow-sm">A4</span>
                        </Button>
                    </div>
                )}
            </div>

            {/* School Header for Print Mode Only */}
            <div className="hidden print:block border-b-2 border-slate-900 pb-6 mb-8 text-center">
                <h1 className="text-3xl font-black uppercase text-slate-900">ShuleCloud Institutional Academy</h1>
                <p className="text-sm font-bold text-slate-600 uppercase tracking-widest mt-1">Official Test Results Summary Report</p>
                <div className="grid grid-cols-4 gap-4 mt-6 text-xs font-bold text-slate-500 uppercase">
                    <div>Class: {selectedClass?.name}</div>
                    <div>Subject: {selectedSubject?.name}</div>
                    <div>Test: {selectedTest?.name}</div>
                    <div>Term: {selectedTerm} ({selectedYear})</div>
                </div>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm print:hidden">
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
                    <Select value={selectedTest?._id || ""} onValueChange={(val) => setSelectedTest(tests.find((t: any) => t._id === val))}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-slate-700">
                            <SelectValue placeholder="Choose Test" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {tests.map((t: any) => (
                                <SelectItem key={t._id} value={t._id} className="font-bold">{t.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {analytics && (
                <>
                    {/* Analytics Strip */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Students</span>
                            <div className="flex items-baseline justify-between mt-2">
                                <span className="text-3xl font-black text-slate-800">{analytics.total_students}</span>
                                <Users className="w-5 h-5 text-slate-300" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Class Average</span>
                            <div className="flex items-baseline justify-between mt-2">
                                <span className="text-3xl font-black text-slate-800">{analytics.average}</span>
                                <Percent className="w-5 h-5 text-slate-300" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pass Rate (≥ 50%)</span>
                            <div className="flex items-baseline justify-between mt-2">
                                <span className="text-3xl font-black text-slate-800">{analytics.pass_rate}%</span>
                                <GraduationCap className="w-5 h-5 text-slate-300" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Highest Score</span>
                            <div className="flex flex-col mt-2">
                                <span className="text-2xl font-black text-emerald-600">{analytics.highest?.marks}</span>
                                <span className="text-[10px] font-bold text-slate-400 truncate">{analytics.highest?.student_name}</span>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lowest Score</span>
                            <div className="flex flex-col mt-2">
                                <span className="text-2xl font-black text-rose-500">{analytics.lowest?.marks}</span>
                                <span className="text-[10px] font-bold text-slate-400 truncate">{analytics.lowest?.student_name}</span>
                            </div>
                        </div>
                    </div>

                    {/* Chart & Distribution Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 print:hidden">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                                <BarChart2 className="w-4 h-4 text-slate-400" /> Score Distribution
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={distribution}>
                                        <XAxis dataKey="range" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col print:hidden">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Score Range Counts</h3>
                            <div className="space-y-3 flex-1 flex flex-col justify-center">
                                {distribution.map((d: any) => (
                                    <div key={d.range} className="flex justify-between items-center text-sm font-bold">
                                        <span className="text-slate-500">{d.range} Percentage Range</span>
                                        <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-black">{d.count} Student{d.count !== 1 ? 's' : ''}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Results Table */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th onClick={() => handleSort('rank')} className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none">Rank <ChevronDown className="inline w-3 h-3 ml-0.5" /></th>
                                        <th onClick={() => handleSort('student_name')} className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none">Student <ChevronDown className="inline w-3 h-3 ml-0.5" /></th>
                                        <th onClick={() => handleSort('admission_no')} className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none">Admission No <ChevronDown className="inline w-3 h-3 ml-0.5" /></th>
                                        <th onClick={() => handleSort('marks_obtained')} className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none">Marks Obtained <ChevronDown className="inline w-3 h-3 ml-0.5" /></th>
                                        <th onClick={() => handleSort('percentage')} className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none">Percentage <ChevronDown className="inline w-3 h-3 ml-0.5" /></th>
                                        <th onClick={() => handleSort('grade')} className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest cursor-pointer select-none">Grade <ChevronDown className="inline w-3 h-3 ml-0.5" /></th>
                                        <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedResults.map((r: any) => (
                                        <tr 
                                            key={r.student_id} 
                                            onClick={() => setSelectedStudentHistory(r)}
                                            className={`border-b border-slate-100 cursor-pointer transition-all ${getRowColorClass(r.grade)}`}
                                        >
                                            <td className="px-6 py-4 font-black">{r.rank}</td>
                                            <td className="px-6 py-4 font-bold">{r.student_name}</td>
                                            <td className="px-6 py-4 font-semibold">{r.admission_no}</td>
                                            <td className="px-6 py-4 font-bold">{r.marks_obtained} / {r.total_marks}</td>
                                            <td className="px-6 py-4 font-bold">{r.percentage}%</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-white/60 border">
                                                    {r.grade}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-semibold opacity-80">{r.remarks || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Student Full Test History Modal */}
            <Dialog open={!!selectedStudentHistory} onOpenChange={() => setSelectedStudentHistory(null)}>
                <DialogContent className="rounded-3xl max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black flex items-center gap-2">
                            <Award className="w-5 h-5 text-indigo-600" />
                            Academic Test History
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border">
                            <div>
                                <h4 className="text-sm font-black text-slate-800">{selectedStudentHistory?.student_name}</h4>
                                <p className="text-xs font-bold text-slate-400 mt-0.5">Admission No: {selectedStudentHistory?.admission_no}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h5 className="text-xs font-black uppercase tracking-wider text-slate-400 px-2">History Records</h5>
                            <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <th className="p-3">Test</th>
                                            <th className="p-3">Subject</th>
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Marks</th>
                                            <th className="p-3">Grade</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studentHistoryQuery.data?.map((h: any, idx: number) => (
                                            <tr key={idx} className="border-b border-slate-50 text-xs font-bold text-slate-700">
                                                <td className="p-3">{h.test_name}</td>
                                                <td className="p-3">{h.subject_name}</td>
                                                <td className="p-3 text-slate-400">{h.date}</td>
                                                <td className="p-3">{h.marks_obtained} / {h.total_marks}</td>
                                                <td className="p-3"><span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-black">{h.grade}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
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
