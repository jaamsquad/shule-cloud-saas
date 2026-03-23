import * as mock from '../data/mockData'
import type { Course, Lesson, Assignment, Submission, Quiz, DiscussionThread, ProgressSnapshot, LiveSession } from '../types'

const delay = <T,>(data: T, ms = 200) => new Promise<T>(res => setTimeout(() => res(data), ms))

export const fetchCourses = () => delay<Course[]>(mock.courses)
export const fetchLessons = (courseId?: string) => delay<Lesson[]>(courseId ? mock.lessons.filter(l => l.courseId === courseId) : mock.lessons)
export const fetchAssignments = (courseId?: string) => delay<Assignment[]>(courseId ? mock.assignments.filter(a => a.courseId === courseId) : mock.assignments)
export const fetchSubmissions = (assignmentId?: string) => delay<Submission[]>(assignmentId ? mock.submissions.filter(s => s.assignmentId === assignmentId) : mock.submissions)
export const fetchQuizzes = (courseId?: string) => delay<Quiz[]>(courseId ? mock.quizzes.filter(q => q.courseId === courseId) : mock.quizzes)
export const fetchThreads = (courseId?: string) => delay<DiscussionThread[]>(courseId ? mock.threads.filter(t => t.courseId === courseId) : mock.threads)
export const fetchProgress = () => delay<ProgressSnapshot[]>(mock.progressSnapshots)
export const fetchLiveSessions = (courseId?: string) => delay<LiveSession[]>(courseId ? mock.liveSessions.filter(s => s.courseId === courseId) : mock.liveSessions)

// Placeholder create/submit functions
export const submitAssignment = (assignmentId: string, payload: any) => delay({ success: true, assignmentId })
export const postThread = (thread: Partial<DiscussionThread>) => delay({ ...thread, id: `d${Date.now()}` })
