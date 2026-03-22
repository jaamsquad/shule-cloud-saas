import React from 'react';
import { Search, Filter } from 'lucide-react';

interface SearchFilterBarProps {
  placeholder?: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onFilterClick?: () => void;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({ 
  placeholder = "Search...", 
  searchTerm, 
  onSearchChange,
  onFilterClick
}) => {
  return (
    <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between bg-gray-50/50">
      <div className="relative max-w-md w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder={placeholder} 
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      {onFilterClick && (
        <button 
          onClick={onFilterClick}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors bg-white"
        >
          <Filter size={20} /> Filters
        </button>
      )}
    </div>
  );
};
