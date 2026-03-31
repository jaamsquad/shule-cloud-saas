import React, { useState } from 'react';
import { Bell } from 'lucide-react';

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Overdue Book', message: 'John Doe has an overdue book.', time: '10m ago', unread: true },
    { id: 2, title: 'Reservation Ready', message: 'Book BK-001 is ready for Jane Smith.', time: '1h ago', unread: true },
    { id: 3, title: 'Fine Paid', message: '$2.00 fine paid by Mike.', time: '2h ago', unread: false },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Library Notifications</h3>
            <button onClick={handleMarkAllRead} className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800">
              Mark all as read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.map(n => (
              <div key={n.id} className={`p-4 border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${n.unread ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`text-sm font-medium ${n.unread ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>{n.title}</h4>
                  <span className="text-xs text-gray-400">{n.time}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{n.message}</p>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">No new notifications</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
