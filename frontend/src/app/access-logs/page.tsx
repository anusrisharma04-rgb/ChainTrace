'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest, EvidenceAccess, User, Evidence } from '@/lib/api';
import { Activity, ShieldCheck, ShieldAlert, Filter, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

export default function AccessLogsPage() {
  const [logs, setLogs] = useState<EvidenceAccess[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const [lData, uData] = await Promise.all([
        apiRequest<EvidenceAccess[]>('/evidence-access/?limit=200'),
        apiRequest<User[]>('/users/').catch(() => []),
      ]);
      setLogs(lData);
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

  const grantedCount = logs.filter(l => l.access_status === 'granted').length;
  const deniedCount = logs.filter(l => l.access_status === 'denied').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-charcoal">Evidence Access Logs</h2>
          <p className="text-xs text-[#55524E] mt-0.5">
            Real-time audit log of all evidence interactions, views, cryptographic verifications, and physical downloads.
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
              <option value="VIEW">VIEW</option>
              <option value="DOWNLOAD">DOWNLOAD</option>
              <option value="VERIFY">VERIFY</option>
              <option value="UPLOAD">UPLOAD</option>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-white border border-[#E0D8CB] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#66635D] uppercase tracking-wider">Total Access Events</span>
            <p className="text-2xl font-bold text-charcoal mt-1">{logs.length}</p>
          </div>
          <Activity className="w-6 h-6 text-charcoal" />
        </div>

        <div className="p-4 rounded-lg bg-white border border-[#E0D8CB] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#66635D] uppercase tracking-wider">Granted Accesses</span>
            <p className="text-2xl font-bold text-forest mt-1">{grantedCount}</p>
          </div>
          <CheckCircle2 className="w-6 h-6 text-forest" />
        </div>

        <div className="p-4 rounded-lg bg-white border border-[#E0D8CB] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#66635D] uppercase tracking-wider">Denied / Flagged Accesses</span>
            <p className="text-2xl font-bold text-burgundy mt-1">{deniedCount}</p>
          </div>
          <XCircle className="w-6 h-6 text-burgundy" />
        </div>
      </div>

      {/* Access Logs Table */}
      <div className="bg-white rounded-lg border border-[#E0D8CB] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-charcoal">
            <thead className="bg-[#FAF7F2] text-[#55524E] uppercase text-[10px] tracking-wider border-b border-[#E0D8CB]">
              <tr>
                <th className="px-4 py-3">Access ID</th>
                <th className="px-4 py-3">Evidence Item</th>
                <th className="px-4 py-3">Operator / User</th>
                <th className="px-4 py-3">Action Type</th>
                <th className="px-4 py-3">Client IP</th>
                <th className="px-4 py-3">Access Timestamp</th>
                <th className="px-4 py-3 text-right">Result Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE2D3]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#8C8880]">
                    Loading evidence access history...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#8C8880]">
                    No access log entries found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.access_id} className="hover:bg-[#FAF7F2] transition-colors">
                    <td className="px-4 py-3 font-mono text-[#8C8880]">#{log.access_id}</td>
                    <td className="px-4 py-3 font-bold text-charcoal">Evidence #{log.evidence_id}</td>
                    <td className="px-4 py-3 text-[#55524E] font-medium">{getUserLabel(log.user_id)}</td>
                    <td className="px-4 py-3">
                      <span className="bg-[#EFE8DC] px-2 py-0.5 rounded font-mono font-bold text-charcoal text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[#55524E] text-[11px]">{log.ip_address || '127.0.0.1'}</td>
                    <td className="px-4 py-3 font-mono text-[#8C8880] text-[11px]">
                      {new Date(log.access_time).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        log.access_status === 'granted' ? 'bg-forest/10 text-forest border border-forest/30' :
                        'bg-burgundy/10 text-burgundy border border-burgundy/30'
                      }`}>
                        {log.access_status}
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
