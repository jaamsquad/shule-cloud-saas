import { who } from "@/lib/who";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, Download,
  User, Users, UserCheck, BookOpen, ClipboardCheck,
  CreditCard, AlertTriangle, Library, Heart, FileText
} from "lucide-react";
import { Link } from "react-router-dom";

const student = {
  name: "Amani Wanjiku",
  admNo: "ADM-2024-0042",
  class: "Grade 8 East",
  dob: "2011-03-15",
  gender: "Female",
  status: "Active",
  house: "Eagle",
  boarder: "Day Scholar",
  email: "guardian@example.com",
  phone: "+254 712 345 678",
  address: "Nairobi, Kenya",
  admissionDate: "2022-01-10",
};

const guardians = [
  { name: "Jane Wanjiku", relation: "Mother", phone: "+254 712 345 678", email: "jane@example.com", primary: true },
  { name: "Peter Kamau", relation: "Father", phone: "+254 723 456 789", email: "peter@example.com", primary: false },
];

const attendanceData = [
  { month: "Jan", present: 20, absent: 2, late: 1 },
  { month: "Feb", present: 18, absent: 1, late: 2 },
  { month: "Mar", present: 21, absent: 0, late: 1 },
];

const academicData = [
  { area: "Mathematics", strand: "Numbers", level: "Exceeding", score: 92 },
  { area: "English", strand: "Reading", level: "Meeting", score: 78 },
  { area: "Kiswahili", strand: "Kusoma", level: "Meeting", score: 80 },
  { area: "Science & Tech", strand: "Living Things", level: "Approaching", score: 65 },
  { area: "Social Studies", strand: "Citizenship", level: "Exceeding", score: 88 },
];

const assessments = [
  { name: "CAT 1 - Mathematics", date: "2024-02-10", score: "45/50", grade: "A", status: "Published" },
  { name: "CAT 1 - English", date: "2024-02-12", score: "38/50", grade: "B+", status: "Published" },
  { name: "Mid-Term Exam", date: "2024-03-15", score: "420/500", grade: "A-", status: "Published" },
  { name: "CAT 2 - Science", date: "2024-04-05", score: "—", grade: "—", status: "Pending" },
];

const feeData = [
  { term: "Term 1 2024", amount: 45000, paid: 45000, balance: 0, status: "Paid" },
  { term: "Term 2 2024", amount: 45000, paid: 30000, balance: 15000, status: "Partial" },
  { term: "Term 3 2024", amount: 45000, paid: 0, balance: 45000, status: "Unpaid" },
];

const disciplineRecords = [
  { date: "2024-02-20", type: "Merit", points: 5, reason: "Excellence in science fair", by: "Mr. Ochieng" },
  { date: "2024-03-05", type: "Demerit", points: -2, reason: "Late to assembly", by: "Mrs. Akinyi" },
];

const libraryRecords = [
  { title: "Things Fall Apart", borrowed: "2024-03-01", due: "2024-03-15", status: "Returned" },
  { title: "The River Between", borrowed: "2024-03-10", due: "2024-03-24", status: "Borrowed" },
];

const clinicVisits = [
  { date: "2024-02-14", complaint: "Headache", treatment: "Paracetamol", nurse: "Sr. Mwangi" },
  { date: "2024-03-20", complaint: "Stomach ache", treatment: "Antacid + rest", nurse: "Sr. Mwangi" },
];

const documents = [
  { name: "Birth Certificate", uploaded: "2022-01-10", type: "PDF" },
  { name: "Previous Report Card", uploaded: "2022-01-10", type: "PDF" },
  { name: "Medical Form", uploaded: "2022-01-12", type: "PDF" },
  { name: "Passport Photo", uploaded: "2022-01-10", type: "Image" },
];

const levelColor = (level: string) => {
  switch (level) {
    case "Exceeding": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "Meeting": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "Approaching": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    default: return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  }
};

const tabIcons: Record<string, React.ElementType> = {
  overview: User, guardians: Users, attendance: UserCheck, academics: BookOpen,
  assessments: ClipboardCheck, fees: CreditCard, discipline: AlertTriangle,
  library: Library, clinic: Heart, documents: FileText,
};

export default function StudentProfile() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/students">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <Avatar className="h-16 w-16 border-2 border-primary">
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">AW</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-heading font-bold text-foreground">{student.name}</h1>
              <Badge variant="default">{student.status}</Badge>
              <Badge variant="outline">{student.boarder}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{student.admNo} · {student.class} · House: {student.house}</p>
          </div>
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />ID Card</Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {Object.entries(tabIcons).map(([key, Icon]) => (
              <TabsTrigger key={key} value={key} className="text-xs gap-1.5 capitalize">
                <Icon className="w-3.5 h-3.5" />{key}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" />DOB: {student.dob} · Gender: {student.gender}</div>
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" />{student.address}</div>
                  <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" />{student.email}</div>
                  <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" />{student.phone}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Quick Stats</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><p className="text-xs text-muted-foreground mb-1">Attendance Rate</p><Progress value={93} className="h-2" /><p className="text-xs text-right text-muted-foreground mt-1">93%</p></div>
                  <div><p className="text-xs text-muted-foreground mb-1">Academic Average</p><Progress value={81} className="h-2" /><p className="text-xs text-right text-muted-foreground mt-1">81%</p></div>
                  <div><p className="text-xs text-muted-foreground mb-1">Fee Payment</p><Progress value={56} className="h-2" /><p className="text-xs text-right text-muted-foreground mt-1">56%</p></div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Guardians */}
          <TabsContent value="guardians">
            <div className="grid md:grid-cols-2 gap-4">
              {guardians.map((g, i) => (
                <Card key={i}>
                  <CardContent className="pt-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{g.name}</h3>
                      {g.primary && <Badge>Primary</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{g.relation}</p>
                    <div className="flex items-center gap-2 text-sm"><Phone className="w-3.5 h-3.5" />{g.phone}</div>
                    <div className="flex items-center gap-2 text-sm"><Mail className="w-3.5 h-3.5" />{g.email}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Attendance */}
          <TabsContent value="attendance">
            <Card>
              <CardHeader><CardTitle className="text-base">Attendance Summary</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Month</TableHead><TableHead>Present</TableHead><TableHead>Absent</TableHead><TableHead>Late</TableHead><TableHead>Rate</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {attendanceData.map((r) => {
                      const total = r.present + r.absent + r.late;
                      const rate = Math.round((r.present / total) * 100);
                      return (
                        <TableRow key={r.month}>
                          <TableCell className="font-medium">{r.month}</TableCell>
                          <TableCell>{r.present}</TableCell>
                          <TableCell>{r.absent}</TableCell>
                          <TableCell>{r.late}</TableCell>
                          <TableCell><Badge variant={rate >= 90 ? "default" : "destructive"}>{rate}%</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Academics */}
          <TabsContent value="academics">
            <Card>
              <CardHeader><CardTitle className="text-base">CBC Competency Levels</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Learning Area</TableHead><TableHead>Strand</TableHead><TableHead>Level</TableHead><TableHead>Score</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {academicData.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.area}</TableCell>
                        <TableCell>{r.strand}</TableCell>
                        <TableCell><span className={`px-2 py-0.5 rounded text-xs font-medium ${levelColor(r.level)}`}>{r.level}</span></TableCell>
                        <TableCell>{r.score}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assessments */}
          <TabsContent value="assessments">
            <Card>
              <CardHeader><CardTitle className="text-base">Assessment History</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Assessment</TableHead><TableHead>Date</TableHead><TableHead>Score</TableHead><TableHead>Grade</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {assessments.map((a, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell>{a.date}</TableCell>
                        <TableCell>{a.score}</TableCell>
                        <TableCell>{a.grade}</TableCell>
                        <TableCell><Badge variant={a.status === "Published" ? "default" : "secondary"}>{a.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fees */}
          <TabsContent value="fees">
            <Card>
              <CardHeader><CardTitle className="text-base">Fee Statement</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Term</TableHead><TableHead>Amount (KES)</TableHead><TableHead>Paid</TableHead><TableHead>Balance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {feeData.map((f, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{f.term}</TableCell>
                        <TableCell>{(Number(f.amount) || 0).toLocaleString()}</TableCell>
                        <TableCell>{(Number(f.paid) || 0).toLocaleString()}</TableCell>
                        <TableCell>{(Number(f.balance) || 0).toLocaleString()}</TableCell>
                        <TableCell><Badge variant={f.status === "Paid" ? "default" : f.status === "Partial" ? "secondary" : "destructive"}>{f.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Discipline */}
          <TabsContent value="discipline">
            <Card>
              <CardHeader><CardTitle className="text-base">Discipline Records</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Points</TableHead><TableHead>Reason</TableHead><TableHead>Recorded By</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {disciplineRecords.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell>{d.date}</TableCell>
                        <TableCell><Badge variant={d.type === "Merit" ? "default" : "destructive"}>{d.type}</Badge></TableCell>
                        <TableCell className={d.points > 0 ? "text-green-600" : "text-red-600"}>{d.points > 0 ? `+${d.points}` : d.points}</TableCell>
                        <TableCell>{d.reason}</TableCell>
                        <TableCell>{who(d.by)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Library */}
          <TabsContent value="library">
            <Card>
              <CardHeader><CardTitle className="text-base">Library History</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Borrowed</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {libraryRecords.map((l, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{l.title}</TableCell>
                        <TableCell>{l.borrowed}</TableCell>
                        <TableCell>{l.due}</TableCell>
                        <TableCell><Badge variant={l.status === "Returned" ? "default" : "secondary"}>{l.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clinic */}
          <TabsContent value="clinic">
            <Card>
              <CardHeader><CardTitle className="text-base">Clinic Visits</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Complaint</TableHead><TableHead>Treatment</TableHead><TableHead>Nurse</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {clinicVisits.map((v, i) => (
                      <TableRow key={i}>
                        <TableCell>{v.date}</TableCell>
                        <TableCell>{v.complaint}</TableCell>
                        <TableCell>{v.treatment}</TableCell>
                        <TableCell>{v.nurse}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents */}
          <TabsContent value="documents">
            <Card>
              <CardHeader><CardTitle className="text-base">Uploaded Documents</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Uploaded</TableHead><TableHead>Type</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {documents.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell>{d.uploaded}</TableCell>
                        <TableCell><Badge variant="outline">{d.type}</Badge></TableCell>
                        <TableCell><Button variant="ghost" size="sm"><Download className="w-3.5 h-3.5" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
