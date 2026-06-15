import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useReportSchool } from "./useReportSchool";
import { toast } from "sonner";
import { 
    Sliders, Printer, Search, Filter, Save, CheckCircle, 
    Layers, PlusCircle, Check, Columns, Sparkles 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

const AVAILABLE_COLUMNS = [
    { id: "admNo", label: "Admission No" },
    { id: "name", label: "Student Name" },
    { id: "gender", label: "Gender" },
    { id: "studentClass", label: "Class / Grade" },
    { id: "status", label: "Status" },
    { id: "balance", label: "Fee Balance (KSH)" },
    { id: "parentName", label: "Parent Name" },
    { id: "parentPhone", label: "Parent Phone" }
];

export default function CustomisedReports() {
    const school = useReportSchool();
    const queryClient = useQueryClient();
    const [selectedColumns, setSelectedColumns] = useState<string[]>(["admNo", "name", "studentClass", "balance"]);
    const [filterStatus, setFilterStatus] = useState("");
    const [filterGender, setFilterGender] = useState("");
    const [filterClass, setFilterClass] = useState("");
    const [templateName, setTemplateName] = useState("");
    const [templateDesc, setTemplateDesc] = useState("");

    // Fetch classes
    const { data: classes = [] } = useQuery({
        queryKey: ["reports_shared_classes"],
        queryFn: async () => (await api.get("/reports/shared/classes")).data
    });

    // Fetch saved templates
    const { data: templates = [] } = useQuery({
        queryKey: ["reports_custom_templates"],
        queryFn: async () => (await api.get("/reports/custom/templates")).data?.data || []
    });

    // Fetch generated report data
    const { data: resData, isLoading: isGenerating } = useQuery({
        queryKey: ["reports_custom_generate", selectedColumns, filterStatus, filterGender, filterClass],
        queryFn: async () => {
            const res = await api.post("/reports/custom/generate", {
                columns: selectedColumns,
                filters: {
                    status: filterStatus || undefined,
                    gender: filterGender || undefined,
                    studentClass: filterClass || undefined
                }
            });
            return res.data;
        }
    });

    const generatedData = resData?.data || [];

    // Save template mutation
    const saveTemplateMut = useMutation({
        mutationFn: async () => {
            if (!templateName) throw new Error("Please enter a template name");
            const res = await api.post("/reports/custom/templates", {
                name: templateName,
                description: templateDesc || "Custom user-defined report template",
                columns: selectedColumns,
                filters: { status: filterStatus, gender: filterGender, studentClass: filterClass }
            });
            return res.data;
        },
        onSuccess: () => {
            toast.success("Custom report template saved successfully!");
            setTemplateName("");
            setTemplateDesc("");
            queryClient.invalidateQueries({ queryKey: ["reports_custom_templates"] });
        },
        onError: (err: any) => toast.error(err.message)
    });

    const toggleColumn = (colId: string) => {
        if (selectedColumns.includes(colId)) {
            if (selectedColumns.length <= 1) { toast.error("You must select at least one column"); return; }
            setSelectedColumns(selectedColumns.filter(id => id !== colId));
        } else {
            setSelectedColumns([...selectedColumns, colId]);
        }
    };

    const applyTemplate = (tmpl: any) => {
        setSelectedColumns(tmpl.columns || ["admNo", "name", "studentClass"]);
        setFilterStatus(tmpl.filters?.status || "");
        setFilterGender(tmpl.filters?.gender || "");
        setFilterClass(tmpl.filters?.studentClass || "");
        toast.success(`Applied template: ${tmpl.name}`);
    };

    const handlePrint = () => {
        const headersHtml = selectedColumns.map(colId => {
            const colObj = AVAILABLE_COLUMNS.find(c => c.id === colId);
            return `<th>${colObj?.label || colId}</th>`;
        }).join("");

        const rowsHtml = generatedData.map((item: any, i: number) => {
            const cellsHtml = selectedColumns.map(colId => `
                <td style="padding: 12px 16px; color: #1E293B; font-weight: ${colId === 'admNo' ? '700' : '500'};">${item[colId] ?? 'N/A'}</td>
            `).join("");

            return `<tr style="border-bottom: 1px solid #E2E8F0; background: ${i % 2 === 0 ? '#fff' : '#F8FAFC'};">${cellsHtml}</tr>`;
        }).join("");

        const html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Customised Report</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                @page { size: A4 landscape; margin: 15mm; }
                body { font-family: 'Inter', sans-serif; color: #0F172A; background: #fff; margin: 0; padding: 0; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .header { text-align: center; border-bottom: 3px solid #8B5CF6; padding-bottom: 15px; margin-bottom: 25px; }
                .school-title { font-size: 24px; font-weight: 800; color: #1E293B; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
                .report-title { font-size: 16px; font-weight: 600; color: #8B5CF6; margin-top: 5px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
                th { background: #8B5CF6; color: #fff; padding: 12px 16px; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
                .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #CBD5E1; display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; }
            </style>
        </head>
        <body>
            <div class="header">
                ${school.logo ? `<img src="${school.logo}" style="height:56px;margin-bottom:8px;object-fit:contain;" />` : ""}
                <h1 class="school-title">${school.name}</h1>
                <div class="report-title">Custom User-Defined Data Query Report</div>
            </div>

            <table>
                <thead><tr>${headersHtml}</tr></thead>
                <tbody>${rowsHtml}</tbody>
            </table>

            <div class="footer">
                <span>Official Institutional Custom Query Report</span>
                <span>Total Records: ${generatedData.length} | Printed: ${new Date().toLocaleDateString()}</span>
            </div>
        </body>
        </html>`;

        const win = window.open("", "_blank", "width=1200,height=900");
        if (!win) { toast.error("Pop-up blocked"); return; }
        win.document.write(html);
        win.document.close();
        win.focus();
        win.onload = () => { win.print(); };
    };

    return (
        <div className="flex-1 bg-[#f8fafc] p-8 space-y-8 overflow-y-auto custom-scrollbar animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 shadow-inner">
                        <Sliders className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Customised Reports</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Flexible Column Selection & Saved Query Templates</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <Button 
                        onClick={handlePrint}
                        className="h-11 bg-purple-600 hover:bg-purple-700 text-white border-none font-bold text-xs gap-2 rounded-xl shadow-lg shadow-purple-100"
                    >
                        <Printer className="w-4 h-4" /> Print / Export Custom Report
                    </Button>
                </div>
            </div>

            {/* Main Builder Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Controls & Templates Sidebar */}
                <div className="space-y-8 lg:col-span-1">
                    {/* Column Selector */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                            <Columns className="w-5 h-5 text-purple-600" />
                            <h3 className="text-base font-black text-slate-800 tracking-tight">Select Columns</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {AVAILABLE_COLUMNS.map(col => {
                                const active = selectedColumns.includes(col.id);
                                return (
                                    <Button
                                        key={col.id}
                                        onClick={() => toggleColumn(col.id)}
                                        variant={active ? "default" : "outline"}
                                        className={`h-11 justify-start font-bold text-xs gap-2 rounded-xl shadow-none ${active ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100'}`}
                                    >
                                        <Check className={`w-4 h-4 ${active ? 'opacity-100' : 'opacity-0'}`} />
                                        {col.label}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                            <Filter className="w-5 h-5 text-purple-600" />
                            <h3 className="text-base font-black text-slate-800 tracking-tight">Query Filters</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Student Class</label>
                                <select 
                                    value={filterClass} 
                                    onChange={e => setFilterClass(e.target.value)}
                                    className="h-11 w-full px-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-purple-500 transition-colors"
                                >
                                    <option value="">All Classes</option>
                                    {classes.map((c: any) => (
                                        <option key={c._id} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Gender</label>
                                <select 
                                    value={filterGender} 
                                    onChange={e => setFilterGender(e.target.value)}
                                    className="h-11 w-full px-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-purple-500 transition-colors"
                                >
                                    <option value="">All Genders</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Status</label>
                                <select 
                                    value={filterStatus} 
                                    onChange={e => setFilterStatus(e.target.value)}
                                    className="h-11 w-full px-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-purple-500 transition-colors"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="Active">Active</option>
                                    <option value="Suspended">Suspended</option>
                                    <option value="Transferred">Transferred</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Save Template */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                            <Save className="w-5 h-5 text-purple-600" />
                            <h3 className="text-base font-black text-slate-800 tracking-tight">Save as Template</h3>
                        </div>
                        <div className="space-y-4">
                            <Input 
                                value={templateName}
                                onChange={e => setTemplateName(e.target.value)}
                                placeholder="Template Name (e.g. Active Girls Fee List)" 
                                className="h-11 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600"
                            />
                            <Input 
                                value={templateDesc}
                                onChange={e => setTemplateDesc(e.target.value)}
                                placeholder="Short description..." 
                                className="h-11 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-600"
                            />
                            <Button 
                                onClick={() => saveTemplateMut.mutate()}
                                disabled={saveTemplateMut.isPending}
                                className="h-11 w-full bg-purple-600 hover:bg-purple-700 text-white border-none font-bold text-xs gap-2 rounded-xl shadow-lg shadow-purple-100"
                            >
                                <PlusCircle className="w-4 h-4" /> Save Template
                            </Button>
                        </div>
                    </div>

                    {/* Saved Templates List */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                            <Sparkles className="w-5 h-5 text-purple-600" />
                            <h3 className="text-base font-black text-slate-800 tracking-tight">Saved Templates</h3>
                        </div>
                        <div className="space-y-3">
                            {templates.map((tmpl: any) => (
                                <div key={tmpl._id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between gap-3 hover:border-purple-200 transition-colors">
                                    <div>
                                        <h4 className="text-xs font-black text-slate-800">{tmpl.name}</h4>
                                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">{tmpl.description}</p>
                                    </div>
                                    <Button 
                                        onClick={() => applyTemplate(tmpl)}
                                        size="sm" 
                                        className="h-8 bg-white hover:bg-purple-50 text-purple-600 border border-purple-200 font-bold text-xs gap-1 rounded-lg self-start shadow-none"
                                    >
                                        Apply Template
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Generated Table Preview */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-2">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <Layers className="w-5 h-5 text-purple-600" />
                            <h3 className="text-base font-black text-slate-800 tracking-tight">Live Query Preview</h3>
                        </div>
                        <Badge className="bg-purple-50 text-purple-700 border border-purple-200 font-black text-xs px-2.5 py-1 rounded-lg shadow-none">
                            {generatedData.length} Records Found
                        </Badge>
                    </div>
                    <Table>
                        <TableHeader className="bg-slate-50/75 border-b border-slate-100">
                            <TableRow className="h-12 hover:bg-transparent">
                                {selectedColumns.map(colId => {
                                    const colObj = AVAILABLE_COLUMNS.find(c => c.id === colId);
                                    return (
                                        <TableHead key={colId} className="font-black text-[11px] text-slate-400 uppercase tracking-wider px-6">
                                            {colObj?.label || colId}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isGenerating ? (
                                <TableRow><TableCell colSpan={selectedColumns.length} className="text-center py-12 text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Generating custom report...</TableCell></TableRow>
                            ) : generatedData.length === 0 ? (
                                <TableRow><TableCell colSpan={selectedColumns.length} className="text-center py-12 text-slate-400 font-bold text-xs uppercase tracking-widest">No records match your custom query</TableCell></TableRow>
                            ) : (
                                generatedData.map((item: any, idx: number) => (
                                    <TableRow key={idx} className="h-16 hover:bg-slate-50/50 transition-colors border-b border-slate-50">
                                        {selectedColumns.map(colId => (
                                            <TableCell key={colId} className={`px-6 text-xs ${colId === 'admNo' ? 'font-mono font-bold text-slate-500' : 'font-semibold text-slate-700'}`}>
                                                {colId === 'status' ? (
                                                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-[10px] px-2.5 py-0.5 rounded-md uppercase shadow-none">
                                                        {item[colId]}
                                                    </Badge>
                                                ) : colId === 'balance' ? `KSH ${Number(item[colId] || 0).toLocaleString()}` : (item[colId] ?? 'N/A')}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
