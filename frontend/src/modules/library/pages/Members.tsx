import React, { useEffect, useState } from 'react';
import { Borrower } from '../types';
import { LibraryService } from '../services/libraryService';
import { UserPlus } from 'lucide-react';
import { SearchFilterBar } from '../components/SearchFilterBar';
import { BorrowerProfilePanel } from '../components/BorrowerProfilePanel';
import { AddMemberModal } from '../components/AddMemberModal';
import { toast } from 'sonner';

export const Members = () => {
  const [members, setMembers] = useState<Borrower[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Borrower | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const fetchMembers = () => {
    LibraryService.getBorrowers().then(setMembers);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAddMember = async (data: Omit<Borrower, 'id' | 'booksIssued' | 'finesTotal'>) => {
    try {
      await LibraryService.addBorrower(data);
      toast.success("Member added successfully!");
      fetchMembers();
    } catch (error) {
      toast.error("Failed to add member");
    }
  };

  const filteredMembers = members.filter(m => {
    const term = searchTerm.toLowerCase();
    return (
      (m.name?.toLowerCase() || '').includes(term) ||
      (m.admissionNumber?.toLowerCase() || '').includes(term) ||
      (m.id?.toLowerCase() || '').includes(term)
    );
  });

  return (
    <div className="relative p-6 max-w-7xl mx-auto space-y-6 h-full min-h-[calc(100vh-100px)] overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Members & Borrowers</h1>
          <p className="text-gray-500">Manage library user accounts and permissions.</p>
        </div>
        <button 
          onClick={() => setIsAddOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
        >
          <UserPlus size={20} /> Add Member
        </button>
      </div>

      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 ${selectedMember ? 'mr-96' : ''}`}>
        <SearchFilterBar 
          searchTerm={searchTerm} 
          onSearchChange={setSearchTerm} 
          placeholder="Search by name or ID..."
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-900 font-medium">
              <tr>
                <th className="px-6 py-4">Member Info</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4 text-center">Books Issued</th>
                <th className="px-6 py-4 text-right">Fines</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr 
                  key={member.id} 
                  className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedMember(member)}
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{member.name}</div>
                    <div className="text-gray-500 text-xs mt-1">{member.admissionNumber || member.id}</div>
                  </td>
                  <td className="px-6 py-4">
                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      member.type === 'Student' ? 'bg-indigo-50 text-indigo-700' : 'bg-purple-50 text-purple-700'
                    }`}>
                      {member.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">{member.contact}</td>
                  <td className="px-6 py-4 text-center font-medium">{member.booksIssued}</td>
                  <td className={`px-6 py-4 text-right font-medium ${member.finesTotal > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    ${member.finesTotal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMember && (
         <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setSelectedMember(null)} />
      )}
      
      <div className={`absolute top-0 right-0 h-full w-96 transform transition-transform duration-300 z-40 ${selectedMember ? 'translate-x-0' : 'translate-x-full border-transparent shadow-none'}`}>
        <BorrowerProfilePanel borrower={selectedMember} onClose={() => setSelectedMember(null)} />
      </div>

      <AddMemberModal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        onSubmit={handleAddMember} 
      />
    </div>
  );
};
