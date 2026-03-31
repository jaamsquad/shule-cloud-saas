import React, { useEffect, useState } from 'react';
import { Author } from '../types';
import { LibraryService } from '../services/libraryService';
import { Plus, User } from 'lucide-react';
import { SearchFilterBar } from '../components/SearchFilterBar';
import { AddAuthorModal } from '../components/AddAuthorModal';
import { toast } from 'sonner';

export const Authors = () => {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const fetchAuthors = () => {
    LibraryService.getAuthors().then(setAuthors);
  };

  useEffect(() => {
    fetchAuthors();
  }, []);

  const handleAddAuthor = async (data: { name: string }) => {
    try {
      await LibraryService.addAuthor(data);
      toast.success("Author added successfully!");
      fetchAuthors();
    } catch (error) {
      toast.error("Failed to add author");
    }
  };

  const filteredAuthors = authors.filter(a => {
    const term = searchTerm.toLowerCase();
    return (a.name?.toLowerCase() || '').includes(term);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Authors & Publishers</h1>
          <p className="text-gray-500">Manage book authors, publishers, and their collections.</p>
        </div>
        <button 
          onClick={() => setIsAddOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
        >
          <Plus size={20} /> Add Author
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <SearchFilterBar 
          searchTerm={searchTerm} 
          onSearchChange={setSearchTerm} 
          placeholder="Search authors..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAuthors.map((author) => (
          <div key={author.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 p-3 rounded-full text-gray-600">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{author.name}</h3>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                {author.bookCount} books
              </span>
              <button 
                className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                onClick={() => toast.info(`Viewing collection for ${author.name}`)}
              >
                View Collection
              </button>
            </div>
          </div>
        ))}
        {filteredAuthors.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white border border-gray-200 rounded-xl">
            No authors found.
          </div>
        )}
      </div>

      <AddAuthorModal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        onSubmit={handleAddAuthor} 
      />
    </div>
  );
};
