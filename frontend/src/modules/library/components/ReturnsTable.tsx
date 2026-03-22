import React from 'react';
import { IssueRecord } from '../types';

interface ReturnsTableProps {
  issues: IssueRecord[];
}

export const ReturnsTable: React.FC<ReturnsTableProps> = ({ issues }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-gray-600">
        <thead className="bg-gray-50 text-gray-900 font-medium">
          <tr>
            <th className="px-6 py-4">Book ID</th>
            <th className="px-6 py-4">Borrower ID</th>
            <th className="px-6 py-4">Return Date</th>
            <th className="px-6 py-4">Fine Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {issues.map((issue) => (
            <tr key={issue.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-6 py-4 font-medium text-gray-900">{issue.bookId}</td>
              <td className="px-6 py-4">{issue.borrowerId}</td>
              <td className="px-6 py-4">{issue.returnDate || '-'}</td>
              <td className="px-6 py-4 text-emerald-600">${issue.fineAmount.toFixed(2)}</td>
            </tr>
          ))}
          {issues.length === 0 && (
            <tr>
               <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                 No return history available.
               </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
