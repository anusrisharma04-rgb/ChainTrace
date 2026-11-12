export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export interface User {
  user_id: number;
  name: string;
  email: string;
  role_id: number;
  role_name?: string;
  department?: string;
  status: string;
}

export interface Case {
  case_id: number;
  case_number: string;
  title: string;
  description?: string;
  status: string;
  created_by: number;
  created_at?: string;
}

export interface Evidence {
  evidence_id: number;
  case_id: number;
  evidence_type: string;
  description?: string;
  serial_number?: string;
  collection_time: string;
  collected_by: number;
  current_location_id?: number;
  current_custodian_id?: number;
  status: string;
  original_hash: string;
  file_path?: string;
  created_at: string;
}

export interface EvidenceTransfer {
  transfer_id: number;
  evidence_id: number;
  from_user_id: number;
  to_user_id: number;
  from_location_id: number;
  to_location_id: number;
  transfer_time: string;
  reason: string;
  authorization_status: 'pending' | 'approved' | 'rejected';
}

export interface Examination {
  examination_id: number;
  evidence_id: number;
  analyst_id: number;
  start_time: string;
  end_time?: string;
  tool_used?: string;
  purpose: string;
  findings?: string;
  result?: string;
}

export interface AuditLog {
  audit_id: number;
  user_id: number;
  evidence_id?: number;
  action: string;
  event_timestamp: string;
  old_value?: string;
  new_value?: string;
  status: string;
}

export interface EvidenceAccess {
  access_id: number;
  evidence_id: number;
  user_id: number;
  action: string;
  access_time: string;
  access_status: string;
  ip_address?: string;
}

function getAuthHeader(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('chaintrace_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: HeadersInit = {
    ...getAuthHeader(),
    ...options.headers,
  };

  // If body is not FormData, default to application/json
  if (!(options.body instanceof FormData) && !('Content-Type' in (headers as Record<string, string>))) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      errorDetail = `HTTP ${response.status} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}
