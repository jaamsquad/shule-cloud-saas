import React from 'react';

// Components
export { default as WeeklyGridTimetable } from './components/WeeklyGridTimetable';
export { default as ClassSelector } from './components/ClassSelector';
export { default as TeacherSelector } from './components/TeacherSelector';
export { default as RoomSelector } from './components/RoomSelector';
export { default as ConflictWarningCards } from './components/ConflictWarningCards';
export { default as ScheduleBuilderForm } from './components/ScheduleBuilderForm';
export { default as SubstitutionForm } from './components/SubstitutionForm';
export { default as PrintableTimetableCard } from './components/PrintableTimetableCard';
export { default as ExamScheduleTable } from './components/ExamScheduleTable';
export { default as FiltersToolbar } from './components/FiltersToolbar';

// Pages
import TimetableDashboard from './pages/TimetableDashboard';
import ClassTimetable from './pages/ClassTimetable';
import TeacherTimetable from './pages/TeacherTimetable';
import RoomTimetable from './pages/RoomTimetable';
import ExamTimetable from './pages/ExamTimetable';
import TimetableBuilder from './pages/TimetableBuilder';
import TimetableConflicts from './pages/TimetableConflicts';
import SubstitutionReplacementSchedule from './pages/SubstitutionReplacementSchedule';
import TimetablePrintView from './pages/TimetablePrintView';
import TimetableSettings from './pages/TimetableSettings';

export {
  TimetableDashboard,
  ClassTimetable,
  TeacherTimetable,
  RoomTimetable,
  ExamTimetable,
  TimetableBuilder,
  TimetableConflicts,
  SubstitutionReplacementSchedule,
  TimetablePrintView,
  TimetableSettings
};

// Services
export * from './services';

// Data
export * from './data';

// Types
export * from './types';

// Routes config
export const timetableRoutes = [
  { path: 'dashboard', element: React.createElement(TimetableDashboard) },
  { path: 'class', element: React.createElement(ClassTimetable) },
  { path: 'teacher', element: React.createElement(TeacherTimetable) },
  { path: 'room', element: React.createElement(RoomTimetable) },
  { path: 'exam', element: React.createElement(ExamTimetable) },
  { path: 'builder', element: React.createElement(TimetableBuilder) },
  { path: 'conflicts', element: React.createElement(TimetableConflicts) },
  { path: 'substitution', element: React.createElement(SubstitutionReplacementSchedule) },
  { path: 'print', element: React.createElement(TimetablePrintView) },
  { path: 'settings', element: React.createElement(TimetableSettings) },
];