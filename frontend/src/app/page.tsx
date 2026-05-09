'use client';

import { useState, useEffect } from 'react';
import {
  Ghost,
  Shield,
  FileText,
  MapPin,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Users,
  Zap,
  Search,
  Bell,
  Settings,
  BarChart3,
  Bot,
  FileWarning,
  ArrowRight,
  ExternalLink,
  Activity,
  Target,
  Layers,
  ChevronRight,
  Play,
  Building2
} from 'lucide-react';

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Types
interface GhostOffice {
  office_id: string;
  department: string;
  ward_name: string;
  zone: string;
  ghost_score: number;
  alert_level: 'critical' | 'high' | 'medium' | 'low';
  complaint_stats: {
    total: number;
    open: number;
    overdue: number;
  };
  factors: {
    stagnation_rate: number;
    avg_resolution_days: number;
  };
}

interface ScamReport {
  report_id: string;
  content: string;
  spoofed_department: string;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  trust_score: number;
  reported_at: string;
  victim_reports: number;
  related_outage: { is_correlated: boolean };
}

interface DashboardStats {
  complaints: { total: number; overdue_count: number; avg_resolution_days: number };
  ghost_offices: { critical_count: number; total_offices: number };
  scams: { total: number; by_risk_level: Record<string, number> };
}

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('overview');
  const [ghostOffices, setGhostOffices] = useState<GhostOffice[]>([]);
  const [scamReports, setScamReports] = useState<ScamReport[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analyzeInput, setAnalyzeInput] = useState('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const [ghostRes, scamRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/ghost-offices?limit=10`).catch(() => null),
        fetch(`${API_URL}/api/trustlens/reports?limit=5`).catch(() => null),
        fetch(`${API_URL}/api/analytics/dashboard`).catch(() => null),
      ]);

      if (ghostRes?.ok) {
        const data = await ghostRes.json();
        setGhostOffices(data.data || []);
      }

      if (scamRes?.ok) {
        const data = await scamRes.json();
        setScamReports(data.data || []);
      }

      if (statsRes?.ok) {
        const data = await statsRes.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function analyzeMessage() {
    if (!analyzeInput.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${API_URL}/api/trustlens/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: analyzeInput }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data.data);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }

  // Demo data for ghost offices if API hasn't returned yet
  const displayGhostOffices = ghostOffices.length > 0 ? ghostOffices : [
    { office_id: '1', department: 'BBMP', ward_name: 'Mahadevapura', zone: 'East', ghost_score: 92.4, alert_level: 'critical' as const, complaint_stats: { total: 187, open: 142, overdue: 89 }, factors: { stagnation_rate: 78, avg_resolution_days: 45 } },
    { office_id: '2', department: 'BWSSB', ward_name: 'HSR Layout', zone: 'South', ghost_score: 87.1, alert_level: 'critical' as const, complaint_stats: { total: 156, open: 118, overdue: 72 }, factors: { stagnation_rate: 71, avg_resolution_days: 38 } },
    { office_id: '3', department: 'BESCOM', ward_name: 'Whitefield', zone: 'East', ghost_score: 79.8, alert_level: 'high' as const, complaint_stats: { total: 134, open: 98, overdue: 56 }, factors: { stagnation_rate: 65, avg_resolution_days: 32 } },
    { office_id: '4', department: 'BBMP', ward_name: 'Koramangala', zone: 'South', ghost_score: 72.3, alert_level: 'high' as const, complaint_stats: { total: 98, open: 67, overdue: 41 }, factors: { stagnation_rate: 58, avg_resolution_days: 28 } },
    { office_id: '5', department: 'BWSSB', ward_name: 'Indiranagar', zone: 'East', ghost_score: 65.9, alert_level: 'medium' as const, complaint_stats: { total: 76, open: 45, overdue: 28 }, factors: { stagnation_rate: 49, avg_resolution_days: 21 } },
  ];

  const displayScamReports = scamReports.length > 0 ? scamReports : [
    { report_id: '1', content: 'BESCOM Alert: Power disconnection in 2 hours. Pay Rs. 1500 now at bit.ly/bescom-pay', spoofed_department: 'BESCOM', risk_level: 'critical' as const, trust_score: 8, reported_at: new Date().toISOString(), victim_reports: 23, related_outage: { is_correlated: true } },
    { report_id: '2', content: 'BWSSB: Your water connection will be cut. Clear dues via UPI: 9876543210@paytm', spoofed_department: 'BWSSB', risk_level: 'critical' as const, trust_score: 12, reported_at: new Date().toISOString(), victim_reports: 15, related_outage: { is_correlated: false } },
    { report_id: '3', content: 'BBMP Property Tax Notice: 50% penalty waiver if paid today. Contact 9988776655', spoofed_department: 'BBMP', risk_level: 'high' as const, trust_score: 25, reported_at: new Date().toISOString(), victim_reports: 8, related_outage: { is_correlated: false } },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center surface-void">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <Ghost className="w-20 h-20 text-ghost animate-pulse" />
            <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-[hsl(270,65%,60%)]/30 animate-ping" />
          </div>
          <h2 className="text-xl font-semibold text-gradient mb-2">Initializing GhostOffice</h2>
          <p className="text-smoke text-sm">Connecting to Civic Intelligence Network...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen surface-void">
      {/* ═══════════════════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 surface-base border-b border-[hsl(220,12%,18%)]">
        <div className="max-w-[1800px] mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Ghost className="w-8 h-8 text-ghost" />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[hsl(152,60%,48%)]">
                <span className="absolute inset-0 rounded-full bg-[hsl(152,60%,48%)] animate-ping opacity-75" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-pure">GhostOffice</h1>
              <p className="text-xs text-smoke -mt-0.5">Civic Intelligence Platform</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-xl mx-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-smoke" />
              <input
                type="text"
                placeholder="Search complaints, wards, departments..."
                className="input-field pl-11 py-2.5"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button className="btn-ghost p-2.5 rounded-lg relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[hsl(0,72%,58%)]" />
            </button>
            <button className="btn-ghost p-2.5 rounded-lg">
              <Settings className="w-5 h-5" />
            </button>
            <div className="w-px h-8 bg-[hsl(220,12%,18%)] mx-2" />
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg surface-raised cursor-pointer hover:border-[hsl(270,65%,60%)]/50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[hsl(270,65%,60%)] to-[hsl(300,60%,50%)] flex items-center justify-center">
                <span className="text-sm font-bold text-pure">A</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-light">Admin</p>
                <p className="text-xs text-smoke">Bengaluru</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          NAVIGATION TABS
          ═══════════════════════════════════════════════════════════════ */}
      <nav className="surface-base border-b border-[hsl(220,12%,18%)]">
        <div className="max-w-[1800px] mx-auto px-6">
          <div className="flex items-center gap-1">
            {[
              { id: 'overview', label: 'Overview', icon: Layers },
              { id: 'ghost-offices', label: 'Ghost Offices', icon: Ghost, badge: displayGhostOffices.filter(g => g.alert_level === 'critical').length },
              { id: 'trustlens', label: 'TrustLens', icon: Shield, badge: displayScamReports.length },
              { id: 'complaints', label: 'Complaints', icon: FileText },
              { id: 'agents', label: 'Agents', icon: Bot },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition-all border-b-2 -mb-[1px] ${
                  activeSection === tab.id
                    ? 'border-[hsl(270,65%,60%)] text-ghost'
                    : 'border-transparent text-smoke hover:text-light'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.badge && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-bold ${
                    tab.id === 'ghost-offices' ? 'bg-[hsl(0,72%,58%)]/20 text-danger' : 'bg-[hsl(38,92%,55%)]/20 text-warning'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════
          MAIN CONTENT
          ═══════════════════════════════════════════════════════════════ */}
      <main className="max-w-[1800px] mx-auto px-6 py-8">

        {/* ─────────────────────────────────────────────────────────────
            METRICS BAR
            ───────────────────────────────────────────────────────────── */}
        <div className="flex gap-5 mb-8">
          {/* Total Complaints */}
          <div className="flex-1 panel p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-smoke text-xs uppercase tracking-wider mb-2">Total Complaints</p>
                <p className="metric-value">{(stats?.complaints.total || 5247).toLocaleString()}</p>
                <div className="metric-delta positive mt-3">
                  <TrendingUp className="w-3 h-3" />
                  <span>12.5% from last month</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[hsl(205,85%,55%)]/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-info" />
              </div>
            </div>
          </div>

          {/* Ghost Offices */}
          <div className="flex-1 panel p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-smoke text-xs uppercase tracking-wider mb-2">Ghost Offices</p>
                <p className="metric-value text-ghost">{displayGhostOffices.filter(g => g.alert_level === 'critical').length}</p>
                <div className="metric-delta negative mt-3">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Critical attention needed</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[hsl(270,65%,60%)]/10 flex items-center justify-center">
                <Ghost className="w-5 h-5 text-ghost" />
              </div>
            </div>
          </div>

          {/* Scam Alerts */}
          <div className="flex-1 panel p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-smoke text-xs uppercase tracking-wider mb-2">Scam Alerts</p>
                <p className="metric-value text-danger">{stats?.scams.total || displayScamReports.length}</p>
                <div className="metric-delta negative mt-3">
                  <Zap className="w-3 h-3" />
                  <span>Active threats detected</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[hsl(0,72%,58%)]/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-danger" />
              </div>
            </div>
          </div>

          {/* Avg Resolution */}
          <div className="flex-1 panel p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-smoke text-xs uppercase tracking-wider mb-2">Avg Resolution</p>
                <p className="metric-value">{(stats?.complaints.avg_resolution_days || 8.3).toFixed(1)}<span className="text-lg text-smoke ml-0.5">d</span></p>
                <div className="metric-delta positive mt-3">
                  <TrendingDown className="w-3 h-3" />
                  <span>15% faster than last week</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-[hsl(152,60%,48%)]/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-safe" />
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            MAIN PANELS
            ───────────────────────────────────────────────────────────── */}
        <div className="flex gap-6">

          {/* LEFT COLUMN - Ghost Offices */}
          <div className="flex-1 min-w-0">
            <div className="panel">
              <div className="panel-header">
                <div className="flex items-center gap-3">
                  <Ghost className="w-5 h-5 text-ghost" />
                  <span className="panel-title">Ghost Office Leaderboard</span>
                </div>
                <span className="status-badge critical">
                  <span className="pulse-dot" style={{ background: 'hsl(0, 72%, 58%)' }} />
                  {displayGhostOffices.filter(g => g.alert_level === 'critical').length} Critical
                </span>
              </div>

              <div className="divide-y divide-[hsl(220,12%,18%)/50]">
                {displayGhostOffices.slice(0, 6).map((office, index) => (
                  <div key={office.office_id} className="p-4 hover:bg-[hsl(220,12%,18%)]/30 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold font-mono ${
                        index === 0 ? 'bg-[hsl(0,72%,58%)]/20 text-danger' :
                        index === 1 ? 'bg-[hsl(38,92%,55%)]/20 text-warning' :
                        index === 2 ? 'bg-[hsl(270,65%,60%)]/20 text-ghost' :
                        'bg-[hsl(220,12%,18%)] text-smoke'
                      }`}>
                        {index + 1}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-light">{office.department}</span>
                          <span className={`status-badge ${office.alert_level}`}>
                            {office.alert_level}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-smoke">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {office.ward_name}
                          </span>
                          <span className="text-[hsl(220,12%,28%)]">•</span>
                          <span>{office.zone} Zone</span>
                        </div>
                      </div>

                      {/* Ghost Score */}
                      <div className="text-right">
                        <div className="flex items-center gap-3">
                          <div className="w-20">
                            <div className="progress-bar h-1.5">
                              <div
                                className={`progress-bar-fill ${
                                  office.ghost_score >= 80 ? 'danger' :
                                  office.ghost_score >= 60 ? 'warning' :
                                  office.ghost_score >= 40 ? 'ghost' : 'safe'
                                }`}
                                style={{ width: `${office.ghost_score}%` }}
                              />
                            </div>
                          </div>
                          <span className="font-mono font-bold text-lg text-ghost w-12 text-right">
                            {office.ghost_score.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-xs text-smoke mt-1">
                          {office.complaint_stats.open} open · {office.complaint_stats.overdue} overdue
                        </p>
                      </div>

                      <ChevronRight className="w-4 h-4 text-smoke opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-[hsl(220,12%,18%)]">
                <button className="w-full btn-secondary justify-center">
                  View All Ghost Offices
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - TrustLens */}
          <div className="w-[440px] flex-shrink-0 space-y-6">

            {/* Live Analysis */}
            <div className="panel">
              <div className="panel-header">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-danger" />
                  <span className="panel-title">TrustLens Analyzer</span>
                </div>
                <span className="flex items-center gap-2 text-xs text-safe">
                  <span className="pulse-dot" />
                  Live
                </span>
              </div>

              <div className="p-4">
                <p className="text-sm text-smoke mb-3">Paste a suspicious message to analyze</p>
                <textarea
                  value={analyzeInput}
                  onChange={(e) => setAnalyzeInput(e.target.value)}
                  placeholder="e.g., BESCOM URGENT: Pay Rs. 1500 immediately..."
                  className="input-field h-20 resize-none mb-3 text-sm"
                />
                <button
                  onClick={analyzeMessage}
                  disabled={isAnalyzing || !analyzeInput.trim()}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Target className="w-4 h-4" />
                      Analyze Message
                    </>
                  )}
                </button>

                {/* Analysis Result */}
                {analysisResult && (
                  <div className="mt-4 p-4 rounded-xl bg-[hsl(230,20%,8%)] border border-[hsl(220,12%,18%)]">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`status-badge ${analysisResult.risk_level}`}>
                        {analysisResult.risk_level?.toUpperCase()} RISK
                      </span>
                      <span className="font-mono text-lg font-bold text-light">
                        {analysisResult.trust_score}/100
                      </span>
                    </div>
                    <p className="text-sm text-smoke">
                      Scam Probability: <span className="text-danger font-mono font-bold">
                        {(analysisResult.scam_probability * 100).toFixed(1)}%
                      </span>
                    </p>
                    {analysisResult.indicators && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {Object.entries(analysisResult.indicators).map(([key, value]) => (
                          value && (
                            <span key={key} className="text-xs px-2 py-1 rounded bg-[hsl(0,72%,58%)]/10 text-danger">
                              {key.replace(/_/g, ' ')}
                            </span>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Scam Reports */}
            <div className="panel">
              <div className="panel-header">
                <div className="flex items-center gap-3">
                  <FileWarning className="w-5 h-5 text-warning" />
                  <span className="panel-title">Recent Threats</span>
                </div>
              </div>

              <div className="p-3 space-y-3">
                {displayScamReports.slice(0, 3).map((report) => (
                  <div
                    key={report.report_id}
                    className={`scam-card ${report.related_outage?.is_correlated ? 'correlated' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={`status-badge ${report.risk_level}`}>
                        {report.risk_level}
                      </span>
                      {report.related_outage?.is_correlated && (
                        <span className="text-xs px-2 py-0.5 rounded bg-[hsl(38,92%,55%)]/10 text-warning flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          Outage Linked
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-light line-clamp-2 mb-2">{report.content}</p>
                    <div className="flex items-center justify-between text-xs text-smoke">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {report.spoofed_department}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {report.victim_reports} victims
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            ZONE HEALTH + AGENTS
            ───────────────────────────────────────────────────────────── */}
        <div className="flex gap-6 mt-8">
          {/* Zone Health */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-light">Civic Health by Zone</h2>
                <p className="text-sm text-smoke">Performance overview across Bengaluru</p>
              </div>
              <button className="btn-secondary text-sm py-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </button>
            </div>

            <div className="flex gap-3">
              {[
                { zone: 'East', grade: 'C', score: 45.2, complaints: 1250, ghostOffices: 4 },
                { zone: 'West', grade: 'B', score: 62.8, complaints: 980, ghostOffices: 2 },
                { zone: 'North', grade: 'D', score: 38.5, complaints: 1450, ghostOffices: 5 },
                { zone: 'South', grade: 'B', score: 71.3, complaints: 850, ghostOffices: 1 },
                { zone: 'Central', grade: 'C', score: 55.9, complaints: 720, ghostOffices: 0 },
              ].map((zone) => (
                <div key={zone.zone} className="flex-1 zone-card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`zone-grade ${zone.grade} w-10 h-10 text-base`}>{zone.grade}</div>
                    <div>
                      <p className="font-semibold text-light text-sm">{zone.zone}</p>
                      <p className="text-xs text-smoke">{zone.score.toFixed(1)}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-smoke">Complaints</span>
                      <span className="text-light font-mono">{zone.complaints.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-smoke">Ghost Offices</span>
                      <span className={zone.ghostOffices > 0 ? 'text-danger font-mono' : 'text-safe font-mono'}>
                        {zone.ghostOffices}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            AGENT STATUS
            ───────────────────────────────────────────────────────────── */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-light">OpenClaw Agents</h2>
              <p className="text-sm text-smoke">AI-powered civic intelligence</p>
            </div>
            <span className="flex items-center gap-2 text-sm text-safe">
              <Activity className="w-4 h-4" />
              2 running
            </span>
          </div>

          <div className="flex gap-4">
            {[
              { name: 'Ghost Hunter', desc: 'Detects unresponsive offices', status: 'running', tasks: 156, icon: Ghost, color: 'from-[hsl(270,65%,60%)] to-[hsl(300,60%,50%)]' },
              { name: 'Scam Detector', desc: 'Analyzes fraud attempts', status: 'running', tasks: 234, icon: Shield, color: 'from-[hsl(0,72%,58%)] to-[hsl(25,90%,55%)]' },
              { name: 'Escalation Tracer', desc: 'Maps complaint journeys', status: 'idle', tasks: 89, icon: Target, color: 'from-[hsl(205,85%,55%)] to-[hsl(185,70%,45%)]' },
              { name: 'RTI Drafter', desc: 'Generates RTI applications', status: 'idle', tasks: 23, icon: FileText, color: 'from-[hsl(38,92%,55%)] to-[hsl(45,95%,50%)]' },
            ].map((agent) => (
              <div key={agent.name} className={`flex-1 agent-card ${agent.status}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`agent-icon bg-gradient-to-br ${agent.color}`}>
                    <agent.icon className="w-5 h-5 text-pure" />
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    agent.status === 'running'
                      ? 'bg-[hsl(152,60%,48%)]/15 text-safe'
                      : 'bg-[hsl(220,12%,18%)] text-smoke'
                  }`}>
                    {agent.status}
                  </span>
                </div>
                <h3 className="font-semibold text-light text-sm mb-0.5">{agent.name}</h3>
                <p className="text-xs text-smoke mb-3">{agent.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-smoke">{agent.tasks} tasks</span>
                  <button className="btn-ghost p-1.5 rounded">
                    <Play className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-[hsl(220,12%,18%)] mt-12">
        <div className="max-w-[1800px] mx-auto px-6 py-5">
          <div className="flex items-center justify-between text-sm text-smoke">
            <div className="flex items-center gap-2">
              <Ghost className="w-4 h-4 text-ghost" />
              <span className="font-medium text-light">GhostOffice</span>
              <span className="text-[hsl(220,12%,28%)]">v1.0.0</span>
              <span className="mx-2 text-[hsl(220,12%,28%)]">·</span>
              <span>Powered by Elastic + AWS</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-light transition-colors">Docs</a>
              <a href="#" className="hover:text-light transition-colors">API</a>
              <a href="#" className="hover:text-light transition-colors flex items-center gap-1">
                GitHub <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
