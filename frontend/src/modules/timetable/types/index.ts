export interface TimetableEntry {
  id: string;
  className: string;
  stream?: string;
  subject: string;
  teacher: string;
  room: string;
  day: string;
  startTime: string;
  endTime: string;
  lessonType: 'Regular' | 'Practical' | 'Remedial' | 'Exam';
}

export interface ExamTimetableEntry {
  id: string;
  subject: string;
  className: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  invigilator: string;
}

export interface Conflict {
  id: string;
  reason: string;
  affectedEntries: string[];
}

export interface Substitution {
  id: string;
  originalTeacher: string;
  replacementTeacher: string;
  date: string;
  period: string;
  subject: string;
  className: string;
}

export interface TimetableSettings {
  schoolStartTime: string;
  schoolEndTime: string;
  breakTimes: { start: string; end: string }[];
  periodsPerDay: number;
}