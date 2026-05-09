'use client';

import { useState } from 'react';
import { Search, Bell, User, Moon, Sun, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  const [isDark, setIsDark] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search complaints, wards, departments..."
            className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Refresh */}
        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          title="Refresh data"
        >
          <RefreshCw className={cn('w-5 h-5 text-muted-foreground', isRefreshing && 'animate-spin')} />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Moon className="w-5 h-5 text-muted-foreground" />
          )}
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-accent transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-border mx-2" />

        {/* User */}
        <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="text-left hidden md:block">
            <p className="text-sm font-medium">Admin User</p>
            <p className="text-xs text-muted-foreground">Bengaluru</p>
          </div>
        </button>
      </div>
    </header>
  );
}
