import React from 'react';
import { IssueRecord, Borrower, Book } from '../types';
import { X, Printer, CheckCircle } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'Issue' | 'Return';
  record: IssueRecord | null;
  book: Book | null;
  borrower: Borrower | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, type, record, book, borrower }) => {
  if (!isOpen || !record || !book || !borrower) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #receipt-print-area, #receipt-print-area * {
              visibility: visible;
            }
            #receipt-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              box-shadow: none !important;
            }
            @page { margin: 0; }
          }
        `}
      </style>
      <div id="receipt-print-area" className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative print:shadow-none print:w-full">
        {/* Do not show close buttons when printing */}
        <button onClick={onClose} className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 print:hidden">
          <X size={20} />
        </button>

        <div className="p-8 pb-6 text-center border-b border-gray-100 dark:border-gray-800">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100 dark:border-blue-800">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest">{type} Receipt</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ShuleCloud Library System</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Transaction ID:</span>
            <span className="font-mono text-gray-900 dark:text-gray-100">{record.id.toUpperCase()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Date:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{new Date().toLocaleString()}</span>
          </div>

          <div className="border-t border-dashed border-gray-200 dark:border-gray-700 py-4 space-y-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Borrower</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{borrower.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{borrower.admissionNumber || borrower.id} • {borrower.type}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 mt-4">Book</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{book.title}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{book.author}</p>
              <p className="font-mono text-xs text-gray-500 dark:text-gray-500 mt-1">Accession: {book.accessionNumber}</p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl space-y-2 border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Issue Date:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{new Date(record.issueDate).toLocaleDateString()}</span>
            </div>
            {type === 'Issue' ? (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Due Date:</span>
                <span className="font-medium text-indigo-600 dark:text-indigo-400">{new Date(record.dueDate).toLocaleDateString()}</span>
              </div>
            ) : (
              <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <span className="text-gray-500 dark:text-gray-400">Return Date:</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">{new Date(record.returnDate || new Date()).toLocaleDateString()}</span>
              </div>
            )}
          </div>
          
          {type === 'Return' && record.fineAmount > 0 && (
             <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-100 dark:border-rose-900/50 flex justify-between items-center">
               <span className="font-medium text-rose-800 dark:text-rose-300">Fine Applied:</span>
               <span className="font-bold text-rose-700 dark:text-rose-400">${record.fineAmount.toFixed(2)}</span>
             </div>
          )}

          <p className="text-xs text-center text-gray-400 italic mt-6">Please retain this receipt for your records.</p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-800 flex gap-3 print:hidden">
          <button 
            onClick={onClose} 
            className="flex-1 py-2 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
          <button 
            onClick={handlePrint}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Printer size={18} /> Print
          </button>
        </div>
      </div>
    </div>
  );
};
