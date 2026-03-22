import { TimetableEntry, ExamTimetableEntry, Conflict, Substitution, TimetableSettings } from '../types';

export const mockTimetableEntries: TimetableEntry[] = [
  {
    id: '1',
    className: 'Grade 10',
    stream: 'A',
    subject: 'Mathematics',
    teacher: 'Mr. Smith',
    room: 'Room 101',
    day: 'Monday',
    startTime: '08:00',
    endTime: '09:00',
    lessonType: 'Regular',
  },
  {
    id: '2',
    className: 'Grade 10',
    stream: 'A',
    subject: 'English',
    teacher: 'Ms. Johnson',
    room: 'Room 102',
    day: 'Monday',
    startTime: '09:00',
    endTime: '10:00',
    lessonType: 'Regular',
  },
  {
    id: '3',
    className: 'Grade 10',
    stream: 'A',
    subject: 'Science',
    teacher: 'Dr. Brown',
    room: 'Lab 1',
    day: 'Monday',
    startTime: '10:00',
    endTime: '11:00',
    lessonType: 'Practical',
  },
  // Add more entries for other days and classes
  {
    id: '4',
    className: 'Grade 11',
    stream: 'B',
    subject: 'History',
    teacher: 'Mrs. Davis',
    room: 'Room 201',
    day: 'Tuesday',
    startTime: '08:00',
    endTime: '09:00',
    lessonType: 'Regular',
  },
];

export const mockExamTimetableEntries: ExamTimetableEntry[] = [
  {
    id: '1',
    subject: 'Mathematics',
    className: 'Grade 10',
    date: '2026-03-25',
    startTime: '09:00',
    endTime: '12:00',
    room: 'Hall A',
    invigilator: 'Mr. Smith',
  },
  {
    id: '2',
    subject: 'English',
    className: 'Grade 10',
    date: '2026-03-26',
    startTime: '09:00',
    endTime: '12:00',
    room: 'Hall B',
    invigilator: 'Ms. Johnson',
  },
];

export const mockConflicts: Conflict[] = [
  {
    id: '1',
    reason: 'Teacher double-booked',
    affectedEntries: ['1', '4'],
  },
];

export const mockSubstitutions: Substitution[] = [
  {
    id: '1',
    originalTeacher: 'Mr. Smith',
    replacementTeacher: 'Ms. Lee',
    date: '2026-03-22',
    period: '1st Period',
    subject: 'Mathematics',
    className: 'Grade 10',
  },
];

export const mockTimetableSettings: TimetableSettings = {
  schoolStartTime: '08:00',
  schoolEndTime: '15:00',
  breakTimes: [
    { start: '10:00', end: '10:15' },
    { start: '12:00', end: '13:00' },
  ],
  periodsPerDay: 7,
};