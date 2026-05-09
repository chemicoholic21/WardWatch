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
  indicators: Record<string, boolean>;
  scores: {
    urgency_language: number;
    financial_risk: number;
    impersonation: number;
    link_safety: number;
  };
  matched_patterns: string[];
  explanation: string;
  recommended_action: string;
}

// Scam detection patterns - AGGRESSIVE detection
const PATTERNS = {
  // Government department names (impersonation)
  departments: [
    { regex: /\b(bescom|bangalore electricity)\b/i, name: 'BESCOM', weight: 30 },
    { regex: /\b(bbmp|bruhat bengaluru|municipal|corporation)\b/i, name: 'BBMP', weight: 30 },
    { regex: /\b(bwssb|water supply|water board)\b/i, name: 'BWSSB', weight: 30 },
    { regex: /\b(bda|bangalore development)\b/i, name: 'BDA', weight: 30 },
    { regex: /\b(bmtc|bus transport)\b/i, name: 'BMTC', weight: 25 },
    { regex: /\b(government|govt|karnataka|official)\b/i, name: 'Government', weight: 20 },
  ],

  // Urgency indicators
  urgency: [
    { regex: /\b(urgent|urgently|immediately|immediate)\b/i, weight: 25 },
    { regex: /\b(last chance|final notice|final warning|last warning)\b/i, weight: 30 },
    { regex: /\b(within \d+ hours?|today only|expires today|act now)\b/i, weight: 25 },
    { regex: /\b(don'?t delay|time sensitive|limited time)\b/i, weight: 20 },
    { regex: /\b(action required|response required|mandatory)\b/i, weight: 20 },
  ],

  // Financial/payment indicators - CRITICAL
  financial: [
    { regex: /\b(pay|payment|paid|paying)\b/i, weight: 35 },
    { regex: /\b(rs\.?\s*\d+|₹\s*\d+|\d+\s*rupees?)\b/i, weight: 40 },
    { regex: /\b(upi|gpay|phonepe|paytm|bhim)\b/i, weight: 35 },
    { regex: /\b(bank account|account number|ifsc)\b/i, weight: 40 },
    { regex: /\b(transfer|send money|deposit)\b/i, weight: 30 },
    { regex: /\b(fine|penalty|dues?|outstanding|overdue)\b/i, weight: 25 },
    { regex: /\b(bill|invoice|amount)\b/i, weight: 20 },
  ],

  // Credential theft - CRITICAL
  credentials: [
    { regex: /\b(otp|one time password)\b/i, weight: 50 },
    { regex: /\b(password|passcode|pin)\b/i, weight: 45 },
    { regex: /\b(cvv|card number|expiry)\b/i, weight: 50 },
    { regex: /\b(verify|verification|kyc)\b/i, weight: 25 },
    { regex: /\b(login|log in|sign in)\b/i, weight: 20 },
  ],

  // Threat indicators
  threats: [
    { regex: /\b(disconnection|disconnect|cut off|terminate)\b/i, weight: 30 },
    { regex: /\b(suspend|suspended|block|blocked)\b/i, weight: 30 },
    { regex: /\b(legal action|court|police|arrest|fir)\b/i, weight: 35 },
    { regex: /\b(penalty|fine|charges)\b/i, weight: 20 },
  ],

  // Suspicious links
  links: [
    { regex: /bit\.ly|tinyurl|goo\.gl|short\.|t\.co/i, weight: 40 },
    { regex: /\.xyz|\.top|\.click|\.info|\.online/i, weight: 35 },
    { regex: /http:\/\//i, weight: 15 }, // non-HTTPS
    { regex: /[a-z0-9]+-[a-z0-9]+-[a-z0-9]+\./i, weight: 25 }, // suspicious subdomain patterns
  ],

  // Contact requests
  contact: [
    { regex: /\b(call|contact|reach|whatsapp)\s*(us|me|now)?\s*(\+91|91)?[\s-]?\d{10}\b/i, weight: 30 },
    { regex: /\b\d{10}\b/i, weight: 15 }, // Phone number
    { regex: /@(gmail|yahoo|hotmail|outlook)\./i, weight: 25 }, // Non-official email
  ],
};

export class TrustLensAnalyzer {
  async analyzeContent(content: string, url?: string): Promise<ScamAnalysisResult> {
    const reportId = `SCAN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const matchedPatterns: string[] = [];
    let totalScore = 0;
    let spoofedDepartment: string | null = null;

    const indicators: Record<string, boolean> = {
      urgency_language: false,
      payment_request: false,
      government_impersonation: false,
      credential_request: false,
      threatening_language: false,
      suspicious_link: false,
      phone_number: false,
    };

    const scores = {
      urgency_language: 0,
      financial_risk: 0,
      impersonation: 0,
      link_safety: 100,
    };

    // Check for department impersonation
    for (const dept of PATTERNS.departments) {
      if (dept.regex.test(content)) {
        scores.impersonation += dept.weight;
        totalScore += dept.weight;
        spoofedDepartment = dept.name;
        indicators.government_impersonation = true;
        matchedPatterns.push(`Department: ${dept.name}`);
      }
    }

    // Check urgency patterns
    for (const pattern of PATTERNS.urgency) {
      if (pattern.regex.test(content)) {
        scores.urgency_language += pattern.weight;
        totalScore += pattern.weight;
        indicators.urgency_language = true;
        const match = content.match(pattern.regex);
        if (match) matchedPatterns.push(`Urgency: "${match[0]}"`);
      }
    }

    // Check financial patterns - HEAVY weight
    for (const pattern of PATTERNS.financial) {
      if (pattern.regex.test(content)) {
        scores.financial_risk += pattern.weight;
        totalScore += pattern.weight;
        indicators.payment_request = true;
        const match = content.match(pattern.regex);
        if (match) matchedPatterns.push(`Financial: "${match[0]}"`);
      }
    }

    // Check credential patterns - CRITICAL
    for (const pattern of PATTERNS.credentials) {
      if (pattern.regex.test(content)) {
        scores.financial_risk += pattern.weight;
        totalScore += pattern.weight;
        indicators.credential_request = true;
        const match = content.match(pattern.regex);
        if (match) matchedPatterns.push(`Credential: "${match[0]}"`);
      }
    }

    // Check threat patterns
    for (const pattern of PATTERNS.threats) {
      if (pattern.regex.test(content)) {
        scores.urgency_language += pattern.weight;
        totalScore += pattern.weight;
        indicators.threatening_language = true;
        const match = content.match(pattern.regex);
        if (match) matchedPatterns.push(`Threat: "${match[0]}"`);
      }
    }

    // Check link patterns
    const combinedContent = content + (url || '');
    for (const pattern of PATTERNS.links) {
      if (pattern.regex.test(combinedContent)) {
        scores.link_safety -= pattern.weight;
        totalScore += pattern.weight;
        indicators.suspicious_link = true;
        matchedPatterns.push(`Link: suspicious URL pattern`);
      }
    }

    // Check contact patterns
    for (const pattern of PATTERNS.contact) {
      if (pattern.regex.test(content)) {
        totalScore += pattern.weight;
        indicators.phone_number = true;
        const match = content.match(pattern.regex);
        if (match) matchedPatterns.push(`Contact: "${match[0]}"`);
      }
    }

    // COMBO BONUS: If multiple red flags, increase score significantly
    const flagCount = Object.values(indicators).filter(Boolean).length;
    if (flagCount >= 3) {
      totalScore += 30; // Combo bonus
      matchedPatterns.push(`Multiple red flags detected (${flagCount})`);
    }
    if (flagCount >= 4) {
      totalScore += 40; // Extra combo bonus
    }

    // Special case: Government + Payment = Almost certainly scam
    if (indicators.government_impersonation && indicators.payment_request) {
      totalScore += 50;
      matchedPatterns.push(`CRITICAL: Government impersonation + payment request`);
    }

    // Special case: Urgency + Payment = Very suspicious
    if (indicators.urgency_language && indicators.payment_request) {
      totalScore += 30;
      matchedPatterns.push(`ALERT: Urgency + payment request`);
    }

    // Calculate final scores
    scores.link_safety = Math.max(0, scores.link_safety);
    scores.urgency_language = Math.min(100, scores.urgency_language);
    scores.financial_risk = Math.min(100, scores.financial_risk);
    scores.impersonation = Math.min(100, scores.impersonation);

    // Calculate scam probability (0 to 1)
    // totalScore typically ranges from 0-300+ for scams
    const scamProbability = Math.min(1, totalScore / 150);
    const trustScore = Math.round((1 - scamProbability) * 100);

    // Determine risk level with LOWER thresholds
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (scamProbability >= 0.7 || totalScore >= 100) {
      riskLevel = 'critical';
    } else if (scamProbability >= 0.5 || totalScore >= 70) {
      riskLevel = 'high';
    } else if (scamProbability >= 0.3 || totalScore >= 40) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    // Determine scam type
    let scamType = 'SUSPICIOUS_MESSAGE';
    let scamCategory = 'UNKNOWN';

    if (indicators.credential_request) {
      scamType = 'CREDENTIAL_THEFT';
      scamCategory = 'IDENTITY_THEFT';
    } else if (indicators.government_impersonation && indicators.payment_request) {
      scamType = 'FAKE_GOVERNMENT_NOTICE';
      scamCategory = 'IMPERSONATION_FRAUD';
    } else if (indicators.payment_request) {
      scamType = 'PAYMENT_FRAUD';
      scamCategory = 'FINANCIAL_FRAUD';
    } else if (indicators.government_impersonation) {
      scamType = 'GOVERNMENT_IMPERSONATION';
      scamCategory = 'IMPERSONATION_FRAUD';
    } else if (indicators.threatening_language) {
      scamType = 'THREAT_SCAM';
      scamCategory = 'EXTORTION';
    }

    // Generate explanation
    const explanation = this.generateExplanation(riskLevel, matchedPatterns, spoofedDepartment);
    const recommendedAction = this.generateRecommendation(riskLevel);

    return {
      report_id: reportId,
      trust_score: trustScore,
      scam_probability: Math.round(scamProbability * 1000) / 1000,
      risk_level: riskLevel,
      scam_type: scamType,
      scam_category: scamCategory,
      spoofed_department: spoofedDepartment,
      indicators,
      scores,
      matched_patterns: matchedPatterns,
      explanation,
      recommended_action: recommendedAction,
    };
  }

  private generateExplanation(riskLevel: string, patterns: string[], dept: string | null): string {
    if (riskLevel === 'critical') {
      return `🚨 CRITICAL SCAM ALERT: This message is almost certainly a scam. ${dept ? `It impersonates ${dept}.` : ''} Detected: ${patterns.slice(0, 3).join(', ')}. DO NOT respond or click any links.`;
    } else if (riskLevel === 'high') {
      return `⚠️ HIGH RISK: This message shows strong scam indicators. ${dept ? `Claims to be from ${dept}.` : ''} Red flags: ${patterns.slice(0, 3).join(', ')}. Verify independently before any action.`;
    } else if (riskLevel === 'medium') {
      return `⚡ CAUTION: This message has suspicious elements. ${patterns.slice(0, 2).join(', ')}. Do not share personal information or make payments without verification.`;
    } else {
      return `✓ LOW RISK: No major scam indicators detected. However, always verify payment requests or sensitive information requests through official channels.`;
    }
  }

  private generateRecommendation(riskLevel: string): string {
    if (riskLevel === 'critical' || riskLevel === 'high') {
      return `1. DO NOT click any links or call numbers in this message. 2. Block the sender. 3. Report to cybercrime.gov.in or call 1930. 4. If you shared any info, contact your bank immediately.`;
    } else if (riskLevel === 'medium') {
      return `1. Do not respond directly. 2. Verify by calling the official helpline (find it independently, not from this message). 3. Never share OTP, password, or bank details.`;
    } else {
      return `This appears safe, but always verify payment/info requests through official websites or helplines.`;
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

    try {
      await esService.index(ES_INDICES.SCAM_REPORTS, report, {
        id: analysis.report_id,
      });
    } catch (e) {
      console.error('Failed to store report:', e);
    }

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
    };

    try {
      const result = await esService.aggregate(ES_INDICES.SCAM_REPORTS, aggs, query);
      const total = await esService.count(ES_INDICES.SCAM_REPORTS, query);

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
        trend_7d: 'stable',
      };
    } catch (e) {
      return {
        total_reports: 0,
        by_risk_level: {},
        by_scam_type: {},
        by_department: {},
        outage_correlated: 0,
        trend_7d: 'stable',
      };
    }
  }
}

export const trustLensAnalyzer = new TrustLensAnalyzer();
