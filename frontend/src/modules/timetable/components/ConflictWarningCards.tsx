import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { Conflict } from '../types';

interface ConflictWarningCardsProps {
  conflicts: Conflict[];
}

const ConflictWarningCards: React.FC<ConflictWarningCardsProps> = ({ conflicts }) => (
  <div className="space-y-4">
    {conflicts.map(conflict => (
      <Card key={conflict.id} className="border-red-500 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center text-red-700">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Timetable Conflict
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{conflict.reason}</p>
          <p className="text-sm text-gray-600">Affected entries: {conflict.affectedEntries.join(', ')}</p>
        </CardContent>
      </Card>
    ))}
  </div>
);

export default ConflictWarningCards;