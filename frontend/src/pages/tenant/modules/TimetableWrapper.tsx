import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import TimetableDashboard from '@/modules/timetable/pages/TimetableDashboard';
import ClassTimetable from '@/modules/timetable/pages/ClassTimetable';
import TeacherTimetable from '@/modules/timetable/pages/TeacherTimetable';
import RoomTimetable from '@/modules/timetable/pages/RoomTimetable';
import ExamTimetable from '@/modules/timetable/pages/ExamTimetable';
import TimetableBuilder from '@/modules/timetable/pages/TimetableBuilder';
import TimetableConflicts from '@/modules/timetable/pages/TimetableConflicts';
import SubstitutionReplacementSchedule from '@/modules/timetable/pages/SubstitutionReplacementSchedule';
import TimetablePrintView from '@/modules/timetable/pages/TimetablePrintView';
import TimetableSettings from '@/modules/timetable/pages/TimetableSettings';

const TimetableWrapper: React.FC = () => {
  return (
    <div className="flex flex-col h-full">
      <AppHeader title="Timetable Management" subtitle="View, create, and manage school timetables" />
      <div className="flex-1 overflow-auto px-6 py-6">
        <Routes>
          <Route index element={<TimetableDashboard />} />
          <Route path="dashboard" element={<TimetableDashboard />} />
          <Route path="class" element={<ClassTimetable />} />
          <Route path="teacher" element={<TeacherTimetable />} />
          <Route path="room" element={<RoomTimetable />} />
          <Route path="exam" element={<ExamTimetable />} />
          <Route path="builder" element={<TimetableBuilder />} />
          <Route path="conflicts" element={<TimetableConflicts />} />
          <Route path="substitution" element={<SubstitutionReplacementSchedule />} />
          <Route path="print" element={<TimetablePrintView />} />
          <Route path="settings" element={<TimetableSettings />} />
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default TimetableWrapper;