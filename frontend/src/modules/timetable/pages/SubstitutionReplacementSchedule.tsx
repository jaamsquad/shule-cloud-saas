import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SubstitutionForm from '../components/SubstitutionForm';
import { getSubstitutions, createSubstitution } from '../services';
import { Substitution } from '../types';

const SubstitutionReplacementSchedule: React.FC = () => {
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubstitutions = async () => {
      const data = await getSubstitutions();
      setSubstitutions(data);
      setLoading(false);
    };
    fetchSubstitutions();
  }, []);

  const handleAddSubstitution = async (sub: Omit<Substitution, 'id'>) => {
    const newSub = await createSubstitution(sub);
    setSubstitutions([...substitutions, newSub]);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Substitution / Replacement Schedule</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Add New Substitution</CardTitle>
          </CardHeader>
          <CardContent>
            <SubstitutionForm onSubmit={handleAddSubstitution} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Substitutions</CardTitle>
          </CardHeader>
          <CardContent>
            {substitutions.length > 0 ? (
              <ul className="space-y-2">
                {substitutions.map(sub => (
                  <li key={sub.id} className="p-2 border rounded">
                    <p><strong>{sub.originalTeacher}</strong> → <strong>{sub.replacementTeacher}</strong></p>
                    <p>{sub.date} - {sub.period} - {sub.subject} ({sub.className})</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No substitutions scheduled.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubstitutionReplacementSchedule;