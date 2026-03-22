import React, { useEffect, useState } from 'react';
import ExamScheduleTable from '../components/ExamScheduleTable';
import { getExamTimetableEntries } from '../services';
import { ExamTimetableEntry } from '../types';

const ExamTimetable: React.FC = () => {
  const [exams, setExams] = useState<ExamTimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      const data = await getExamTimetableEntries();
      setExams(data);
      setLoading(false);
    };
    fetchExams();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Exam Timetable</h1>
      <ExamScheduleTable exams={exams} />
    </div>
  );
};

export default ExamTimetable;