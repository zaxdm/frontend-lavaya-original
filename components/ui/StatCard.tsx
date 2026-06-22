// components/ui/StatCard.tsx
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: { value: string; up: boolean };
}

export default function StatCard({ title, value, sub, icon: Icon, iconColor = 'text-blue-600', trend }: StatCardProps) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 shadow-sm transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-secondary)] truncate">{title}</p>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{value}</p>
          {sub && <p className="text-xs text-[var(--text-secondary)] mt-1">{sub}</p>}
          {trend && (
            <p className={cn('text-xs font-medium mt-1.5', trend.up ? 'text-green-600' : 'text-red-500')}>
              {trend.up ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 opacity-90',
          iconColor.includes('blue') ? 'bg-blue-100 dark:bg-blue-900/40' :
          iconColor.includes('green') ? 'bg-green-100 dark:bg-green-900/40' :
          iconColor.includes('indigo') ? 'bg-indigo-100 dark:bg-indigo-900/40' :
          iconColor.includes('purple') ? 'bg-purple-100 dark:bg-purple-900/40' :
          'bg-slate-100 dark:bg-slate-700',
        )}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
      </div>
    </div>
  );
}
