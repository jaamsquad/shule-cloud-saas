import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface IssueBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  defaultBookId?: string;
}

export const IssueBookModal: React.FC<IssueBookModalProps> = ({ isOpen, onClose, onSubmit, defaultBookId = '' }) => {
  const [formData, setFormData] = useState({
    borrowerId: '',
    bookId: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 14 days default
  });

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({ ...prev, bookId: defaultBookId, borrowerId: '' }));
    }
  }, [isOpen, defaultBookId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">Issue Book</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors bg-white">
            <X size={20} />
          </button>
        </div>
        
        <form 
          className="p-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(formData);
            onClose();
          }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Borrower ID / Admission Number</label>
            <input 
              type="text" 
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. STU2023001"
              value={formData.borrowerId}
              onChange={e => setFormData({...formData, borrowerId: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Book Accession Number</label>
            <input 
              type="text" 
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Scan or type book ID"
              value={formData.bookId}
              onChange={e => setFormData({...formData, bookId: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
              <input 
                type="date" 
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.issueDate}
                onChange={e => setFormData({...formData, issueDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input 
                type="date" 
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.dueDate}
                onChange={e => setFormData({...formData, dueDate: e.target.value})}
              />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 mt-4 border-t border-gray-100 pb-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Issue Book
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
