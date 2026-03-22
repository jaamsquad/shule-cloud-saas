import React, { useEffect, useState } from 'react';
import { IssueRecord } from '../types';
import { LibraryService } from '../services/libraryService';
import { Undo2 } from 'lucide-react';
import { ReturnsTable } from '../components/ReturnsTable';
import { toast } from 'sonner';

export const Returns = () => {
  const [issues, setIssues] = useState<IssueRecord[]>([]);
  const [returnInput, setReturnInput] = useState('');
  const [isDamaged, setIsDamaged] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchReturns = () => {
    LibraryService.getIssues().then(data => setIssues(data.filter(i => i.status === 'Returned')));
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const handleProcessReturn = async () => {
    if (!returnInput.trim()) return;
    setIsProcessing(true);
    try {
      await LibraryService.processReturn(returnInput.trim(), isDamaged);
      toast.success("Book returned successfully!");
      if (isDamaged) toast.warning("$1 Fine applied for bad condition.");
      setReturnInput('');
      setIsDamaged(false);
      fetchReturns();
    } catch (error: any) {
      toast.error(error.message || "Failed to process return");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Returns</h1>
        <p className="text-gray-500">Process returned books and view return history.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col gap-4">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Undo2 size={20} className="text-blue-600"/> Process Return</h3>
        <div className="flex flex-col gap-3">
          <div className="flex gap-4">
            <input 
              type="text" 
              placeholder="Scan or enter Book Accession Number" 
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={returnInput}
              onChange={e => setReturnInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleProcessReturn()}
            />
            <button 
              onClick={handleProcessReturn}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {isProcessing ? 'Processing...' : 'Process'}
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer pt-1">
            <input 
              type="checkbox" 
              checked={isDamaged}
              onChange={e => setIsDamaged(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-rose-500 focus:ring-rose-500"
            />
            <span className={isDamaged ? "text-rose-600 font-medium" : ""}>Book returned in bad condition (applies $1.00 fine)</span>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
         <div className="p-4 border-b border-gray-200 bg-gray-50/50">
           <h3 className="font-semibold text-gray-800">Return History</h3>
         </div>
         <ReturnsTable issues={issues} />
      </div>
    </div>
  );
};
