'use client';

import { useEffect, useState } from 'react';
import { FileText, Ghost, Shield, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

interface StatCard {
  label: string;
  value: number;
  change: number;
  changeLabel: string;
  icon: React.ElementType;
  color: string;
}

export function StatsOverview() {
  const [stats, setStats] = useState<StatCard[]>([
    {
      label: 'Total Complaints',
      value: 5247,
      change: 12.5,
      changeLabel: 'from last month',
      icon: FileText,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: 'Ghost Offices',
      value: 12,
      change: -8.3,
      changeLabel: 'improvement',
      icon: Ghost,
      color: 'from-purple-500 to-pink-500',
    },
    {
      label: 'Scam Alerts',
      value: 47,
      change: 23.1,
      changeLabel: 'from last week',
      icon: Shield,
      color: 'from-red-500 to-orange-500',
    },
    {
      label: 'Avg Resolution',
      value: 8.3,
      change: -15.2,
      changeLabel: 'days faster',
      icon: Clock,
      color: 'from-green-500 to-emerald-500',
    },
  ]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const isPositive = stat.change > 0;
        const isImprovement = stat.label === 'Ghost Offices' || stat.label === 'Avg Resolution'
          ? stat.change < 0
          : stat.change > 0;

        return (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all duration-300"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-3xl font-bold">
                  {stat.label === 'Avg Resolution'
                    ? `${stat.value}d`
                    : formatNumber(stat.value)}
                </p>
              </div>
              <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center', stat.color)}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              {isImprovement ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <span className={cn('text-sm font-medium', isImprovement ? 'text-green-400' : 'text-red-400')}>
                {Math.abs(stat.change)}%
              </span>
              <span className="text-sm text-muted-foreground">{stat.changeLabel}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
