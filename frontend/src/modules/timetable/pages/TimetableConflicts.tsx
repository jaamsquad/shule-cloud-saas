import React, { useEffect, useState } from 'react';
import ConflictWarningCards from '../components/ConflictWarningCards';
import { getConflicts } from '../services';
import { Conflict } from '../types';

const TimetableConflicts: React.FC = () => {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConflicts = async () => {
      const data = await getConflicts();
      setConflicts(data);
      setLoading(false);
    };
    fetchConflicts();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Timetable Conflicts</h1>
      {conflicts.length > 0 ? (
        <ConflictWarningCards conflicts={conflicts} />
      ) : (
        <p>No conflicts found.</p>
      )}
    </div>
  );
};

export default TimetableConflicts;