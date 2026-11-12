'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest, Examination, Evidence, User } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { 
  Microscope, 
  Plus, 
  FileCode, 
  Server, 
  Check, 
  AlertCircle, 
  X, 
  Terminal, 
  Database,
  Search,
  FileCheck
} from 'lucide-react';

export default function ExaminationsPage() {
  const { user, isAnalyst, isAdmin } = useAuth();
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Record Exam Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [examEvidenceId, setExamEvidenceId] = useState('');
  const [examAnalystId, setExamAnalystId] = useState('');
  const [toolUsed, setToolUsed] = useState('Autopsy Forensic Browser');
  const [purpose, setPurpose] = useState('');
  const [findings, setFindings] = useState('');
  const [result, setResult] = useState('Pending forensic verification');
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
  const [endTime, setEndTime] = useState(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
  const [submitting, setSubmitting] = useState(false);

  // NoSQL Reports Viewer / Attach Modal state
  const [selectedExam, setSelectedExam] = useState<Examination | null>(null);
  const [nosqlReports, setNosqlReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [showAttachNoSQL, setShowAttachNoSQL] = useState(false);
  const [nosqlNotes, setNosqlNotes] = useState('');
  const [nosqlArtifacts, setNosqlArtifacts] = useState('');
  const [nosqlToolOutputs, setNosqlToolOutputs] = useState('');
  const [attachSubmitting, setAttachSubmitting] = useState(false);

  const fetchExamsAndCatalog = async () => {
    setLoading(true);
    try {
      const [exData, evData, uData] = await Promise.all([
        apiRequest<Examination[]>('/examinations/'),
        apiRequest<Evidence[]>('/evidence/'),
        apiRequest<User[]>('/users/').catch(() => []),
      ]);
      setExaminations(exData);
      setEvidenceList(evData);
      setUsers(uData);
      if (evData.length > 0 && !examEvidenceId) {
        setExamEvidenceId(String(evData[0].evidence_id));
      }
      if (uData.length > 0 && !examAnalystId) {
        setExamAnalystId(String(user?.user_id || uData[0].user_id));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch forensic examinations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamsAndCatalog();
  }, []);

  const handleCreateExamination = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest('/examinations/', {
        method: 'POST',
        body: JSON.stringify({
          evidence_id: parseInt(examEvidenceId),
          analyst_id: parseInt(examAnalystId),
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          tool_used: toolUsed,
          purpose,
          findings,
          result,
        }),
      });
      setShowCreateModal(false);
      setPurpose('');
      setFindings('');
      fetchExamsAndCatalog();
    } catch (err: any) {
      setError(err.message || 'Failed to create examination');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReports = async (exam: Examination) => {
    setSelectedExam(exam);
    setReportsLoading(true);
    setShowAttachNoSQL(false);
    try {
      const reports = await apiRequest<any[]>(`/examinations/${exam.examination_id}/reports`);
      setNosqlReports(reports);
    } catch (err) {
      setNosqlReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  const handleAttachNoSQLReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;
    setAttachSubmitting(true);

    let parsedOutputs = {};
    try {
      parsedOutputs = nosqlToolOutputs ? JSON.parse(nosqlToolOutputs) : {};
    } catch {
      parsedOutputs = { raw_output: nosqlToolOutputs };
    }

    const artifactsArray = nosqlArtifacts
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    try {
      await apiRequest(`/examinations/${selectedExam.examination_id}/report`, {
        method: 'POST',
        body: JSON.stringify({
          metadata: {
            analyst: user?.name || 'Analyst',
            timestamp: new Date().toISOString(),
            tool: selectedExam.tool_used,
          },
          extracted_artifacts: artifactsArray,
          tool_outputs: parsedOutputs,
          notes: nosqlNotes,
        }),
      });

      // Refresh reports
      const reports = await apiRequest<any[]>(`/examinations/${selectedExam.examination_id}/reports`);
      setNosqlReports(reports);
      setShowAttachNoSQL(false);
      setNosqlNotes('');
      setNosqlArtifacts('');
      setNosqlToolOutputs('');
    } catch (err: any) {
      alert(`Could not save NoSQL report: ${err.message}`);
    } finally {
      setAttachSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-charcoal">Forensic Examinations & NoSQL Artifact Store</h2>
          <p className="text-xs text-[#55524E] mt-0.5">
            Relational examination records stored in PostgreSQL paired with flexible, semi-structured artifact documents in MongoDB.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-1.5 px-4 py-2 rounded bg-burgundy hover:bg-[#5B192C] text-ivory text-xs font-semibold shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Record Forensic Examination</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-burgundy/10 border border-burgundy/30 text-burgundy text-xs rounded flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Examinations Table */}
      <div className="bg-white rounded-lg border border-[#E0D8CB] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-charcoal">
            <thead className="bg-[#FAF7F2] text-[#55524E] uppercase text-[10px] tracking-wider border-b border-[#E0D8CB]">
              <tr>
                <th className="px-4 py-3">Exam ID</th>
                <th className="px-4 py-3">Evidence ID</th>
                <th className="px-4 py-3">Forensic Tool</th>
                <th className="px-4 py-3">Purpose & Scope</th>
                <th className="px-4 py-3">Findings</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3 text-right">NoSQL Documents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE2D3]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#8C8880]">
                    Loading examination records...
                  </td>
                </tr>
              ) : examinations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#8C8880]">
                    No examination records logged yet.
                  </td>
                </tr>
              ) : (
                examinations.map((ex) => (
                  <tr key={ex.examination_id} className="hover:bg-[#FAF7F2] transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-burgundy">#{ex.examination_id}</td>
                    <td className="px-4 py-3 font-semibold text-charcoal">Evidence #{ex.evidence_id}</td>
                    <td className="px-4 py-3 font-semibold text-charcoal">
                      <span className="bg-[#EFE8DC] px-2 py-0.5 rounded text-[11px]">
                        {ex.tool_used || 'Manual Analysis'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#55524E] max-w-xs truncate">{ex.purpose}</td>
                    <td className="px-4 py-3 text-[#55524E] max-w-xs truncate">{ex.findings || '—'}</td>
                    <td className="px-4 py-3 font-medium text-forest">{ex.result || 'In progress'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenReports(ex)}
                        className="px-2.5 py-1 rounded bg-[#EAE2D3] hover:bg-forest hover:text-white text-charcoal text-xs font-semibold transition-colors flex items-center space-x-1 ml-auto"
                      >
                        <Server className="w-3.5 h-3.5" />
                        <span>MongoDB Reports</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NoSQL Reports Modal */}
      {selectedExam && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#D9D0BF] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 bg-[#FAF7F2] border-b border-[#E0D8CB] flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center space-x-2">
                <Server className="w-5 h-5 text-burgundy" />
                <div>
                  <h3 className="font-bold text-sm text-charcoal">
                    NoSQL Forensic Artifact Documents — Examination #{selectedExam.examination_id}
                  </h3>
                  <p className="text-[11px] text-[#66635D]">Evidence #{selectedExam.evidence_id} • Flexible Schema Collection</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedExam(null)}
                className="p-1 rounded text-[#8C8880] hover:bg-[#EAE2D3] hover:text-charcoal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase text-[#55524E] tracking-wider">
                  Associated Documents ({nosqlReports.length})
                </span>
                <button
                  onClick={() => setShowAttachNoSQL(!showAttachNoSQL)}
                  className="px-3 py-1 rounded bg-burgundy hover:bg-[#5B192C] text-ivory text-xs font-semibold transition-colors flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Attach New Artifact Doc</span>
                </button>
              </div>

              {/* Attach Form */}
              {showAttachNoSQL && (
                <form onSubmit={handleAttachNoSQLReport} className="p-4 rounded-lg bg-[#FAF7F2] border border-[#D9D0BF] space-y-3">
                  <h4 className="font-bold text-xs text-charcoal">New NoSQL Report Document</h4>

                  <div>
                    <label className="block font-semibold text-[#55524E] mb-1">Analyst Notes & Summary</label>
                    <textarea
                      rows={2}
                      required
                      value={nosqlNotes}
                      onChange={(e) => setNosqlNotes(e.target.value)}
                      placeholder="e.g. Hex stream signature analysis reveals hidden JPEG payload at offset 0x4A00."
                      className="w-full p-2 bg-white border border-[#D9D0BF] rounded text-charcoal"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#55524E] mb-1">Extracted Artifacts (One per line)</label>
                    <textarea
                      rows={2}
                      value={nosqlArtifacts}
                      onChange={(e) => setNosqlArtifacts(e.target.value)}
                      placeholder="SHA256: 8a9f...&#10;EXIF: Nikon D850&#10;GPS: 12.9716, 77.5946"
                      className="w-full p-2 bg-white border border-[#D9D0BF] rounded text-charcoal font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#55524E] mb-1">Tool Output JSON / Metrics (Optional)</label>
                    <textarea
                      rows={2}
                      value={nosqlToolOutputs}
                      onChange={(e) => setNosqlToolOutputs(e.target.value)}
                      placeholder='{"entropy": 7.84, "volatility_profile": "Win10x64"}'
                      className="w-full p-2 bg-white border border-[#D9D0BF] rounded text-charcoal font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAttachNoSQL(false)}
                      className="px-3 py-1.5 rounded border border-[#D9D0BF] text-[#55524E] font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={attachSubmitting}
                      className="px-3.5 py-1.5 rounded bg-forest hover:bg-[#1D3D2F] text-white font-semibold shadow disabled:opacity-50"
                    >
                      {attachSubmitting ? 'Saving to MongoDB...' : 'Save Document'}
                    </button>
                  </div>
                </form>
              )}

              {/* Documents List */}
              {reportsLoading ? (
                <p className="text-center py-6 text-[#8C8880]">Loading MongoDB documents...</p>
              ) : nosqlReports.length === 0 ? (
                <p className="text-center py-6 text-[#8C8880]">No NoSQL report documents attached yet.</p>
              ) : (
                <div className="space-y-3">
                  {nosqlReports.map((doc, idx) => (
                    <div key={doc._id || idx} className="p-3.5 rounded-lg bg-[#FCFAF6] border border-[#E0D8CB] space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-[#EAE2D3]">
                        <span className="font-mono font-bold text-burgundy text-[11px]">Document ID: {doc._id}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-forest/10 text-forest border border-forest/20">
                          {doc.storage_backend || 'MongoDB'}
                        </span>
                      </div>

                      {doc.notes && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#8C8880] block">Notes:</span>
                          <p className="text-charcoal mt-0.5">{doc.notes}</p>
                        </div>
                      )}

                      {doc.extracted_artifacts && doc.extracted_artifacts.length > 0 && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#8C8880] block">Extracted Artifacts:</span>
                          <ul className="list-disc list-inside font-mono text-[11px] text-[#55524E] mt-0.5">
                            {doc.extracted_artifacts.map((a: string, aIdx: number) => (
                              <li key={aIdx}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {doc.tool_outputs && Object.keys(doc.tool_outputs).length > 0 && (
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#8C8880] block">Structured Tool Output:</span>
                          <pre className="p-2 rounded bg-charcoal text-ivory text-[10px] font-mono mt-1 overflow-x-auto">
                            {JSON.stringify(doc.tool_outputs, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-[#FAF7F2] border-t border-[#E0D8CB] text-right">
              <button
                onClick={() => setSelectedExam(null)}
                className="px-4 py-2 rounded bg-charcoal text-ivory text-xs font-semibold hover:bg-black transition-colors"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Examination Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#D9D0BF] max-w-lg w-full shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E0D8CB] mb-4">
              <div className="flex items-center space-x-2">
                <Microscope className="w-5 h-5 text-burgundy" />
                <h3 className="font-bold text-sm text-charcoal">Log Forensic Examination</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-[#8C8880] hover:text-charcoal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExamination} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#55524E] mb-1">Evidence Item *</label>
                  <select
                    required
                    value={examEvidenceId}
                    onChange={(e) => setExamEvidenceId(e.target.value)}
                    className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#D9D0BF] rounded text-charcoal font-semibold"
                  >
                    {evidenceList.map((ev) => (
                      <option key={ev.evidence_id} value={ev.evidence_id}>
                        Evidence #{ev.evidence_id} ({ev.evidence_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#55524E] mb-1">Forensic Tool Used *</label>
                  <select
                    value={toolUsed}
                    onChange={(e) => setToolUsed(e.target.value)}
                    className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#D9D0BF] rounded text-charcoal"
                  >
                    <option value="Autopsy Forensic Browser">Autopsy Forensic Browser</option>
                    <option value="Volatility 3 Memory Framework">Volatility 3 Memory Framework</option>
                    <option value="FTK Imager 4.7">FTK Imager 4.7</option>
                    <option value="Wireshark Network Analyzer">Wireshark Network Analyzer</option>
                    <option value="Ghidra Reverse Engineering">Ghidra Reverse Engineering</option>
                    <option value="ExifTool Metadata Extractor">ExifTool Metadata Extractor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#55524E] mb-1">Examination Purpose *</label>
                <textarea
                  rows={2}
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Conduct deep header analysis and metadata extraction for anomalous embedded streams."
                  className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#D9D0BF] rounded text-charcoal"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#55524E] mb-1">Initial Findings</label>
                <textarea
                  rows={2}
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  placeholder="e.g. File format conforms to PDF-1.7 standard, no hidden malicious JavaScript discovered."
                  className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#D9D0BF] rounded text-charcoal"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#55524E] mb-1">Result & Conclusion</label>
                <input
                  type="text"
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  placeholder="e.g. Evidence intact, verified provenance"
                  className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#D9D0BF] rounded text-charcoal"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 rounded border border-[#D9D0BF] text-[#55524E] hover:bg-[#FAF7F2] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded bg-burgundy hover:bg-[#5B192C] text-ivory font-semibold shadow disabled:opacity-50"
                >
                  {submitting ? 'Logging...' : 'Save Examination Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
