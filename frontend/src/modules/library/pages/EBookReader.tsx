import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Book } from '../types';
import { LibraryService } from '../services/libraryService';
import { ArrowLeft, BookOpen, Settings, Maximize, ZoomIn, ZoomOut, Download, Bookmark } from 'lucide-react';
import { toast } from 'sonner';

export const EBookReader = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bookId) {
      LibraryService.getBooks().then(books => {
        const found = books.find(b => b.id === bookId || b.accessionNumber === bookId);
        if (found) {
          setBook(found);
          // Award points for reading (mock)
          setTimeout(() => {
            toast.success(<span>You earned <b>+50 XP</b> for reading today!</span>, { icon: '🔥' });
          }, 5000);
        }
        setLoading(false);
      });
    }
  }, [bookId]);

  if (loading) return <div className="p-8 flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

  if (!book || !book.digitalCopyUrl) {
    return (
      <div className="p-8 h-screen flex flex-col items-center justify-center text-center bg-gray-50 dark:bg-gray-900 animate-in fade-in">
        <BookOpen size={64} className="text-gray-300 dark:text-gray-700 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Digital Copy Unavailable</h2>
        <p className="text-gray-500 mt-2 max-w-md">The book you are looking for does not have a digital copy attached, or the link has expired.</p>
        <button onClick={() => navigate(-1)} className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2">
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-950 animate-in slide-in-from-bottom duration-300">
      {/* Reader Toolbar */}
      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-50 dark:bg-gray-800 rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-1">{book.title}</h1>
            <p className="text-xs text-gray-500">{book.author}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><Bookmark size={18}/></button>
          <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><ZoomOut size={18}/></button>
          <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><ZoomIn size={18}/></button>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>
          <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><Download size={18}/></button>
          <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><Settings size={18}/></button>
          <button className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><Maximize size={18}/></button>
        </div>
      </div>

      {/* Reader Content Area */}
      <div className="flex-1 bg-gray-200 dark:bg-gray-950 overflow-hidden relative">
         <iframe 
           src={`${book.digitalCopyUrl}#toolbar=0`} 
           title={`eReader: ${book.title}`}
           className="w-full h-full border-none"
           sandbox="allow-same-origin allow-scripts"
         />
      </div>
    </div>
  );
};
