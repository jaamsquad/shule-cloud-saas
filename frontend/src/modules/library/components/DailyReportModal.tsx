import React, { useState, useEffect } from 'react';
import { X, Printer, Calendar } from 'lucide-react';
import { LibraryService, ActivityLog } from '../services/libraryService';
import { IssueRecord } from '../types';

interface DailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailyReportModal: React.FC<DailyReportModalProps> = ({ isOpen, onClose }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<{
    borrowed: IssueRecord[];
    returned: IssueRecord[];
    activities: ActivityLog[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadReport(date);
    }
  }, [isOpen, date]);

  const loadReport = async (selectedDate: string) => {
    setIsLoading(true);
    try {
      const data = await LibraryService.getDailyReport(selectedDate);
      setReport(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:p-0 print:bg-white print:block">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col print:shadow-none print:max-h-none print:w-full print:rounded-none">
        
        {/* Header - Hidden when printing */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl print:hidden">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-900">Daily Activity Report</h2>
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
              <Calendar size={16} className="text-gray-500" />
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="text-sm outline-none text-gray-700 bg-transparent font-medium"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              disabled={isLoading || !report}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Printer size={16} /> Print Report
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors bg-white border border-gray-200 ml-2">
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Printable Content Area */}
        <div className="p-8 overflow-y-auto flex-1 print:overflow-visible print:p-4 text-sm download-print-area">
          {/* Print Header - Visible mainly on print or as standard document header */}
          <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
            <h1 className="text-2xl font-bold uppercase tracking-wider text-gray-900 mb-2">Library Daily Report</h1>
            <p className="text-gray-600 text-lg">Date: <span className="font-semibold text-gray-900">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-gray-500 print:hidden">Generating report data...</div>
          ) : report ? (
            <div className="space-y-8">
              
              {/* Borrowed Books Section */}
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Books Borrowed ({report.borrowed.length})</h3>
                {report.borrowed.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700">
                        <th className="p-3 border border-gray-300 font-semibold w-32">Time / ID</th>
                        <th className="p-3 border border-gray-300 font-semibold">Book Accession</th>
                        <th className="p-3 border border-gray-300 font-semibold">Borrower ID</th>
                        <th className="p-3 border border-gray-300 font-semibold w-32">Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.borrowed.map(issue => (
                        <tr key={issue.id} className="border-b border-gray-200">
                          <td className="p-3 border border-gray-300 text-gray-500">{issue.id}</td>
                          <td className="p-3 border border-gray-300 font-medium text-gray-900">{issue.bookId}</td>
                          <td className="p-3 border border-gray-300 text-gray-700">{issue.borrowerId}</td>
                          <td className="p-3 border border-gray-300 text-gray-700">{issue.dueDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500 italic">No books were borrowed on this day.</p>
                )}
              </section>

              {/* Returned Books Section */}
              <section className="print:break-inside-avoid">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Books Returned ({report.returned.length})</h3>
                {report.returned.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700">
                        <th className="p-3 border border-gray-300 font-semibold w-32">Issue ID</th>
                        <th className="p-3 border border-gray-300 font-semibold">Book Accession</th>
                        <th className="p-3 border border-gray-300 font-semibold">Borrower ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.returned.map(issue => (
                        <tr key={`ret_${issue.id}`} className="border-b border-gray-200">
                          <td className="p-3 border border-gray-300 text-gray-500">{issue.id}</td>
                          <td className="p-3 border border-gray-300 font-medium text-gray-900">{issue.bookId}</td>
                          <td className="p-3 border border-gray-300 text-gray-700">{issue.borrowerId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500 italic">No books were returned on this day.</p>
                )}
              </section>

              {/* Activity Log Section */}
              <section className="print:break-inside-avoid">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Full Activity Log ({report.activities.length})</h3>
                {report.activities.length > 0 ? (
                  <ul className="space-y-3">
                    {report.activities.map(act => (
                      <li key={act.id} className="flex gap-4 text-gray-800">
                        <span className="text-gray-500 whitespace-nowrap w-24 border-r border-gray-300 pr-4">
                          {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>{act.message}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No activities recorded on this day.</p>
                )}
              </section>

              <div className="mt-12 pt-8 border-t border-gray-300 justify-between text-gray-500 w-full hidden print:flex">
                <p>Generated by ShuleCloud Library System</p>
                <p>Page 1 of 1</p>
              </div>

            </div>
          ) : null}
        </div>
      </div>
      
      {/* Global Print Styles Injection */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .download-print-area, .download-print-area * {
            visibility: visible;
          }
          .download-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
};
