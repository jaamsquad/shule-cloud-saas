import React, { useEffect, useState } from 'react';
import { IssueRecord } from '../types';
import { LibraryService } from '../services/libraryService';
import { AlertTriangle, Send } from 'lucide-react';

export const OverdueBooks = () => {
  const [issues, setIssues] = useState<IssueRecord[]>([]);

  useEffect(() => {
    LibraryService.getIssues().then(data => setIssues(data.filter(i => i.status === 'Overdue')));
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-rose-600 flex items-center gap-3">
          <AlertTriangle size={32} /> Overdue Books
        </h1>
        <p className="text-gray-500">Manage borrowers who have exceeded their due dates.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-rose-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-rose-50 text-rose-900 font-medium">
              <tr>
                <th className="px-6 py-4">Book ID</th>
                <th className="px-6 py-4">Borrower ID</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4 text-right">Fine Accrued</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {issues.map((issue) => (
                <tr key={issue.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{issue.bookId}</td>
                  <td className="px-6 py-4">{issue.borrowerId}</td>
                  <td className="px-6 py-4 font-semibold text-rose-600">{issue.dueDate}</td>
                  <td className="px-6 py-4 text-right">${issue.fineAmount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-center">
                    <button className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 font-medium bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                      <Send size={16} /> Notify
                    </button>
                  </td>
                </tr>
              ))}
              {issues.length === 0 && (
                <tr>
                   <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                     No overdue books currently. Great job!
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
