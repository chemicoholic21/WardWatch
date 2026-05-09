'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Icons as simple SVG components
const GhostIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2 2 3-3 3 3 2-2 3 3V10a8 8 0 0 0-8-8z"/>
  </svg>
);

const ShieldIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const FileIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>
  </svg>
);

const ClockIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
  </svg>
);

const AlertIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
);

const MapPinIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

const ZapIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);

const UsersIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const SearchIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
  </svg>
);

const BellIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const PlayIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);

const TargetIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);

// Types
interface GhostOffice {
  office_id: string;
  department: string;
  ward_name: string;
  zone: string;
  ghost_score: number;
  alert_level: 'critical' | 'high' | 'medium' | 'low';
  complaint_stats: { total: number; open: number; overdue: number };
}

interface ScamReport {
  report_id: string;
  content: string;
  spoofed_department: string;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  trust_score: number;
  victim_reports: number;
  related_outage: { is_correlated: boolean };
}

// Styles object
const styles = {
  // Layout
  container: "min-h-screen bg-[hsl(222,47%,7%)]",
  maxWidth: "max-w-7xl mx-auto px-4 sm:px-6",

  // Header
  header: "sticky top-0 z-50 bg-[hsl(222,47%,9%)] border-b border-[hsl(215,20%,18%)]",
  headerInner: "h-16 flex items-center justify-between gap-4",
  logo: "flex items-center gap-3",
  logoIcon: "w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white",
  logoText: "text-lg font-bold text-white",
  logoSub: "text-xs text-gray-500",
  searchBox: "flex-1 max-w-md relative",
  searchInput: "w-full bg-[hsl(222,47%,12%)] border border-[hsl(215,20%,20%)] rounded-lg pl-10 pr-4 py-2 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-purple-500",
  headerActions: "flex items-center gap-2",
  iconBtn: "p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[hsl(215,20%,20%)] transition-colors",
  avatar: "w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold",

  // Navigation
  nav: "bg-[hsl(222,47%,9%)] border-b border-[hsl(215,20%,18%)]",
  navInner: "flex gap-1",
  navItem: "px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
  navActive: "text-purple-400 border-purple-500",
  navInactive: "text-gray-500 border-transparent hover:text-gray-300",
  navBadge: "ml-2 px-1.5 py-0.5 text-xs rounded font-medium",

  // Main content
  main: "py-6",

  // Metric cards
  metricsGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6",
  metricCard: "bg-[hsl(222,47%,10%)] border border-[hsl(215,20%,18%)] rounded-xl p-5",
  metricHeader: "flex items-start justify-between mb-3",
  metricLabel: "text-xs text-gray-500 uppercase tracking-wide",
  metricValue: "text-3xl font-bold text-white font-mono",
  metricIcon: "w-10 h-10 rounded-lg flex items-center justify-center",
  metricDelta: "flex items-center gap-1 text-xs mt-2",

  // Panels
  twoCol: "grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6",
  panel: "bg-[hsl(222,47%,10%)] border border-[hsl(215,20%,18%)] rounded-xl overflow-hidden",
  panelHeader: "flex items-center justify-between px-5 py-4 border-b border-[hsl(215,20%,18%)]",
  panelTitle: "flex items-center gap-2 text-sm font-semibold text-white",
  panelBody: "p-5",

  // Ghost office list
  officeRow: "flex items-center gap-4 py-4 px-5 border-b border-[hsl(215,20%,15%)] hover:bg-[hsl(215,20%,12%)] transition-colors cursor-pointer",
  officeRank: "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold font-mono",
  officeInfo: "flex-1 min-w-0",
  officeName: "font-semibold text-white text-sm",
  officeLocation: "flex items-center gap-2 text-xs text-gray-500 mt-0.5",
  officeScore: "text-right",
  scoreBar: "w-20 h-1.5 bg-[hsl(215,20%,20%)] rounded-full overflow-hidden",
  scoreValue: "text-lg font-bold font-mono text-purple-400",

  // Status badges
  badge: "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
  badgeCritical: "bg-red-500/20 text-red-400",
  badgeHigh: "bg-orange-500/20 text-orange-400",
  badgeMedium: "bg-yellow-500/20 text-yellow-400",
  badgeLow: "bg-green-500/20 text-green-400",

  // TrustLens
  textarea: "w-full bg-[hsl(222,47%,8%)] border border-[hsl(215,20%,20%)] rounded-lg p-3 text-sm text-gray-300 placeholder-gray-500 resize-none focus:outline-none focus:border-purple-500",
  btnPrimary: "w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2",

  // Scam card
  scamCard: "p-4 bg-[hsl(222,47%,8%)] border-l-3 border-l-red-500 rounded-lg mb-3",
  scamCardCorrelated: "border-l-orange-500 bg-gradient-to-r from-orange-500/5 to-transparent",

  // Zone cards
  zonesGrid: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6",
  zoneCard: "bg-[hsl(222,47%,10%)] border border-[hsl(215,20%,18%)] rounded-xl p-4 hover:border-purple-500/50 transition-colors cursor-pointer",
  zoneGrade: "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold font-mono",

  // Agent cards
  agentsGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
  agentCard: "bg-[hsl(222,47%,10%)] border border-[hsl(215,20%,18%)] rounded-xl p-5 relative overflow-hidden",
  agentRunning: "border-green-500/30",
  agentIcon: "w-12 h-12 rounded-xl flex items-center justify-center text-white mb-3",
  agentName: "font-semibold text-white text-sm",
  agentDesc: "text-xs text-gray-500 mt-1",
  agentStatus: "absolute top-4 right-4 text-xs px-2 py-0.5 rounded-full",

  // Footer
  footer: "border-t border-[hsl(215,20%,18%)] mt-8",
  footerInner: "py-6 flex items-center justify-between text-sm text-gray-500",
};

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [ghostOffices, setGhostOffices] = useState<GhostOffice[]>([]);
  const [scamReports, setScamReports] = useState<ScamReport[]>([]);
  const [analyzeInput, setAnalyzeInput] = useState('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stats, setStats] = useState({ complaints: 5247, ghostCount: 2, scamCount: 3, avgDays: 8.3 });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [ghostRes, scamRes] = await Promise.all([
        fetch(`${API_URL}/api/ghost-offices?limit=10`).catch(() => null),
        fetch(`${API_URL}/api/trustlens/reports?limit=5`).catch(() => null),
      ]);

      if (ghostRes?.ok) {
        const data = await ghostRes.json();
        if (data.data?.length) setGhostOffices(data.data);
      }

      if (scamRes?.ok) {
        const data = await scamRes.json();
        if (data.data?.length) setScamReports(data.data);
      }
    } catch (e) {
      console.error(e);
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
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  }

  // Demo data
  const demoGhostOffices: GhostOffice[] = [
    { office_id: '1', department: 'BBMP', ward_name: 'Mahadevapura', zone: 'East', ghost_score: 92.4, alert_level: 'critical', complaint_stats: { total: 187, open: 142, overdue: 89 } },
    { office_id: '2', department: 'BWSSB', ward_name: 'HSR Layout', zone: 'South', ghost_score: 87.1, alert_level: 'critical', complaint_stats: { total: 156, open: 118, overdue: 72 } },
    { office_id: '3', department: 'BESCOM', ward_name: 'Whitefield', zone: 'East', ghost_score: 79.8, alert_level: 'high', complaint_stats: { total: 134, open: 98, overdue: 56 } },
    { office_id: '4', department: 'BBMP', ward_name: 'Koramangala', zone: 'South', ghost_score: 72.3, alert_level: 'high', complaint_stats: { total: 98, open: 67, overdue: 41 } },
    { office_id: '5', department: 'BWSSB', ward_name: 'Indiranagar', zone: 'East', ghost_score: 65.9, alert_level: 'medium', complaint_stats: { total: 76, open: 45, overdue: 28 } },
  ];

  const demoScamReports: ScamReport[] = [
    { report_id: '1', content: 'BESCOM Alert: Power disconnection in 2 hours. Pay Rs. 1500 at bit.ly/bescom-pay', spoofed_department: 'BESCOM', risk_level: 'critical', trust_score: 8, victim_reports: 23, related_outage: { is_correlated: true } },
    { report_id: '2', content: 'BWSSB: Water connection will be cut. Clear dues via UPI: 9876543210@paytm', spoofed_department: 'BWSSB', risk_level: 'critical', trust_score: 12, victim_reports: 15, related_outage: { is_correlated: false } },
    { report_id: '3', content: 'BBMP Property Tax: 50% penalty waiver if paid today. Contact 9988776655', spoofed_department: 'BBMP', risk_level: 'high', trust_score: 25, victim_reports: 8, related_outage: { is_correlated: false } },
  ];

  const displayGhosts = ghostOffices.length > 0 ? ghostOffices : demoGhostOffices;
  const displayScams = scamReports.length > 0 ? scamReports : demoScamReports;

  const getBadgeClass = (level: string) => {
    switch (level) {
      case 'critical': return styles.badgeCritical;
      case 'high': return styles.badgeHigh;
      case 'medium': return styles.badgeMedium;
      default: return styles.badgeLow;
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-500/20 text-green-400';
      case 'B': return 'bg-blue-500/20 text-blue-400';
      case 'C': return 'bg-yellow-500/20 text-yellow-400';
      case 'D': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-red-500/20 text-red-400';
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container + " flex items-center justify-center"}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-purple-500 animate-pulse">
            <GhostIcon className="w-16 h-16" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Loading GhostOffice</h2>
          <p className="text-gray-500 text-sm">Connecting to Civic Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.maxWidth}>
          <div className={styles.headerInner}>
            <div className={styles.logo}>
              <div className={styles.logoIcon}>
                <GhostIcon className="w-5 h-5" />
              </div>
              <div>
                <div className={styles.logoText}>GhostOffice</div>
                <div className={styles.logoSub}>Civic Intelligence</div>
              </div>
            </div>

            <div className={styles.searchBox}>
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" placeholder="Search complaints, wards..." className={styles.searchInput} />
            </div>

            <div className={styles.headerActions}>
              <button className={styles.iconBtn}>
                <BellIcon className="w-5 h-5" />
              </button>
              <div className={styles.avatar}>A</div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.maxWidth}>
          <div className={styles.navInner}>
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'ghost-offices', label: 'Ghost Offices', badge: displayGhosts.filter(g => g.alert_level === 'critical').length },
              { id: 'trustlens', label: 'TrustLens', badge: displayScams.length },
              { id: 'complaints', label: 'Complaints' },
              { id: 'agents', label: 'Agents' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${styles.navItem} ${activeTab === tab.id ? styles.navActive : styles.navInactive}`}
              >
                {tab.label}
                {tab.badge && (
                  <span className={`${styles.navBadge} ${tab.id === 'ghost-offices' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className={styles.main}>
        <div className={styles.maxWidth}>

          {/* Metrics */}
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <div>
                  <div className={styles.metricLabel}>Total Complaints</div>
                  <div className={styles.metricValue}>{stats.complaints.toLocaleString()}</div>
                </div>
                <div className={`${styles.metricIcon} bg-blue-500/10 text-blue-400`}>
                  <FileIcon className="w-5 h-5" />
                </div>
              </div>
              <div className={`${styles.metricDelta} text-green-400`}>
                <span>↑ 12.5% from last month</span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <div>
                  <div className={styles.metricLabel}>Ghost Offices</div>
                  <div className={`${styles.metricValue} text-purple-400`}>{displayGhosts.filter(g => g.alert_level === 'critical').length}</div>
                </div>
                <div className={`${styles.metricIcon} bg-purple-500/10 text-purple-400`}>
                  <GhostIcon className="w-5 h-5" />
                </div>
              </div>
              <div className={`${styles.metricDelta} text-red-400`}>
                <AlertIcon className="w-3 h-3" />
                <span>Critical attention needed</span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <div>
                  <div className={styles.metricLabel}>Scam Alerts</div>
                  <div className={`${styles.metricValue} text-red-400`}>{displayScams.length}</div>
                </div>
                <div className={`${styles.metricIcon} bg-red-500/10 text-red-400`}>
                  <ShieldIcon className="w-5 h-5" />
                </div>
              </div>
              <div className={`${styles.metricDelta} text-orange-400`}>
                <ZapIcon className="w-3 h-3" />
                <span>Active threats detected</span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <div>
                  <div className={styles.metricLabel}>Avg Resolution</div>
                  <div className={styles.metricValue}>{stats.avgDays}<span className="text-lg text-gray-500 ml-1">d</span></div>
                </div>
                <div className={`${styles.metricIcon} bg-green-500/10 text-green-400`}>
                  <ClockIcon className="w-5 h-5" />
                </div>
              </div>
              <div className={`${styles.metricDelta} text-green-400`}>
                <span>↓ 15% faster than last week</span>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className={styles.twoCol}>
            {/* Ghost Office Leaderboard - Takes 2 columns */}
            <div className={`${styles.panel} lg:col-span-2`}>
              <div className={styles.panelHeader}>
                <div className={styles.panelTitle}>
                  <GhostIcon className="w-5 h-5 text-purple-400" />
                  <span>Ghost Office Leaderboard</span>
                </div>
                <span className={`${styles.badge} ${styles.badgeCritical}`}>
                  {displayGhosts.filter(g => g.alert_level === 'critical').length} Critical
                </span>
              </div>

              <div>
                {displayGhosts.slice(0, 5).map((office, idx) => (
                  <div key={office.office_id} className={styles.officeRow}>
                    <div className={`${styles.officeRank} ${
                      idx === 0 ? 'bg-red-500/20 text-red-400' :
                      idx === 1 ? 'bg-orange-500/20 text-orange-400' :
                      idx === 2 ? 'bg-purple-500/20 text-purple-400' :
                      'bg-[hsl(215,20%,20%)] text-gray-400'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className={styles.officeInfo}>
                      <div className="flex items-center gap-2">
                        <span className={styles.officeName}>{office.department}</span>
                        <span className={`${styles.badge} ${getBadgeClass(office.alert_level)}`}>
                          {office.alert_level}
                        </span>
                      </div>
                      <div className={styles.officeLocation}>
                        <MapPinIcon className="w-3 h-3" />
                        <span>{office.ward_name}</span>
                        <span className="text-gray-600">•</span>
                        <span>{office.zone} Zone</span>
                      </div>
                    </div>
                    <div className={styles.officeScore}>
                      <div className="flex items-center gap-3">
                        <div className={styles.scoreBar}>
                          <div
                            className={`h-full rounded-full ${
                              office.ghost_score >= 80 ? 'bg-red-500' :
                              office.ghost_score >= 60 ? 'bg-orange-500' :
                              'bg-yellow-500'
                            }`}
                            style={{ width: `${office.ghost_score}%` }}
                          />
                        </div>
                        <span className={styles.scoreValue}>{office.ghost_score.toFixed(1)}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {office.complaint_stats.open} open · {office.complaint_stats.overdue} overdue
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TrustLens Panel - Takes 1 column */}
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div className={styles.panelTitle}>
                  <ShieldIcon className="w-5 h-5 text-red-400" />
                  <span>TrustLens</span>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-green-400">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Live
                </span>
              </div>

              <div className={styles.panelBody}>
                <p className="text-sm text-gray-500 mb-3">Analyze suspicious messages</p>
                <textarea
                  value={analyzeInput}
                  onChange={(e) => setAnalyzeInput(e.target.value)}
                  placeholder="Paste message here..."
                  className={styles.textarea}
                  rows={3}
                />
                <button
                  onClick={analyzeMessage}
                  disabled={isAnalyzing || !analyzeInput.trim()}
                  className={`${styles.btnPrimary} mt-3 disabled:opacity-50`}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <TargetIcon className="w-4 h-4" />
                      Analyze
                    </>
                  )}
                </button>

                {analysisResult && (
                  <div className="mt-4 p-4 rounded-lg bg-[hsl(222,47%,8%)] border border-[hsl(215,20%,20%)]">
                    <div className="flex justify-between items-center mb-2">
                      <span className={`${styles.badge} ${getBadgeClass(analysisResult.risk_level)}`}>
                        {analysisResult.risk_level?.toUpperCase()} RISK
                      </span>
                      <span className="font-mono font-bold text-white">{analysisResult.trust_score}/100</span>
                    </div>
                    <p className="text-sm text-gray-400">
                      Scam Probability: <span className="text-red-400 font-mono">{(analysisResult.scam_probability * 100).toFixed(1)}%</span>
                    </p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-[hsl(215,20%,18%)]">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Recent Threats</p>
                  {displayScams.slice(0, 2).map((scam) => (
                    <div key={scam.report_id} className={`${styles.scamCard} ${scam.related_outage.is_correlated ? styles.scamCardCorrelated : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`${styles.badge} ${getBadgeClass(scam.risk_level)}`}>{scam.risk_level}</span>
                        {scam.related_outage.is_correlated && (
                          <span className="text-xs text-orange-400 flex items-center gap-1">
                            <ZapIcon className="w-3 h-3" /> Outage
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-300 line-clamp-2">{scam.content}</p>
                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>{scam.spoofed_department}</span>
                        <span className="flex items-center gap-1">
                          <UsersIcon className="w-3 h-3" /> {scam.victim_reports}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Zone Health */}
          <div className="mb-6">
            <h2 className="text-base font-semibold text-white mb-4">Civic Health by Zone</h2>
            <div className={styles.zonesGrid}>
              {[
                { zone: 'East', grade: 'C', score: 45.2, complaints: 1250, ghosts: 4 },
                { zone: 'West', grade: 'B', score: 62.8, complaints: 980, ghosts: 2 },
                { zone: 'North', grade: 'D', score: 38.5, complaints: 1450, ghosts: 5 },
                { zone: 'South', grade: 'B', score: 71.3, complaints: 850, ghosts: 1 },
                { zone: 'Central', grade: 'C', score: 55.9, complaints: 720, ghosts: 0 },
              ].map((z) => (
                <div key={z.zone} className={styles.zoneCard}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`${styles.zoneGrade} ${getGradeColor(z.grade)}`}>{z.grade}</div>
                    <div>
                      <div className="font-semibold text-white text-sm">{z.zone}</div>
                      <div className="text-xs text-gray-500">{z.score.toFixed(1)}</div>
                    </div>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Complaints</span>
                      <span className="text-gray-300 font-mono">{z.complaints}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ghost Offices</span>
                      <span className={z.ghosts > 0 ? 'text-red-400 font-mono' : 'text-green-400 font-mono'}>{z.ghosts}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Agents */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">OpenClaw Agents</h2>
              <span className="text-sm text-green-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                2 running
              </span>
            </div>
            <div className={styles.agentsGrid}>
              {[
                { name: 'Ghost Hunter', desc: 'Detects unresponsive offices', status: 'running', tasks: 156, color: 'from-purple-500 to-pink-500' },
                { name: 'Scam Detector', desc: 'Analyzes fraud attempts', status: 'running', tasks: 234, color: 'from-red-500 to-orange-500' },
                { name: 'Escalation Tracer', desc: 'Maps complaint journeys', status: 'idle', tasks: 89, color: 'from-blue-500 to-cyan-500' },
                { name: 'RTI Drafter', desc: 'Generates RTI applications', status: 'idle', tasks: 23, color: 'from-yellow-500 to-orange-500' },
              ].map((agent) => (
                <div key={agent.name} className={`${styles.agentCard} ${agent.status === 'running' ? styles.agentRunning : ''}`}>
                  <div className={`${styles.agentIcon} bg-gradient-to-br ${agent.color}`}>
                    {agent.name === 'Ghost Hunter' && <GhostIcon />}
                    {agent.name === 'Scam Detector' && <ShieldIcon />}
                    {agent.name === 'Escalation Tracer' && <TargetIcon />}
                    {agent.name === 'RTI Drafter' && <FileIcon />}
                  </div>
                  <div className={styles.agentName}>{agent.name}</div>
                  <div className={styles.agentDesc}>{agent.desc}</div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-500">{agent.tasks} tasks</span>
                    <button className="p-1.5 rounded hover:bg-[hsl(215,20%,20%)] text-gray-400 hover:text-white transition-colors">
                      <PlayIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <span className={`${styles.agentStatus} ${agent.status === 'running' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {agent.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.maxWidth}>
          <div className={styles.footerInner}>
            <div className="flex items-center gap-2">
              <GhostIcon className="w-4 h-4 text-purple-400" />
              <span className="text-white font-medium">GhostOffice</span>
              <span className="text-gray-600">v1.0.0</span>
              <span className="mx-2 text-gray-700">•</span>
              <span>Powered by Elastic + AWS</span>
            </div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Docs</a>
              <a href="#" className="hover:text-white transition-colors">API</a>
              <a href="#" className="hover:text-white transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
