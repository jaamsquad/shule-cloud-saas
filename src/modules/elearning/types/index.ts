export interface Course {
  id: string
  title: string
  subject: string
  className: string
  teacher: string
  description?: string
  progress?: number
}

export interface Lesson {
  id: string
  courseId: string
  title: string
  contentType: 'video' | 'document' | 'quiz' | 'other'
  durationMinutes?: number
  summary?: string
}

export interface Assignment {
  id: string
  courseId: string
  title: string
  dueDate: string
  totalMarks?: number
}

export interface Submission {
  id: string
  assignmentId: string
  studentName: string
  submittedAt?: string
  status: 'pending' | 'graded' | 'late'
  marks?: number
}

export interface Quiz {
  id: string
  courseId: string
  title: string
  durationMinutes: number
  attemptsAllowed?: number
}

export interface DiscussionThread {
  id: string
  courseId?: string
  title: string
  author: string
  replies: number
  lastActivityAt: string
}

export interface ProgressSnapshot {
  courseId: string
  completedPercent: number
}

export interface LiveSession {
  id: string
  title: string
  courseId?: string
  teacher: string
  sessionDate: string
  meetingLink?: string
}
export interface Course {
  id: string;
  title: string;
  subject: string;
  className: string;
  teacher: string;
  description?: string;
  progress?: number; // 0-100
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  contentType: 'video' | 'article' | 'pdf' | 'quiz' | 'other';
  durationMinutes?: number;
  resources?: string[];
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  dueDate?: string; // ISO
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentName: string;
  submittedAt?: string;
  status: 'pending' | 'graded' | 'late' | 'missing';
  marks?: number | null;
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  durationMinutes?: number;
  attemptsAllowed?: number;
}

export interface DiscussionThread {
  id: string;
  courseId: string;
  title: string;
  author: string;
  posts: Array<{ id: string; author: string; body: string; createdAt: string }>;
}

export interface LiveSession {
  id: string;
  courseId: string;
  title: string;
  sessionDate: string; // ISO
  meetingLink?: string;
}
