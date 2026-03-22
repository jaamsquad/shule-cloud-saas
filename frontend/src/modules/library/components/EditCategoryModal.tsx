import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Category } from '../types';

interface EditCategoryModalProps {
  isOpen: boolean;
  category: Category | null;
  onClose: () => void;
  onSubmit: (id: string, data: { name: string, description: string }) => void;
}

export const EditCategoryModal: React.FC<EditCategoryModalProps> = ({ isOpen, category, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (category && isOpen) {
      setName(category.name);
      setDescription(category.description);
    }
  }, [category, isOpen]);

  if (!isOpen || !category) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full flex flex-col">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-900">Edit Category</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors bg-white">
            <X size={20} />
          </button>
        </div>
        
        <form 
          className="p-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(category.id, { name, description });
            onClose();
          }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
            <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea required rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          
          <div className="pt-4 flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 rounded-lg font-medium transition-colors">
              <Save size={16}/> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
