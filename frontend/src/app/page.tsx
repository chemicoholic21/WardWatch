'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { StatsOverview } from '@/components/dashboard/StatsOverview';
import { GhostOfficeLeaderboard } from '@/components/dashboard/GhostOfficeLeaderboard';
import { TrustLensPanel } from '@/components/dashboard/TrustLensPanel';
import { CivicHealthMap } from '@/components/dashboard/CivicHealthMap';
import { RecentComplaints } from '@/components/dashboard/RecentComplaints';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { AgentStatus } from '@/components/dashboard/AgentStatus';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial load
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-primary/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold ghost-gradient bg-clip-text text-transparent">
            Loading GhostOffice
          </h2>
          <p className="text-muted-foreground mt-2">
            Connecting to Civic Intelligence Network...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              {/* Stats Overview */}
              <StatsOverview />

              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ghost Office Leaderboard */}
                <GhostOfficeLeaderboard />

                {/* TrustLens Panel */}
                <TrustLensPanel />
              </div>

              {/* Trend Chart */}
              <TrendChart />

              {/* Map and Recent Complaints */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CivicHealthMap />
                <RecentComplaints />
              </div>

              {/* Agent Status */}
              <AgentStatus />
            </div>
          )}

          {activeTab === 'ghost-offices' && (
            <div className="animate-fade-in">
              <h1 className="text-2xl font-bold mb-6">Ghost Office Detection</h1>
              <GhostOfficeLeaderboard fullView />
            </div>
          )}

          {activeTab === 'trustlens' && (
            <div className="animate-fade-in">
              <h1 className="text-2xl font-bold mb-6">TrustLens Security</h1>
              <TrustLensPanel fullView />
            </div>
          )}

          {activeTab === 'complaints' && (
            <div className="animate-fade-in">
              <h1 className="text-2xl font-bold mb-6">Civic Complaints</h1>
              <RecentComplaints fullView />
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="animate-fade-in">
              <h1 className="text-2xl font-bold mb-6">OpenClaw Agents</h1>
              <AgentStatus fullView />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="animate-fade-in">
              <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TrendChart />
                <CivicHealthMap />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
