import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Settings2, PlusCircle, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ScheduleBuilderForm from '../components/ScheduleBuilderForm';
import WeeklyGridTimetable from '../components/WeeklyGridTimetable';
import { getTimetableEntries, createTimetableEntry } from '../services';
import { TimetableEntry } from '../types';
import { toast } from 'sonner';

const TimetableBuilder: React.FC = () => {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'form' | 'grid'>('form');

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const data = await getTimetableEntries();
        setEntries(data);
      } catch (err) {
        toast.error('Failed to load timetable entries');
        console.error('Error loading entries:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEntries();
  }, []);

  const handleAddEntry = async (entry: Omit<TimetableEntry, 'id'>) => {
    try {
      const newEntry = await createTimetableEntry(entry);
      setEntries(prev => [...prev, newEntry]);
      toast.success(`Successfully added ${entry.subject} to schedule`);
      
      // Auto-switch to grid to show the new entry if on mobile
      if (window.innerWidth < 1024) {
        setActiveTab('grid');
      }
    } catch (err) {
      toast.error('Failed to add timetable entry');
      console.error('Error adding entry:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Initializing Builder Workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-[1600px] mx-auto">
      {/* Header section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-semibold mb-3">
            <Settings2 className="w-4 h-4" /> Academic Planning Module
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Schedule Builder
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            Create and allocate classes, teachers, and rooms across the academic week.
          </p>
        </div>
        
        {/* Mobile Tab Toggles */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg lg:hidden w-full md:w-auto">
          <Button 
            variant={activeTab === 'form' ? 'default' : 'ghost'} 
            onClick={() => setActiveTab('form')}
            className={`w-full md:w-auto rounded-md ${activeTab === 'form' ? 'shadow-sm' : ''}`}
          >
            <PlusCircle className="w-4 h-4 mr-2" /> Add Entry
          </Button>
          <Button 
            variant={activeTab === 'grid' ? 'default' : 'ghost'} 
            onClick={() => setActiveTab('grid')}
            className={`w-full md:w-auto rounded-md ${activeTab === 'grid' ? 'shadow-sm' : ''}`}
          >
            <LayoutGrid className="w-4 h-4 mr-2" /> View Grid
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
        {/* Left Column - Form */}
        <div className={`lg:col-span-4 ${activeTab === 'form' ? 'block' : 'hidden lg:block'}`}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="sticky top-6"
          >
            <Card className="border border-slate-200/60 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-slate-900/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
              <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <PlusCircle className="w-5 h-5 text-indigo-500" />
                  New Allocation
                </CardTitle>
                <CardDescription>Enter details to add a new class to the schedule.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ScheduleBuilderForm onSubmit={handleAddEntry} />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Column - Live Grid */}
        <div className={`lg:col-span-8 ${activeTab === 'grid' ? 'block' : 'hidden lg:block'}`}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="h-full flex flex-col"
          >
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-teal-500" />
                Live Preview 
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs px-2 py-0.5 rounded-full font-medium ml-2">
                  {entries.length} items
                </span>
              </h3>
            </div>
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-200/50 dark:border-slate-800 overflow-hidden">
              <WeeklyGridTimetable entries={entries} />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default TimetableBuilder;