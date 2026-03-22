import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import WeeklyGridTimetable from '../components/WeeklyGridTimetable';
import ConflictWarningCards from '../components/ConflictWarningCards';
import { getTimetableEntries, getConflicts } from '../services';
import { TimetableEntry, Conflict } from '../types';
import { Link } from 'react-router-dom';
import { Calendar, AlertTriangle, Users, BookOpen, ChevronRight, PlusCircle, ArrowRightCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const StatCardLocal = ({ label, value, icon: Icon, colorClass, delay = 0 }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
  >
    <Card className="overflow-hidden relative group hover:shadow-lg transition-all duration-300 border-none bg-white dark:bg-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
      {/* Decorative gradient background that subtle glows on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${colorClass} opacity-10 blur-2xl group-hover:blur-xl transition-all duration-500`} />
      
      <CardContent className="p-6 relative z-10">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {value}
            </p>
          </div>
          <div className={`p-3 rounded-2xl bg-gradient-to-br ${colorClass} bg-opacity-10 text-white shadow-sm ring-1 ring-white/20`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const TimetableDashboard: React.FC = () => {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [entriesData, conflictsData] = await Promise.all([
          getTimetableEntries(),
          getConflicts(),
        ]);
        setEntries(entriesData);
        setConflicts(conflictsData);
      } catch (err) {
        console.error('Error loading timetable data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Synchronizing Schedules...</p>
      </div>
    );
  }

  const uniqueClasses = new Set(entries.map(e => e.className)).size;
  const uniqueTeachers = new Set(entries.map(e => e.teacher)).size;

  return (
    <div className="space-y-8 p-6 max-w-[1600px] mx-auto">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Timetable Overview
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-lg font-medium">
            Manage your school's master schedule and resolve conflicts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild size="lg" className="rounded-full shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:-translate-y-0.5">
            <Link to="/timetable/builder" className="gap-2">
              <PlusCircle className="w-5 h-5" />
              Build Schedule
            </Link>
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCardLocal 
          label="Total Scheduled Sessions" 
          value={entries.length.toString()} 
          icon={Calendar} 
          colorClass="from-blue-500 to-cyan-500"
          delay={0.1}
        />
        <StatCardLocal 
          label="Active Conflicts" 
          value={conflicts.length.toString()} 
          icon={AlertTriangle} 
          colorClass="from-rose-500 to-orange-500" 
          delay={0.2}
        />
        <StatCardLocal 
          label="Active Classes" 
          value={uniqueClasses.toString()} 
          icon={Users} 
          colorClass="from-emerald-500 to-teal-500" 
          delay={0.3}
        />
        <StatCardLocal 
          label="Active Teachers" 
          value={uniqueTeachers.toString()} 
          icon={BookOpen} 
          colorClass="from-purple-500 to-indigo-500" 
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <motion.div 
          className="xl:col-span-2 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <WeeklyGridTimetable entries={entries} />
        </motion.div>
        
        <motion.div 
          className="space-y-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] dark:bg-slate-900 overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="flex items-center gap-2">
                <ArrowRightCircle className="w-5 h-5 text-indigo-500" />
                Quick Navigation
              </CardTitle>
              <CardDescription>Fast access to timetable management modules</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {[
                  { to: "/timetable/class", label: "Class Timetables", desc: "View schedule by specific classes" },
                  { to: "/timetable/teacher", label: "Teacher Schedules", desc: "View workload per teacher" },
                  { to: "/timetable/room", label: "Room Allocations", desc: "Check room availability" },
                  { to: "/timetable/substitutions", label: "Substitutions", desc: "Manage absent teachers" },
                  { to: "/timetable/settings", label: "Global Settings", desc: "Configure periods and breaks" },
                ].map((link, i) => (
                  <Link key={i} to={link.to}>
                    <div className="group flex items-center justify-between p-3 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800/50 transition-all duration-300">
                      <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{link.label}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{link.desc}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-slate-900 group-hover:shadow-sm transition-all group-hover:translate-x-1">
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {conflicts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
            >
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                Action Required ({conflicts.length})
              </h3>
              <ConflictWarningCards conflicts={conflicts} />
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TimetableDashboard;