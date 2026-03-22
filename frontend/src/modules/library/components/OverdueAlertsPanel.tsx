import React from 'react';
import { IssueRecord } from '../types';
import { AlertCircle, Send } from 'lucide-react';

interface OverdueAlertsPanelProps {
  overdueIssues: IssueRecord[];
  onNotify?: (issue: IssueRecord) => void;
}

export const OverdueAlertsPanel: React.FC<OverdueAlertsPanelProps> = ({ overdueIssues, onNotify }) => {
  if (overdueIssues.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm min-h-[300px]">
        <h3 className="text-lg font-semibold mb-4 text-emerald-600">Overdue Alerts</h3>
        <div className="flex items-center justify-center h-48 text-gray-400">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-2 text-emerald-300" size={32} />
            <p>No immediate overdue alerts</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-0 rounded-xl border border-rose-100 shadow-sm h-full flex flex-col">
      <div className="p-4 border-b border-rose-100 bg-rose-50/30">
        <h3 className="text-lg font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle size={20} /> Overdue Alerts ({overdueIssues.length})
        </h3>
      </div>
      <div className="p-4 flex-1 overflow-y-auto max-h-[400px]">
        <div className="space-y-4">
          {overdueIssues.slice(0, 5).map(issue => (
            <div key={issue.id} className="p-3 border border-rose-100 rounded-lg bg-white flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-900">Borrower: {issue.borrowerId}</p>
                <p className="text-sm text-gray-500 mt-1">Book ID: {issue.bookId}</p>
                <p className="text-xs font-semibold text-rose-500 mt-2">Due: {issue.dueDate}</p>
              </div>
              <button 
                onClick={() => onNotify && onNotify(issue)}
                className="text-rose-600 hover:text-rose-800 bg-rose-50 p-2 rounded-lg transition-colors"
                title="Send Reminder"
              >
                <Send size={16} />
              </button>
            </div>
          ))}
          {overdueIssues.length > 5 && (
            <div className="text-center pt-2">
              <button className="text-sm font-medium text-blue-600 hover:underline">View All Overdue (+{overdueIssues.length - 5})</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
