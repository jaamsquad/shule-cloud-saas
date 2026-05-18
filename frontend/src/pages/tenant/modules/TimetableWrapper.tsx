import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';

import Weekdays from './Weekdays';
import TimePeriods from './TimePeriods';
import ClassRooms from './ClassRooms';
import CreateTimetable from './CreateTimetable';
import GenerateForClass from './GenerateForClass';
import GenerateForTeacher from './GenerateForTeacher';

const TimetableWrapper: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-[#f4f7f6]">
      <AppHeader title="Timetable Management" subtitle="Manage school schedules and automate class generation" />
      <div className="flex-1 overflow-auto p-6">
        <Routes>
          <Route index element={<Navigate to="weekdays" replace />} />
          <Route path="weekdays" element={<Weekdays />} />
          <Route path="periods" element={<TimePeriods />} />
          <Route path="rooms" element={<ClassRooms />} />
          <Route path="create" element={<CreateTimetable />} />
          <Route path="class" element={<GenerateForClass />} />
          <Route path="teacher" element={<GenerateForTeacher />} />
          <Route path="*" element={<Navigate to="weekdays" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default TimetableWrapper;