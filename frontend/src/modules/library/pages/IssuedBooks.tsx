import React, { useEffect, useState } from 'react';
import { IssueRecord, Book, Borrower } from '../types';
import { LibraryService } from '../services/libraryService';
import { Plus, Printer, AlertTriangle, Clock as ClockIcon, CheckCircle } from 'lucide-react';
import { IssueBookModal } from '../components/IssueBookModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { toast } from 'sonner';

export const IssuedBooks = () => {
  const [issues, setIssues] = useState<IssueRecord[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isIssueModalOpen, setIssueModalOpen] = useState(false);
  
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
      setIssues(issueData.filter(i => i.status === 'Issued' || i.status === 'Overdue'));
      setBooks(bookData);
      setBorrowers(borrowerData);
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleIssueBook = async (data: {bookId: string; borrowerId: string; issueDate: string; dueDate: string}) => {
    try {
      const newIssue = await LibraryService.issueBook(data.bookId, data.borrowerId, data.issueDate, data.dueDate);
      toast.success("Book issued successfully!");
      fetchData();
      
      // Auto-open receipt
      const book = books.find(b => b.accessionNumber === data.bookId || b.id === data.bookId) || null;
      const borrower = borrowers.find(u => u.id === data.borrowerId || u.admissionNumber === data.borrowerId) || null;
      setReceiptData({ isOpen: true, record: newIssue, book, borrower });
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to issue book");
    }
  };

  const openReceipt = (record: IssueRecord) => {
    const book = books.find(b => b.accessionNumber === record.bookId) || null;
    const borrower = borrowers.find(u => u.id === record.borrowerId) || null;
    setReceiptData({ isOpen: true, record, book, borrower });
  };

  const getCountdownBadge = (dueDateStr: string) => {
    const now = new Date();
    const due = new Date(dueDateStr);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
          <AlertTriangle size={12} className="mr-1" /> Overdue by {Math.abs(diffDays)}d
        </span>
      );
    } else if (diffDays <= 2) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          <ClockIcon size={12} className="mr-1" /> Due in {diffDays}d
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle size={12} className="mr-1" /> {diffDays}d left
        </span>
      );
    }
  };

  const filteredIssues = issues.filter(i => 
    i.bookId.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.borrowerId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Issued Books</h1>
          <p className="text-gray-500 dark:text-gray-400">Track currently issued books and overdue alerts.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()}
            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
          >
            <Printer size={20} /> Print List
          </button>
          <button 
            onClick={() => setIssueModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
          >
            <Plus size={20} /> Issue Book
          </button>
        </div>
      </div>
      
      {/* Print-only Header */}
      <div className="hidden print:block mb-8">
        <h1 className="text-2xl font-bold text-black border-b border-black pb-2 mb-4">ShuleCloud Library - Issued Books Report</h1>
        <p className="text-sm text-gray-600">Generated on {new Date().toLocaleString()}</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <input 
            type="text" 
            placeholder="Search by book ID or borrower ID..." 
            className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-gray-900 dark:text-gray-100"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 font-medium">
              <tr>
                <th className="px-6 py-4">Borrower Details</th>
                <th className="px-6 py-4">Book Details</th>
                <th className="px-6 py-4">Issue Date</th>
                <th className="px-6 py-4">Due Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredIssues.map((issue) => {
                const book = books.find(b => b.accessionNumber === issue.bookId);
                const borrower = borrowers.find(u => u.id === issue.borrowerId);
                
                return (
                  <tr key={issue.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{borrower?.name || issue.borrowerId}</div>
                      <div className="text-xs text-gray-500 mt-1">{issue.borrowerId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{book?.title || issue.bookId}</div>
                      <div className="text-xs text-gray-500 mt-1">{issue.bookId}</div>
                    </td>
                    <td className="px-6 py-4">{new Date(issue.issueDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        {getCountdownBadge(issue.dueDate)}
                        <span className="text-xs text-gray-400">{new Date(issue.dueDate).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => openReceipt(issue)}
                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                        title="Print Receipt"
                      >
                        <Printer size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredIssues.length === 0 && (
                <tr>
                   <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                     No books are currently issued matching your search.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <IssueBookModal 
        isOpen={isIssueModalOpen} 
        onClose={() => setIssueModalOpen(false)} 
        onSubmit={handleIssueBook} 
      />

      <ReceiptModal 
        isOpen={receiptData.isOpen}
        onClose={() => setReceiptData({ ...receiptData, isOpen: false })}
        type="Issue"
        record={receiptData.record}
        book={receiptData.book}
        borrower={receiptData.borrower}
      />
    </div>
  );
};
