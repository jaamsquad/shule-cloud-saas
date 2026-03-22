import React from 'react';
import { Fine } from '../types';
import { Receipt } from 'lucide-react';

interface FinesTableProps {
  fines: Fine[];
  onMarkPaid?: (fineId: string) => void;
}

export const FinesTable: React.FC<FinesTableProps> = ({ fines, onMarkPaid }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-gray-600">
        <thead className="bg-gray-50 text-gray-900 font-medium">
          <tr>
            <th className="px-6 py-4">Borrower ID</th>
            <th className="px-6 py-4">Reason</th>
            <th className="px-6 py-4">Date Added</th>
            <th className="px-6 py-4">Amount</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {fines.map((fine) => (
            <tr key={fine.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-4 font-medium text-gray-900">{fine.borrowerId}</td>
              <td className="px-6 py-4">{fine.reason}</td>
              <td className="px-6 py-4 text-gray-500">{fine.date}</td>
              <td className="px-6 py-4 font-semibold text-gray-900">${fine.amount.toFixed(2)}</td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  fine.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  {fine.status}
                </span>
              </td>
              <td className="px-6 py-4 text-center">
                {fine.status === 'Unpaid' && (
                  <button 
                    onClick={() => onMarkPaid && onMarkPaid(fine.id)}
                    className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-1 font-medium transition-colors"
                  >
                    <Receipt size={16} /> Mark Paid
                  </button>
                )}
              </td>
            </tr>
          ))}
          {fines.length === 0 && (
            <tr>
               <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                 No fines currently exist.
               </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
