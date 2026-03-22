import React, { useEffect, useState } from 'react';
import { Book } from '../types';
import { LibraryService } from '../services/libraryService';
import { Plus } from 'lucide-react';
import { SearchFilterBar } from '../components/SearchFilterBar';
import { BooksTable } from '../components/BooksTable';
import { BookDetailPanel } from '../components/BookDetailPanel';
import { AddBookModal } from '../components/AddBookModal';
import { IssueBookModal } from '../components/IssueBookModal';
import { toast } from 'sonner';

export const BookCatalog = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isIssueOpen, setIsIssueOpen] = useState(false);

  const fetchBooks = () => {
    LibraryService.getBooks().then(setBooks);
  };

  useEffect(() => {
    fetchBooks();
    LibraryService.getCategories().then(cats => setCategories(cats.map(c => c.name)));
  }, []);

  const handleAddBook = async (data: any) => {
    try {
      await LibraryService.addBook(data);
      toast.success("Book added successfully");
      fetchBooks();
    } catch (error) {
      toast.error("Failed to add book");
    }
  };

  const handleIssueBook = async (data: any) => {
    try {
      await LibraryService.issueBook(data.bookId, data.borrowerId, data.issueDate, data.dueDate);
      toast.success("Book issued successfully!");
      fetchBooks();
      if (selectedBook && (selectedBook.accessionNumber === data.bookId || selectedBook.id === data.bookId)) {
        const updatedBook = { ...selectedBook, copiesAvailable: selectedBook.copiesAvailable - 1 };
        if (updatedBook.copiesAvailable === 0) updatedBook.status = 'Out of Stock';
        setSelectedBook(updatedBook);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to issue book");
    }
  };

  const handleDeleteBook = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this book?")) return;
    try {
      await LibraryService.deleteBook(id);
      toast.success("Book deleted successfully!");
      setSelectedBook(null);
      fetchBooks();
    } catch (error) {
      toast.error("Failed to delete book");
    }
  };

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.isbn.includes(searchTerm)
  );

  return (
    <div className="relative p-6 max-w-7xl mx-auto space-y-6 h-full min-h-[calc(100vh-100px)] overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Book Catalog</h1>
          <p className="text-gray-500">Manage library books, inventory, and details.</p>
        </div>
        <button 
          onClick={() => setIsAddOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
        >
          <Plus size={20} /> Add New Book
        </button>
      </div>

      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 ${selectedBook ? 'mr-96' : ''}`}>
        <SearchFilterBar 
          searchTerm={searchTerm} 
          onSearchChange={setSearchTerm} 
          placeholder="Search by title, author, or ISBN..."
        />
        <BooksTable books={filteredBooks} onRowClick={setSelectedBook} />
      </div>

      {selectedBook && (
         <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setSelectedBook(null)} />
      )}
      
      <div className={`absolute top-0 right-0 h-full w-96 transform transition-transform duration-300 z-40 ${selectedBook ? 'translate-x-0' : 'translate-x-full border-transparent shadow-none'}`}>
        <BookDetailPanel 
          book={selectedBook} 
          onClose={() => setSelectedBook(null)} 
          onIssueClick={() => setIsIssueOpen(true)}
          onDeleteClick={() => selectedBook && handleDeleteBook(selectedBook.id)}
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
