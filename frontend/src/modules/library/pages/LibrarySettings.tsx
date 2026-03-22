import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { LibraryService } from '../services/libraryService';
import { toast } from 'sonner';

export const LibrarySettings = () => {
  const [settings, setSettings] = useState({
    maxBooksPerStudent: 3,
    maxBooksPerStaff: 10,
    finePerDay: 0.50,
    loanPeriodStudents: 14,
    loanPeriodStaff: 30,
    enableAutoReminders: true,
    requireConditionCheck: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    LibraryService.getSettings().then(setSettings);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setSettings(prev => ({ ...prev, [name]: checked }));
    } else {
      setSettings(prev => ({ ...prev, [name]: Number(value) }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await LibraryService.updateSettings(settings);
      toast.success("Settings saved successfully!");
    } catch (e) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Library Settings</h1>
        <p className="text-gray-500">Configure global library rules, limits, and system preferences.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        <div className="p-6 border-b border-gray-100">
           <h3 className="text-lg font-bold text-gray-900 mb-4">Borrowing Limits & Fines</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Books (Students)</label>
                <input type="number" name="maxBooksPerStudent" value={settings.maxBooksPerStudent} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Books (Staff)</label>
                <input type="number" name="maxBooksPerStaff" value={settings.maxBooksPerStaff} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loan Period (Students) - Days</label>
                <input type="number" name="loanPeriodStudents" value={settings.loanPeriodStudents} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loan Period (Staff) - Days</label>
                <input type="number" name="loanPeriodStaff" value={settings.loanPeriodStaff} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fine Amount Per Day ($)</label>
                <input type="number" step="0.10" name="finePerDay" value={settings.finePerDay} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
           </div>
        </div>

        <div className="p-6">
           <h3 className="text-lg font-bold text-gray-900 mb-4">System Preferences</h3>
           <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="enableAutoReminders" checked={settings.enableAutoReminders} onChange={handleChange} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <div>
                  <p className="font-medium text-gray-900">Enable Auto-Reminders</p>
                  <p className="text-sm text-gray-500">Automatically send SMS/Email reminders 1 day before due date.</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="requireConditionCheck" checked={settings.requireConditionCheck} onChange={handleChange} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <div>
                  <p className="font-medium text-gray-900">Require Condition Check on Return</p>
                  <p className="text-sm text-gray-500">Prompt staff to evaluate book condition before processing a return.</p>
                </div>
              </label>
           </div>
        </div>

        <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end">
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Save size={18} /> {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
