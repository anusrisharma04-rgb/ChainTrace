'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiRequest, Case, Evidence, AuditLog } from '@/lib/api';
import { 
  FolderKanban, 
  HardDrive, 
  GitCommit, 
  Microscope, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw,
  PlusCircle,
  FileSearch
} from 'lucide-react';

interface CaseSummaryRow {
  case_id: number;
  case_number: string;
  case_title: string;
  case_status: string;
  lead_investigator: string;
  total_evidence_count: number;
  evidence_under_examination: number;
  pending_transfers: number;
  total_examinations_conducted: number;
  assigned_team_members: number;
}

export default function DashboardPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [summaries, setSummaries] = useState<CaseSummaryRow[]>([]);
  const [recentAudits, setRecentAudits] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [verificationResult, setVerificationResult] = useState<{ [id: number]: any }>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cData, eData, sData, aData] = await Promise.all([
        apiRequest<Case[]>('/cases/'),
        apiRequest<Evidence[]>('/evidence/'),
        apiRequest<CaseSummaryRow[]>('/cases/summary/stats').catch(() => []),
        apiRequest<AuditLog[]>('/audit-logs/?limit=6').catch(() => []),
      ]);
      setCases(cData);
      setEvidenceList(eData);
      setSummaries(sData);
      setRecentAudits(aData);
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVerify = async (evidenceId: number) => {
    setVerifyingId(evidenceId);
    try {
      const result = await apiRequest<any>(`/evidence/${evidenceId}/verify`);
      setVerificationResult(prev => ({ ...prev, [evidenceId]: result }));
    } catch (err: any) {
      setVerificationResult(prev => ({ 
        ...prev, 
        [evidenceId]: { integrity_status: 'FAILED', message: err.message } 
      }));
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#EDE6D9] p-5 rounded-lg border border-[#DACFBD]">
        <div>
          <h2 className="text-xl font-bold text-charcoal">Forensic Provenance Control Center</h2>
          <p className="text-xs text-[#59554F] mt-1">
            Real-time evidence chain of custody, cryptographic SHA-256 verification, and relational audit provenance.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            href="/evidence"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded bg-burgundy hover:bg-[#5B192C] text-ivory text-xs font-semibold shadow transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Register Evidence</span>
          </Link>
          <Link
            href="/transfers"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded bg-forest hover:bg-[#1D3D2F] text-ivory text-xs font-semibold shadow transition-colors"
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Transfer Custody</span>
          </Link>
          <button
            onClick={fetchData}
            title="Refresh Data"
            className="p-2 rounded bg-[#DFD6C4] hover:bg-[#D4C9B3] text-charcoal transition-colors border border-[#C8BDAB]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-white border border-[#E0D8CB] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#66635D] uppercase tracking-wider">Active Cases</p>
            <p className="text-2xl font-bold text-charcoal mt-1">{cases.length}</p>
            <p className="text-[11px] text-[#8C8880] mt-0.5">PostgreSQL Master Store</p>
          </div>
          <div className="p-3 rounded-lg bg-[#F8F5EE] border border-[#E8DEC9] text-charcoal">
            <FolderKanban className="w-6 h-6 text-burgundy" />
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white border border-[#E0D8CB] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#66635D] uppercase tracking-wider">Evidence Artifacts</p>
            <p className="text-2xl font-bold text-charcoal mt-1">{evidenceList.length}</p>
            <p className="text-[11px] text-[#8C8880] mt-0.5">SHA-256 Registered</p>
          </div>
          <div className="p-3 rounded-lg bg-[#F8F5EE] border border-[#E8DEC9] text-charcoal">
            <HardDrive className="w-6 h-6 text-forest" />
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white border border-[#E0D8CB] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#66635D] uppercase tracking-wider">Custody Transfers</p>
            <p className="text-2xl font-bold text-charcoal mt-1">
              {summaries.reduce((acc, curr) => acc + (curr.pending_transfers || 0), 0)} Pending
            </p>
            <p className="text-[11px] text-[#8C8880] mt-0.5">Dual-Signoff Workflow</p>
          </div>
          <div className="p-3 rounded-lg bg-[#F8F5EE] border border-[#E8DEC9] text-charcoal">
            <GitCommit className="w-6 h-6 text-[#9A5826]" />
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white border border-[#E0D8CB] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#66635D] uppercase tracking-wider">NoSQL Reports</p>
            <p className="text-2xl font-bold text-charcoal mt-1">
              {summaries.reduce((acc, curr) => acc + (curr.total_examinations_conducted || 0), 0)}
            </p>
            <p className="text-[11px] text-[#8C8880] mt-0.5">MongoDB Flexible Store</p>
          </div>
          <div className="p-3 rounded-lg bg-[#F8F5EE] border border-[#E8DEC9] text-charcoal">
            <Microscope className="w-6 h-6 text-charcoal" />
          </div>
        </div>
      </div>

      {/* Advanced DBMS View Demonstration: Case Forensic Summary */}
      <div className="bg-white rounded-lg border border-[#E0D8CB] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-[#FAF7F2] border-b border-[#E0D8CB] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileSearch className="w-4 h-4 text-burgundy" />
            <h3 className="text-sm font-bold text-charcoal">
              Case Forensic Summary (Database View: <code className="text-xs text-burgundy font-mono">v_case_forensic_summary</code>)
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-forest bg-forest/10 px-2.5 py-0.5 rounded border border-forest/20">
            Advanced SQL Aggregate View
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-charcoal">
            <thead className="bg-[#F4EFE5] text-[#55524E] uppercase text-[10px] tracking-wider border-b border-[#E0D8CB]">
              <tr>
                <th className="px-4 py-2.5">Case Number</th>
                <th className="px-4 py-2.5">Case Title</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Lead Investigator</th>
                <th className="px-4 py-2.5 text-center">Evidence Count</th>
                <th className="px-4 py-2.5 text-center">Under Exam</th>
                <th className="px-4 py-2.5 text-center">Pending Transfers</th>
                <th className="px-4 py-2.5 text-center">Examinations</th>
                <th className="px-4 py-2.5 text-center">Team Members</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE2D3]">
              {summaries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-[#8C8880]">
                    No case forensic summary records available.
                  </td>
                </tr>
              ) : (
                summaries.map((s) => (
                  <tr key={s.case_id} className="hover:bg-[#FAF7F2] transition-colors">
                    <td className="px-4 py-3 font-semibold text-burgundy font-mono">
                      {s.case_number}
                    </td>
                    <td className="px-4 py-3 font-medium">{s.case_title}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        s.case_status === 'open' ? 'bg-forest/10 text-forest border border-forest/30' : 'bg-charcoal/10 text-charcoal'
                      }`}>
                        {s.case_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#55524E]">{s.lead_investigator}</td>
                    <td className="px-4 py-3 text-center font-bold">{s.total_evidence_count}</td>
                    <td className="px-4 py-3 text-center font-semibold text-burgundy">{s.evidence_under_examination}</td>
                    <td className="px-4 py-3 text-center font-semibold text-[#9A5826]">{s.pending_transfers}</td>
                    <td className="px-4 py-3 text-center font-bold text-forest">{s.total_examinations_conducted}</td>
                    <td className="px-4 py-3 text-center text-[#55524E]">{s.assigned_team_members}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Column Layout: Real-Time Evidence Verification & Recent Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Quick Evidence Integrity Check */}
        <div className="bg-white rounded-lg border border-[#E0D8CB] shadow-sm flex flex-col justify-between">
          <div>
            <div className="px-5 py-3.5 bg-[#FAF7F2] border-b border-[#E0D8CB] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-forest" />
                <h3 className="text-sm font-bold text-charcoal">Real-Time Evidence Integrity Monitor</h3>
              </div>
              <Link href="/evidence" className="text-xs font-semibold text-burgundy hover:underline flex items-center">
                <span>All Evidence</span>
                <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>

            <div className="p-4 space-y-3">
              {evidenceList.slice(0, 4).map((ev) => {
                const res = verificationResult[ev.evidence_id];
                const isVerifying = verifyingId === ev.evidence_id;

                return (
                  <div 
                    key={ev.evidence_id} 
                    className="p-3 rounded-lg border border-[#E0D8CB] bg-[#FCFAF6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                  >
                    <div className="overflow-hidden">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-charcoal">Evidence #{ev.evidence_id}</span>
                        <span className="text-[11px] font-mono bg-[#EFE8DC] px-1.5 py-0.5 rounded text-[#55524E]">
                          {ev.serial_number || 'N/A'}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-[#66635D]">{ev.evidence_type}</span>
                      </div>
                      <p className="text-[11px] font-mono text-[#8C8880] truncate max-w-xs mt-1">
                        SHA-256: {ev.original_hash}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {res && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1 ${
                          res.integrity_status === 'INTACT'
                            ? 'bg-forest text-white'
                            : 'bg-burgundy text-white'
                        }`}>
                          {res.integrity_status === 'INTACT' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>INTACT</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3" />
                              <span>{res.integrity_status}</span>
                            </>
                          )}
                        </span>
                      )}

                      <button
                        onClick={() => handleVerify(ev.evidence_id)}
                        disabled={isVerifying}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-forest hover:bg-[#1D3D2F] text-white transition-colors disabled:opacity-50"
                      >
                        {isVerifying ? 'Checking...' : 'Verify Hash'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-[#FAF7F2] border-t border-[#E0D8CB] text-center">
            <p className="text-[11px] text-[#78746D]">
              Integrity verification dynamically recalculates cryptographic SHA-256 on disk and compares against PostgreSQL provenance hash.
            </p>
          </div>
        </div>

        {/* Right: Immutable System Audit Trail Feed */}
        <div className="bg-white rounded-lg border border-[#E0D8CB] shadow-sm flex flex-col justify-between">
          <div>
            <div className="px-5 py-3.5 bg-[#FAF7F2] border-b border-[#E0D8CB] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-burgundy" />
                <h3 className="text-sm font-bold text-charcoal">Immutable Audit Log Feed</h3>
              </div>
              <Link href="/audit-logs" className="text-xs font-semibold text-burgundy hover:underline flex items-center">
                <span>View Full Trail</span>
                <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>

            <div className="p-4 divide-y divide-[#EAE2D3]">
              {recentAudits.length === 0 ? (
                <p className="text-xs text-[#8C8880] py-6 text-center">No recent audit events.</p>
              ) : (
                recentAudits.map((a) => (
                  <div key={a.audit_id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-charcoal font-mono text-[11px]">{a.action}</span>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                          a.status === 'SUCCESS' ? 'bg-forest/10 text-forest' : 'bg-burgundy/10 text-burgundy'
                        }`}>
                          {a.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#66635D] mt-0.5 line-clamp-1">
                        {a.new_value || a.old_value || 'System event recorded'}
                      </p>
                    </div>
                    <span className="text-[10px] text-[#8C8880] shrink-0 font-mono">
                      {new Date(a.event_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 bg-[#FAF7F2] border-t border-[#E0D8CB] text-center">
            <p className="text-[11px] text-[#78746D]">
              Protected by PostgreSQL trigger <code className="text-burgundy font-mono">trg_protect_audit_log</code> (Strictly Append-Only).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
