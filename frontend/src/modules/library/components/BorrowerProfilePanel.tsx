import React, { useState, useEffect } from 'react';
import { Borrower, IssueRecord, Fine } from '../types';
import { User, Phone, X, History, Clock, DollarSign, Activity, BookText, Award, ShieldCheck, Flame } from 'lucide-react';
import { LibraryService } from '../services/libraryService';

interface BorrowerProfilePanelProps {
  borrower: Borrower | null;
  onClose: () => void;
}

export const BorrowerProfilePanel: React.FC<BorrowerProfilePanelProps> = ({ borrower, onClose }) => {
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'fines' | 'stats'>('current');
  const [issues, setIssues] = useState<IssueRecord[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (borrower) {
      setLoading(true);
      Promise.all([
        LibraryService.getIssues(),
        LibraryService.getFines()
      ]).then(([allIssues, allFines]) => {
        setIssues(allIssues.filter(i => i.borrowerId === borrower.id || i.borrowerId === borrower.admissionNumber));
        setFines(allFines.filter(f => f.borrowerId === borrower.id));
        setLoading(false);
      });
    }
  }, [borrower]);

  if (!borrower) return null;

  const currentBooks = issues.filter(i => i.status === 'Issued' || i.status === 'Overdue');
  const historyBooks = issues.filter(i => i.status === 'Returned');
  const totalFinesAcc = fines.reduce((acc, f) => acc + f.amount, 0);

  return (
    <div className="bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-xl h-full flex flex-col absolute right-0 top-0 w-96 md:w-[450px] z-40 transform transition-transform duration-300">
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-2xl border-2 border-white dark:border-gray-800 shadow-sm">
            {borrower.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{borrower.name}</h2>
            <p className="text-sm text-gray-500 shadow-sm inline-block px-2 py-0.5 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 mt-1">
              {borrower.admissionNumber || borrower.id}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <X size={18} />
        </button>
      </div>
      
      <div className="p-6 flex-1 flex flex-col overflow-hidden space-y-4">
        {/* Top Stats */}
        <div className="grid grid-cols-2 gap-3 shrink-0">
           <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50 flex items-center justify-between">
             <div>
               <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Active Books</p>
               <p className="text-2xl font-black text-blue-900 dark:text-blue-300 mt-0.5">{currentBooks.length}</p>
             </div>
             <BookText size={24} className="text-blue-300 dark:text-blue-700 opacity-50" />
           </div>
           <div className={`p-4 rounded-xl border flex items-center justify-between ${
             borrower.finesTotal > 0 ? 'bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800/50' : 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/50'
           }`}>
             <div>
               <p className={`text-[10px] font-bold uppercase tracking-wider ${borrower.finesTotal > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>Unpaid Fines</p>
               <p className={`text-2xl font-black mt-0.5 ${borrower.finesTotal > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                 ${borrower.finesTotal.toFixed(2)}
               </p>
             </div>
             <DollarSign size={24} className={`${borrower.finesTotal > 0 ? 'text-rose-300 dark:text-rose-700' : 'text-emerald-300 dark:text-emerald-700'} opacity-50`} />
           </div>
        </div>

        {/* Contact Info */}
        <div className="flex bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 p-3 items-center divide-x divide-gray-200 dark:divide-gray-700 shrink-0">
          <div className="flex-1 px-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Phone size={14} className="text-gray-400" /> <span className="truncate">{borrower.contact}</span>
          </div>
          <div className="flex-1 px-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <User size={14} className="text-gray-400" /> <span className="font-medium text-gray-900 dark:text-gray-200">{borrower.type}</span>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg shrink-0">
          {[
            { id: 'current', label: 'Current', icon: BookText },
            { id: 'history', label: 'History', icon: History },
            { id: 'fines', label: 'Fines', icon: DollarSign },
            { id: 'stats', label: 'Stats', icon: Activity },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'current' | 'history' | 'fines' | 'stats')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === tab.id 
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-gray-700' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <Icon size={14} /> {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 shadow-inner p-4 relative">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400">Loading data...</div>
          ) : (
            <>
              {activeTab === 'current' && (
                <div className="space-y-3">
                  {currentBooks.map(i => (
                    <div key={i.id} className="p-3 border border-gray-100 dark:border-gray-800 rounded-lg flex justify-between items-center shadow-sm">
                      <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{i.bookId}</p>
                        <p className="text-xs text-gray-500">Issued: {new Date(i.issueDate).toLocaleDateString()}</p>
                        <p className={`text-xs mt-1 font-medium ${new Date(i.dueDate) < new Date() ? 'text-rose-500' : 'text-emerald-500'}`}>
                          Due: {new Date(i.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md ${i.status === 'Overdue' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'}`}>{i.status}</span>
                    </div>
                  ))}
                  {currentBooks.length === 0 && <p className="text-center text-sm text-gray-400 mt-8">No active books</p>}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-gray-700 before:to-transparent">
                  {historyBooks.map((i, index) => (
                    <div key={i.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-gray-900 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                        <History size={16} />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 shadow-sm">
                        <div className="flex justify-between">
                          <p className="font-bold text-gray-900 dark:text-gray-100 text-xs">{i.bookId}</p>
                          <span className="text-[10px] text-gray-400">{new Date(i.returnDate || i.dueDate).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">Returned</p>
                      </div>
                    </div>
                  ))}
                  {historyBooks.length === 0 && <p className="text-center text-sm text-gray-400 mt-8">No borrow history</p>}
                </div>
              )}

              {activeTab === 'fines' && (
                <div className="space-y-3">
                  {fines.map(f => (
                    <div key={f.id} className="p-3 border border-gray-100 dark:border-gray-800 rounded-lg flex justify-between items-center bg-rose-50/30 dark:bg-rose-900/10">
                      <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{f.reason}</p>
                        <p className="text-xs text-gray-500">{new Date(f.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-rose-600 dark:text-rose-400">${f.amount.toFixed(2)}</p>
                        <span className={`text-[10px] uppercase font-bold ${f.status === 'Paid' ? 'text-emerald-500' : 'text-rose-500'}`}>{f.status}</span>
                      </div>
                    </div>
                  ))}
                  {fines.length === 0 && <p className="text-center text-sm text-gray-400 mt-8">No fine history</p>}
                </div>
              )}

              {activeTab === 'stats' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 dark:border-indigo-900/30 dark:bg-indigo-900/10 text-center">
                    <Activity size={32} className="mx-auto text-indigo-400 mb-2 opacity-80" />
                    <h4 className="font-semibold text-indigo-900 dark:text-indigo-300 text-sm">Reading Behavior</h4>
                    <p className="text-xs text-indigo-700/80 dark:text-indigo-400 mt-1 pb-3 border-b border-indigo-200 dark:border-indigo-800/40">
                      Consistent reader. Tends to borrow Science and Literature.
                    </p>
                    <div className="flex justify-between mt-3 px-4">
                      <div>
                        <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400">{historyBooks.length}</p>
                        <p className="text-[10px] uppercase font-bold text-indigo-500 dark:text-indigo-600">Total Read</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold text-rose-700 dark:text-rose-400">{totalFinesAcc > 0 ? '$'+totalFinesAcc.toFixed(2) : '0'}</p>
                        <p className="text-[10px] uppercase font-bold text-rose-500 dark:text-rose-600">Total Fines</p>
                      </div>
                      <div className="border-l border-indigo-200 dark:border-indigo-800/40 pl-4">
                        <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-center"><Flame size={16}/> {borrower.readingPoints || 0}</p>
                        <p className="text-[10px] uppercase font-bold text-emerald-500 dark:text-emerald-600">XP Points</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Badges Section */}
                  <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-900/10">
                    <div className="flex items-center gap-2 mb-3">
                      <Award size={18} className="text-amber-500" />
                      <h4 className="font-semibold text-amber-900 dark:text-amber-300 text-sm">Badges Earned</h4>
                    </div>
                    {borrower.badges && borrower.badges.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {borrower.badges.map((badge, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700/50 rounded-full shadow-sm">
                            {idx % 2 === 0 ? <ShieldCheck size={14} className="text-emerald-500" /> : <Award size={14} className="text-amber-500" />}
                            <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">{badge}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-700/60 dark:text-amber-500/60 italic">No badges earned yet. Keep reading!</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
