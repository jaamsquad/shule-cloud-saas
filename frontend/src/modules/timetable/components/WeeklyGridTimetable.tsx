import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, User, BookOpen } from 'lucide-react';
import { TimetableEntry } from '../types';

interface WeeklyGridTimetableProps {
  entries: TimetableEntry[];
}

const getLessonTypeColor = (type: TimetableEntry['lessonType']) => {
  switch (type) {
    case 'Regular': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    case 'Practical': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
    case 'Remedial': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    case 'Exam': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
    default: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
  }
};

const WeeklyGridTimetable: React.FC<WeeklyGridTimetableProps> = ({ entries }) => {
  const defaultDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const defaultTimes = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

  const daysToShow = defaultDays;
  
  // Get all unique times from the default plus any entries
  const allTimes = new Set([...defaultTimes, ...entries.map(e => e.startTime), ...entries.map(e => e.endTime)]);
  const timesToShow = Array.from(allTimes).sort();

  if (entries.length === 0) {
    return (
      <Card className="w-full shadow-sm hover:shadow-md transition-shadow duration-300 border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
          <CalendarDays className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-600" />
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">No Schedule Available</h3>
          <p className="max-w-xs mt-1 text-sm">There are no timetable entries matching the given filters. Try adjusting your selection.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden shadow-sm border-slate-200 dark:border-slate-800">
      <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-indigo-500" />
              Weekly Overview
            </CardTitle>
            <CardDescription className="mt-1">
              Displays the active curriculum schedule for the selected view.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse text-sm min-w-[800px]">
            <thead>
              <tr>
                <th className="w-20 p-3 bg-slate-100/50 dark:bg-slate-800/50 border-b border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-400 text-center sticky left-0 z-10 backdrop-blur-md">
                  Time
                </th>
                {daysToShow.map(day => (
                  <th key={day} className="p-3 bg-slate-50 dark:bg-slate-800/30 border-b border-r border-slate-100 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300 min-w-[200px]">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Note: In a real implementation we would calculate row spans based on duration, but for this simple grid we align by start time. */}
              {timesToShow.slice(0, -1).map((time, idx) => (
                <tr key={time} className="group">
                  <td className="p-2 border-b border-r border-slate-100 dark:border-slate-800/80 text-center font-medium text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/20 sticky left-0 z-10 backdrop-blur-md text-xs group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
                    {time}
                  </td>
                  {daysToShow.map(day => {
                    // Check if an entry starts at this time
                    const entry = entries.find(e => e.day === day && e.startTime === time);
                    return (
                      <td key={`${day}-${time}`} className="p-2 border-b border-r border-slate-100 dark:border-slate-800/60 align-top h-28 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        {entry ? (
                          <div className="h-full relative group/card">
                            <div className="absolute inset-0 bg-white dark:bg-slate-950 rounded-lg shadow-sm border border-slate-200/60 dark:border-slate-800 p-3 flex flex-col gap-1.5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-200 dark:hover:border-indigo-900 cursor-pointer overflow-hidden group-hover/card:ring-1 ring-indigo-500/20">
                              <div className="flex justify-between items-start">
                                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${getLessonTypeColor(entry.lessonType)}`}>
                                  {entry.lessonType}
                                </span>
                                {entry.stream && (
                                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    {entry.stream}
                                  </span>
                                )}
                              </div>
                              
                              <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm leading-tight flex items-start gap-1.5 mt-0.5 line-clamp-2">
                                <BookOpen className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                                {entry.subject}
                              </h4>
                              
                              <div className="mt-auto pt-1 flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-400">
                                <div className="flex items-center gap-1.5 w-full">
                                  <User className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{entry.teacher}</span>
                                </div>
                                <div className="flex items-center gap-1.5 w-full">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{entry.room}</span>
                                </div>
                              </div>
                              
                              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover/card:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyGridTimetable;