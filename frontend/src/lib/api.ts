const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

// Dashboard
export async function getDashboardStats() {
  return fetchApi<any>('/api/analytics/dashboard');
}

// Ghost Offices
export async function getGhostOffices(params?: { limit?: number; department?: string; zone?: string }) {
  const query = new URLSearchParams(params as any).toString();
  return fetchApi<any>(`/api/ghost-offices?${query}`);
}

export async function getTopGhostOffices(limit = 10) {
  return fetchApi<any[]>(`/api/ghost-offices/top?limit=${limit}`);
}

export async function getGhostOfficeHeatmap() {
  return fetchApi<any[]>('/api/ghost-offices/heatmap');
}

// TrustLens
export async function analyzeContent(content: string, url?: string) {
  return fetchApi<any>('/api/trustlens/analyze', {
    method: 'POST',
    body: JSON.stringify({ content, url }),
  });
}

export async function getScamReports(params?: { risk_level?: string; limit?: number }) {
  const query = new URLSearchParams(params as any).toString();
  return fetchApi<any[]>(`/api/trustlens/reports?${query}`);
}

export async function getScamStats() {
  return fetchApi<any>('/api/trustlens/stats');
}

// Complaints
export async function getComplaints(params?: {
  status?: string;
  department?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams(params as any).toString();
  return fetchApi<any[]>(`/api/complaints?${query}`);
}

export async function getComplaintStats() {
  return fetchApi<any>('/api/complaints/stats/summary');
}

// Search
export async function search(query: string, index?: string) {
  return fetchApi<any[]>(`/api/search?q=${encodeURIComponent(query)}${index ? `&index=${index}` : ''}`);
}

// Agents
export async function getAgents() {
  return fetchApi<any>('/api/agents');
}

export async function executeAgentTask(agentType: string, task: string, parameters?: Record<string, any>) {
  return fetchApi<any>('/api/agents/execute', {
    method: 'POST',
    body: JSON.stringify({ agent_type: agentType, task, parameters }),
  });
}

// Actions
export async function generateRti(params: { complaint_id?: string; ghost_office_id?: string }) {
  return fetchApi<any>('/api/actions/rti/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function generateEscalation(complaintId: string, level?: string) {
  return fetchApi<any>('/api/actions/escalation/generate', {
    method: 'POST',
    body: JSON.stringify({ complaint_id: complaintId, escalation_level: level }),
  });
}

// Analytics
export async function getTrends(metric: string, interval?: string, dateFrom?: string) {
  const query = new URLSearchParams({
    metric,
    ...(interval && { interval }),
    ...(dateFrom && { date_from: dateFrom }),
  }).toString();
  return fetchApi<any>(`/api/analytics/trends?${query}`);
}

export async function getCivicHealth(zone?: string) {
  return fetchApi<any[]>(`/api/analytics/civic-health${zone ? `?zone=${zone}` : ''}`);
}

// Wards
export async function getWards(zone?: string) {
  return fetchApi<any[]>(`/api/wards${zone ? `?zone=${zone}` : ''}`);
}

export async function getWardLeaderboard(limit = 20) {
  return fetchApi<any[]>(`/api/wards/leaderboard/performance?limit=${limit}`);
}

export async function getZoneSummary() {
  return fetchApi<any[]>('/api/wards/zones/summary');
}

// Health
export async function getHealth() {
  return fetchApi<any>('/health');
}
