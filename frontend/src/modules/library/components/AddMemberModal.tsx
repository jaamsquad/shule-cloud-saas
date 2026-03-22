import React, { useState } from 'react';
import { X } from 'lucide-react';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '', admissionNumber: '', type: 'Student', contact: ''
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full flex flex-col">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-900">Add New Member</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
              <option value="Student">Student (requires Admission Number)</option>
              <option value="Staff">Staff (Teachers, Admins)</option>
            </select>
          </div>
          {formData.type === 'Student' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admission Number</label>
              <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value={formData.admissionNumber} onChange={e => setFormData({...formData, admissionNumber: e.target.value})} placeholder="e.g. STU1234" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Details (Email or Phone)</label>
            <input required type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-4 rounded-b-xl pb-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">Add Member</button>
          </div>
        </form>
      </div>
    </div>
  );
};
