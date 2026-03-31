import React, { useEffect, useState } from 'react';
import { Book } from '../types';
import { LibraryService } from '../services/libraryService';
import { Plus, Download, Trash2, FolderEdit } from 'lucide-react';
import { SearchFilterBar } from '../components/SearchFilterBar';
import { BooksTable } from '../components/BooksTable';
import { BookDetailPanel } from '../components/BookDetailPanel';
import { AddBookModal } from '../components/AddBookModal';
import { IssueBookModal } from '../components/IssueBookModal';
import { toast } from 'sonner';

export const BookCatalog = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<'Admin' | 'Librarian' | 'Student'>('Student');
  
  // Advanced Search & Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ category: '', availability: '', sortBy: 'Recently Added' });
  
  // Selection States
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  
  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isIssueOpen, setIsIssueOpen] = useState(false);

  const fetchBooks = () => {
    LibraryService.getBooks().then(setBooks);
  };

  useEffect(() => {
    fetchBooks();
    LibraryService.getCategories().then(cats => setCategories(cats.map(c => c.name)));
    setUserRole(LibraryService.getRole());
  }, []);

  const handleAddBook = async (data: Omit<Book, 'id'>) => {
    try {
      await LibraryService.addBook(data);
      toast.success("Book added successfully");
      fetchBooks();
    } catch (error) {
      toast.error("Failed to add book");
    }
  };

  const handleIssueBook = async (data: {bookId: string; borrowerId: string; issueDate: string; dueDate: string}) => {
    try {
      await LibraryService.issueBook(data.bookId, data.borrowerId, data.issueDate, data.dueDate);
      toast.success("Book issued successfully!");
      fetchBooks();
      if (selectedBook && (selectedBook.accessionNumber === data.bookId || selectedBook.id === data.bookId)) {
        const updatedBook = { ...selectedBook, copiesAvailable: selectedBook.copiesAvailable - 1 };
        if (updatedBook.copiesAvailable === 0) updatedBook.status = 'Out of Stock';
        setSelectedBook(updatedBook);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to issue book");
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this book?")) return;
    try {
      await LibraryService.deleteBook(id);
      toast.success("Book deleted successfully!");
      setSelectedBook(null);
      setSelectedBookIds(prev => prev.filter(bid => bid !== id));
      fetchBooks();
    } catch (error) {
      toast.error("Failed to delete book");
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedBookIds.length} books?`)) return;
    try {
      // Mock sequential deletion for simplicity
      for (const id of selectedBookIds) {
         await LibraryService.deleteBook(id);
      }
      toast.success(`${selectedBookIds.length} books deleted successfully!`);
      setSelectedBookIds([]);
      fetchBooks();
    } catch (error) {
      toast.error("Failed to delete some books");
    }
  };

  const handleBulkExport = () => {
    // Mock export
    toast.success(`Exporting ${selectedBookIds.length} books as CSV...`);
    setTimeout(() => toast.info('Download complete'), 1500);
  };

  const handleBulkCategory = () => {
    // Mock assigning category
    toast.success(`Assigning category to ${selectedBookIds.length} books... (Mocked)`);
  };

  const handleCoverUpdate = async (coverUrl: string) => {
    if (!selectedBook) return;
    try {
      const updatedBook = await LibraryService.updateBookCover(selectedBook.id, coverUrl);
      setSelectedBook(updatedBook);
      setBooks(books.map(b => b.id === updatedBook.id ? updatedBook : b));
      toast.success("Cover updated successfully!");
    } catch (e) {
      toast.error("Failed to update cover");
    }
  };

  // Filter and Sort Logic
  const processedBooks = books.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.isbn.includes(searchTerm) ||
                          b.accessionNumber.includes(searchTerm);
    const matchesCategory = filters.category === '' || b.category === filters.category;
    const matchesAvailability = filters.availability === '' || b.status === filters.availability;
    
    return matchesSearch && matchesCategory && matchesAvailability;
  });

  processedBooks.sort((a, b) => {
    if (filters.sortBy === 'Title A-Z') {
      return a.title.localeCompare(b.title);
    } else if (filters.sortBy === 'Most Borrowed') {
      return (b.totalBorrowed || 0) - (a.totalBorrowed || 0); // Mock usage
    } else {
      // Recently Added - fallback to parsing id timestamp typically present in mock data `b${timestamp}`
      const numA = parseInt(a.id.replace('b', '')) || 0;
      const numB = parseInt(b.id.replace('b', '')) || 0;
      return numB - numA;
    }
  });

  return (
    <div className="relative p-6 max-w-7xl mx-auto space-y-6 h-full min-h-[calc(100vh-100px)] overflow-hidden animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Book Catalog</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage library books, inventory, and details.</p>
        </div>
        
        {selectedBookIds.length > 0 ? (
          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-1.5 animate-in slide-in-from-right-4">
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300 px-3 border-r border-indigo-200 dark:border-indigo-800">
              {selectedBookIds.length} Selected
            </span>
            <button onClick={handleBulkExport} className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 rounded-md tooltip-trigger" title="Export CSV">
              <Download size={18} />
            </button>
            <button onClick={handleBulkCategory} className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 rounded-md" title="Assign Category">
              <FolderEdit size={18} />
            </button>
            <button onClick={handleBulkDelete} className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md" title="Delete Selected">
              <Trash2 size={18} />
            </button>
          </div>
        ) : userRole !== 'Student' ? (
          <button 
            onClick={() => setIsAddOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
          >
            <Plus size={20} /> Add New Book
          </button>
        ) : null}
      </div>

      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 ${selectedBook ? 'mr-96' : ''}`}>
        <SearchFilterBar 
          searchTerm={searchTerm} 
          onSearchChange={setSearchTerm} 
          placeholder="Search Title, Author, ISBN, Accession..."
          categories={categories}
          filters={filters}
          onFilterChange={setFilters}
        />
        <BooksTable 
          books={processedBooks} 
          onRowClick={setSelectedBook} 
          selectedIds={selectedBookIds}
          onSelectIds={userRole !== 'Student' ? setSelectedBookIds : () => {}}
        />
      </div>

      {selectedBook && (
         <div className="fixed inset-0 z-30 bg-black/20 dark:bg-black/40 backdrop-blur-sm transition-all" onClick={() => setSelectedBook(null)} />
      )}
      
      <div className={`absolute top-0 right-0 h-full w-96 bg-white dark:bg-gray-900 transform transition-transform duration-300 z-40 border-l border-gray-200 dark:border-gray-800 shadow-2xl ${selectedBook ? 'translate-x-0' : 'translate-x-full border-transparent shadow-none'}`}>
        <BookDetailPanel 
          book={selectedBook} 
          onClose={() => setSelectedBook(null)} 
          onIssueClick={() => setIsIssueOpen(true)}
          onDeleteClick={() => selectedBook && handleDeleteBook(selectedBook.id)}
          onCoverUpdate={handleCoverUpdate}
        />
      </div>

      <AddBookModal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        onSubmit={handleAddBook} 
        categories={categories}
      />

      <IssueBookModal
        isOpen={isIssueOpen}
        onClose={() => setIsIssueOpen(false)}
        onSubmit={handleIssueBook}
        defaultBookId={selectedBook?.accessionNumber}
      />
    </div>
  );
};
