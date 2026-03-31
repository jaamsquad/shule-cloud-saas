import React, { useEffect, useState } from 'react';
import { Reservation } from '../types';
import { LibraryService } from '../services/libraryService';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export const Reservations = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const fetchReservations = () => {
    LibraryService.getReservations().then(setReservations);
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: Reservation['status']) => {
    try {
      await LibraryService.updateReservationStatus(id, newStatus);
      toast.success(`Reservation status updated to ${newStatus}`);
      fetchReservations();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Reservations Queue</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage book reservations and waiting lists.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">ID</th>
                <th className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">Book Accession</th>
                <th className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">Borrower ID</th>
                <th className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">Expiry Date</th>
                <th className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">Status</th>
                <th className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {reservations.map((res) => (
                <tr key={res.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 font-medium">{res.id}</td>
                  <td className="px-6 py-4">{res.bookId}</td>
                  <td className="px-6 py-4">{res.borrowerId}</td>
                  <td className="px-6 py-4">
                    {new Date(res.expiryDate).toLocaleDateString()}
                    <span className="text-xs text-gray-500 block">{new Date(res.expiryDate).toLocaleTimeString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                      res.status === 'Ready for pickup' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                      res.status === 'Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      res.status === 'Expired' || res.status === 'Cancelled' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    }`}>
                      {res.status === 'Pending' && <Clock size={12} className="mr-1"/>}
                      {res.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {res.status === 'Pending' && (
                      <button onClick={() => handleUpdateStatus(res.id, 'Ready for pickup')} className="text-indigo-600 hover:text-indigo-900 mr-3 text-sm font-medium">Mark Ready</button>
                    )}
                    {res.status === 'Ready for pickup' && (
                      <button onClick={() => handleUpdateStatus(res.id, 'Completed')} className="flex items-center justify-end text-emerald-600 hover:text-emerald-900 mr-3 text-sm font-medium"><CheckCircle size={16} className="mr-1"/> Complete</button>
                    )}
                    {res.status !== 'Cancelled' && res.status !== 'Completed' && (
                      <button onClick={() => handleUpdateStatus(res.id, 'Cancelled')} className="text-rose-600 hover:text-rose-900 text-sm font-medium"><XCircle size={16}/></button>
                    )}
                  </td>
                </tr>
              ))}
              {reservations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No reservations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
