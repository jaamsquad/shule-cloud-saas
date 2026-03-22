import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExamTimetableEntry } from '../types';

interface ExamScheduleTableProps {
  exams: ExamTimetableEntry[];
}

const ExamScheduleTable: React.FC<ExamScheduleTableProps> = ({ exams }) => (
  <Card>
    <CardHeader>
      <CardTitle>Exam Schedule</CardTitle>
    </CardHeader>
    <CardContent>
      <table className="w-full border-collapse border border-gray-300 text-sm">
        <thead>
          <tr>
            <th className="border border-gray-300 p-2 bg-gray-100">Subject</th>
            <th className="border border-gray-300 p-2 bg-gray-100">Class</th>
            <th className="border border-gray-300 p-2 bg-gray-100">Date</th>
            <th className="border border-gray-300 p-2 bg-gray-100">Time</th>
            <th className="border border-gray-300 p-2 bg-gray-100">Room</th>
            <th className="border border-gray-300 p-2 bg-gray-100">Invigilator</th>
          </tr>
        </thead>
        <tbody>
          {exams.map(exam => (
            <tr key={exam.id}>
              <td className="border border-gray-300 p-2">{exam.subject}</td>
              <td className="border border-gray-300 p-2">{exam.className}</td>
              <td className="border border-gray-300 p-2">{exam.date}</td>
              <td className="border border-gray-300 p-2">{exam.startTime} - {exam.endTime}</td>
              <td className="border border-gray-300 p-2">{exam.room}</td>
              <td className="border border-gray-300 p-2">{exam.invigilator}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent>
  </Card>
);

export default ExamScheduleTable;