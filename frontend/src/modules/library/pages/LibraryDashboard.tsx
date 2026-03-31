import React, { useEffect, useState } from 'react';
import { LibraryService, ActivityLog } from '../services/libraryService';
import { StatCard } from '../components/StatCard';
import { OverdueAlertsPanel } from '../components/OverdueAlertsPanel';
import { NotifyModal } from '../components/NotifyModal';
import { DailyReportModal } from '../components/DailyReportModal';
import { IssueRecord, Book, Borrower } from '../types';
import { BookOpen, Users, Clock, DollarSign, Printer, TrendingUp, AlertCircle, Award, BookX } from 'lucide-react';
import { toast } from 'sonner';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { NotificationBell } from '../components/NotificationBell';
import { Link } from 'react-router-dom';

export const LibraryDashboard = () => {
  const [stats, setStats] = useState({ totalBooks: 0, totalBorrowers: 0, activeIssues: 0, totalFines: 0 });
  const [userRole, setUserRole] = useState<'Admin' | 'Librarian' | 'Student'>('Student');
  const [overdue, setOverdue] = useState<IssueRecord[]>([]);
  const [notifyIssue, setNotifyIssue] = useState<IssueRecord | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isReportOpen, setIsReportOpen] = useState(false);
  
  // New metrics states
  const [timeFilter, setTimeFilter] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [trends, setTrends] = useState<{name: string, issues: number, returns: number}[]>([]);
  const [mostBorrowed, setMostBorrowed] = useState<{title: string, author: string, accessionNumber: string, borrows: number}[]>([]);
  const [activeBorrowers, setActiveBorrowers] = useState<Borrower[]>([]);
  const [neverBorrowed, setNeverBorrowed] = useState<Book[]>([]);
  const [avgDelay, setAvgDelay] = useState(0);

  const fetchDashboardData = () => {
    LibraryService.getDashboardStats().then(setStats);
    LibraryService.getIssues().then(data => setOverdue(data.filter(i => i.status === 'Overdue')));
    LibraryService.getActivities().then(setActivities);
    
    // Fetch new metrics
    LibraryService.getMonthlyTrends().then(setTrends);
    LibraryService.getMostBorrowedBooks().then(setMostBorrowed);
    LibraryService.getMostActiveBorrowers().then(setActiveBorrowers);
    LibraryService.getBooksNeverBorrowed().then(setNeverBorrowed);
    LibraryService.getAverageReturnDelay().then(data => setAvgDelay(data.days));
    setUserRole(LibraryService.getRole());
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSendNotification = async (message: string) => {
    if (!notifyIssue) return;
    try {
      await LibraryService.notifyBorrower(notifyIssue.borrowerId, message);
      toast.success("Notification sent successfully!");
      setNotifyIssue(null);
    } catch (error) {
      toast.error("Failed to send notification");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Library Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Overview of library activity and management metrics.</p>
        </div>
        <div className="flex gap-2">
          <NotificationBell />
          <select 
            value={timeFilter} 
            onChange={(e) => setTimeFilter(e.target.value as 'weekly' | 'monthly' | 'yearly')}
            className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2"
          >
            <option value="weekly">This Week</option>
            <option value="monthly">This Month</option>
            <option value="yearly">This Year</option>
          </select>
          <button 
            onClick={() => setIsReportOpen(true)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
          >
            <Printer size={20} className="text-gray-500"/> Daily Report
          </button>
        </div>
      </div>
      
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Books" value={stats.totalBooks} icon={BookOpen} trend="12 added" trendUp={true} />
        <StatCard title="Total Borrowers" value={stats.totalBorrowers} icon={Users} trend="4 new" trendUp={true} />
        <StatCard title="Active Issues" value={stats.activeIssues} icon={Clock} trend="Needs attention" trendUp={false} />
        <StatCard title="Total Fines ($)" value={stats.totalFines.toFixed(2)} icon={DollarSign} trend="Outstanding" trendUp={false} />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <TrendingUp size={20} className="text-indigo-500"/> Borrowing Trends
            </h3>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIssues" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorReturns" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb"/>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="issues" stroke="#6366f1" fillOpacity={1} fill="url(#colorIssues)" name="Books Issued" />
                <Area type="monotone" dataKey="returns" stroke="#10b981" fillOpacity={1} fill="url(#colorReturns)" name="Books Returned" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Most Active Borrowers */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Award size={20} className="text-amber-500"/> Top Borrowers
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {activeBorrowers.slice(0, 5).map((u, i) => (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-indigo-600 dark:text-indigo-400">{u.booksIssued}</p>
                  <p className="text-xs text-gray-500">books</p>
                </div>
              </div>
            ))}
          </div>
          <Link to="/library/leaderboards" className="mt-4 text-sm text-center font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg transition-colors">
            View Full Leaderboard →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Most Borrowed Books */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:col-span-1">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <BookOpen size={20} className="text-emerald-500"/> Most Borrowed Books
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[300px]">
            {mostBorrowed.slice(0, 5).map((b, i) => (
              <div key={b.accessionNumber} className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div className="flex-1 pr-4">
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate" title={b.title}>{b.title}</p>
                  <p className="text-xs text-gray-500">{b.author}</p>
                </div>
                <span className="bg-emerald-100 text-emerald-700 py-1 px-2 rounded-md text-xs font-semibold">
                  {b.borrows}x
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Analytics Insights */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:col-span-1">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <AlertCircle size={20} className="text-blue-500"/> Quick Insights
          </h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-300">Average Return Delay</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-400">{avgDelay} Days</p>
            </div>
            <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 flex justify-between items-center">
              <div>
                <p className="text-sm text-rose-800 dark:text-rose-300">Unborrowed Books</p>
                <p className="text-2xl font-bold text-rose-900 dark:text-rose-400">{neverBorrowed.length}</p>
              </div>
              <BookX size={32} className="text-rose-400 opacity-50"/>
            </div>
          </div>
        </div>

        {/* Activity Panel */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:col-span-1">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Live Activity Feed</h3>
          <div className="flex flex-col gap-3 text-sm flex-1 overflow-y-auto max-h-[300px] pr-2">
            {activities.length > 0 ? activities.map(item => (
              <div 
                key={item.id} 
                className={`p-3 border-l-2 rounded-r-lg ${
                  item.type === 'success' ? 'border-emerald-500 text-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300' : 
                  item.type === 'error' ? 'border-rose-500 text-rose-900 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-300' : 
                  item.type === 'warning' ? 'border-amber-500 text-amber-900 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300' : 
                  'border-indigo-500 text-indigo-900 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300'
                }`}
              >
                <div>{item.message}</div>
                <div className="text-xs opacity-70 mt-1">{new Date(item.timestamp).toLocaleTimeString()}</div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-400">No recent activity</div>
            )}
          </div>
        </div>
      </div>

      {userRole !== 'Student' && (
        <div className="mt-8">
          <OverdueAlertsPanel 
            overdueIssues={overdue} 
            onNotify={issue => setNotifyIssue(issue)} 
          />
        </div>
      )}

      <NotifyModal 
        isOpen={!!notifyIssue} 
        issue={notifyIssue} 
        onClose={() => setNotifyIssue(null)} 
        onSend={handleSendNotification} 
      />

      <DailyReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  );
};
