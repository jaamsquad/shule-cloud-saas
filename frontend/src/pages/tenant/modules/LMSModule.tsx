import { useState } from "react";
import { Search, Plus, BookOpen, Users, FileText, Award } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const courses = [
  { id: 1, title: "Mathematics Grade 8", subject: "Mathematics", class: "Grade 8", teacher: "Mr. Ochieng", students: 42, modules: 8, completion: 65, status: "Published" },
  { id: 2, title: "English Language Grade 7", subject: "English", class: "Grade 7", teacher: "Ms. Njeri", students: 45, modules: 10, completion: 40, status: "Published" },
  { id: 3, title: "Science & Technology Grade 9", subject: "Science", class: "Grade 9", teacher: "Dr. Kamau", students: 38, modules: 12, completion: 25, status: "Published" },
  { id: 4, title: "Kiswahili Grade 8", subject: "Kiswahili", class: "Grade 8", teacher: "Mr. Wafula", students: 42, modules: 6, completion: 80, status: "Published" },
  { id: 5, title: "Social Studies Grade 7", subject: "Social Studies", class: "Grade 7", teacher: "Ms. Akinyi", students: 45, modules: 5, completion: 0, status: "Draft" },
];

const assignments = [
  { id: 1, title: "Algebra Practice Set 3", course: "Mathematics Grade 8", due: "2026-03-05", submissions: 38, total: 42, graded: 30 },
  { id: 2, title: "Essay: My Community", course: "English Language Grade 7", due: "2026-03-03", submissions: 40, total: 45, graded: 40 },
  { id: 3, title: "Lab Report: Photosynthesis", course: "Science & Technology Grade 9", due: "2026-03-07", submissions: 15, total: 38, graded: 0 },
];

export default function LMSModule() {
  const [search, setSearch] = useState("");

  return (
    <>
      <AppHeader title="Learning Management" subtitle="Courses, lessons, assignments and quizzes" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><BookOpen className="w-8 h-8 text-primary" /><div><p className="text-2xl font-bold">5</p><p className="text-xs text-muted-foreground">Courses</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><FileText className="w-8 h-8 text-info" /><div><p className="text-2xl font-bold">41</p><p className="text-xs text-muted-foreground">Total Lessons</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="w-8 h-8 text-success" /><div><p className="text-2xl font-bold">212</p><p className="text-xs text-muted-foreground">Enrolled Students</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Award className="w-8 h-8 text-secondary" /><div><p className="text-2xl font-bold">3</p><p className="text-xs text-muted-foreground">Active Assignments</p></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="courses">
          <TabsList><TabsTrigger value="courses">Courses</TabsTrigger><TabsTrigger value="assignments">Assignments</TabsTrigger></TabsList>

          <TabsContent value="courses" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="relative w-80"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" /></div>
              <Button size="sm"><Plus className="w-4 h-4 mr-1.5" />Create Course</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map(c => (
                <Card key={c.id} className="shadow-card hover:shadow-card-hover transition-all cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={c.status === "Published" ? "default" : "secondary"} className="text-xs">{c.status}</Badge>
                      <span className="text-xs text-muted-foreground">{c.modules} modules</span>
                    </div>
                    <CardTitle className="text-base mt-2">{c.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{c.teacher} · {c.class}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{c.students} students</span>
                      <span>{c.completion}% complete</span>
                    </div>
                    <Progress value={c.completion} className="h-1.5" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-4">
            {assignments.map(a => (
              <Card key={a.id} className="shadow-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.course} · Due: {a.due}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{a.submissions}/{a.total}</p>
                      <p className="text-xs text-muted-foreground">submitted</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{a.graded}/{a.submissions}</p>
                      <p className="text-xs text-muted-foreground">graded</p>
                    </div>
                    <Button variant="outline" size="sm">Review</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
