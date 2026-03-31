import React, { useState } from 'react';
import { Book } from '../types';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

interface BooksTableProps {
  books: Book[];
  onRowClick?: (book: Book) => void;
  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;
}

export const BooksTable: React.FC<BooksTableProps> = ({ books, onRowClick, selectedIds, onSelectIds }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const totalPages = Math.ceil(books.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBooks = books.slice(startIndex, startIndex + itemsPerPage);

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onSelectIds(paginatedBooks.map(b => b.id));
    } else {
      onSelectIds([]);
    }
  };

  const toggleSelectRow = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      onSelectIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onSelectIds([...selectedIds, id]);
    }
  };

  const isAllSelected = paginatedBooks.length > 0 && paginatedBooks.every(b => selectedIds.includes(b.id));

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-4 w-12">
                <input 
                  type="checkbox" 
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white"
                />
              </th>
              <th className="px-6 py-4">Title & Author</th>
              <th className="px-6 py-4">Accession / ISBN</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Shelf</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Copies</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
            {paginatedBooks.map((book) => (
              <tr 
                key={book.id} 
                className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${selectedIds.includes(book.id) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                onClick={() => onRowClick && onRowClick(book)}
              >
                <td className="px-6 py-4" onClick={(e) => toggleSelectRow(e, book.id)}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(book.id)}
                    onChange={() => {}} // handled by td onClick
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white"
                  />
                </td>
                <td className="px-6 py-4 w-[30%]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-12 flex-shrink-0 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded shadow-sm overflow-hidden flex flex-col items-center justify-center border border-gray-200 dark:border-gray-700">
                      {book.coverUrl ? (
                         <img src={book.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                      ) : (
                         <span className="text-xs font-bold text-indigo-300 dark:text-indigo-800/70">{book.title.substring(0, 1)}</span>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100 truncate pr-4">{book.title}</div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">{book.author}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-gray-900 dark:text-gray-100">{book.accessionNumber}</div>
                  <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">{book.isbn}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                    {book.category}
                  </span>
                </td>
                <td className="px-6 py-4">{book.shelfNumber}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${
                    book.status === 'Available' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' :
                    book.status === 'Low Stock' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' :
                    'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  }`}>
                    {book.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{book.copiesAvailable} / {book.copiesTotal}</div>
                </td>
              </tr>
            ))}
            {paginatedBooks.length === 0 && (
              <tr>
                 <td colSpan={7} className="px-6 py-16 text-center">
                   <div className="flex flex-col items-center justify-center text-gray-400">
                     <Inbox size={48} className="mb-4 opacity-50" />
                     <p className="text-lg font-medium text-gray-900 dark:text-gray-100">No books found</p>
                     <p className="text-sm">Try adjusting your search or filters.</p>
                   </div>
                 </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(startIndex + itemsPerPage, books.length)}</span> of <span className="font-medium">{books.length}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300 px-2 font-medium">Page {currentPage} of {totalPages}</span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
