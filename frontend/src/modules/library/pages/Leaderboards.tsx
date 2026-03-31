import React, { useEffect, useState } from 'react';
import { Borrower } from '../types';
import { LibraryService } from '../services/libraryService';
import { Trophy, Medal, Star, Flame, Award } from 'lucide-react';

export const Leaderboards = () => {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);

  useEffect(() => {
    LibraryService.getBorrowers().then(data => {
      // Sort by reading points descending
      const sorted = [...data].sort((a, b) => (b.readingPoints || 0) - (a.readingPoints || 0));
      setBorrowers(sorted);
    });
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Trophy className="text-amber-500" size={32} /> Reading Leaderboards
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">See who's reading the most this semester.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Leaderboard */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Star className="text-amber-500" size={18} /> Top Readers
            </h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {borrowers.map((borrower, index) => (
              <div key={borrower.id} className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="w-12 text-center font-bold text-gray-400 text-lg">
                  {index === 0 ? <Medal size={28} className="text-amber-400 mx-auto drop-shadow-sm" /> : 
                   index === 1 ? <Medal size={28} className="text-gray-400 mx-auto drop-shadow-sm" /> :
                   index === 2 ? <Medal size={28} className="text-amber-700 mx-auto drop-shadow-sm" /> :
                   `#${index + 1}`
                  }
                </div>
                <div className="flex-1 px-4">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">{borrower.name}</h3>
                  <p className="text-xs text-gray-500">{borrower.type} • {borrower.admissionNumber}</p>
                </div>
                <div className="flex items-center gap-4">
                  {borrower.badges && borrower.badges.slice(0, 2).map((b, i) => (
                    <span key={i} className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50">
                      <Award size={12} /> {b}
                    </span>
                  ))}
                  <div className="text-right min-w-[80px]">
                    <div className="font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                      <Flame size={16} /> {borrower.readingPoints || 0}
                    </div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold">XP Points</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gamification Sidebar */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <Trophy size={120} />
            </div>
            <h3 className="font-bold border-b border-white/20 pb-2 mb-4 relative z-10">Monthly Challenge</h3>
            <div className="relative z-10 space-y-3">
              <p className="font-medium">"Spring Sci-Fi Sprint"</p>
              <p className="text-sm text-indigo-100">Read 5 Science Fiction books to unlock the exclusive Sci-Fi Fanatic badge and earn 500 bonus XP.</p>
              <div className="pt-2">
                <div className="w-full bg-black/20 rounded-full h-2.5">
                  <div className="bg-white h-2.5 rounded-full" style={{ width: '40%' }}></div>
                </div>
                <p className="text-xs text-right mt-1 text-indigo-100">2 / 5 Books Read</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Award className="text-amber-500" size={18} /> Recent Badges
            </h3>
            <div className="space-y-4">
              {[
                { name: 'Alice Johnson', badge: 'Sci-Fi Fanatic', time: '2 hours ago' },
                { name: 'Bob Smith', badge: 'Fast Reader', time: 'Yesterday' }
              ].map((activity, i) => (
                <div key={i} className="flex gap-3 items-center">
                   <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-bold text-xs text-gray-600 dark:text-gray-300">
                     {activity.name.charAt(0)}
                   </div>
                   <div>
                     <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{activity.name}</p>
                     <p className="text-xs text-gray-500">Unlocked <span className="font-semibold text-amber-600 dark:text-amber-400">{activity.badge}</span></p>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
