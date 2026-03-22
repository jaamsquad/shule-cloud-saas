import React from 'react';
import { Book } from '../types';

interface BooksTableProps {
  books: Book[];
  onRowClick?: (book: Book) => void;
}

export const BooksTable: React.FC<BooksTableProps> = ({ books, onRowClick }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-gray-600">
        <thead className="bg-gray-50 text-gray-900 font-medium">
          <tr>
            <th className="px-6 py-4">Title & Author</th>
            <th className="px-6 py-4">Accession / ISBN</th>
            <th className="px-6 py-4">Category</th>
            <th className="px-6 py-4">Shelf</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Copies</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {books.map((book) => (
            <tr 
              key={book.id} 
              className={`hover:bg-gray-50/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick && onRowClick(book)}
            >
              <td className="px-6 py-4">
                <div className="font-semibold text-gray-900 truncate max-w-[200px]">{book.title}</div>
                <div className="text-gray-500 text-xs mt-1">{book.author}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-gray-900">{book.accessionNumber}</div>
                <div className="text-gray-500 text-xs mt-1">{book.isbn}</div>
              </td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  {book.category}
                </span>
              </td>
              <td className="px-6 py-4">{book.shelfNumber}</td>
              <td className="px-6 py-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  book.status === 'Available' ? 'bg-emerald-50 text-emerald-700' :
                  book.status === 'Low Stock' ? 'bg-amber-50 text-amber-700' :
                  'bg-rose-50 text-rose-700'
                }`}>
                  {book.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="font-medium text-gray-900">{book.copiesAvailable} / {book.copiesTotal}</div>
              </td>
            </tr>
          ))}
          {books.length === 0 && (
            <tr>
               <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                 No books found matching your criteria.
               </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
