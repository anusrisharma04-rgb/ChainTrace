'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest, AuditLog, User } from '@/lib/api';
import { 
  FileText, 
  ShieldCheck, 
  Lock, 
  Filter, 
  RefreshCw, 
  AlertCircle, 
  Activity, 
  Database 
} from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const [lData, sData, uData] = await Promise.all([
        apiRequest<AuditLog[]>('/audit-logs/?limit=200'),
        apiRequest<any>('/audit-logs/stats').catch(() => null),
        apiRequest<User[]>('/users/').catch(() => []),
      ]);
      setLogs(lData);
      setStats(sData);
      setUsers(uData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getUserLabel = (uid: number) => {
    const u = users.find(x => x.user_id === uid);
    return u ? `${u.name} (${u.email})` : `User #${uid}`;
  };

  const filteredLogs = actionFilter === 'all'
    ? logs
    : logs.filter(l => l.action === actionFilter);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-charcoal">Immutable System Audit Trail</h2>
          <p className="text-xs text-[#55524E] mt-0.5">
            Cryptographic provenance history strictly protected by database triggers. All state mutations are permanently recorded.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs bg-white px-3 py-1.5 rounded border border-[#D9D0BF]">
            <Filter className="w-3.5 h-3.5 text-[#8C8880]" />
            <span className="text-[#55524E] font-medium">Action:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-transparent font-semibold text-charcoal focus:outline-none"
            >
              <option value="all">All Actions ({logs.length})</option>
              {stats?.actions && Object.keys(stats.actions).map(act => (
                <option key={act} value={act}>{act} ({stats.actions[act]})</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchLogs}
            className="p-2 rounded bg-white hover:bg-[#FAF7F2] text-charcoal border border-[#D9D0BF] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Security Immutability Alert Banner */}
      <div className="p-4 rounded-lg bg-[#FAF7F2] border border-[#D9D0BF] flex items-start space-x-3">
        <div className="p-2 rounded bg-forest text-white shrink-0">
          <Lock className="w-4 h-4" />
        </div>
        <div className="text-xs">
          <h4 className="font-bold text-charcoal flex items-center space-x-2">
            <span>Forensic Immutability Protection Active</span>
            <span className="text-[10px] font-mono text-burgundy bg-burgundy/10 px-1.5 py-0.5 rounded">
              Trigger: trg_protect_audit_log
            </span>
          </h4>
          <p className="text-[#55524E] mt-1 leading-relaxed">
            The PostgreSQL audit table is enforced as <strong>Append-Only</strong>. Any attempt by any user or administrator to perform an <code className="font-mono text-burgundy">UPDATE</code> or <code className="font-mono text-burgundy">DELETE</code> operation is aborted by the database engine with an active security exception.
          </p>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-lg border border-[#E0D8CB] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-charcoal">
            <thead className="bg-[#FAF7F2] text-[#55524E] uppercase text-[10px] tracking-wider border-b border-[#E0D8CB]">
              <tr>
                <th className="px-4 py-3">Audit ID</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor / User</th>
                <th className="px-4 py-3">Action Type</th>
                <th className="px-4 py-3">Target Evidence</th>
                <th className="px-4 py-3">Old Value</th>
                <th className="px-4 py-3">New Value</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE2D3]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#8C8880]">
                    Loading immutable audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#8C8880]">
                    No audit records match the current filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.audit_id} className="hover:bg-[#FAF7F2] transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-burgundy">#{log.audit_id}</td>
                    <td className="px-4 py-3 font-mono text-[#8C8880] text-[11px] whitespace-nowrap">
                      {new Date(log.event_timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[#55524E] font-medium whitespace-nowrap">
                      {getUserLabel(log.user_id)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-[#EFE8DC] px-2 py-0.5 rounded font-mono font-bold text-charcoal text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-charcoal">
                      {log.evidence_id ? `Evidence #${log.evidence_id}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-[#78746D] max-w-xs truncate" title={log.old_value || ''}>
                      {log.old_value || '—'}
                    </td>
                    <td className="px-4 py-3 text-charcoal font-medium max-w-xs truncate" title={log.new_value || ''}>
                      {log.new_value || '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        log.status === 'SUCCESS' ? 'bg-forest/10 text-forest border border-forest/30' :
                        log.status === 'PENDING' ? 'bg-[#9A5826]/10 text-[#9A5826] border border-[#9A5826]/30' :
                        'bg-burgundy/10 text-burgundy border border-burgundy/30'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
