import React from 'react';
import { Book } from '../types';
import { BookOpen, MapPin, Tag, Copy, X } from 'lucide-react';

interface BookDetailPanelProps {
  book: Book | null;
  onClose: () => void;
  onIssueClick?: () => void;
  onDeleteClick?: () => void;
}

export const BookDetailPanel: React.FC<BookDetailPanelProps> = ({ book, onClose, onIssueClick, onDeleteClick }) => {
  if (!book) return null;

  return (
    <div className="bg-white border-l border-gray-200 shadow-xl h-full flex flex-col absolute right-0 top-0 w-96 z-40 transform transition-transform duration-300">
      <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
        <div>
          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mb-3 ${
            book.status === 'Available' ? 'bg-emerald-100 text-emerald-700' :
            book.status === 'Low Stock' ? 'bg-amber-100 text-amber-700' :
            'bg-rose-100 text-rose-700'
          }`}>
            {book.status}
          </span>
          <h2 className="text-xl font-bold text-gray-900 leading-tight">{book.title}</h2>
          <p className="text-sm text-gray-500 mt-1">by {book.author}</p>
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg bg-white border border-gray-200 shadow-sm">
          <X size={16} />
        </button>
      </div>
      
      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
             <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Available</p>
             <p className="text-2xl font-bold text-blue-900 mt-1">{book.copiesAvailable}</p>
           </div>
           <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
             <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Copies</p>
             <p className="text-2xl font-bold text-gray-900 mt-1">{book.copiesTotal}</p>
           </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-100 pb-2">Publishing Details</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-2"><BookOpen size={16}/> Publisher</span>
              <span className="font-medium text-gray-900">{book.publisher}</span>
            </div>
             <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-2"><Tag size={16}/> ISBN</span>
              <span className="font-medium text-gray-900">{book.isbn}</span>
            </div>
             <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-2"><Copy size={16}/> Accession</span>
              <span className="font-medium text-gray-900">{book.accessionNumber}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-100 pb-2">Location</h3>
          <div className="space-y-3">
             <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-2"><MapPin size={16}/> Category</span>
              <span className="font-medium text-gray-900">{book.category}</span>
            </div>
             <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-2"><MapPin size={16}/> Shelf No.</span>
              <span className="font-medium text-gray-900">{book.shelfNumber}</span>
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-gray-100 flex gap-3">
           <button 
             onClick={onDeleteClick}
             className="px-4 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg font-medium transition-colors cursor-pointer"
             title="Delete Book"
           >
             Delete
           </button>
           <button 
             onClick={onIssueClick}
             className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors cursor-pointer"
           >
             Issue Copy
           </button>
        </div>
      </div>
    </div>
  );
};
