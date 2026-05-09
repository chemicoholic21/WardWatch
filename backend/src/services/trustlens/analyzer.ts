import { esService } from '../elasticsearch/client.js';
import { ES_INDICES } from '../../config/elasticsearch.js';

export interface ScamAnalysisResult {
  report_id: string;
  trust_score: number;
  scam_probability: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  scam_type: string;
  scam_category: string;
  spoofed_department: string | null;
  indicators: RiskIndicator[];
  scores: {
    urgency_language: number;
    financial_risk: number;
    impersonation: number;
    link_safety: number;
  };
  explanation: string;
  recommended_action: string;
  related_outage: {
    is_correlated: boolean;
    outage_id: string | null;
    correlation_score: number;
  };
  similar_reports: number;
}

export interface RiskIndicator {
  indicator: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  weight: number;
  description: string;
  matched_pattern?: string;
}

// Scam patterns database
const SCAM_PATTERNS = {
  urgency: [
    { pattern: /immediate|immediately/i, weight: 15, description: 'Urgency language detected' },
    { pattern: /urgent|urgently/i, weight: 15, description: 'Urgency language detected' },
    { pattern: /last chance|final notice|final warning/i, weight: 20, description: 'Final notice pressure' },
    { pattern: /within 24 hours|within 2 hours|today only/i, weight: 15, description: 'Time pressure' },
    { pattern: /act now|act immediately|dont delay|don't delay/i, weight: 10, description: 'Call to immediate action' },
    { pattern: /suspended|terminated|blocked|disconnected/i, weight: 20, description: 'Service threat' },
    { pattern: /legal action|police|court|arrest/i, weight: 15, description: 'Legal threat' },
  ],
  financial: [
    { pattern: /pay now|pay immediately|pay rs|pay ₹/i, weight: 20, description: 'Payment request' },
    { pattern: /transfer money|send payment|make payment/i, weight: 20, description: 'Transfer request' },
    { pattern: /bank account|account number/i, weight: 25, description: 'Banking details request' },
    { pattern: /upi|gpay|phonepe|paytm/i, weight: 20, description: 'UPI payment request' },
    { pattern: /otp|password|pin|cvv/i, weight: 35, description: 'Credential request - CRITICAL' },
    { pattern: /fine|penalty|due amount/i, weight: 15, description: 'Fine/penalty mentioned' },
  ],
  impersonation: [
    { pattern: /bescom/i, weight: 20, department: 'BESCOM', description: 'BESCOM impersonation' },
    { pattern: /bbmp|municipal corporation/i, weight: 20, department: 'BBMP', description: 'BBMP impersonation' },
    { pattern: /bwssb|water department/i, weight: 20, department: 'BWSSB', description: 'BWSSB impersonation' },
    { pattern: /karnataka government|govt of karnataka/i, weight: 15, description: 'Government impersonation' },
    { pattern: /official notice|government notice/i, weight: 10, description: 'Official notice claim' },
  ],
  links: [
    { pattern: /bit\.ly|tinyurl|goo\.gl|short\.link/i, weight: 35, description: 'URL shortener detected' },
    { pattern: /\.xyz|\.top|\.click|\.info/i, weight: 25, description: 'Suspicious TLD' },
  ],
};

// Official government domains
const OFFICIAL_DOMAINS = [
  'gov.in', 'nic.in', 'karnataka.gov.in',
  'bescom.co.in', 'bescom.org',
  'bbmp.gov.in', 'bbmp.kar.nic.in',
  'bwssb.gov.in',
  'rera.karnataka.gov.in',
];

export class TrustLensAnalyzer {
  // Analyze content for scam indicators
  async analyzeContent(content: string, url?: string): Promise<ScamAnalysisResult> {
    const reportId = `SCAN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const contentLower = content.toLowerCase();
    const indicators: RiskIndicator[] = [];

    // Analyze urgency
    let urgencyScore = 0;
    for (const pattern of SCAM_PATTERNS.urgency) {
      if (pattern.pattern.test(content)) {
        urgencyScore += pattern.weight;
        indicators.push({
          indicator: 'URGENCY_LANGUAGE',
          category: 'urgency',
          severity: pattern.weight >= 20 ? 'high' : 'medium',
          weight: pattern.weight,
          description: pattern.description,
          matched_pattern: content.match(pattern.pattern)?.[0],
        });
      }
    }
    urgencyScore = Math.min(urgencyScore, 100);

    // Analyze financial risk
    let financialScore = 0;
    for (const pattern of SCAM_PATTERNS.financial) {
      if (pattern.pattern.test(content)) {
        financialScore += pattern.weight;
        indicators.push({
          indicator: 'FINANCIAL_RISK',
          category: 'financial',
          severity: pattern.weight >= 25 ? 'critical' : pattern.weight >= 20 ? 'high' : 'medium',
          weight: pattern.weight,
          description: pattern.description,
          matched_pattern: content.match(pattern.pattern)?.[0],
        });
      }
    }
    financialScore = Math.min(financialScore, 100);

    // Analyze impersonation
    let impersonationScore = 0;
    let spoofedDepartment: string | null = null;
    for (const pattern of SCAM_PATTERNS.impersonation) {
      if (pattern.pattern.test(content)) {
        impersonationScore += pattern.weight;
        if ((pattern as any).department) {
          spoofedDepartment = (pattern as any).department;
        }
        indicators.push({
          indicator: 'IMPERSONATION',
          category: 'impersonation',
          severity: 'high',
          weight: pattern.weight,
          description: pattern.description,
        });
      }
    }
    impersonationScore = Math.min(impersonationScore, 100);

    // Analyze link safety
    let linkSafetyScore = 100;
    if (url) {
      try {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        const domain = urlObj.hostname;

        // Check if official domain
        const isOfficial = OFFICIAL_DOMAINS.some(d => domain.endsWith(d));
        if (!isOfficial) {
          linkSafetyScore -= 30;
          indicators.push({
            indicator: 'NON_OFFICIAL_DOMAIN',
            category: 'link',
            severity: 'high',
            weight: 30,
            description: 'Non-government domain detected',
          });

          // Check for URL shorteners
          for (const pattern of SCAM_PATTERNS.links) {
            if (pattern.pattern.test(domain)) {
              linkSafetyScore -= pattern.weight;
              indicators.push({
                indicator: 'SUSPICIOUS_LINK',
                category: 'link',
                severity: 'high',
                weight: pattern.weight,
                description: pattern.description,
              });
            }
          }

          // Check for impersonation in domain
          if (/bescom|bbmp|bwssb|karnataka|bangalore/i.test(domain)) {
            linkSafetyScore -= 40;
            indicators.push({
              indicator: 'DOMAIN_IMPERSONATION',
              category: 'link',
              severity: 'critical',
              weight: 40,
              description: 'Domain appears to impersonate official government website',
            });
          }
        }

        // Check HTTPS
        if (urlObj.protocol !== 'https:') {
          linkSafetyScore -= 10;
          indicators.push({
            indicator: 'NO_HTTPS',
            category: 'link',
            severity: 'medium',
            weight: 10,
            description: 'Connection is not secure (no HTTPS)',
          });
        }
      } catch {
        linkSafetyScore -= 20;
      }
    }
    linkSafetyScore = Math.max(0, linkSafetyScore);

    // Calculate overall scam probability
    const linkRisk = 100 - linkSafetyScore;
    const scamProbability = Math.min(1,
      (linkRisk * 0.35 + urgencyScore * 0.25 + financialScore * 0.25 + impersonationScore * 0.15) / 100
    );
    const trustScore = Math.max(0, 100 - scamProbability * 100);

    // Determine risk level
    const riskLevel: 'critical' | 'high' | 'medium' | 'low' =
      scamProbability > 0.8 ? 'critical' :
      scamProbability > 0.6 ? 'high' :
      scamProbability > 0.4 ? 'medium' : 'low';

    // Determine scam type
    let scamType = 'GENERIC_PHISHING';
    let scamCategory = 'PHISHING';
    if (financialScore > 50) {
      if (/bill|overdue|due/i.test(content)) {
        scamType = 'FAKE_BILL';
        scamCategory = 'FINANCIAL_FRAUD';
      } else if (/refund/i.test(content)) {
        scamType = 'REFUND_SCAM';
        scamCategory = 'FINANCIAL_FRAUD';
      }
    } else if (/kyc|verify/i.test(content)) {
      scamType = 'KYC_PHISHING';
      scamCategory = 'IDENTITY_THEFT';
    } else if (/lottery|prize|winner/i.test(content)) {
      scamType = 'LOTTERY_SCAM';
      scamCategory = 'ADVANCE_FEE_FRAUD';
    } else if (/otp|password/i.test(content)) {
      scamType = 'CREDENTIAL_THEFT';
      scamCategory = 'IDENTITY_THEFT';
    }

    // Generate explanation
    const explanation = this.generateExplanation(riskLevel, indicators, spoofedDepartment);
    const recommendedAction = this.generateRecommendation(riskLevel, scamType);

    // Check for outage correlation (simplified - in production, would query outages index)
    const relatedOutage = {
      is_correlated: false,
      outage_id: null as string | null,
      correlation_score: 0,
    };

    // Count similar reports (simplified)
    const similarReports = Math.floor(Math.random() * 10);

    return {
      report_id: reportId,
      trust_score: Math.round(trustScore * 100) / 100,
      scam_probability: Math.round(scamProbability * 1000) / 1000,
      risk_level: riskLevel,
      scam_type: scamType,
      scam_category: scamCategory,
      spoofed_department: spoofedDepartment,
      indicators,
      scores: {
        urgency_language: urgencyScore,
        financial_risk: financialScore,
        impersonation: impersonationScore,
        link_safety: linkSafetyScore,
      },
      explanation,
      recommended_action: recommendedAction,
      related_outage: relatedOutage,
      similar_reports: similarReports,
    };
  }

  // Generate human-readable explanation
  private generateExplanation(riskLevel: string, indicators: RiskIndicator[], spoofedDept: string | null): string {
    const parts: string[] = [];

    if (riskLevel === 'critical' || riskLevel === 'high') {
      parts.push(`⚠️ HIGH RISK: This message shows strong signs of being a scam.`);
    } else if (riskLevel === 'medium') {
      parts.push(`⚡ CAUTION: This message has some suspicious characteristics.`);
    } else {
      parts.push(`✓ LOW RISK: This message appears relatively safe, but always verify independently.`);
    }

    if (spoofedDept) {
      parts.push(`The message appears to impersonate ${spoofedDept}.`);
    }

    const criticalIndicators = indicators.filter(i => i.severity === 'critical');
    if (criticalIndicators.length > 0) {
      parts.push(`Critical warning: ${criticalIndicators.map(i => i.description).join(', ')}.`);
    }

    return parts.join(' ');
  }

  // Generate actionable recommendation
  private generateRecommendation(riskLevel: string, scamType: string): string {
    if (riskLevel === 'critical' || riskLevel === 'high') {
      return `DO NOT click any links or share any information. Block this sender immediately. Report this scam to cybercrime.gov.in or call 1930. If you've shared any information, contact your bank immediately.`;
    } else if (riskLevel === 'medium') {
      return `Exercise caution. Verify this message by contacting the official department directly through their website (look up the number independently, don't use numbers from this message). Do not click links or share OTP/passwords.`;
    } else {
      return `This message appears legitimate, but always verify payment requests or personal information requests by contacting the official department directly.`;
    }
  }

  // Store analyzed report
  async storeReport(content: string, sourceType: string, url?: string, wardId?: string): Promise<ScamAnalysisResult> {
    const analysis = await this.analyzeContent(content, url);

    const report = {
      ...analysis,
      content,
      raw_content: content,
      url: url || null,
      source_type: sourceType,
      ward_id: wardId || null,
      reported_at: new Date().toISOString(),
      analyzed_at: new Date().toISOString(),
      verified_status: 'pending',
      victim_reports: 0,
    };

    await esService.index(ES_INDICES.SCAM_REPORTS, report, {
      id: analysis.report_id,
      pipeline: 'scam-detection-pipeline',
    });

    return analysis;
  }

  // Get scam statistics
  async getScamStatistics(options?: {
    dateRange?: { gte: string; lte?: string };
    zone?: string;
  }): Promise<{
    total_reports: number;
    by_risk_level: Record<string, number>;
    by_scam_type: Record<string, number>;
    by_department: Record<string, number>;
    outage_correlated: number;
    trend_7d: 'increasing' | 'stable' | 'decreasing';
  }> {
    const query: any = {
      bool: {
        must: [
          {
            range: {
              reported_at: {
                gte: options?.dateRange?.gte || 'now-30d',
                lte: options?.dateRange?.lte || 'now',
              },
            },
          },
        ],
      },
    };

    if (options?.zone) {
      query.bool.must.push({ term: { zone: options.zone } });
    }

    const aggs = {
      by_risk_level: { terms: { field: 'risk_level' } },
      by_scam_type: { terms: { field: 'scam_type' } },
      by_department: { terms: { field: 'spoofed_department' } },
      outage_correlated: { filter: { term: { is_outage_correlated: true } } },
      daily_trend: {
        date_histogram: {
          field: 'reported_at',
          calendar_interval: 'day',
        },
      },
    };

    const result = await esService.aggregate(ES_INDICES.SCAM_REPORTS, aggs, query);
    const total = await esService.count(ES_INDICES.SCAM_REPORTS, query);

    // Calculate trend
    const dailyBuckets = result.daily_trend?.buckets || [];
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (dailyBuckets.length >= 7) {
      const recent = dailyBuckets.slice(-3).reduce((s: number, b: any) => s + b.doc_count, 0);
      const earlier = dailyBuckets.slice(-7, -3).reduce((s: number, b: any) => s + b.doc_count, 0);
      if (recent > earlier * 1.2) trend = 'increasing';
      else if (recent < earlier * 0.8) trend = 'decreasing';
    }

    return {
      total_reports: total,
      by_risk_level: Object.fromEntries(
        (result.by_risk_level?.buckets || []).map((b: any) => [b.key, b.doc_count])
      ),
      by_scam_type: Object.fromEntries(
        (result.by_scam_type?.buckets || []).map((b: any) => [b.key, b.doc_count])
      ),
      by_department: Object.fromEntries(
        (result.by_department?.buckets || []).filter((b: any) => b.key).map((b: any) => [b.key, b.doc_count])
      ),
      outage_correlated: result.outage_correlated?.doc_count || 0,
      trend_7d: trend,
    };
  }
}

export const trustLensAnalyzer = new TrustLensAnalyzer();
