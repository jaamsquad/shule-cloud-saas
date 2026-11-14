import { useState, useEffect } from "react";
import {
    School, GraduationCap, Library, UserCog, Wallet, MessageSquare,
    UserCheck, CalendarDays, Globe, FileEdit, Link, Palette, Shield,
    CreditCard, Save, Loader2, Camera, MapPin, Building2, Globe2,
    Mail, Phone, User, Clock, Bell, Lock, Database, Smartphone,
    CheckCircle2, AlertCircle, Upload, Trash2, Plus, RefreshCw,
    Key, Eye, EyeOff, Wifi, Send, Volume2, Timer, BookOpen, Sun, Moon
} from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function Settings() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("profile");

    const { data: settings, isLoading } = useQuery({
        queryKey: ["tenant-settings"],
        queryFn: async () => (await api.get("/settings")).data,
    });

    const updateMutation = useMutation({
        mutationFn: ({ type, data }: { type: string; data: any }) => api.post(`/settings/${type}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tenant-settings"] });
            toast.success("Settings saved!");
        },
        onError: () => toast.error("Could not save settings"),
    });

    // Local state for each settings section
    const [school, setSchool] = useState<any>({});
    const [academic, setAcademic] = useState<any>({});
    const [finance, setFinance] = useState<any>({});
    const [notif, setNotif] = useState<any>({});
    const [brand, setBrand] = useState<any>({});
    const [attendance, setAttendance] = useState<any>({});
    const [timetable, setTimetable] = useState<any>({});
    const [lms, setLms] = useState<any>({});
    const [assess, setAssess] = useState<any>({});
    const [integrations, setIntegrations] = useState<any>({});
    const [privacy, setPrivacy] = useState<any>({});

    // Sync fetched data into local state
    useEffect(() => {
        if (!settings) return;
        setSchool(settings.schoolSettings || {});
        setAcademic(settings.academicSettings || {});
        setFinance(settings.financeSettings || {});
        setNotif(settings.notificationSettings || {});
        setBrand(settings.brandSettings || {});
        setAttendance(settings.attendanceSettings || {});
        setTimetable(settings.timetableSettings || {});
        setLms(settings.lmsSettings || {});
        setAssess(settings.assessmentSettings || {});
        setIntegrations(settings.integrationSettings || {});
        setPrivacy(settings.privacySettings || {});
    }, [settings]);

    const saving = updateMutation.isPending;

    const save = (type: string, data: any) => {
        // Strip out relation/meta fields before sending
        const { id, tenantId, tenant, createdAt, updatedAt, ...clean } = data;
        updateMutation.mutate({ type, data: clean });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Loading settings...</p>
            </div>
        );
    }

    const tabs = [
        { id: "profile", label: "School Info", icon: School },
        { id: "academic", label: "Exams & Terms", icon: GraduationCap },
        { id: "classes", label: "Classes & Streams", icon: Library },
        { id: "users", label: "Users & Roles", icon: UserCog },
        { id: "finance", label: "Fees & Money", icon: Wallet },
        { id: "comm", label: "Messages", icon: MessageSquare },
        { id: "attendance", label: "Attendance", icon: UserCheck },
        { id: "timetable", label: "Timetable", icon: CalendarDays },
        { id: "lms", label: "Online Learning", icon: Globe },
        { id: "exams", label: "Tests & Papers", icon: FileEdit },
        { id: "integrations", label: "Connections", icon: Link },
        { id: "branding", label: "Colors & Logo", icon: Palette },
        { id: "privacy", label: "Data & Privacy", icon: Shield },
        { id: "subscription", label: "My Plan", icon: CreditCard },
    ];

    return (
        <div className="flex flex-col h-full bg-muted/30">
            <AppHeader title="School Settings" subtitle="Set up and manage your school" />

            <div className="flex-1 overflow-hidden p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col xl:flex-row gap-6">

                    {/* Sidebar nav */}
                    <Card className="xl:w-72 shrink-0 border-0 shadow-soft bg-background/60 backdrop-blur-xl p-2 h-fit">
                        <ScrollArea className="max-h-[calc(100vh-200px)]">
                            <TabsList className="bg-transparent flex flex-col h-auto gap-0.5 p-0 w-full">
                                {tabs.map((tab) => (
                                    <TabsTrigger
                                        key={tab.id}
                                        value={tab.id}
                                        className="w-full justify-start gap-3 px-4 py-2.5 rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all text-left group"
                                    >
                                        <tab.icon className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform" />
                                        <span className="text-xs font-bold truncate">{tab.label}</span>
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </ScrollArea>
                    </Card>

                    {/* Content area */}
                    <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.15 }}
                                className="max-w-4xl mx-auto space-y-6"
                            >

                                {/* ──────────── 1. SCHOOL PROFILE ──────────── */}
                                <TabsContent value="profile" className="m-0 space-y-6">
                                    <Header title="School Info" desc="Your school's name, logo, type, and contact details." />
                                    <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-xl">
                                        <CardContent className="p-8 space-y-8">
                                            {/* Logo */}
                                            <div className="flex items-center gap-8">
                                                <div className="relative group">
                                                    <div className="w-28 h-28 rounded-3xl bg-muted flex items-center justify-center overflow-hidden border-4 border-background shadow-xl">
                                                        {school.logoUrl
                                                            ? <img src={school.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                                            : <School className="w-10 h-10 text-muted-foreground/30" />
                                                        }
                                                    </div>
                                                    <Button size="icon" className="absolute -bottom-2 -right-2 rounded-xl shadow-lg group-hover:scale-110 transition-transform h-8 w-8">
                                                        <Camera className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black">School Logo</h3>
                                                    <p className="text-sm text-muted-foreground">Upload a clear picture of your school badge or crest.</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <Field label="School Name" value={school.schoolName || settings?.name} onChange={v => setSchool({ ...school, schoolName: v })} icon={Building2} />
                                                <Field label="Motto" value={school.motto} onChange={v => setSchool({ ...school, motto: v })} icon={Globe2} placeholder="e.g. Learning for Life" />
                                                <Field label="Website" value={school.website} onChange={v => setSchool({ ...school, website: v })} icon={Globe} placeholder="www.myschool.ac.ke" />
                                                <SelectField label="School Type" value={school.schoolType || "Day"} onChange={v => setSchool({ ...school, schoolType: v })} options={["Day", "Boarding", "Mixed"]} />
                                                <SelectField label="Level" value={school.educationLevel || "Both"} onChange={v => setSchool({ ...school, educationLevel: v })} options={["Junior", "Senior", "Both"]} />
                                                <Field label="Address" value={school.address} onChange={v => setSchool({ ...school, address: v })} icon={MapPin} placeholder="P.O. Box ..." />
                                            </div>

                                            <div className="pt-6 border-t border-dashed border-border/40">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-primary">Contact Details</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <Field label="County" value={school.county} onChange={v => setSchool({ ...school, county: v })} icon={MapPin} />
                                                    <Field label="Sub-County" value={school.subCounty} onChange={v => setSchool({ ...school, subCounty: v })} icon={MapPin} />
                                                    <Field label="Email" value={school.contactEmail} onChange={v => setSchool({ ...school, contactEmail: v })} icon={Mail} />
                                                    <Field label="Phone" value={school.contactPhone} onChange={v => setSchool({ ...school, contactPhone: v })} icon={Phone} />
                                                    <Field label="Head Teacher" value={school.principalName} onChange={v => setSchool({ ...school, principalName: v })} icon={User} />
                                                    <Field label="GPS Coordinates" value={school.gps} onChange={v => setSchool({ ...school, gps: v })} icon={MapPin} placeholder="e.g. -1.28, 36.82" />
                                                </div>
                                            </div>

                                            <SaveBtn loading={saving} onClick={() => save("school", { ...school, schoolName: school.schoolName || settings?.name })} />
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* ──────────── 2. ACADEMIC SETUP ──────────── */}
                                <TabsContent value="academic" className="m-0 space-y-6">
                                    <Header title="Exams & Terms" desc="Set the current year, term, grading rules, and CBC options." />
                                    <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-xl">
                                        <CardContent className="p-8 space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <SelectField label="Current Year" value={academic.currentYearId || "2025"} onChange={v => setAcademic({ ...academic, currentYearId: v })} options={["2024", "2025", "2026"]} />
                                                <SelectField label="Current Term" value={academic.currentTermId || "Term 1"} onChange={v => setAcademic({ ...academic, currentTermId: v })} options={["Term 1", "Term 2", "Term 3"]} />
                                                <SelectField label="Report Card Style" value={academic.reportTemplate || "standard"} onChange={v => setAcademic({ ...academic, reportTemplate: v })} options={["standard", "detailed", "cbc"]} />
                                            </div>

                                            <div className="pt-6 border-t border-dashed border-border/40">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">CBC & Grading</h4>
                                                    <Badge variant="outline" className="text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-500 border-none">Active</Badge>
                                                </div>
                                                <div className="space-y-3">
                                                    <ToggleRow
                                                        label="Auto Mark Weighting"
                                                        desc="30% CAT, 70% End of Term"
                                                        checked={academic.gradingSystem?.autoWeight !== false}
                                                        onChange={v => setAcademic({ ...academic, gradingSystem: { ...academic.gradingSystem, autoWeight: v } })}
                                                    />
                                                    <ToggleRow
                                                        label="Standard Grading (A to E)"
                                                        desc="Use the default Kenyan grading scale"
                                                        checked={academic.gradingSystem?.standardScale !== false}
                                                        onChange={v => setAcademic({ ...academic, gradingSystem: { ...academic.gradingSystem, standardScale: v } })}
                                                    />
                                                    <ToggleRow
                                                        label="Show Ranking on Reports"
                                                        desc="Display class and overall position"
                                                        checked={academic.gradingSystem?.showRanking === true}
                                                        onChange={v => setAcademic({ ...academic, gradingSystem: { ...academic.gradingSystem, showRanking: v } })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-dashed border-border/40">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Test Types</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {["CAT", "Mid-Term", "End Term", "Project", "Practical", "Assignment"].map(t => (
                                                        <div key={t} className="flex items-center gap-2 p-3 rounded-2xl bg-muted/30 border border-border/30">
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                            <span className="text-xs font-bold">{t}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <SaveBtn loading={saving} onClick={() => save("academic", academic)} />
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* ──────────── 3. CLASSES & STREAMS ──────────── */}
                                <TabsContent value="classes" className="m-0 space-y-6">
                                    <Header title="Classes & Streams" desc="How students are grouped in your school." />
                                    <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-xl">
                                        <CardContent className="p-8 space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <Field label="Naming Format" value="Grade [Number][Letter]" icon={Library} placeholder="e.g. Grade 7A, Form 1B" />
                                                <Field label="Max Students Per Stream" value="45" icon={User} placeholder="e.g. 45" />
                                            </div>
                                            <InfoBox
                                                icon={Library}
                                                title="Need to set up many streams?"
                                                desc="Go to Classes > Class Streams to create and manage all your streams at once."
                                                color="indigo"
                                            />
                                            <SaveBtn loading={saving} onClick={() => toast.info("Class settings are managed in the Classes section")} label="Go to Classes" />
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* ──────────── 4. USERS & ROLES ──────────── */}
                                <TabsContent value="users" className="m-0 space-y-6">
                                    <Header title="Users & Roles" desc="Decide who can do what in the system." />
                                    <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-xl">
                                        <CardContent className="p-8 space-y-8">
                                            <div className="space-y-3">
                                                <ToggleRow label="Allow Teachers to Edit Marks" desc="Teachers can change marks after first entry" checked={true} />
                                                <ToggleRow label="Allow Parents to View Reports" desc="Parents can see term report cards online" checked={true} />
                                                <ToggleRow label="Allow Students to See Results" desc="Students can log in and check their scores" checked={false} />
                                                <ToggleRow label="Two-Step Login for Admins" desc="Extra security for admin accounts" checked={false} />
                                            </div>

                                            <div className="pt-6 border-t border-dashed border-border/40">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Default Roles</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                    {["Admin", "Head Teacher", "Teacher", "Bursar", "Librarian", "Parent", "Student", "HOD", "Nurse"].map(role => (
                                                        <div key={role} className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 border border-border/30 hover:border-primary/30 transition-colors cursor-pointer group">
                                                            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                                <UserCog className="w-4 h-4" />
                                                            </div>
                                                            <span className="text-sm font-bold">{role}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <InfoBox icon={Shield} title="Need custom roles?" desc="Go to Settings > Roles to create special roles with custom access." color="violet" />
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* ──────────── 5. FEES & MONEY ──────────── */}
                                <TabsContent value="finance" className="m-0 space-y-6">
                                    <Header title="Fees & Money" desc="Set your currency, receipt format, and payment methods." />
                                    <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-xl">
                                        <CardContent className="p-8 space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <SelectField label="Currency" value={finance.currency || "KES"} onChange={v => setFinance({ ...finance, currency: v })} options={["KES", "USD", "UGX", "TZS", "GBP"]} />
                                                <Field label="Receipt Number Start" value={finance.invoicePrefix || "SC/INV/"} onChange={v => setFinance({ ...finance, invoicePrefix: v })} icon={Wallet} />
                                                <SelectField label="Receipt Style" value={finance.receiptFormat || "standard"} onChange={v => setFinance({ ...finance, receiptFormat: v })} options={["standard", "detailed", "simple"]} />
                                            </div>

                                            <div className="pt-6 border-t border-dashed border-border/40">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Payment Methods</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {[
                                                        { name: "M-PESA", on: true },
                                                        { name: "Bank Transfer", on: true },
                                                        { name: "Cash", on: true },
                                                        { name: "Credit/Debit Card", on: false },
                                                    ].map(m => (
                                                        <ToggleRow key={m.name} label={m.name} desc={m.on ? "Turned on" : "Turned off"} checked={m.on} />
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-dashed border-border/40">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Late Fee Rules</h4>
                                                <div className="space-y-3">
                                                    <ToggleRow label="Charge Late Fees" desc="Add a penalty when fees are overdue" checked={false} />
                                                    <ToggleRow label="Send Payment Reminders" desc="Auto-send SMS before fee deadlines" checked={true} />
                                                </div>
                                            </div>

                                            <SaveBtn loading={saving} onClick={() => save("finance", finance)} />
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* ──────────── 6. MESSAGES ──────────── */}
                                <TabsContent value="comm" className="m-0 space-y-6">
                                    <Header title="Messages" desc="Set up SMS, email, and WhatsApp for your school." />
                                    <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-xl">
                                        <CardContent className="p-8 space-y-8">
                                            <Field label="Sender Name" value={notif.senderName || ""} onChange={v => setNotif({ ...notif, senderName: v })} icon={Send} placeholder="e.g. MySchool" />

                                            <div className="pt-6 border-t border-dashed border-border/40">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Channels</h4>
                                                <div className="space-y-3">
                                                    <ToggleRow label="SMS Messages" desc="Send text messages to parents and staff" checked={notif.smsConfig?.enabled !== false}
                                                        onChange={v => setNotif({ ...notif, smsConfig: { ...notif.smsConfig, enabled: v } })} />
                                                    <ToggleRow label="Email Messages" desc="Send emails to parents and staff" checked={notif.emailConfig?.enabled !== false}
                                                        onChange={v => setNotif({ ...notif, emailConfig: { ...notif.emailConfig, enabled: v } })} />
                                                    <ToggleRow label="WhatsApp Messages" desc="Send WhatsApp notifications" checked={notif.whatsappConfig?.enabled === true}
                                                        onChange={v => setNotif({ ...notif, whatsappConfig: { ...notif.whatsappConfig, enabled: v } })} />
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-dashed border-border/40">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Auto Messages</h4>
                                                <div className="space-y-3">
                                                    <ToggleRow label="Fee Payment Received" desc="Tell parents when their payment goes through" checked={true} />
                                                    <ToggleRow label="Student Absent" desc="Alert parents when their child misses school" checked={true} />
                                                    <ToggleRow label="Exam Results Ready" desc="Let parents know when results are out" checked={false} />
                                                    <ToggleRow label="Term Report Ready" desc="Send a note when term reports are published" checked={false} />
                                                </div>
                                            </div>

                                            <SaveBtn loading={saving} onClick={() => save("notifications", notif)} />
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* ──────────── 7. ATTENDANCE ──────────── */}
                                <TabsContent value="attendance" className="m-0 space-y-6">
                                    <Header title="Attendance" desc="Choose how attendance is taken and what the rules are." />
                                    <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-xl">
                                        <CardContent className="p-8 space-y-8">
                                            <SelectField label="How is Attendance Taken?" value={attendance.mode || "manual"} onChange={v => setAttendance({ ...attendance, mode: v })} options={["manual", "qr", "biometric"]} />

                                            <div className="pt-6 border-t border-dashed border-border/40">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Rules</h4>
                                                <div className="space-y-3">
                                                    <ToggleRow label="Automatic Late Marking" desc="If a student checks in after the cutoff, mark them late" checked={attendance.lateRules?.autoLate !== false}
                                                        onChange={v => setAttendance({ ...attendance, lateRules: { ...attendance.lateRules, autoLate: v } })} />
                                                    <ToggleRow label="Notify Parents on Absence" desc="Send a message to parents if their child is absent" checked={attendance.lateRules?.notifyParent !== false}
                                                        onChange={v => setAttendance({ ...attendance, lateRules: { ...attendance.lateRules, notifyParent: v } })} />
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-dashed border-border/40">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Roll Call Times</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <Field label="Morning" value={attendance.rollCallTimes?.morning || "07:30"} onChange={v => setAttendance({ ...attendance, rollCallTimes: { ...attendance.rollCallTimes, morning: v } })} icon={Clock} />
                                                    <Field label="Afternoon" value={attendance.rollCallTimes?.afternoon || "14:00"} onChange={v => setAttendance({ ...attendance, rollCallTimes: { ...attendance.rollCallTimes, afternoon: v } })} icon={Clock} />
                                                    <Field label="Evening (Boarding)" value={attendance.rollCallTimes?.evening || "19:00"} onChange={v => setAttendance({ ...attendance, rollCallTimes: { ...attendance.rollCallTimes, evening: v } })} icon={Clock} />
                                                </div>
                                            </div>

                                            <SaveBtn loading={saving} onClick={() => save("attendance", attendance)} />
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* ──────────── 8. TIMETABLE ──────────── */}
                                <TabsContent value="timetable" className="m-0 space-y-6">
                                    <Header title="Timetable" desc="Set lesson times, breaks, and how many lessons per day." />
                                    <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-xl">
                                        <CardContent className="p-8 space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <NumberField label="Lesson Length (minutes)" value={timetable.lessonDuration || 40} onChange={v => setTimetable({ ...timetable, lessonDuration: v })} icon={Timer} />
                                                <NumberField label="Break Time (minutes)" value={timetable.breakDuration || 20} onChange={v => setTimetable({ ...timetable, breakDuration: v })} icon={Clock} />
                                                <NumberField label="Lunch Time (minutes)" value={timetable.lunchDuration || 60} onChange={v => setTimetable({ ...timetable, lunchDuration: v })} icon={Clock} />
                                                <NumberField label="Lessons Per Day" value={timetable.periodsPerDay || 8} onChange={v => setTimetable({ ...timetable, periodsPerDay: v })} icon={CalendarDays} />
                                            </div>

                                            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200/50">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                                                        <CalendarDays className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-amber-900">Quick Math</p>
                                                        <p className="text-xs text-amber-700 mt-1">
                                                            With {timetable.periodsPerDay || 8} lessons × {timetable.lessonDuration || 40} minutes each,
                                                            your school day is about <strong>{Math.round(((timetable.periodsPerDay || 8) * (timetable.lessonDuration || 40) + (timetable.breakDuration || 20) * 2 + (timetable.lunchDuration || 60)) / 60 * 10) / 10} hours</strong> long.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <SaveBtn loading={saving} onClick={() => save("timetable", timetable)} />
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* ──────────── 9. ONLINE LEARNING ──────────── */}
                                <TabsContent value="lms" className="m-0 space-y-6">
                                    <Header title="Online Learning" desc="Turn on e-learning tools and set upload limits." />
                                    <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-xl">
                                        <CardContent className="p-8 space-y-8">
                                            <ToggleRow
                                                label="Turn On Online Learning"
                                                desc="Let teachers upload notes, videos, and assignments online"
                                                checked={lms.isEnabled === true}
                                                onChange={v => setLms({ ...lms, isEnabled: v })}
                                            />

                                            {lms.isEnabled && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-8">
                                                    <NumberField label="Max File Size (MB)" value={lms.maxUploadSize || 10} onChange={v => setLms({ ...lms, maxUploadSize: v })} icon={Upload} />

                                                    <div className="pt-6 border-t border-dashed border-border/40">
                                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Allowed File Types</h4>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                            {["PDF", "Word", "PowerPoint", "Video", "Image", "Audio", "Excel", "ZIP"].map(t => (
                                                                <div key={t} className="flex items-center gap-2 p-3 rounded-2xl bg-muted/30 border border-border/30">
                                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                                    <span className="text-xs font-bold">{t}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <ToggleRow label="Teacher Approval Needed" desc="Admin must approve content before students see it" checked={lms.approvalWorkflow?.required === true}
                                                        onChange={v => setLms({ ...lms, approvalWorkflow: { ...lms.approvalWorkflow, required: v } })} />
                                                </motion.div>
                                            )}

                                            <SaveBtn loading={saving} onClick={() => save("lms", lms)} />
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* ──────────── 10. TESTS & PAPERS ──────────── */}
                                <TabsContent value="exams" className="m-0 space-y-6">
                                    <Header title="Tests & Papers" desc="Control question bank rules, blueprints, paper generation, and security." />

                                    {/* Question Bank Rules */}
                                    <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-xl">
                                        <CardContent className="p-8 space-y-8">
                                            <div>
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Question Bank Rules</h4>
                                                <div className="space-y-3">
                                                    <ToggleRow label="Questions Need Approval" desc="Questions must be reviewed and approved before use in exams" checked={assess.categories?.approvalRequired !== false}
                                                        onChange={v => setAssess({ ...assess, categories: { ...assess.categories, approvalRequired: v } })} />
                                                    <ToggleRow label="Stop Question Reuse" desc="Don't use the same question again within a set number of days" checked={assess.categories?.preventReuse === true}
                                                        onChange={v => setAssess({ ...assess, categories: { ...assess.categories, preventReuse: v } })} />
                                                    <NumberField label="Days Before Reuse" value={assess.categories?.reuseDays || 90} onChange={v => setAssess({ ...assess, categories: { ...assess.categories, reuseDays: v } })} icon={Clock} />
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-dashed border-border/40">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Question Types Allowed</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {["MCQ", "Short Answer", "Structured", "Essay", "Practical", "Oral", "Project"].map(t => (
                                                        <div key={t} className="flex items-center gap-2 p-3 rounded-2xl bg-muted/30 border border-border/30">
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                            <span className="text-xs font-bold">{t}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Blueprint Defaults */}
                                    <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-xl">
                                        <CardContent className="p-8 space-y-8">
                                            <div>
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Default Exam Blueprints</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                    {[
                                                        { name: "CAT", marks: 30, time: "45 min" },
                                                        { name: "Mid-Term", marks: 60, time: "1.5 hrs" },
                                                        { name: "End Term", marks: 80, time: "2.5 hrs" },
                                                        { name: "Mock Exam", marks: 80, time: "2.5 hrs" },
                                                        { name: "Practical", marks: 40, time: "1 hr" },
                                                        { name: "Project", marks: 20, time: "varies" },
                                                    ].map(bp => (
                                                        <div key={bp.name} className="flex flex-col p-4 rounded-2xl bg-muted/30 border border-border/30 hover:border-primary/30 transition-colors cursor-pointer group">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <FileEdit className="w-4 h-4 text-primary" />
                                                                <span className="text-sm font-black">{bp.name}</span>
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground">{bp.marks} marks · {bp.time}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-dashed border-border/40">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Default Difficulty Split</h4>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                                                        <p className="text-2xl font-black text-emerald-600">30%</p>
                                                        <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Easy</p>
                                                    </div>
                                                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                                                        <p className="text-2xl font-black text-amber-600">50%</p>
                                                        <p className="text-[10px] font-bold text-amber-600 uppercase mt-1">Medium</p>
                                                    </div>
                                                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-center">
                                                        <p className="text-2xl font-black text-rose-600">20%</p>
                                                        <p className="text-[10px] font-bold text-rose-600 uppercase mt-1">Hard</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-dashed border-border/40">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Default Bloom's Level Split</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                    {[
                                                        { name: "Remember", pct: 15, color: "bg-slate-100 text-slate-600" },
                                                        { name: "Understand", pct: 25, color: "bg-blue-50 text-blue-600" },
                                                        { name: "Apply", pct: 30, color: "bg-indigo-50 text-indigo-600" },
                                                        { name: "Analyze", pct: 15, color: "bg-violet-50 text-violet-600" },
                                                        { name: "Evaluate", pct: 10, color: "bg-purple-50 text-purple-600" },
                                                        { name: "Create", pct: 5, color: "bg-pink-50 text-pink-600" },
                                                    ].map(b => (
                                                        <div key={b.name} className={`p-3 rounded-2xl ${b.color} text-center`}>
                                                            <p className="text-lg font-black">{b.pct}%</p>
                                                            <p className="text-[9px] font-bold uppercase">{b.name}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Paper Security */}
                                    <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-xl">
                                        <CardContent className="p-8 space-y-8">
                                            <div>
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Paper Security & Workflow</h4>
                                                <div className="space-y-3">
                                                    <ToggleRow label="Moderation Required" desc="A HOD must review before a paper is approved" checked={assess.integrityRules?.moderationRequired !== false}
                                                        onChange={v => setAssess({ ...assess, integrityRules: { ...assess.integrityRules, moderationRequired: v } })} />
                                                    <ToggleRow label="Deputy Approval Required" desc="Deputy Head must approve after moderation" checked={assess.integrityRules?.deputyApproval === true}
                                                        onChange={v => setAssess({ ...assess, integrityRules: { ...assess.integrityRules, deputyApproval: v } })} />
                                                    <ToggleRow label="Auto-Watermark Papers" desc="Add a watermark with date and school name" checked={assess.integrityRules?.autoWatermark !== false}
                                                        onChange={v => setAssess({ ...assess, integrityRules: { ...assess.integrityRules, autoWatermark: v } })} />
                                                    <ToggleRow label="Log All Paper Access" desc="Record every time someone views or downloads a paper" checked={assess.integrityRules?.logAccess !== false}
                                                        onChange={v => setAssess({ ...assess, integrityRules: { ...assess.integrityRules, logAccess: v } })} />
                                                    <ToggleRow label="Shuffle Questions" desc="Mix up the order of questions for each paper version" checked={assess.integrityRules?.shuffle !== false}
                                                        onChange={v => setAssess({ ...assess, integrityRules: { ...assess.integrityRules, shuffle: v } })} />
                                                    <ToggleRow label="Generate Multiple Versions" desc="Create Version A, B, C from the same blueprint" checked={assess.integrityRules?.multiVersion === true}
                                                        onChange={v => setAssess({ ...assess, integrityRules: { ...assess.integrityRules, multiVersion: v } })} />
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-dashed border-border/40">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Paper Format</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {["KCSE Standard", "CBC Format", "School Custom"].map(f => (
                                                        <div key={f} className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 border border-border/30">
                                                            <BookOpen className="w-4 h-4 text-primary" />
                                                            <span className="text-sm font-bold">{f}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <InfoBox icon={Shield} title="Exam Security" desc="Locked papers are watermarked and every download is tracked. Only approved users can generate or view papers." color="indigo" />

                                            <SaveBtn loading={saving} onClick={() => save("assessments", assess)} />
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* ──────────── 11. CONNECTIONS (INTEGRATIONS) ──────────── */}
                                <TabsContent value="integrations" className="m-0 space-y-6">
                                    <Header title="Connections" desc="Link M-PESA, printers, and other tools." />
                                    <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-xl">
                                        <CardContent className="p-8 space-y-8">
                                            {[
                                                { name: "M-PESA", desc: "Receive fee payments through M-PESA", icon: Wallet, color: "emerald", connected: !!integrations.mpesaConfig?.shortCode },
                                                { name: "eTIMS (KRA)", desc: "Tax invoice integration with KRA", icon: FileEdit, color: "blue", connected: false },
                                                { name: "Printer", desc: "Connect your receipt printer", icon: Database, color: "amber", connected: false },
                                                { name: "Webhooks", desc: "Send event data to other systems", icon: Wifi, color: "violet", connected: false },
                                            ].map(item => (
                                                <div key={item.name} className="flex items-center gap-5 p-5 rounded-2xl bg-muted/20 border border-border/30 hover:border-primary/20 transition-colors">
                                                    <div className={`w-12 h-12 rounded-2xl bg-${item.color}-500/10 flex items-center justify-center text-${item.color}-500 shrink-0`}>
                                                        <item.icon className="w-6 h-6" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-black">{item.name}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                                                    </div>
                                                    <Badge variant="outline" className={`text-[9px] font-black uppercase ${item.connected ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'} border-none`}>
                                                        {item.connected ? "Connected" : "Not Set Up"}
                                                    </Badge>
                                                    <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold">
                                                        {item.connected ? "Edit" : "Set Up"}
                                                    </Button>
                                                </div>
                                            ))}

                                            <SaveBtn loading={saving} onClick={() => save("integrations", integrations)} />
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* ──────────── 12. COLORS & LOGO (BRANDING) ──────────── */}
                                <TabsContent value="branding" className="m-0 space-y-6">
                                    <Header title="Colors & Logo" desc="Change how your school portal looks." />
                                    <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-xl">
                                        <CardContent className="p-8 space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">Main Color</Label>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 rounded-2xl shadow-xl border-4 border-white" style={{ backgroundColor: brand.primaryColor || "#3b82f6" }} />
                                                        <Input className="font-mono font-bold rounded-xl h-12 bg-muted/50 border-0" value={brand.primaryColor || "#3b82f6"} onChange={e => setBrand({ ...brand, primaryColor: e.target.value })} />
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">Second Color</Label>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 rounded-2xl shadow-xl border-4 border-white" style={{ backgroundColor: brand.secondaryColor || "#10b981" }} />
                                                        <Input className="font-mono font-bold rounded-xl h-12 bg-muted/50 border-0" value={brand.secondaryColor || "#10b981"} onChange={e => setBrand({ ...brand, secondaryColor: e.target.value })} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-dashed border-border/40">
                                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1 mb-4 block">Portal Theme</Label>
                                                <div className="flex gap-4">
                                                    <button
                                                        onClick={() => setBrand({ ...brand, portalTheme: "light" })}
                                                        className={`flex-1 rounded-2xl h-16 font-black text-sm border-2 transition-all ${brand.portalTheme !== "dark" ? "border-primary bg-primary/5 text-primary" : "border-border/50 bg-white text-foreground"}`}
                                                    >
                                                        <span className="inline-flex items-center gap-2"><Sun className="w-4 h-4" />Light Mode</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setBrand({ ...brand, portalTheme: "dark" })}
                                                        className={`flex-1 rounded-2xl h-16 font-black text-sm border-2 transition-all ${brand.portalTheme === "dark" ? "border-primary bg-slate-900 text-white" : "border-border/50 bg-slate-900 text-white/60"}`}
                                                    >
                                                        <span className="inline-flex items-center gap-2"><Moon className="w-4 h-4" />Dark Mode</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-8 rounded-3xl bg-muted/20 border border-dashed border-border flex flex-col items-center justify-center gap-3 text-center">
                                                <Smartphone className="w-10 h-10 text-muted-foreground/30" />
                                                <p className="font-black text-sm">Preview</p>
                                                <p className="text-xs text-muted-foreground">See how your colors look on student and parent screens.</p>
                                            </div>

                                            <SaveBtn loading={saving} onClick={() => save("brand", brand)} />
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* ──────────── 13. DATA & PRIVACY ──────────── */}
                                <TabsContent value="privacy" className="m-0 space-y-6">
                                    <Header title="Data & Privacy" desc="Control how long data is kept and who can see it." />
                                    <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-xl">
                                        <CardContent className="p-8 space-y-8">
                                            <NumberField label="Keep Records For (days)" value={privacy.dataRetention || 365} onChange={v => setPrivacy({ ...privacy, dataRetention: v })} icon={Database} />

                                            <div className="pt-6 border-t border-dashed border-border/40">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Privacy Settings</h4>
                                                <div className="space-y-3">
                                                    <ToggleRow label="Keep Activity Logs" desc="Record who does what in the system" checked={privacy.enableAuditLogs !== false}
                                                        onChange={v => setPrivacy({ ...privacy, enableAuditLogs: v })} />
                                                    <ToggleRow label="Get Parent Permission" desc="Ask parents to agree before using student photos" checked={privacy.consentSettings?.photoConsent === true}
                                                        onChange={v => setPrivacy({ ...privacy, consentSettings: { ...privacy.consentSettings, photoConsent: v } })} />
                                                    <ToggleRow label="Hide Student Phone Numbers" desc="Don't show student contacts to everyone" checked={privacy.consentSettings?.hidePhone === true}
                                                        onChange={v => setPrivacy({ ...privacy, consentSettings: { ...privacy.consentSettings, hidePhone: v } })} />
                                                </div>
                                            </div>

                                            <InfoBox icon={Shield} title="Data Safety" desc="All your data is encrypted and stored safely. Only your school can see it." color="emerald" />

                                            <SaveBtn loading={saving} onClick={() => save("privacy", privacy)} />
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* ──────────── 14. MY PLAN (SUBSCRIPTION) ──────────── */}
                                <TabsContent value="subscription" className="m-0 space-y-6">
                                    <Header title="My Plan" desc="See your ShuleCloud plan and what you can use." />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Card className="border-0 shadow-soft bg-primary text-primary-foreground p-8 rounded-3xl overflow-hidden relative group">
                                            <CreditCard className="absolute top-[-20px] right-[-20px] w-40 h-40 opacity-10 group-hover:rotate-12 transition-transform duration-700" />
                                            <div className="relative z-10 space-y-5">
                                                <Badge className="bg-white/20 text-white border-none py-1 px-4 text-[10px] font-black uppercase tracking-widest">Current Plan</Badge>
                                                <h2 className="text-3xl font-black tracking-tight">{settings?.subscription?.plan?.name || "Free Trial"}</h2>
                                                <div className="space-y-2.5">
                                                    <PlanRow text={`${settings?.subscription?.studentsCount || 0} students enrolled`} />
                                                    <PlanRow text={`${settings?.subscription?.staffCount || 0} staff members`} />
                                                    <PlanRow text={settings?.subscription?.plan?.description || "Basic features"} />
                                                </div>
                                                <div className="pt-5 border-t border-white/10">
                                                    <p className="text-xs font-bold opacity-70">
                                                        {settings?.subscription?.currentPeriodEnd
                                                            ? `Renews ${new Date(settings.subscription.currentPeriodEnd).toLocaleDateString()}`
                                                            : "No billing date set"
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        </Card>

                                        <Card className="border-0 shadow-soft bg-background/60 backdrop-blur-xl p-8 rounded-3xl flex flex-col justify-between gap-6">
                                            <div>
                                                <h3 className="text-lg font-black">Quick Actions</h3>
                                                <p className="text-sm text-muted-foreground">Manage your billing and receipts.</p>
                                            </div>
                                            <div className="space-y-3">
                                                <Button variant="outline" className="w-full h-12 rounded-2xl font-bold border-border/50">Download Last Receipt</Button>
                                                <Button variant="outline" className="w-full h-12 rounded-2xl font-bold border-border/50">Change Payment Method</Button>
                                                <Button className="w-full h-14 rounded-2xl font-black bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200">Upgrade Plan</Button>
                                            </div>
                                        </Card>
                                    </div>
                                </TabsContent>

                            </motion.div>
                        </AnimatePresence>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}

/* ────────── Small Helper Components ────────── */

function Header({ title, desc }: { title: string; desc: string }) {
    return (
        <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight">{title}</h2>
            <p className="text-muted-foreground text-sm">{desc}</p>
        </div>
    );
}

function Field({ label, value, icon: Icon, placeholder, onChange }: { label: string; value?: string; icon?: any; placeholder?: string; onChange?: (v: string) => void }) {
    return (
        <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">{label}</Label>
            <div className="relative group">
                {Icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"><Icon className="w-4 h-4" /></div>}
                <Input
                    defaultValue={value || ""}
                    placeholder={placeholder}
                    onChange={e => onChange?.(e.target.value)}
                    className={`${Icon ? "pl-11" : ""} h-12 rounded-2xl bg-muted/50 border-0 focus-visible:ring-primary shadow-none font-bold`}
                />
            </div>
        </div>
    );
}

function NumberField({ label, value, icon: Icon, onChange }: { label: string; value: number; icon?: any; onChange?: (v: number) => void }) {
    return (
        <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">{label}</Label>
            <div className="relative group">
                {Icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"><Icon className="w-4 h-4" /></div>}
                <Input
                    type="number"
                    defaultValue={value}
                    onChange={e => onChange?.(parseInt(e.target.value) || 0)}
                    className={`${Icon ? "pl-11" : ""} h-12 rounded-2xl bg-muted/50 border-0 focus-visible:ring-primary shadow-none font-bold`}
                />
            </div>
        </div>
    );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
    return (
        <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="h-12 rounded-2xl bg-muted/50 border-0 font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>
                    {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
    );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc?: string; checked?: boolean; onChange?: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/20 hover:border-border/40 transition-colors">
            <div className="pr-4">
                <p className="text-sm font-bold">{label}</p>
                {desc && <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>}
            </div>
            <Switch checked={checked} onCheckedChange={onChange} />
        </div>
    );
}

function InfoBox({ icon: Icon, title, desc, color }: { icon: any; title: string; desc: string; color: string }) {
    const colors: Record<string, string> = {
        indigo: "bg-indigo-50 border-indigo-100/50 text-indigo-600",
        violet: "bg-violet-50 border-violet-100/50 text-violet-600",
        emerald: "bg-emerald-50 border-emerald-100/50 text-emerald-600",
        amber: "bg-amber-50 border-amber-100/50 text-amber-600",
    };
    const c = colors[color] || colors.indigo;

    return (
        <div className={`p-5 rounded-2xl border flex items-start gap-4 ${c}`}>
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-sm font-black">{title}</p>
                <p className="text-xs mt-1 opacity-80">{desc}</p>
            </div>
        </div>
    );
}

function SaveBtn({ loading, onClick, label }: { loading?: boolean; onClick: () => void; label?: string }) {
    return (
        <Button onClick={onClick} disabled={loading} className="w-full h-14 rounded-2xl font-black gap-2 shadow-xl shadow-primary/20">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {label || "Save Changes"}
        </Button>
    );
}

function PlanRow({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-2 text-sm font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{text}</span>
        </div>
    );
}
