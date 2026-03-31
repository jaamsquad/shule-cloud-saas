import React, { useState } from 'react';
import { Book } from '../types';
import { BookOpen, MapPin, Tag, Copy, X, QrCode, Bookmark, ScanLine, Lightbulb } from 'lucide-react';
import { LibraryService } from '../services/libraryService';
import { toast } from 'sonner';

interface BookDetailPanelProps {
  book: Book | null;
  onClose: () => void;
  onIssueClick?: () => void;
  onDeleteClick?: () => void;
  onCoverUpdate?: (coverUrl: string) => void;
}

export const BookDetailPanel: React.FC<BookDetailPanelProps> = ({ book, onClose, onIssueClick, onDeleteClick, onCoverUpdate }) => {
  const [isReserving, setIsReserving] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image must be smaller than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (onCoverUpdate) {
          onCoverUpdate(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  if (!book) return null;

  const handleReserve = async () => {
    setIsReserving(true);
    try {
      // Mock borrowerId 'u1' for testing
      await LibraryService.reserveBook(book.accessionNumber, 'u1');
      toast.success(<span>Reserved <b>{book.title}</b> successfully!</span>);
    } catch (error) {
      toast.error('Failed to reserve book');
    } finally {
      setIsReserving(false);
    }
  };

  const handleScanToIssue = () => {
    toast.info('Opening scanner... (Mock)');
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-xl h-full flex flex-col absolute right-0 top-0 w-96 z-40 transform transition-transform duration-300">
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start bg-gray-50/50 dark:bg-gray-800/50 relative overflow-hidden">
        {!book.coverUrl && (
          <div className="absolute -right-10 -top-10 text-gray-200 dark:text-gray-800/50 opacity-50 transform rotate-12 pointer-events-none">
            <BookOpen size={140} />
          </div>
        )}
        <div className="flex gap-4 relative z-10 w-full pr-8">
          {/* Cover Editor */}
          <div 
            onClick={handleUploadClick}
            className="w-20 h-28 sm:w-24 sm:h-32 flex-shrink-0 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-lg shadow-sm overflow-hidden flex flex-col items-center justify-center cursor-pointer group relative border border-gray-200 dark:border-gray-700 transition-transform hover:scale-105"
            title="Upload book cover"
          >
            {book.coverUrl ? (
              <img src={book.coverUrl} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="p-2 text-center flex flex-col items-center px-1">
                <div className="text-2xl font-black text-indigo-300 dark:text-indigo-800/70 uppercase leading-none mb-1">
                  {book.title.substring(0, 2)}
                </div>
                <div className="text-[10px] text-indigo-500/70 dark:text-indigo-400/70 font-bold line-clamp-3 text-center leading-tight">
                  {book.title}
                </div>
              </div>
            )}
            
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
               <span className="text-white text-xs font-semibold px-2 py-1 bg-black/50 rounded-full">Upload</span>
            </div>
          </div>
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />

          <div className="flex-1 flex flex-col justify-start pt-1">
            <div>
              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-md mb-2 border ${
                book.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' :
                book.status === 'Low Stock' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' :
                'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800'
              }`}>
                {book.status}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight line-clamp-2">{book.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">by {book.author}</p>
          </div>
        </div>
        <button onClick={onClose} className="absolute right-4 top-4 p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-lg bg-white/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-sm z-20">
          <X size={16} />
        </button>
      </div>
      
      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        {/* Copies Info */}
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 text-center">
             <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wider">Available</p>
             <p className="text-2xl font-bold text-blue-900 dark:text-blue-300 mt-1">{book.copiesAvailable}</p>
           </div>
           <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
             <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Total Copies</p>
             <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{book.copiesTotal}</p>
           </div>
        </div>

         {/* QR Code & Scan mock */}
         <div className="bg-white dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
               <QrCode size={32} className="text-gray-700 dark:text-gray-300" />
             </div>
             <div>
               <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Accession QR</p>
               <p className="text-xs text-gray-500">{book.accessionNumber}</p>
             </div>
           </div>
           <button onClick={handleScanToIssue} className="flex items-center gap-1 text-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 py-1.5 px-3 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
             <ScanLine size={16} /> Scan
           </button>
         </div>

        {/* Publishing Details */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">Publishing Details</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-2"><BookOpen size={16}/> Publisher</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{book.publisher}</span>
            </div>
             <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-2"><Tag size={16}/> ISBN</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{book.isbn}</span>
            </div>
             <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-2"><Copy size={16}/> Accession</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{book.accessionNumber}</span>
            </div>
          </div>
        </div>

        {/* Location Info */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">Location</h3>
          <div className="space-y-3">
             <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-2"><MapPin size={16}/> Category</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{book.category}</span>
            </div>
             <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 flex items-center gap-2"><MapPin size={16}/> Shelf No.</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{book.shelfNumber}</span>
            </div>
          </div>
        </div>

        {/* Smart Recommendations */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-800/30">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-500 mb-2">
            <Lightbulb size={18} />
            <h4 className="text-sm font-semibold">Smart Suggestion</h4>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Students who borrowed this also borrowed <b>"Advanced Physics by Resnick"</b> and <b>"Calculus I"</b>.
          </p>
        </div>
      </div>

      {/* Action Footer */}
      {/* 
        Reservation Logic:
        If copies == 0, show Reserve button instead of Issue
      */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex gap-3 shadow-inner">
         <button 
           onClick={onDeleteClick}
           className="px-4 py-2 text-rose-600 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg font-medium transition-colors"
           title="Delete Book"
         >
           Delete
         </button>

         {book.copiesAvailable > 0 ? (
           <button 
             onClick={onIssueClick}
             className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
           >
             Issue Copy
           </button>
         ) : (
           <button 
             onClick={handleReserve}
             disabled={isReserving}
             className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
           >
             <Bookmark size={18} /> {isReserving ? 'Reserving...' : 'Reserve Book'}
           </button>
         )}
      </div>
    </div>
  );
};
