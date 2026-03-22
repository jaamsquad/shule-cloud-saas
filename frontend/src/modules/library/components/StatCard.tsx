import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, trendUp }) => {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
          <Icon size={20} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {trend && (
          <p className={`text-sm mt-2 font-medium ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </p>
        )}
      </div>
    </div>
  );
};
