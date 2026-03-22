import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import WeeklyGridTimetable from '../components/WeeklyGridTimetable';
import ClassSelector from '../components/ClassSelector';
import FiltersToolbar from '../components/FiltersToolbar';
import { getTimetableEntries } from '../services';
import { TimetableEntry } from '../types';

const ClassTimetable: React.FC = () => {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<TimetableEntry[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
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
    if (selectedClass) {
      setFilteredEntries(entries.filter(e => e.className === selectedClass));
    } else {
      setFilteredEntries(entries);
    }
  }, [selectedClass, entries]);

  const classes = Array.from(new Set(entries.map(e => e.className)));

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Class Timetable</h1>

      <ClassSelector
        value={selectedClass}
        onChange={setSelectedClass}
        classes={classes}
      />

      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle>Timetable for {selectedClass}</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyGridTimetable entries={filteredEntries} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClassTimetable;