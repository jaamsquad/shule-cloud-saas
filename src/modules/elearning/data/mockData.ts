import type { Course, Lesson, Assignment, Submission, Quiz, DiscussionThread, ProgressSnapshot, LiveSession } from '../types'

export const courses: Course[] = [
  { id: 'c1', title: 'Intro to Biology', subject: 'Biology', className: 'Form 2', teacher: 'Mrs. Achieng', description: 'Foundations of biology', progress: 42 },
  { id: 'c2', title: 'Basic Algebra', subject: 'Mathematics', className: 'Form 1', teacher: 'Mr. Otieno', description: 'Numbers, expressions and equations', progress: 78 },
]

export const lessons: Lesson[] = [
  { id: 'l1', courseId: 'c1', title: 'Cell Structure', contentType: 'video', durationMinutes: 12, summary: 'Overview of cells' },
  { id: 'l2', courseId: 'c1', title: 'Photosynthesis', contentType: 'document', durationMinutes: 8, summary: 'Light reactions' },
  { id: 'l3', courseId: 'c2', title: 'Linear Equations', contentType: 'video', durationMinutes: 15, summary: 'Solving equations' },
]

export const assignments: Assignment[] = [
  { id: 'a1', courseId: 'c1', title: 'Cell Model Project', dueDate: '2026-04-10', totalMarks: 50 },
  { id: 'a2', courseId: 'c2', title: 'Algebra Worksheet 1', dueDate: '2026-04-03', totalMarks: 20 },
]

export const submissions: Submission[] = [
  { id: 's1', assignmentId: 'a1', studentName: 'Jane Doe', submittedAt: '2026-03-20T10:00:00Z', status: 'graded', marks: 45 },
  { id: 's2', assignmentId: 'a2', studentName: 'John K', status: 'pending' },
]

export const quizzes: Quiz[] = [
  { id: 'q1', courseId: 'c1', title: 'Cells Quick Quiz', durationMinutes: 10, attemptsAllowed: 3 },
  { id: 'q2', courseId: 'c2', title: 'Algebra Basics', durationMinutes: 15, attemptsAllowed: 2 },
]

export const threads: DiscussionThread[] = [
  { id: 'd1', courseId: 'c1', title: 'Question about cell membrane', author: 'Student A', replies: 4, lastActivityAt: '2026-03-22T09:00:00Z' },
  { id: 'd2', courseId: 'c2', title: 'Homework clarification', author: 'Student B', replies: 1, lastActivityAt: '2026-03-21T12:00:00Z' },
]

export const progressSnapshots: ProgressSnapshot[] = [
  { courseId: 'c1', completedPercent: 42 },
  { courseId: 'c2', completedPercent: 78 },
]

export const liveSessions: LiveSession[] = [
  { id: 'ls1', title: 'Live: Photosynthesis Q&A', courseId: 'c1', teacher: 'Mrs. Achieng', sessionDate: '2026-03-27T14:00:00Z', meetingLink: 'https://meet.example/ls1' },
]
