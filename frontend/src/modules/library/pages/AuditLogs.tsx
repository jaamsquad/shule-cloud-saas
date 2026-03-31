import React, { useEffect, useState } from 'react';
import { LibraryService, ActivityLog } from '../services/libraryService';
import { FileText } from 'lucide-react';

export const AuditLogs = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  useEffect(() => {
    LibraryService.getActivities().then(setActivities);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Audit Logs</h1>
        <p className="text-gray-500 dark:text-gray-400">Activity tracking and system logs.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100 w-1/4">Timestamp</th>
                <th className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100 w-1/6">Type</th>
                <th className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">Message / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {activities.map((act) => (
                <tr key={act.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 text-xs font-mono text-gray-500 dark:text-gray-400">
                    {new Date(act.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      act.type === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' :
                      act.type === 'error' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30' :
                      act.type === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' :
                      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30'
                    }`}>
                      {act.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{act.message}</td>
                </tr>
              ))}
              {activities.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <FileText size={48} className="mb-4 opacity-30" />
                      <p>No activity logs found.</p>
                    </div>
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
