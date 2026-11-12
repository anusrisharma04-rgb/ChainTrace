'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest, Case, Evidence, User } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  FolderKanban, 
  Plus, 
  Users, 
  HardDrive, 
  Check, 
  AlertCircle, 
  X, 
  UserPlus, 
  Trash2,
  Calendar,
  UserCheck
} from 'lucide-react';

export default function CasesPage() {
  const { user, isAdmin } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Case Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCaseNumber, setNewCaseNumber] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Selected Case Detail View state
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [caseMembers, setCaseMembers] = useState<any[]>([]);
  const [caseEvidence, setCaseEvidence] = useState<Evidence[]>([]);
  const [memberUserIdToAdd, setMemberUserIdToAdd] = useState<string>('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusUpdateMsg, setStatusUpdateMsg] = useState<string | null>(null);

  const fetchCasesAndUsers = async () => {
    setLoading(true);
    try {
      const [cData, uData] = await Promise.all([
        apiRequest<Case[]>('/cases/'),
        apiRequest<User[]>('/users/').catch(() => []),
      ]);
      setCases(cData);
      setAllUsers(uData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCasesAndUsers();
  }, []);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setError(null);
    try {
      const created = await apiRequest<Case>('/cases/', {
        method: 'POST',
        body: JSON.stringify({
          case_number: newCaseNumber,
          title: newTitle,
          description: newDescription,
          created_by: user?.user_id || 1,
        }),
      });
      setCases([created, ...cases]);
      setShowCreateModal(false);
      setNewCaseNumber('');
      setNewTitle('');
      setNewDescription('');
    } catch (err: any) {
      setError(err.message || 'Could not create case');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenCaseDetail = async (c: Case) => {
    setSelectedCase(c);
    setDetailLoading(true);
    setStatusUpdateMsg(null);
    try {
      const [mems, evs] = await Promise.all([
        apiRequest<any[]>(`/cases/${c.case_id}/members`),
        apiRequest<Evidence[]>(`/cases/${c.case_id}/evidence`),
      ]);
      setCaseMembers(mems);
      setCaseEvidence(evs);
    } catch (err: any) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedCase) return;
    try {
      const updated = await apiRequest<Case>(`/cases/${selectedCase.case_id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      setSelectedCase(updated);
      setCases(cases.map(c => c.case_id === updated.case_id ? updated : c));
      setStatusUpdateMsg(`Status updated to ${newStatus}`);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !memberUserIdToAdd) return;
    try {
      await apiRequest('/case-members/', {
        method: 'POST',
        body: JSON.stringify({
          case_id: selectedCase.case_id,
          user_id: parseInt(memberUserIdToAdd),
        }),
      });
      // Refresh members
      const mems = await apiRequest<any[]>(`/cases/${selectedCase.case_id}/members`);
      setCaseMembers(mems);
      setMemberUserIdToAdd('');
    } catch (err: any) {
      alert(err.message || 'Failed to assign user');
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!selectedCase) return;
    try {
      await apiRequest(`/case-members/${selectedCase.case_id}/${userId}`, {
        method: 'DELETE',
      });
      setCaseMembers(caseMembers.filter(m => m.user_id !== userId));
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-charcoal">Investigation Cases</h2>
          <p className="text-xs text-[#55524E] mt-0.5">
            Manage forensic investigation cases, assigned investigators, and associated evidence files.
          </p>
        </div>
        <button
          onClick={() => {
            const nextNum = `CT-${new Date().getFullYear()}-${String(cases.length + 1).padStart(3, '0')}`;
            setNewCaseNumber(nextNum);
            setShowCreateModal(true);
          }}
          className="flex items-center space-x-1.5 px-4 py-2 rounded bg-burgundy hover:bg-[#5B192C] text-ivory text-xs font-semibold shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Investigation Case</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-burgundy/10 border border-burgundy/30 text-burgundy text-xs rounded flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cases Table */}
      <div className="bg-white rounded-lg border border-[#E0D8CB] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-charcoal">
            <thead className="bg-[#FAF7F2] text-[#55524E] uppercase text-[10px] tracking-wider border-b border-[#E0D8CB]">
              <tr>
                <th className="px-4 py-3">Case ID</th>
                <th className="px-4 py-3">Case Number</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE2D3]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#8C8880]">
                    Loading investigation cases...
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#8C8880]">
                    No cases found. Create a new case to begin.
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr key={c.case_id} className="hover:bg-[#FAF7F2] transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#8C8880]">#{c.case_id}</td>
                    <td className="px-4 py-3 font-mono font-bold text-burgundy">{c.case_number}</td>
                    <td className="px-4 py-3 font-medium text-charcoal">{c.title}</td>
                    <td className="px-4 py-3 text-[#55524E] max-w-xs truncate">{c.description || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        c.status === 'open' ? 'bg-forest/10 text-forest border border-forest/30' :
                        c.status === 'under_investigation' ? 'bg-[#9A5826]/10 text-[#9A5826] border border-[#9A5826]/30' :
                        'bg-charcoal/10 text-charcoal'
                      }`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenCaseDetail(c)}
                        className="px-3 py-1 rounded bg-[#EFE8DC] hover:bg-charcoal hover:text-ivory text-charcoal text-xs font-semibold transition-colors"
                      >
                        Inspect Case
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Details Drawer / Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#D9D0BF] max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 bg-[#FAF7F2] border-b border-[#E0D8CB] flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center space-x-2">
                <FolderKanban className="w-5 h-5 text-burgundy" />
                <div>
                  <h3 className="font-bold text-sm text-charcoal">
                    {selectedCase.case_number} — {selectedCase.title}
                  </h3>
                  <p className="text-[11px] text-[#66635D]">Case ID #{selectedCase.case_id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="p-1 rounded text-[#8C8880] hover:bg-[#EAE2D3] hover:text-charcoal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {statusUpdateMsg && (
                <div className="p-2.5 rounded bg-forest/10 border border-forest/30 text-forest text-xs font-semibold flex items-center space-x-1.5">
                  <Check className="w-4 h-4" />
                  <span>{statusUpdateMsg}</span>
                </div>
              )}

              {/* Status Update Control */}
              <div className="p-4 rounded-lg bg-[#FAF7F2] border border-[#E0D8CB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-[#66635D] uppercase tracking-wider">Current Status</span>
                  <div className="mt-1">
                    <span className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-forest text-white">
                      {selectedCase.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-xs text-[#55524E]">Change status:</span>
                  <button
                    onClick={() => handleUpdateStatus('open')}
                    className="px-2.5 py-1 rounded border border-[#C8BDAB] bg-white hover:bg-[#EAE2D3] font-semibold"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('under_investigation')}
                    className="px-2.5 py-1 rounded border border-[#C8BDAB] bg-white hover:bg-[#EAE2D3] font-semibold"
                  >
                    Under Investigation
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('closed')}
                    className="px-2.5 py-1 rounded border border-[#C8BDAB] bg-white hover:bg-[#EAE2D3] font-semibold"
                  >
                    Closed
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold uppercase text-[#66635D] tracking-wider mb-1">Description</h4>
                <p className="text-xs text-charcoal bg-[#FCFAF6] p-3 rounded border border-[#EAE2D3]">
                  {selectedCase.description || 'No detailed case description provided.'}
                </p>
              </div>

              {/* Assigned Members Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase text-[#66635D] tracking-wider flex items-center space-x-1.5">
                    <Users className="w-4 h-4 text-forest" />
                    <span>Assigned Forensic Team Members</span>
                  </h4>
                  <span className="text-[11px] font-semibold text-[#8C8880]">{caseMembers.length} assigned</span>
                </div>

                <div className="space-y-2 mb-3">
                  {caseMembers.length === 0 ? (
                    <p className="text-xs text-[#8C8880] py-2">No members assigned yet.</p>
                  ) : (
                    caseMembers.map((m) => (
                      <div key={m.user_id} className="p-2.5 rounded bg-[#FAF7F2] border border-[#E0D8CB] flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <UserCheck className="w-4 h-4 text-forest shrink-0" />
                          <div>
                            <span className="font-semibold text-charcoal">{m.name}</span>
                            <span className="text-[#8C8880] ml-2">({m.email})</span>
                            <span className="text-[10px] text-[#66635D] block">{m.department || 'Department Unassigned'}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(m.user_id)}
                          title="Remove from Case"
                          className="p-1 rounded text-[#8C8880] hover:text-burgundy hover:bg-[#F8EBEF]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add member form */}
                <form onSubmit={handleAddMember} className="flex items-center space-x-2">
                  <select
                    value={memberUserIdToAdd}
                    onChange={(e) => setMemberUserIdToAdd(e.target.value)}
                    className="flex-1 py-1.5 px-3 text-xs bg-white border border-[#D9D0BF] rounded text-charcoal focus:outline-none focus:border-burgundy"
                  >
                    <option value="">Select an investigator or analyst to assign...</option>
                    {allUsers.map((u) => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.name} ({u.email}) — Role ID: {u.role_id}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={!memberUserIdToAdd}
                    className="px-3 py-1.5 rounded bg-forest hover:bg-[#1D3D2F] text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center space-x-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Assign</span>
                  </button>
                </form>
              </div>

              {/* Associated Evidence List */}
              <div>
                <h4 className="text-xs font-bold uppercase text-[#66635D] tracking-wider mb-2 flex items-center space-x-1.5">
                  <HardDrive className="w-4 h-4 text-burgundy" />
                  <span>Associated Evidence Files ({caseEvidence.length})</span>
                </h4>
                {caseEvidence.length === 0 ? (
                  <p className="text-xs text-[#8C8880] py-2">No evidence uploaded for this case yet.</p>
                ) : (
                  <div className="space-y-2">
                    {caseEvidence.map((ev) => (
                      <div key={ev.evidence_id} className="p-2.5 rounded bg-[#FAF7F2] border border-[#E0D8CB] flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-charcoal">Evidence #{ev.evidence_id}</span>
                            <span className="text-[10px] font-mono bg-[#EAE2D3] px-1.5 py-0.5 rounded">{ev.evidence_type}</span>
                            <span className="text-[10px] uppercase font-bold text-forest">{ev.status}</span>
                          </div>
                          <p className="text-[11px] font-mono text-[#8C8880] truncate max-w-md mt-0.5">
                            SHA-256: {ev.original_hash}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-[#FAF7F2] border-t border-[#E0D8CB] text-right">
              <button
                onClick={() => setSelectedCase(null)}
                className="px-4 py-2 rounded bg-charcoal text-ivory text-xs font-semibold hover:bg-black transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Case Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#D9D0BF] max-w-md w-full shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E0D8CB] mb-4">
              <h3 className="font-bold text-sm text-charcoal">Register New Investigation Case</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#8C8880] hover:text-charcoal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#55524E] mb-1">Case Number</label>
                <input
                  type="text"
                  required
                  value={newCaseNumber}
                  onChange={(e) => setNewCaseNumber(e.target.value)}
                  placeholder="e.g. CT-2026-002"
                  className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#D9D0BF] rounded text-charcoal font-mono focus:outline-none focus:border-burgundy"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#55524E] mb-1">Case Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Unauthorized Intrusion & Exfiltration"
                  className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#D9D0BF] rounded text-charcoal focus:outline-none focus:border-burgundy"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#55524E] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief synopsis of the forensic investigation..."
                  className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#D9D0BF] rounded text-charcoal focus:outline-none focus:border-burgundy"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 rounded border border-[#D9D0BF] text-[#55524E] hover:bg-[#FAF7F2] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-2 rounded bg-burgundy hover:bg-[#5B192C] text-ivory font-semibold shadow disabled:opacity-50"
                >
                  {createSubmitting ? 'Creating Case...' : 'Create Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
