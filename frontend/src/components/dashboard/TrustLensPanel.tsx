'use client';

import { useState } from 'react';
import { Shield, AlertTriangle, Phone, Link2, Users, Zap, ChevronRight, Send } from 'lucide-react';
import { cn, getAlertColor, formatDateTime } from '@/lib/utils';

interface ScamReport {
  id: string;
  content: string;
  scamType: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  trustScore: number;
  department: string;
  reportedAt: string;
  victimCount: number;
  relatedOutage: boolean;
}

const mockScams: ScamReport[] = [
  {
    id: 'SCM001',
    content: 'BESCOM Alert: Power disconnection in 2 hours. Pay Rs. 1500 now at bit.ly/bescom-pay',
    scamType: 'phishing',
    riskLevel: 'critical',
    trustScore: 8,
    department: 'BESCOM',
    reportedAt: '2024-03-15T14:30:00Z',
    victimCount: 23,
    relatedOutage: true,
  },
  {
    id: 'SCM002',
    content: 'BWSSB: Your water connection will be cut. Clear dues of Rs. 2000 via UPI: 9876543210@paytm',
    scamType: 'impersonation',
    riskLevel: 'critical',
    trustScore: 12,
    department: 'BWSSB',
    reportedAt: '2024-03-15T12:15:00Z',
    victimCount: 15,
    relatedOutage: false,
  },
  {
    id: 'SCM003',
    content: 'BBMP Property Tax Notice: 50% penalty waiver if paid today. Contact 9988776655',
    scamType: 'impersonation',
    riskLevel: 'high',
    trustScore: 25,
    department: 'BBMP',
    reportedAt: '2024-03-15T10:00:00Z',
    victimCount: 8,
    relatedOutage: false,
  },
];

interface Props {
  fullView?: boolean;
}

export function TrustLensPanel({ fullView = false }: Props) {
  const [analyzeText, setAnalyzeText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!analyzeText.trim()) return;
    setIsAnalyzing(true);
    // Simulate analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalyzeText('');
    }, 2000);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold">TrustLens Security</h2>
            <p className="text-sm text-muted-foreground">Real-time scam detection</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-sm text-yellow-400">
            <Zap className="w-4 h-4" />
            5 Active Alerts
          </span>
        </div>
      </div>

      {/* Quick Analyze */}
      <div className="p-4 border-b border-border bg-muted/30">
        <p className="text-sm text-muted-foreground mb-2">Quick Message Analysis</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={analyzeText}
            onChange={(e) => setAnalyzeText(e.target.value)}
            placeholder="Paste suspicious SMS or message here..."
            className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !analyzeText.trim()}
            className={cn(
              'px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Analyze
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 border-b border-border">
        <div className="p-3 text-center border-r border-border">
          <p className="text-2xl font-bold text-red-400">47</p>
          <p className="text-xs text-muted-foreground">Total Reports</p>
        </div>
        <div className="p-3 text-center border-r border-border">
          <p className="text-2xl font-bold text-orange-400">12</p>
          <p className="text-xs text-muted-foreground">Verified Scams</p>
        </div>
        <div className="p-3 text-center border-r border-border">
          <p className="text-2xl font-bold text-yellow-400">156</p>
          <p className="text-xs text-muted-foreground">Victims</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">3</p>
          <p className="text-xs text-muted-foreground">Outage Correlated</p>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="divide-y divide-border">
        {mockScams.map((scam) => (
          <div key={scam.id} className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                    getAlertColor(scam.riskLevel)
                  )}>
                    <AlertTriangle className="w-3 h-3" />
                    {scam.riskLevel.toUpperCase()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {scam.department}
                  </span>
                  {scam.relatedOutage && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500">
                      <Zap className="w-3 h-3" />
                      Outage Correlated
                    </span>
                  )}
                </div>
                <p className="text-sm line-clamp-2">{scam.content}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Trust Score: {scam.trustScore}/100
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {scam.victimCount} victims
                  </span>
                  <span>
                    {formatDateTime(scam.reportedAt)}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {!fullView && (
        <div className="p-4 border-t border-border text-center">
          <button className="text-sm text-primary hover:underline">
            View All Reports →
          </button>
        </div>
      )}
    </div>
  );
}
