import React from 'react';
import { Borrower } from '../types';
import { User, Phone, BookOpen, AlertCircle, X } from 'lucide-react';

interface BorrowerProfilePanelProps {
  borrower: Borrower | null;
  onClose: () => void;
}

export const BorrowerProfilePanel: React.FC<BorrowerProfilePanelProps> = ({ borrower, onClose }) => {
  if (!borrower) return null;

  return (
    <div className="bg-white border-l border-gray-200 shadow-xl h-full flex flex-col absolute right-0 top-0 w-96 z-40 transform transition-transform duration-300">
      <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
            {borrower.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{borrower.name}</h2>
            <p className="text-sm text-gray-500">{borrower.admissionNumber || borrower.id}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
          <X size={20} />
        </button>
      </div>
      
      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
             <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Books Issued</p>
             <p className="text-2xl font-bold text-gray-900 mt-1">{borrower.booksIssued}</p>
           </div>
           <div className={`p-4 rounded-xl border text-center ${borrower.finesTotal > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
             <p className={`text-xs font-medium uppercase tracking-wider ${borrower.finesTotal > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>Unpaid Fines</p>
             <p className={`text-2xl font-bold mt-1 ${borrower.finesTotal > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>${borrower.finesTotal.toFixed(2)}</p>
           </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-100 pb-2">Contact Details</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Phone size={16} className="text-gray-400" /> {borrower.contact}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <User size={16} className="text-gray-400" /> Type: <span className="font-medium text-gray-900">{borrower.type}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-100 pb-2">Active Issues</h3>
          <p className="text-sm text-gray-500 italic">Select to view active issue history...</p>
        </div>
      </div>
    </div>
  );
};
