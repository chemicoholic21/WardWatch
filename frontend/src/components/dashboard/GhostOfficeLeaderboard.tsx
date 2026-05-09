'use client';

import { useState } from 'react';
import { Ghost, AlertTriangle, MapPin, Building2, ChevronRight, Download } from 'lucide-react';
import { cn, getAlertColor } from '@/lib/utils';

interface GhostOffice {
  rank: number;
  department: string;
  ward: string;
  zone: string;
  ghostScore: number;
  alertLevel: 'critical' | 'high' | 'medium' | 'low';
  openComplaints: number;
  avgDaysOpen: number;
  stagnationRate: number;
}

const mockData: GhostOffice[] = [
  {
    rank: 1,
    department: 'BBMP',
    ward: 'Mahadevapura',
    zone: 'East',
    ghostScore: 92.4,
    alertLevel: 'critical',
    openComplaints: 187,
    avgDaysOpen: 45,
    stagnationRate: 78,
  },
  {
    rank: 2,
    department: 'BWSSB',
    ward: 'HSR Layout',
    zone: 'South',
    ghostScore: 87.1,
    alertLevel: 'critical',
    openComplaints: 156,
    avgDaysOpen: 38,
    stagnationRate: 71,
  },
  {
    rank: 3,
    department: 'BESCOM',
    ward: 'Whitefield',
    zone: 'East',
    ghostScore: 79.8,
    alertLevel: 'high',
    openComplaints: 134,
    avgDaysOpen: 32,
    stagnationRate: 65,
  },
  {
    rank: 4,
    department: 'BBMP',
    ward: 'Koramangala',
    zone: 'South',
    ghostScore: 72.3,
    alertLevel: 'high',
    openComplaints: 98,
    avgDaysOpen: 28,
    stagnationRate: 58,
  },
  {
    rank: 5,
    department: 'BWSSB',
    ward: 'Indiranagar',
    zone: 'East',
    ghostScore: 65.9,
    alertLevel: 'medium',
    openComplaints: 76,
    avgDaysOpen: 21,
    stagnationRate: 49,
  },
];

interface Props {
  fullView?: boolean;
}

export function GhostOfficeLeaderboard({ fullView = false }: Props) {
  const [selectedOffice, setSelectedOffice] = useState<GhostOffice | null>(null);
  const displayData = fullView ? mockData : mockData.slice(0, 5);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Ghost className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold">Ghost Office Leaderboard</h2>
            <p className="text-sm text-muted-foreground">Unresponsive government offices</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-sm text-primary hover:underline flex items-center gap-1">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Rank</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Office</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Ghost Score</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Alert</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Open</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Avg Days</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Stagnation</th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((office, index) => (
              <tr
                key={`${office.department}-${office.ward}`}
                className={cn(
                  'border-b border-border hover:bg-muted/50 transition-colors cursor-pointer',
                  selectedOffice?.rank === office.rank && 'bg-primary/5'
                )}
                onClick={() => setSelectedOffice(office)}
              >
                <td className="px-4 py-3">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm',
                    office.rank === 1 && 'bg-red-500/20 text-red-400',
                    office.rank === 2 && 'bg-orange-500/20 text-orange-400',
                    office.rank === 3 && 'bg-yellow-500/20 text-yellow-400',
                    office.rank > 3 && 'bg-muted text-muted-foreground'
                  )}>
                    #{office.rank}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{office.department}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {office.ward}, {office.zone}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          office.ghostScore >= 80 && 'bg-red-500',
                          office.ghostScore >= 60 && office.ghostScore < 80 && 'bg-orange-500',
                          office.ghostScore >= 40 && office.ghostScore < 60 && 'bg-yellow-500',
                          office.ghostScore < 40 && 'bg-green-500'
                        )}
                        style={{ width: `${office.ghostScore}%` }}
                      />
                    </div>
                    <span className="font-mono text-sm font-medium">{office.ghostScore}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border',
                    getAlertColor(office.alertLevel)
                  )}>
                    <AlertTriangle className="w-3 h-3" />
                    {office.alertLevel.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono">{office.openComplaints}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'font-mono',
                    office.avgDaysOpen > 30 && 'text-red-400',
                    office.avgDaysOpen > 14 && office.avgDaysOpen <= 30 && 'text-yellow-400',
                    office.avgDaysOpen <= 14 && 'text-green-400'
                  )}>
                    {office.avgDaysOpen}d
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono">{office.stagnationRate}%</span>
                </td>
                <td className="px-4 py-3">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {!fullView && (
        <div className="p-4 border-t border-border text-center">
          <button className="text-sm text-primary hover:underline">
            View All Ghost Offices →
          </button>
        </div>
      )}
    </div>
  );
}
