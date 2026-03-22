import React, { useState } from 'react';
import { X } from 'lucide-react';

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  categories: string[];
}

export const AddBookModal: React.FC<AddBookModalProps> = ({ isOpen, onClose, onSubmit, categories }) => {
  const [formData, setFormData] = useState({
    title: '', author: '', isbn: '', publisher: '', accessionNumber: '', category: categories[0] || '', shelfNumber: '', copiesTotal: 1
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-900">Add New Book</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors bg-white">
            <X size={20} />
          </button>
        </div>
        
        <form 
          className="p-6 overflow-y-auto space-y-4 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ 
              ...formData, 
              copiesAvailable: formData.copiesTotal, 
              status: formData.copiesTotal > 0 ? 'Available' : 'Out of Stock' 
            });
            onClose();
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Book Title</label>
              <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
              <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Publisher</label>
              <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value={formData.publisher} onChange={e => setFormData({...formData, publisher: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
              <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value={formData.isbn} onChange={e => setFormData({...formData, isbn: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Accession Number</label>
              <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value={formData.accessionNumber} onChange={e => setFormData({...formData, accessionNumber: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shelf Number</label>
              <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value={formData.shelfNumber} onChange={e => setFormData({...formData, shelfNumber: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Copies</label>
              <input required type="number" min="1" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value={formData.copiesTotal} onChange={e => setFormData({...formData, copiesTotal: parseInt(e.target.value)})} />
            </div>
          </div>
          
          <div className="pt-6 flex justify-end gap-3 sticky bottom-0 bg-white border-t border-gray-100 mt-4 pb-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">Add Book</button>
          </div>
        </form>
      </div>
    </div>
  );
};
