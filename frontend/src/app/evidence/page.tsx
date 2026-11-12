'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest, Evidence, Case, User, API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  HardDrive, 
  Upload, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  FileText, 
  Filter, 
  X, 
  Check, 
  Clock, 
  User as UserIcon, 
  MapPin,
  GitCommit,
  Microscope
} from 'lucide-react';

export default function EvidencePage() {
  const { user } = useAuth();
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedCaseFilter, setSelectedCaseFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [caseId, setCaseId] = useState('');
  const [evidenceType, setEvidenceType] = useState('PDF Document');
  const [serialNumber, setSerialNumber] = useState('');
  const [description, setDescription] = useState('');
  const [collectionTime, setCollectionTime] = useState(new Date().toISOString().slice(0, 16));
  const [locationId, setLocationId] = useState('1');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  // Evidence Detail & Verification Modal State
  const [inspectEvidence, setInspectEvidence] = useState<Evidence | null>(null);
  const [custodyChain, setCustodyChain] = useState<any | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any | null>(null);

  const fetchEvidenceAndMetadata = async () => {
    setLoading(true);
    try {
      const [eData, cData, uData, lData] = await Promise.all([
        apiRequest<Evidence[]>('/evidence/'),
        apiRequest<Case[]>('/cases/'),
        apiRequest<User[]>('/users/').catch(() => []),
        apiRequest<any[]>('/locations/').catch(() => []),
      ]);
      setEvidenceList(eData);
      setCases(cData);
      setUsers(uData);
      setLocations(lData);
      if (cData.length > 0 && !caseId) {
        setCaseId(String(cData[0].case_id));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load evidence catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidenceAndMetadata();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !caseId) {
      alert('Please select a file and associated case.');
      return;
    }
    setUploading(true);
    setError(null);
    setUploadSuccessMsg(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('case_id', caseId);
    formData.append('evidence_type', evidenceType);
    formData.append('collection_time', new Date(collectionTime).toISOString());
    formData.append('collected_by', String(user?.user_id || 1));
    formData.append('description', description);
    formData.append('serial_number', serialNumber);
    formData.append('current_location_id', locationId);
    formData.append('current_custodian_id', String(user?.user_id || 1));

    try {
      const result = await apiRequest<any>('/evidence/upload', {
        method: 'POST',
        body: formData,
      });
      setUploadSuccessMsg(`Evidence registered! SHA-256: ${result.sha256_hash}`);
      fetchEvidenceAndMetadata();
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadFile(null);
        setDescription('');
        setSerialNumber('');
        setUploadSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to upload evidence');
    } finally {
      setUploading(false);
    }
  };

  const handleInspect = async (ev: Evidence) => {
    setInspectEvidence(ev);
    setVerifyResult(null);
    try {
      const chain = await apiRequest<any>(`/evidence/${ev.evidence_id}/custody-chain`);
      setCustodyChain(chain);
    } catch {
      setCustodyChain(null);
    }
  };

  const runVerification = async (evidenceId: number) => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await apiRequest<any>(`/evidence/${evidenceId}/verify`);
      setVerifyResult(res);
    } catch (err: any) {
      setVerifyResult({
        integrity_status: 'FAILED',
        error: err.message,
      });
    } finally {
      setVerifying(false);
    }
  };

  const filteredEvidence = selectedCaseFilter === 'all'
    ? evidenceList
    : evidenceList.filter(ev => String(ev.case_id) === selectedCaseFilter);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-charcoal">Digital Evidence Vault</h2>
          <p className="text-xs text-[#55524E] mt-0.5">
            Cryptographically registered forensic artifacts, automated backend SHA-256 integrity verification, and custody logs.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Case Filter */}
          <div className="flex items-center space-x-1.5 text-xs bg-white px-3 py-1.5 rounded border border-[#D9D0BF]">
            <Filter className="w-3.5 h-3.5 text-[#8C8880]" />
            <span className="text-[#55524E] font-medium">Case:</span>
            <select
              value={selectedCaseFilter}
              onChange={(e) => setSelectedCaseFilter(e.target.value)}
              className="bg-transparent font-semibold text-charcoal focus:outline-none"
            >
              <option value="all">All Cases ({evidenceList.length})</option>
              {cases.map((c) => (
                <option key={c.case_id} value={String(c.case_id)}>
                  {c.case_number}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded bg-burgundy hover:bg-[#5B192C] text-ivory text-xs font-semibold shadow transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Upload & Register Evidence</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-burgundy/10 border border-burgundy/30 text-burgundy text-xs rounded flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Evidence Table */}
      <div className="bg-white rounded-lg border border-[#E0D8CB] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-charcoal">
            <thead className="bg-[#FAF7F2] text-[#55524E] uppercase text-[10px] tracking-wider border-b border-[#E0D8CB]">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Case</th>
                <th className="px-4 py-3">Evidence Type</th>
                <th className="px-4 py-3">Serial / Tag</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 font-mono">Original SHA-256 Hash</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE2D3]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#8C8880]">
                    Loading registered evidence vault...
                  </td>
                </tr>
              ) : filteredEvidence.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#8C8880]">
                    No evidence records match the current filter.
                  </td>
                </tr>
              ) : (
                filteredEvidence.map((ev) => {
                  const c = cases.find(item => item.case_id === ev.case_id);
                  return (
                    <tr key={ev.evidence_id} className="hover:bg-[#FAF7F2] transition-colors">
                      <td className="px-4 py-3 font-bold text-[#8C8880]">#{ev.evidence_id}</td>
                      <td className="px-4 py-3 font-mono font-bold text-burgundy">
                        {c ? c.case_number : `Case #${ev.case_id}`}
                      </td>
                      <td className="px-4 py-3 font-medium text-charcoal">
                        <span className="bg-[#F0EAE1] px-2 py-0.5 rounded text-[11px] font-semibold">
                          {ev.evidence_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#55524E] font-mono">{ev.serial_number || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          ev.status === 'collected' ? 'bg-forest/10 text-forest border border-forest/30' :
                          ev.status === 'stored' ? 'bg-[#9A5826]/10 text-[#9A5826] border border-[#9A5826]/30' :
                          ev.status === 'under_examination' ? 'bg-burgundy/10 text-burgundy border border-burgundy/30' :
                          'bg-charcoal/10 text-charcoal'
                        }`}>
                          {ev.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#55524E] max-w-xs truncate" title={ev.original_hash}>
                        {ev.original_hash}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleInspect(ev)}
                          className="px-2.5 py-1 rounded bg-[#EFE8DC] hover:bg-charcoal hover:text-ivory text-charcoal text-xs font-semibold transition-colors"
                        >
                          Inspect & Verify
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Evidence Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#D9D0BF] max-w-lg w-full shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E0D8CB] mb-4">
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-burgundy" />
                <h3 className="font-bold text-sm text-charcoal">Upload & Register Forensic Evidence</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-[#8C8880] hover:text-charcoal">
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadSuccessMsg && (
              <div className="mb-4 p-3 bg-forest/10 border border-forest/30 text-forest text-xs rounded font-semibold flex items-center space-x-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{uploadSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#55524E] mb-1">
                  Select Physical Evidence File (Max 150MB) *
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-[#55524E] file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-burgundy file:text-ivory hover:file:bg-[#5B192C] cursor-pointer bg-[#FAF7F2] p-2 rounded border border-[#D9D0BF]"
                />
                <p className="text-[10px] text-[#8C8880] mt-1">
                  SHA-256 cryptographic digest will be computed server-side to guarantee integrity.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#55524E] mb-1">Associated Case *</label>
                  <select
                    required
                    value={caseId}
                    onChange={(e) => setCaseId(e.target.value)}
                    className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#D9D0BF] rounded text-charcoal font-semibold"
                  >
                    {cases.map((c) => (
                      <option key={c.case_id} value={c.case_id}>
                        {c.case_number} — {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#55524E] mb-1">Evidence Type *</label>
                  <select
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value)}
                    className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#D9D0BF] rounded text-charcoal"
                  >
                    <option value="PDF Document">PDF Document</option>
                    <option value="Raw Disk Image (.dd / .raw)">Raw Disk Image (.dd / .raw)</option>
                    <option value="Memory Dump (.raw / .vmem)">Memory Dump (.raw / .vmem)</option>
                    <option value="Network Packet Capture (.pcap)">Network Packet Capture (.pcap)</option>
                    <option value="Mobile Extraction Image">Mobile Extraction Image</option>
                    <option value="Security Event Log (.evtx / .log)">Security Event Log (.evtx / .log)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#55524E] mb-1">Serial / Hardware Tag</label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. SN-84920-SSD"
                    className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#D9D0BF] rounded text-charcoal"
                  >
                  </input>
                </div>

                <div>
                  <label className="block font-semibold text-[#55524E] mb-1">Initial Location</label>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#D9D0BF] rounded text-charcoal"
                  >
                    {locations.map((loc) => (
                      <option key={loc.location_id} value={loc.location_id}>
                        {loc.location_name} ({loc.location_type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#55524E] mb-1">Description & Chain Notes</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notes regarding evidence seizure, source workstation, or MAC address..."
                  className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#D9D0BF] rounded text-charcoal"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3.5 py-2 rounded border border-[#D9D0BF] text-[#55524E] hover:bg-[#FAF7F2] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 rounded bg-burgundy hover:bg-[#5B192C] text-ivory font-semibold shadow disabled:opacity-50"
                >
                  {uploading ? 'Registering & Computing SHA-256...' : 'Register Evidence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect & Integrity Verification Modal */}
      {inspectEvidence && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#D9D0BF] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 bg-[#FAF7F2] border-b border-[#E0D8CB] flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-forest" />
                <div>
                  <h3 className="font-bold text-sm text-charcoal">
                    Evidence Inspection #{inspectEvidence.evidence_id} — {inspectEvidence.evidence_type}
                  </h3>
                  <p className="text-[11px] text-[#66635D]">Serial Tag: {inspectEvidence.serial_number || 'None'}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectEvidence(null)}
                className="p-1 rounded text-[#8C8880] hover:bg-[#EAE2D3] hover:text-charcoal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs">
              {/* Integrity Verification Card */}
              <div className="p-4 rounded-lg bg-[#FAF7F2] border border-[#E0D8CB]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold uppercase text-[#55524E] tracking-wider flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-burgundy" />
                    <span>Cryptographic Integrity Verification</span>
                  </h4>
                  <button
                    onClick={() => runVerification(inspectEvidence.evidence_id)}
                    disabled={verifying}
                    className="px-3 py-1.5 rounded bg-forest hover:bg-[#1D3D2F] text-white font-semibold transition-colors disabled:opacity-50 flex items-center space-x-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{verifying ? 'Recomputing Hash...' : 'Verify Cryptographic Hash'}</span>
                  </button>
                </div>

                <div className="space-y-2 font-mono">
                  <div className="p-2.5 rounded bg-white border border-[#EAE2D3]">
                    <span className="text-[10px] uppercase font-bold text-[#8C8880] block font-sans">
                      Original Master Hash (PostgreSQL Provenance):
                    </span>
                    <span className="text-xs text-charcoal break-all font-semibold">
                      {inspectEvidence.original_hash}
                    </span>
                  </div>

                  {verifyResult && (
                    <div className="p-3 rounded bg-white border border-[#EAE2D3] space-y-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#8C8880] block font-sans">
                          Calculated Live Hash (Disk Re-read):
                        </span>
                        <span className="text-xs text-charcoal break-all font-semibold">
                          {verifyResult.calculated_hash || 'Error calculating hash'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-[#EAE2D3] flex items-center justify-between">
                        <span className="text-xs font-bold font-sans text-charcoal">Integrity Check Result:</span>
                        <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider flex items-center space-x-1 ${
                          verifyResult.integrity_status === 'INTACT'
                            ? 'bg-forest text-white'
                            : 'bg-burgundy text-white'
                        }`}>
                          {verifyResult.integrity_status === 'INTACT' ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>CRYPTOGRAPHICALLY INTACT</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-4 h-4" />
                              <span>INTEGRITY BREACH / MODIFIED</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Custody Chain Provenance View */}
              {custodyChain && (
                <div className="p-4 rounded-lg bg-[#FAF7F2] border border-[#E0D8CB]">
                  <h4 className="font-bold uppercase text-[#55524E] tracking-wider mb-3 flex items-center space-x-1.5">
                    <GitCommit className="w-4 h-4 text-forest" />
                    <span>Provenance Details (View: <code className="text-xs text-burgundy font-mono">v_evidence_custody_chain</code>)</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-[#8C8880] block uppercase">Original Collector:</span>
                      <span className="font-semibold text-charcoal">{custodyChain.collector_name}</span>
                      <span className="text-[11px] text-[#66635D] block">{custodyChain.collector_email}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8C8880] block uppercase">Current Custodian:</span>
                      <span className="font-semibold text-charcoal">{custodyChain.custodian_name || 'Unassigned'}</span>
                      <span className="text-[11px] text-[#66635D] block">{custodyChain.custodian_email || ''}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8C8880] block uppercase">Current Location:</span>
                      <span className="font-semibold text-charcoal">{custodyChain.location_name || 'Storage'}</span>
                      <span className="text-[11px] text-[#66635D] block">Type: {custodyChain.location_type || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8C8880] block uppercase">Collection Timestamp:</span>
                      <span className="font-semibold text-charcoal">
                        {new Date(custodyChain.collection_time).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Physical File Secure Download */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-[#E0D8CB] bg-white">
                <div>
                  <span className="font-bold text-charcoal">Evidence File Repository</span>
                  <p className="text-[11px] text-[#8C8880]">
                    Stored at: <code className="font-mono text-charcoal">{inspectEvidence.file_path || 'uploads/file'}</code>
                  </p>
                </div>
                <a
                  href={`${API_BASE_URL}/evidence/${inspectEvidence.evidence_id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 rounded bg-burgundy hover:bg-[#5B192C] text-ivory font-semibold transition-colors flex items-center space-x-1.5 shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </a>
              </div>
            </div>

            <div className="p-4 bg-[#FAF7F2] border-t border-[#E0D8CB] text-right">
              <button
                onClick={() => setInspectEvidence(null)}
                className="px-4 py-2 rounded bg-charcoal text-ivory text-xs font-semibold hover:bg-black transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
