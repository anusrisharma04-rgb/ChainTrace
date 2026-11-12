'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest, EvidenceTransfer, Evidence, User } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  GitCommit, 
  Check, 
  X, 
  Clock, 
  ArrowRight, 
  AlertCircle, 
  Plus, 
  UserCheck, 
  MapPin, 
  ShieldAlert,
  ShieldCheck,
  Send
} from 'lucide-react';

export default function TransfersPage() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<EvidenceTransfer[]>([]);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Request Transfer Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState('');
  const [toUserId, setToUserId] = useState('');
  const [toLocationId, setToLocationId] = useState('1');
  const [transferReason, setTransferReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchTransfersAndCatalog = async () => {
    setLoading(true);
    try {
      const [tData, eData, uData, lData] = await Promise.all([
        apiRequest<EvidenceTransfer[]>('/transfers/'),
        apiRequest<Evidence[]>('/evidence/'),
        apiRequest<User[]>('/users/').catch(() => []),
        apiRequest<any[]>('/locations/').catch(() => []),
      ]);
      setTransfers(tData);
      setEvidenceList(eData);
      setUsers(uData);
      setLocations(lData);
      if (eData.length > 0 && !selectedEvidenceId) {
        setSelectedEvidenceId(String(eData[0].evidence_id));
      }
      if (uData.length > 0 && !toUserId) {
        setToUserId(String(uData[0].user_id));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transfers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfersAndCatalog();
  }, []);

  const handleApprove = async (transferId: number) => {
    try {
      await apiRequest(`/transfers/${transferId}/approve`, { method: 'PATCH' });
      setSuccessMsg(`Transfer #${transferId} approved! Custodian and location updated.`);
      fetchTransfersAndCatalog();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleReject = async (transferId: number) => {
    try {
      await apiRequest(`/transfers/${transferId}/reject`, { method: 'PATCH' });
      setSuccessMsg(`Transfer #${transferId} rejected. Custody remains unchanged.`);
      fetchTransfersAndCatalog();
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const ev = evidenceList.find(item => String(item.evidence_id) === selectedEvidenceId);
    if (!ev) {
      alert('Please select valid evidence');
      return;
    }

    const fromUser = ev.current_custodian_id || user?.user_id || 1;
    const fromLoc = ev.current_location_id || 1;

    setSubmitting(true);
    setError(null);
    try {
      await apiRequest('/transfers/', {
        method: 'POST',
        body: JSON.stringify({
          evidence_id: ev.evidence_id,
          from_user_id: fromUser,
          to_user_id: parseInt(toUserId),
          from_location_id: fromLoc,
          to_location_id: parseInt(toLocationId),
          reason: transferReason,
        }),
      });

      setSuccessMsg('Transfer request registered! Awaiting authorization sign-off.');
      setShowRequestModal(false);
      setTransferReason('');
      fetchTransfersAndCatalog();
    } catch (err: any) {
      setError(err.message || 'Transfer request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingTransfers = transfers.filter(t => t.authorization_status === 'pending');
  const completedTransfers = transfers.filter(t => t.authorization_status !== 'pending');

  const getUserName = (id: number) => {
    const u = users.find(x => x.user_id === id);
    return u ? `${u.name} (${u.email})` : `User #${id}`;
  };

  const getLocationName = (id: number) => {
    const loc = locations.find(x => x.location_id === id);
    return loc ? `${loc.location_name} (${loc.location_type})` : `Location #${id}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-charcoal">Chain of Custody & Evidence Transfers</h2>
          <p className="text-xs text-[#55524E] mt-0.5">
            Formal chain-of-custody tracking with dual authorization workflows, source/destination integrity, and tamper-proof logging.
          </p>
        </div>
        <button
          onClick={() => setShowRequestModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded bg-burgundy hover:bg-[#5B192C] text-ivory text-xs font-semibold shadow transition-colors"
        >
          <Send className="w-4 h-4" />
          <span>Initiate Custody Transfer</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-forest/10 border border-forest/30 text-forest text-xs rounded font-semibold flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-forest hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-burgundy/10 border border-burgundy/30 text-burgundy text-xs rounded flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* PENDING APPROVALS SECTION */}
      <div className="bg-white rounded-lg border border-[#E0D8CB] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-[#FAF7F2] border-b border-[#E0D8CB] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-burgundy" />
            <h3 className="text-sm font-bold text-charcoal">
              Pending Custody Transfer Approvals ({pendingTransfers.length})
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-[#9A5826] bg-[#9A5826]/10 px-2.5 py-0.5 rounded border border-[#9A5826]/20">
            Requires Dual Sign-off
          </span>
        </div>

        <div className="p-4">
          {pendingTransfers.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#8C8880]">
              <ShieldCheck className="w-8 h-8 text-forest mx-auto mb-1.5 opacity-60" />
              <p>No pending transfers require authorization at this time.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingTransfers.map((pt) => (
                <div key={pt.transfer_id} className="p-4 rounded-lg bg-[#FCFAF6] border border-[#DACFBD] shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-burgundy font-mono">Transfer #{pt.transfer_id}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#9A5826] text-white">
                        PENDING
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-charcoal">
                      <p className="font-bold">Evidence #{pt.evidence_id}</p>
                      
                      <div className="flex items-center space-x-1.5 text-[11px] text-[#55524E]">
                        <span className="font-semibold text-charcoal">From:</span>
                        <span>{getUserName(pt.from_user_id)}</span>
                      </div>

                      <div className="flex items-center space-x-1.5 text-[11px] text-[#55524E]">
                        <span className="font-semibold text-charcoal">To:</span>
                        <span>{getUserName(pt.to_user_id)}</span>
                      </div>

                      <div className="flex items-center space-x-1.5 text-[11px] text-[#55524E]">
                        <span className="font-semibold text-charcoal">Route:</span>
                        <span>{getLocationName(pt.from_location_id)} → {getLocationName(pt.to_location_id)}</span>
                      </div>

                      <div className="p-2 rounded bg-white border border-[#EAE2D3] mt-2 text-[11px]">
                        <span className="font-semibold text-[#66635D] block">Reason for transfer:</span>
                        <p className="italic text-charcoal">{pt.reason}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#EAE2D3] flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleReject(pt.transfer_id)}
                      className="px-3 py-1.5 rounded bg-charcoal hover:bg-black text-ivory text-xs font-semibold transition-colors flex items-center space-x-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleApprove(pt.transfer_id)}
                      className="px-3.5 py-1.5 rounded bg-forest hover:bg-[#1D3D2F] text-white text-xs font-semibold transition-colors flex items-center space-x-1 shadow"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve & Update Custody</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* COMPLETE CUSTODY TRANSFER HISTORY TABLE */}
      <div className="bg-white rounded-lg border border-[#E0D8CB] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-[#FAF7F2] border-b border-[#E0D8CB] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GitCommit className="w-4 h-4 text-forest" />
            <h3 className="text-sm font-bold text-charcoal">Custody Transfer Audit Log ({completedTransfers.length} Processed)</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-charcoal">
            <thead className="bg-[#FAF7F2] text-[#55524E] uppercase text-[10px] tracking-wider border-b border-[#E0D8CB]">
              <tr>
                <th className="px-4 py-3">Transfer ID</th>
                <th className="px-4 py-3">Evidence ID</th>
                <th className="px-4 py-3">Sender (From)</th>
                <th className="px-4 py-3">Recipient (To)</th>
                <th className="px-4 py-3">Location Movement</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE2D3]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#8C8880]">
                    Loading transfer history...
                  </td>
                </tr>
              ) : completedTransfers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#8C8880]">
                    No processed custody transfers found.
                  </td>
                </tr>
              ) : (
                completedTransfers.map((t) => (
                  <tr key={t.transfer_id} className="hover:bg-[#FAF7F2] transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-burgundy">#{t.transfer_id}</td>
                    <td className="px-4 py-3 font-semibold text-charcoal">Evidence #{t.evidence_id}</td>
                    <td className="px-4 py-3 text-[#55524E]">{getUserName(t.from_user_id)}</td>
                    <td className="px-4 py-3 text-[#55524E] font-medium">{getUserName(t.to_user_id)}</td>
                    <td className="px-4 py-3 text-[#55524E]">
                      {getLocationName(t.from_location_id)} → {getLocationName(t.to_location_id)}
                    </td>
                    <td className="px-4 py-3 text-[#55524E] max-w-xs truncate">{t.reason}</td>
                    <td className="px-4 py-3 text-[#8C8880] font-mono text-[11px]">
                      {new Date(t.transfer_time).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        t.authorization_status === 'approved' ? 'bg-forest/10 text-forest border border-forest/30' :
                        'bg-burgundy/10 text-burgundy border border-burgundy/30'
                      }`}>
                        {t.authorization_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Initiate Transfer Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#D9D0BF] max-w-md w-full shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E0D8CB] mb-4">
              <div className="flex items-center space-x-2">
                <Send className="w-5 h-5 text-burgundy" />
                <h3 className="font-bold text-sm text-charcoal">Initiate Chain of Custody Transfer</h3>
              </div>
              <button onClick={() => setShowRequestModal(false)} className="text-[#8C8880] hover:text-charcoal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#55524E] mb-1">Select Evidence Item *</label>
                <select
                  required
                  value={selectedEvidenceId}
                  onChange={(e) => setSelectedEvidenceId(e.target.value)}
                  className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#D9D0BF] rounded text-charcoal font-semibold"
                >
                  {evidenceList.map((ev) => (
                    <option key={ev.evidence_id} value={ev.evidence_id}>
                      Evidence #{ev.evidence_id} ({ev.evidence_type}) — Current Custodian ID: {ev.current_custodian_id || 'None'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#55524E] mb-1">Transfer Recipient (New Custodian) *</label>
                <select
                  required
                  value={toUserId}
                  onChange={(e) => setToUserId(e.target.value)}
                  className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#D9D0BF] rounded text-charcoal font-semibold"
                >
                  {users.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.name} ({u.email}) — Role ID: {u.role_id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#55524E] mb-1">Destination Location *</label>
                <select
                  required
                  value={toLocationId}
                  onChange={(e) => setToLocationId(e.target.value)}
                  className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#D9D0BF] rounded text-charcoal"
                >
                  {locations.map((loc) => (
                    <option key={loc.location_id} value={loc.location_id}>
                      {loc.location_name} ({loc.location_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#55524E] mb-1">Formal Reason for Transfer *</label>
                <textarea
                  rows={3}
                  required
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g. Submitted for volatile memory forensic examination by authorized forensic analyst."
                  className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#D9D0BF] rounded text-charcoal focus:outline-none focus:border-burgundy"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-3.5 py-2 rounded border border-[#D9D0BF] text-[#55524E] hover:bg-[#FAF7F2] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded bg-burgundy hover:bg-[#5B192C] text-ivory font-semibold shadow disabled:opacity-50"
                >
                  {submitting ? 'Submitting Transfer...' : 'Submit Transfer Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
