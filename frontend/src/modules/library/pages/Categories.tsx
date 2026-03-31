import React, { useEffect, useState } from 'react';
import { Category } from '../types';
import { LibraryService } from '../services/libraryService';
import { Plus } from 'lucide-react';
import { CategoryCard } from '../components/CategoryCard';
import { SearchFilterBar } from '../components/SearchFilterBar';
import { AddCategoryModal } from '../components/AddCategoryModal';
import { EditCategoryModal } from '../components/EditCategoryModal';
import { toast } from 'sonner';

export const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);

  const fetchCategories = () => {
    LibraryService.getCategories().then(setCategories);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async (data: { name: string; description: string }) => {
    try {
      await LibraryService.addCategory(data);
      toast.success("Category added successfully!");
      fetchCategories();
    } catch (error) {
      toast.error("Failed to add category");
    }
  };

  const handleEditCategory = async (id: string, data: Partial<Category>) => {
    try {
      await LibraryService.editCategory(id, data);
      toast.success("Category updated successfully!");
      fetchCategories();
    } catch (error) {
      toast.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await LibraryService.deleteCategory(id);
      toast.success("Category deleted successfully!");
      fetchCategories();
    } catch (error) {
      toast.error("Failed to delete category");
    }
  };

  const filteredCategories = categories.filter(c => {
    const term = searchTerm.toLowerCase();
    return (c.name?.toLowerCase() || '').includes(term);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Book Categories</h1>
          <p className="text-gray-500">Organize books into shelves and sections.</p>
        </div>
        <button 
          onClick={() => setIsAddOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
        >
          <Plus size={20} /> Add Category
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <SearchFilterBar 
          searchTerm={searchTerm} 
          onSearchChange={setSearchTerm} 
          placeholder="Search categories..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.map((category) => (
          <CategoryCard 
            key={category.id} 
            category={category} 
            onEdit={() => setEditCategory(category)} 
            onDelete={() => handleDeleteCategory(category.id)}
          />
        ))}
        {filteredCategories.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white border border-gray-200 rounded-xl">
            No categories found.
          </div>
        )}
      </div>

      <AddCategoryModal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        onSubmit={handleAddCategory} 
      />

      <EditCategoryModal 
        isOpen={!!editCategory} 
        category={editCategory}
        onClose={() => setEditCategory(null)} 
        onSubmit={handleEditCategory} 
      />
    </div>
  );
};
