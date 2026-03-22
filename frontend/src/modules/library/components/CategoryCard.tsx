import React from 'react';
import { Category } from '../types';
import { Library } from 'lucide-react';

interface CategoryCardProps {
  category: Category;
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, onEdit, onDelete }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Library size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-900">{category.name}</h3>
        </div>
        <p className="text-gray-500 text-sm">{category.description}</p>
      </div>
      <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
        <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
          {category.bookCount} books
        </span>
        <div className="flex gap-3">
          <button 
            className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
            onClick={() => onEdit && onEdit(category)}
          >
            Edit
          </button>
          {onDelete && (
            <button 
              className="text-rose-600 hover:text-rose-800 font-medium text-sm transition-colors"
              onClick={() => window.confirm(`Delete category "${category.name}"?`) && onDelete(category)}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
