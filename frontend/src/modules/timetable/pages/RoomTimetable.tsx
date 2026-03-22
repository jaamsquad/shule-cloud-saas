import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import WeeklyGridTimetable from '../components/WeeklyGridTimetable';
import RoomSelector from '../components/RoomSelector';
import { getTimetableEntries } from '../services';
import { TimetableEntry } from '../types';

const RoomTimetable: React.FC = () => {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<TimetableEntry[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
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
    if (selectedRoom) {
      setFilteredEntries(entries.filter(e => e.room === selectedRoom));
    } else {
      setFilteredEntries(entries);
    }
  }, [selectedRoom, entries]);

  const rooms = Array.from(new Set(entries.map(e => e.room)));

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Room Timetable</h1>

      <RoomSelector
        value={selectedRoom}
        onChange={setSelectedRoom}
        rooms={rooms}
      />

      {selectedRoom && (
        <Card>
          <CardHeader>
            <CardTitle>Timetable for {selectedRoom}</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyGridTimetable entries={filteredEntries} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RoomTimetable;