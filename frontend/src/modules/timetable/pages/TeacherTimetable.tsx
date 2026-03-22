import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import WeeklyGridTimetable from '../components/WeeklyGridTimetable';
import TeacherSelector from '../components/TeacherSelector';
import { getTimetableEntries } from '../services';
import { TimetableEntry } from '../types';

const TeacherTimetable: React.FC = () => {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<TimetableEntry[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEntries = async () => {
      const data = await getTimetableEntries();
      setEntries(data);
      setLoading(false);
    };
    fetchEntries();
  }, []);

  useEffect(() => {
    if (selectedTeacher) {
      setFilteredEntries(entries.filter(e => e.teacher === selectedTeacher));
    } else {
      setFilteredEntries(entries);
    }
  }, [selectedTeacher, entries]);

  const teachers = Array.from(new Set(entries.map(e => e.teacher)));

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Teacher Timetable</h1>

      <TeacherSelector
        value={selectedTeacher}
        onChange={setSelectedTeacher}
        teachers={teachers}
      />

      {selectedTeacher && (
        <Card>
          <CardHeader>
            <CardTitle>Timetable for {selectedTeacher}</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyGridTimetable entries={filteredEntries} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeacherTimetable;