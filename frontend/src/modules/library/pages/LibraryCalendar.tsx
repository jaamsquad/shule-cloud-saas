import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { LibraryService } from '../services/libraryService';
import { IssueRecord, Reservation } from '../types';

const localizer = momentLocalizer(moment);

export const LibraryCalendar = () => {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    // Combine issues (due dates) and reservations (expiry dates) into calendar events
    Promise.all([
      LibraryService.getIssues(),
      LibraryService.getReservations()
    ]).then(([issues, reservations]) => {
      const issueEvents = issues.filter(i => i.status !== 'Returned').map(i => ({
        id: `i_${i.id}`,
        title: `Return Due: ${i.bookId}`,
        start: new Date(i.dueDate),
        end: new Date(i.dueDate),
        allDay: true,
        type: 'due'
      }));

      const resEvents = reservations.filter(r => r.status === 'Pending' || r.status === 'Ready for pickup').map(r => ({
        id: `r_${r.id}`,
        title: `Res Expiry: ${r.bookId}`,
        start: new Date(r.expiryDate),
        end: new Date(r.expiryDate),
        allDay: true,
        type: 'reservation'
      }));

      setEvents([...issueEvents, ...resEvents]);
    });
  }, []);

  const eventStyleGetter = (event: any) => {
    let backgroundColor = '#3b82f6'; // blue-500
    if (event.type === 'due') {
      backgroundColor = '#ef4444'; // red-500
    } else if (event.type === 'reservation') {
      backgroundColor = '#f59e0b'; // amber-500
    }
    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Library Calendar</h1>
        <p className="text-gray-500 dark:text-gray-400">Visual schedule of due dates, returns, and reservations.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm h-[600px] overflow-hidden">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%', width: '100%' }}
          eventPropGetter={eventStyleGetter}
          views={['month', 'week', 'agenda']}
          className="text-gray-900 dark:text-gray-200"
        />
      </div>
    </div>
  );
};
