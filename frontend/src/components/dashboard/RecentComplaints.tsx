'use client';

import { useState } from 'react';
import { FileText, Clock, MapPin, Building2, ChevronRight, Filter, Search } from 'lucide-react';
import { cn, getStatusColor, formatDateTime, truncate } from '@/lib/utils';

interface Complaint {
  id: string;
  title: string;
  category: string;
  department: string;
  ward: string;
  status: string;
  daysOpen: number;
  createdAt: string;
  escalationCount: number;
  isOverdue: boolean;
}

const mockComplaints: Complaint[] = [
  {
    id: 'CMP-2024-001',
    title: 'Continuous water supply disruption in 4th Block',
    category: 'Water Supply',
    department: 'BWSSB',
    ward: 'Koramangala',
    status: 'in_progress',
    daysOpen: 12,
    createdAt: '2024-03-03T10:30:00Z',
    escalationCount: 2,
    isOverdue: false,
  },
  {
    id: 'CMP-2024-002',
    title: 'Street lights not working on main road for 2 weeks',
    category: 'Street Lights',
    department: 'BESCOM',
    ward: 'HSR Layout',
    status: 'pending',
    daysOpen: 18,
    createdAt: '2024-02-25T14:00:00Z',
    escalationCount: 3,
    isOverdue: true,
  },
  {
    id: 'CMP-2024-003',
    title: 'Large pothole causing accidents near junction',
    category: 'Roads',
    department: 'BBMP',
    ward: 'Whitefield',
    status: 'open',
    daysOpen: 25,
    createdAt: '2024-02-18T09:15:00Z',
    escalationCount: 4,
    isOverdue: true,
  },
  {
    id: 'CMP-2024-004',
    title: 'Garbage not collected for 5 days in residential area',
    category: 'Sanitation',
    department: 'BBMP',
    ward: 'Indiranagar',
    status: 'resolved',
    daysOpen: 6,
    createdAt: '2024-03-09T08:00:00Z',
    escalationCount: 0,
    isOverdue: false,
  },
  {
    id: 'CMP-2024-005',
    title: 'Sewage overflow on public road',
    category: 'Sewage',
    department: 'BWSSB',
    ward: 'Mahadevapura',
    status: 'pending',
    daysOpen: 8,
    createdAt: '2024-03-07T11:45:00Z',
    escalationCount: 1,
    isOverdue: false,
  },
];

interface Props {
  fullView?: boolean;
}

export function RecentComplaints({ fullView = false }: Props) {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const displayComplaints = fullView ? mockComplaints : mockComplaints.slice(0, 5);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold">Recent Complaints</h2>
            <p className="text-sm text-muted-foreground">Latest civic issues</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-accent transition-colors">
            <Filter className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      {fullView && (
        <div className="p-4 border-b border-border flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search complaints..."
              className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex items-center gap-2">
            {['all', 'open', 'pending', 'in_progress', 'resolved'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  filter === f
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent'
                )}
              >
                {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Complaints List */}
      <div className="divide-y divide-border">
        {displayComplaints.map((complaint) => (
          <div
            key={complaint.id}
            className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-muted-foreground">
                    {complaint.id}
                  </span>
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    getStatusColor(complaint.status)
                  )}>
                    {complaint.status.replace('_', ' ')}
                  </span>
                  {complaint.isOverdue && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                      Overdue
                    </span>
                  )}
                  {complaint.escalationCount >= 3 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400">
                      Escalated x{complaint.escalationCount}
                    </span>
                  )}
                </div>
                <h3 className="font-medium text-sm mb-2">
                  {truncate(complaint.title, 60)}
                </h3>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {complaint.department}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {complaint.ward}
                  </span>
                  <span className={cn(
                    'flex items-center gap-1',
                    complaint.daysOpen > 14 && 'text-red-400',
                    complaint.daysOpen > 7 && complaint.daysOpen <= 14 && 'text-yellow-400'
                  )}>
                    <Clock className="w-3 h-3" />
                    {complaint.daysOpen}d open
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-2" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {!fullView && (
        <div className="p-4 border-t border-border text-center">
          <button className="text-sm text-primary hover:underline">
            View All Complaints →
          </button>
        </div>
      )}
    </div>
  );
}
