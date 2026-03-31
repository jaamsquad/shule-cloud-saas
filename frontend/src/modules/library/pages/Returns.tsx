import React, { useEffect, useState } from 'react';
import { IssueRecord, Book, Borrower } from '../types';
import { LibraryService } from '../services/libraryService';
import { ReceiptModal } from '../components/ReceiptModal';
import { SearchFilterBar } from '../components/SearchFilterBar';
import { CheckCircle, AlertTriangle, Printer, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export const Returns = () => {
  const [issues, setIssues] = useState<IssueRecord[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Receipt State
  const [receiptData, setReceiptData] = useState<{ isOpen: boolean, record: IssueRecord | null, book: Book | null, borrower: Borrower | null }>({
    isOpen: false,
    record: null,
    book: null,
    borrower: null
  });

  const fetchData = () => {
    Promise.all([
      LibraryService.getIssues(),
      LibraryService.getBooks(),
      LibraryService.getBorrowers()
    ]).then(([issueData, bookData, borrowerData]) => {
      // Show ALL issues so past returns can be printed, or just Issued ones? 
      // Returns page usually handles the act of returning, so show "Issued" / "Overdue".
      // But also show recently "Returned" so receipts can be reprinted.
      setIssues(issueData);
      setBooks(bookData);
      setBorrowers(borrowerData);
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReturn = async (bookId: string, isDamaged: boolean = false) => {
    try {
      const record = await LibraryService.processReturn(bookId, isDamaged);
      toast.success(isDamaged ? "Book returned with damage fine recorded." : "Book returned successfully!");
      fetchData();
      
      const book = books.find(b => b.accessionNumber === record.bookId) || null;
      const borrower = borrowers.find(u => u.id === record.borrowerId) || null;
      setReceiptData({ isOpen: true, record, book, borrower });

    } catch (error: any) {
      toast.error(error.message || "Failed to process return");
    }
  };

  const handleMarkLost = async (issueId: string, bookId: string, borrowerId: string) => {
    if (!window.confirm("Are you sure you want to mark this book as LOST? The borrower will be fully fined and the book removed from circulation.")) return;
    try {
      // Mocking the "Mark as Lost" flow
      const issueIndex = issues.findIndex(i => i.id === issueId);
      if (issueIndex > -1) {
        // Find borrower and book
        const book = books.find(b => b.accessionNumber === bookId);
        if (book) {
           await LibraryService.deleteBook(book.id); // Removes from circulation
        }
        toast.success(`Book marked as lost. Replacement fine charged to ${borrowerId}.`);
        fetchData();
      }
    } catch (error) {
      toast.error("Failed to mark book as lost.");
    }
  };

  const openReceipt = (record: IssueRecord) => {
    const book = books.find(b => b.accessionNumber === record.bookId) || null;
    const borrower = borrowers.find(u => u.id === record.borrowerId) || null;
    setReceiptData({ isOpen: true, record, book, borrower });
  };

  // Filter: Combine search term, separate into Pending Returns and Past Returns
  const activeIssues = issues.filter(i => (i.status === 'Issued' || i.status === 'Overdue') && (
    i.bookId.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.borrowerId.toLowerCase().includes(searchTerm.toLowerCase())
  ));

  const recentReturns = issues.filter(i => i.status === 'Returned' && (
    i.bookId.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.borrowerId.toLowerCase().includes(searchTerm.toLowerCase())
  )).slice(0, 10); // Show last 10 past returns

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Process Returns</h1>
        <p className="text-gray-500 dark:text-gray-400">Receive books, inspect condition, charge fines, or mark as lost.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <input 
            type="text" 
            placeholder="Scan or type book ID / borrower ID to return..." 
            className="w-full px-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white dark:bg-gray-900 dark:text-gray-100 shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>
        
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">Awaiting Return</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 font-medium">
              <tr>
                <th className="px-6 py-4">Borrower & Book</th>
                <th className="px-6 py-4">Dates</th>
                <th className="px-6 py-4">Status & Fines</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {activeIssues.map((issue) => {
                const book = books.find(b => b.accessionNumber === issue.bookId);
                const borrower = borrowers.find(u => u.id === issue.borrowerId);
                const isOverdue = new Date(issue.dueDate) < new Date();
                const fineEst = LibraryService.calculateFine(
                  isOverdue ? Math.ceil((new Date().getTime() - new Date(issue.dueDate).getTime()) / (1000 * 3600 * 24)) : 0,
                  0.50
                );
                
                return (
                  <tr key={issue.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{borrower?.name || issue.borrowerId}</div>
                      <div className="text-xs text-gray-500 mt-1 pb-1 border-b border-gray-100 dark:border-gray-700">{issue.borrowerId}</div>
                      <div className="font-medium text-gray-700 dark:text-gray-300 mt-2">{book?.title || issue.bookId}</div>
                      <div className="text-xs text-gray-400">{issue.bookId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-gray-500 mb-1">Issued: {new Date(issue.issueDate).toLocaleDateString()}</p>
                      <p className={`text-xs font-semibold ${isOverdue ? 'text-rose-600' : 'text-emerald-600'}`}>Due: {new Date(issue.dueDate).toLocaleDateString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase mb-2 ${
                        isOverdue ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                      }`}>
                        {issue.status}
                      </span>
                      {fineEst > 0 && (
                        <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Est. Fine: ${fineEst.toFixed(2)}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-y-2">
                       <div className="flex justify-end gap-2">
                         <button 
                           onClick={() => handleReturn(issue.bookId, false)}
                           className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300 rounded-md font-medium text-xs transition-colors"
                         >
                           <CheckCircle size={14}/> Return
                         </button>
                         <button 
                           onClick={() => handleReturn(issue.bookId, true)}
                           className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-300 rounded-md font-medium text-xs transition-colors"
                           title="Return With Damage Fine"
                         >
                           <AlertTriangle size={14}/> Damaged
                         </button>
                       </div>
                       <div className="flex justify-end">
                         <button 
                           onClick={() => handleMarkLost(issue.id, issue.bookId, issue.borrowerId)}
                           className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-900/10 dark:hover:bg-rose-900/30 dark:text-rose-400 rounded-md font-medium text-xs transition-colors w-full justify-center"
                         >
                           <ShieldAlert size={14}/> Mark Lost
                         </button>
                       </div>
                    </td>
                  </tr>
                );
              })}
              {activeIssues.length === 0 && (
                <tr>
                   <td colSpan={4} className="px-6 py-8 text-center text-gray-400 italic">
                     No pending returns matching your search.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Recent Returns List for receipts */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-y border-gray-200 dark:border-gray-700 mt-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Recent Returns</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentReturns.map((issue) => (
                 <tr key={issue.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                   <td className="px-6 py-3">{issue.bookId}</td>
                   <td className="px-6 py-3">{issue.borrowerId}</td>
                   <td className="px-6 py-3">Returned: {new Date(issue.returnDate || issue.dueDate).toLocaleDateString()}</td>
                   <td className="px-6 py-3 text-right">
                     <button 
                        onClick={() => openReceipt(issue)}
                        className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors"
                        title="Print Return Receipt"
                      >
                        <Printer size={16} />
                      </button>
                   </td>
                 </tr>
              ))}
              {recentReturns.length === 0 && (
                <tr>
                   <td colSpan={4} className="px-6 py-4 text-center text-gray-400 text-xs">
                     No recent returns.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReceiptModal 
        isOpen={receiptData.isOpen}
        onClose={() => setReceiptData({ ...receiptData, isOpen: false })}
        type="Return"
        record={receiptData.record}
        book={receiptData.book}
        borrower={receiptData.borrower}
      />
    </div>
  );
};
