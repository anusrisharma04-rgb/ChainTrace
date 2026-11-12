'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest, User } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Users, Plus, Shield, Check, AlertCircle, X, UserPlus, Lock } from 'lucide-react';

export default function UsersPage() {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDepartment, setNewDepartment] = useState('Digital Forensics');
  const [newRoleId, setNewRoleId] = useState('2');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchUsersAndRoles = async () => {
    setLoading(true);
    try {
      const [uData, rData] = await Promise.all([
        apiRequest<User[]>('/users/'),
        apiRequest<any[]>('/roles/').catch(() => []),
      ]);
      setUsers(uData);
      setRoles(rData);
      if (rData.length > 0 && !newRoleId) {
        setNewRoleId(String(rData[0].role_id));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest('/users/', {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          department: newDepartment,
          role_id: parseInt(newRoleId),
        }),
      });

      setSuccessMsg(`User ${newEmail} created successfully with Argon2 password hashing.`);
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      fetchUsersAndRoles();
    } catch (err: any) {
      setError(err.message || 'Failed to register user');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleName = (roleId: number) => {
    const r = roles.find(x => x.role_id === roleId);
    if (r) return r.role_name;
    if (roleId === 1) return 'Administrator';
    if (roleId === 2) return 'Investigator';
    if (roleId === 3) return 'Forensic Analyst';
    return `Role #${roleId}`;
  };

  const getRoleBadge = (roleId: number) => {
    if (roleId === 1) {
      return 'bg-burgundy text-white';
    } else if (roleId === 2) {
      return 'bg-forest text-white';
    } else {
      return 'bg-charcoal text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-charcoal">User & Role Administration</h2>
          <p className="text-xs text-[#55524E] mt-0.5">
            Role-Based Access Control (RBAC) governing case assignment, evidence transfer approvals, and examination authorization.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded bg-burgundy hover:bg-[#5B192C] text-ivory text-xs font-semibold shadow transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Authorized User</span>
          </button>
        )}
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

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-[#E0D8CB] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-charcoal">
            <thead className="bg-[#FAF7F2] text-[#55524E] uppercase text-[10px] tracking-wider border-b border-[#E0D8CB]">
              <tr>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Assigned Role</th>
                <th className="px-4 py-3 text-right">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE2D3]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#8C8880]">
                    Loading user records...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#8C8880]">
                    No registered users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.user_id} className="hover:bg-[#FAF7F2] transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#8C8880]">#{u.user_id}</td>
                    <td className="px-4 py-3 font-semibold text-charcoal">{u.name}</td>
                    <td className="px-4 py-3 text-[#55524E] font-mono">{u.email}</td>
                    <td className="px-4 py-3 text-[#55524E]">{u.department || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getRoleBadge(u.role_id)}`}>
                        {getRoleName(u.role_id)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        u.status === 'active' ? 'bg-forest/10 text-forest border border-forest/30' :
                        'bg-burgundy/10 text-burgundy border border-burgundy/30'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#D9D0BF] max-w-md w-full shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#E0D8CB] mb-4">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-burgundy" />
                <h3 className="font-bold text-sm text-charcoal">Create Authorized System User</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-[#8C8880] hover:text-charcoal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#55524E] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Special Agent Marcus Cole"
                  className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#D9D0BF] rounded text-charcoal"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#55524E] mb-1">Email Address *</label>
                <input
                  type="text"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. mcole@chaintrace.local"
                  className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#D9D0BF] rounded text-charcoal"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#55524E] mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#D9D0BF] rounded text-charcoal"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#55524E] mb-1">Department</label>
                <input
                  type="text"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  placeholder="e.g. Digital Forensics Unit"
                  className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#D9D0BF] rounded text-charcoal"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#55524E] mb-1">Assigned Role *</label>
                <select
                  value={newRoleId}
                  onChange={(e) => setNewRoleId(e.target.value)}
                  className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#D9D0BF] rounded text-charcoal font-semibold"
                >
                  {roles.map((r) => (
                    <option key={r.role_id} value={r.role_id}>
                      {r.role_name} — {r.description || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded border border-[#D9D0BF] text-[#55524E] hover:bg-[#FAF7F2] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded bg-burgundy hover:bg-[#5B192C] text-ivory font-semibold shadow disabled:opacity-50"
                >
                  {submitting ? 'Registering User...' : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
