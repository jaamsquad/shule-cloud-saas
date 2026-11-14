// The printed report cards (frontend) and the portals (server) must compute the same
// totals and grades. Runs both copies of lib/reportCardCalc on the same learners.
//   cd frontend && npx tsx scripts/check-report-calc.ts
import * as web from "../src/lib/reportCardCalc";
import * as server from "../../backend/src/lib/reportCardCalc";

const scale = [{ grade: "EE", min: 80, max: 100, label: "Exceeding" }, { grade: "ME", min: 50, max: 79, label: "Meeting" }, { grade: "AE", min: 30, max: 49 }, { grade: "BE", min: 0, max: 29, label: "Below" }];
const m = (subjectName: string, marksObtained: any, totalMarks = 100) => ({ subjectName, marksObtained, totalMarks });
const cases = [
    { studentMarks: [m("Maths", 78), m("English", 64), m("Science", 91)], ownSubjects: ["Maths", "English", "Science", "Kiswahili"], classSubjectNames: [], missingMarkPolicy: "skip", scale, passMark: 50 },
    { studentMarks: [m("Maths", 78), m("English", 64)], ownSubjects: [], classSubjectNames: ["Maths", "English", "CRE"], missingMarkPolicy: "count_as_zero", scale, passMark: 50 },
    { studentMarks: [m("Maths", 40, 50), m("English", 12, 50)], ownSubjects: [{ name: "Maths" }, { subjectName: "English" }], classSubjectNames: [], missingMarkPolicy: "skip", scale: [], passMark: 40 },
    { studentMarks: [], ownSubjects: [], classSubjectNames: [], missingMarkPolicy: undefined, scale, passMark: 50 },
    { studentMarks: [m("Art", "")], ownSubjects: [], classSubjectNames: [], missingMarkPolicy: "skip", scale: [], passMark: 50 },
];
let bad = 0;
cases.forEach((c, i) => {
    const a = JSON.stringify(web.summariseStudent(c as any)), b = JSON.stringify(server.summariseStudent(c as any));
    if (a !== b) { bad++; console.error(`✗ case ${i + 1} differs\n  web:    ${a}\n  server: ${b}`); }
});
const marks = cases.flatMap(c => c.studentMarks);
if (JSON.stringify(web.classStatsOf(marks)) !== JSON.stringify(server.classStatsOf(marks))) { bad++; console.error("✗ class stats differ"); }
for (let p = 0; p <= 100; p += 7) if (web.gradeFor(scale, p) !== server.gradeFor(scale, p) || web.statusFor([], 50, p) !== server.statusFor([], 50, p)) { bad++; console.error(`✗ grade at ${p}%`); }
const g1 = JSON.stringify(web.gradingFrom({ gradingScale: scale, passMark: 45 }, null)), g2 = JSON.stringify(server.gradingFrom({ gradingScale: scale, passMark: 45 }, null));
if (g1 !== g2) { bad++; console.error("✗ grading scale differs"); }
const s = web.summariseStudent(cases[0] as any);
console.log(`case 1: ${s.obtained}/${s.maxAll} → ${s.pct}% ${s.grade} (${s.status}); ${s.marks.length} subjects, Kiswahili blank: ${s.marks[3].noMarks}`);
if (bad) { console.error(`${bad} difference(s)`); process.exit(1); }
console.log(`✓ printed report cards and portals compute the same (${cases.length} learners)`);
