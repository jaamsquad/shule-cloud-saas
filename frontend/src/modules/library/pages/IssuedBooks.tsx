import React, { useEffect, useState } from 'react';
import { IssueRecord } from '../types';
import { LibraryService } from '../services/libraryService';
import { Plus } from 'lucide-react';
import { SearchFilterBar } from '../components/SearchFilterBar';
import { IssueBookModal } from '../components/IssueBookModal';
import { toast } from 'sonner';

export const IssuedBooks = () => {
  const [issues, setIssues] = useState<IssueRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);

  const fetchIssues = () => {
    LibraryService.getIssues().then(data => setIssues(data.filter(i => i.status === 'Issued')));
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const handleIssueBook = async (data: any) => {
    try {
      await LibraryService.issueBook(data.bookId, data.borrowerId, data.issueDate, data.dueDate);
      toast.success("Book issued successfully!");
      fetchIssues();
    } catch (error: any) {
      toast.error(error.message || "Failed to issue book");
    }
  };

  const filteredIssues = issues.filter(i => 
    i.bookId.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.borrowerId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Issued Books</h1>
          <p className="text-gray-500">Track all currently issued books.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
        >
          <Plus size={20} /> Issue Book
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <SearchFilterBar 
          searchTerm={searchTerm} 
          onSearchChange={setSearchTerm} 
          placeholder="Search by book ID or borrower ID..."
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-900 font-medium">
              <tr>
                <th className="px-6 py-4">Book ID</th>
                <th className="px-6 py-4">Borrower ID</th>
                <th className="px-6 py-4">Issue Date</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredIssues.map((issue) => (
                <tr key={issue.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{issue.bookId}</td>
                  <td className="px-6 py-4">{issue.borrowerId}</td>
                  <td className="px-6 py-4">{issue.issueDate}</td>
                  <td className="px-6 py-4 text-emerald-600">{issue.dueDate}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {issue.status}
                    </span>
                  </td>
                </tr>
              ))}
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
        isOpen={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        onSubmit={handleIssueBook} 
      />
    </div>
  );
};
