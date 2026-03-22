import React, { useEffect, useState } from 'react';
import { Fine } from '../types';
import { LibraryService } from '../services/libraryService';
import { FinesTable } from '../components/FinesTable';

export const Fines = () => {
  const [fines, setFines] = useState<Fine[]>([]);

  useEffect(() => {
    LibraryService.getFines().then(setFines);
  }, []);

  const handleMarkPaid = (id: string) => {
    setFines(fines.map(f => f.id === id ? { ...f, status: 'Paid' } : f));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Fines & Penalties</h1>
        <p className="text-gray-500">Manage all outstanding and paid library user fines.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <FinesTable fines={fines} onMarkPaid={handleMarkPaid} />
      </div>
    </div>
  );
};
