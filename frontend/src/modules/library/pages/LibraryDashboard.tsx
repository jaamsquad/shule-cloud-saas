import React, { useEffect, useState } from 'react';
import { LibraryService, ActivityLog } from '../services/libraryService';
import { StatCard } from '../components/StatCard';
import { OverdueAlertsPanel } from '../components/OverdueAlertsPanel';
import { NotifyModal } from '../components/NotifyModal';
import { DailyReportModal } from '../components/DailyReportModal';
import { IssueRecord } from '../types';
import { BookOpen, Users, Clock, DollarSign, Printer } from 'lucide-react';
import { toast } from 'sonner';

export const LibraryDashboard = () => {
  const [stats, setStats] = useState({ totalBooks: 0, totalBorrowers: 0, activeIssues: 0, totalFines: 0 });
  const [overdue, setOverdue] = useState<IssueRecord[]>([]);
  const [notifyIssue, setNotifyIssue] = useState<IssueRecord | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const fetchDashboardData = () => {
    LibraryService.getDashboardStats().then(setStats);
    LibraryService.getIssues().then(data => setOverdue(data.filter(i => i.status === 'Overdue')));
    LibraryService.getActivities().then(setActivities);
  };

  useEffect(() => {
    fetchDashboardData();
    // Set up a polling interval to keep dashboard fresh
    const interval = setInterval(fetchDashboardData, 3000);
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Library Dashboard</h1>
          <p className="text-gray-500">Overview of library activity and management.</p>
        </div>
        <button 
          onClick={() => setIsReportOpen(true)}
          className="bg-white border border-gray-300 shadow-sm hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
        >
          <Printer size={20} className="text-gray-500"/> Daily Report
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Books" value={stats.totalBooks} icon={BookOpen} trend="12 this month" trendUp={true} />
        <StatCard title="Total Borrowers" value={stats.totalBorrowers} icon={Users} trend="4 new" trendUp={true} />
        <StatCard title="Active Issues" value={stats.activeIssues} icon={Clock} trend="Needs attention" trendUp={false} />
        <StatCard title="Total Fines ($)" value={stats.totalFines.toFixed(2)} icon={DollarSign} trend="Outstanding" trendUp={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm min-h-[300px] flex flex-col">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Recent Activity</h3>
          <div className="flex flex-col gap-3 text-sm flex-1 overflow-y-auto max-h-[400px] pr-2">
            {activities.length > 0 ? activities.map(item => (
              <div 
                key={item.id} 
                className={`p-3 border-l-2 bg-gray-50 bg-opacity-50 ${
                  item.type === 'success' ? 'border-emerald-500 text-emerald-900 bg-emerald-50/30' : 
                  item.type === 'error' ? 'border-rose-500 text-rose-900 bg-rose-50/30' : 
                  item.type === 'warning' ? 'border-amber-500 text-amber-900 bg-amber-50/30' : 
                  'border-blue-500 text-blue-900 bg-blue-50/30'
                }`}
              >
                <div className="text-gray-900">{item.message}</div>
                <div className="text-xs text-gray-400 mt-1">{new Date(item.timestamp).toLocaleTimeString()}</div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-400">No recent activity</div>
            )}
          </div>
        </div>
        <div>
          <OverdueAlertsPanel 
            overdueIssues={overdue} 
            onNotify={issue => setNotifyIssue(issue)} 
          />
        </div>
      </div>

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
