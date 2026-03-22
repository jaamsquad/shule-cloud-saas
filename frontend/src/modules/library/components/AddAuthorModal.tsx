import React, { useState } from 'react';
import { X } from 'lucide-react';

interface AddAuthorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string }) => void;
}

export const AddAuthorModal: React.FC<AddAuthorModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full flex flex-col">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-900">Add New Author</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors bg-white">
            <X size={20} />
          </button>
        </div>
        
        <form 
          className="p-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ name });
            setName('');
            onClose();
          }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Author Name</label>
            <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value={name} onChange={e => setName(e.target.value)} />
          </div>
          
          <div className="pt-4 flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">Add Author</button>
          </div>
        </form>
      </div>
    </div>
  );
};
