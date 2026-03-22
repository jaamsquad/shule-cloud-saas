import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { IssueRecord } from '../types';

interface NotifyModalProps {
  isOpen: boolean;
  issue: IssueRecord | null;
  onClose: () => void;
  onSend: (message: string) => void;
}

export const NotifyModal: React.FC<NotifyModalProps> = ({ isOpen, issue, onClose, onSend }) => {
  const [method, setMethod] = useState<'Email' | 'SMS'>('Email');
  const [message, setMessage] = useState('');

  // Auto-generate message when issue changes
  React.useEffect(() => {
    if (issue) {
      setMessage(`Dear Member (${issue.borrowerId}),\n\nThis is a friendly reminder that the book (ID: ${issue.bookId}) was due on ${issue.dueDate}. Please return it to the library as soon as possible to avoid further fines. You currently have a fine of $${issue.fineAmount.toFixed(2)}.\n\nThank you,\nLibrary Management`);
    }
  }, [issue]);

  if (!isOpen || !issue) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">Send Reminder</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form 
          className="p-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSend(message);
          }}
        >
          <div className="flex gap-4 mb-4">
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${method === 'Email' ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <input type="radio" className="hidden" checked={method === 'Email'} onChange={() => setMethod('Email')} />
              Send Email
            </label>
            <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${method === 'SMS' ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <input type="radio" className="hidden" checked={method === 'SMS'} onChange={() => setMethod('SMS')} />
              Send SMS
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
            <textarea 
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-2">The message will be sent through the school's communication module directly to the guardian's contact.</p>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 rounded-lg font-medium transition-colors">
              <Send size={16} /> Send Reminder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
