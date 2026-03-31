import React from 'react';
import { Search, Filter, SortDesc } from 'lucide-react';

interface SearchFilterBarProps {
  placeholder?: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  categories?: string[];
  filters?: { category: string; availability: string; sortBy: string };
  onFilterChange?: (filters: { category: string; availability: string; sortBy: string }) => void;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({ 
  placeholder = "Search...", 
  searchTerm, 
  onSearchChange,
  categories,
  filters,
  onFilterChange
}) => {
  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between bg-gray-50/50 dark:bg-gray-800/50">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder={placeholder} 
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white dark:bg-gray-900 dark:text-gray-100"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      
      {filters && onFilterChange && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          {categories && (
            <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-700 rounded-lg pl-3 pr-2 py-1 bg-white dark:bg-gray-900">
              <Filter size={16} className="text-gray-400" />
              <select 
                className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-200 focus:ring-0 py-1"
                value={filters.category}
                onChange={(e) => onFilterChange({ ...filters, category: e.target.value })}
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* Availability Filter */}
          <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-700 rounded-lg pl-3 pr-2 py-1 bg-white dark:bg-gray-900">
            <Filter size={16} className="text-gray-400" />
            <select 
              className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-200 focus:ring-0 py-1"
              value={filters.availability}
              onChange={(e) => onFilterChange({ ...filters, availability: e.target.value })}
            >
              <option value="">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-700 rounded-lg pl-3 pr-2 py-1 bg-white dark:bg-gray-900">
            <SortDesc size={16} className="text-gray-400" />
            <select 
              className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-200 focus:ring-0 py-1 w-full"
              value={filters.sortBy}
              onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value })}
            >
              <option value="Recently Added">Recently Added</option>
              <option value="Most Borrowed">Most Borrowed</option>
              <option value="Title A-Z">Title A-Z</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
