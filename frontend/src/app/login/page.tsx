'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiRequest<{
        access_token: string;
        user: any;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      login(response.access_token, response.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-charcoal flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-[#1F1E1E] rounded-xl border border-[#3D3A3A] shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-burgundy text-ivory mb-3 shadow-lg">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ivory">ChainTrace</h1>
          <p className="text-xs text-[#A8A49D] mt-1">
            Digital Evidence Provenance & Integrity Management System
          </p>
          <div className="inline-block mt-2 px-2.5 py-0.5 rounded text-[11px] font-semibold tracking-wider uppercase bg-[#2C2929] text-forest border border-[#3F3D3D]">
            DBMS Level 3 • Cryptographic Integrity
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-burgundy/20 border border-burgundy/50 text-[#FCE7EB] text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-burgundy shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#D4CFC6] mb-1">
              Authorized Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8C8880] absolute left-3 top-3" />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@chaintrace.com"
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#141313] border border-[#3D3A3A] rounded text-ivory placeholder-[#66635D] focus:outline-none focus:border-burgundy"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#D4CFC6] mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8C8880] absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#141313] border border-[#3D3A3A] rounded text-ivory placeholder-[#66635D] focus:outline-none focus:border-burgundy"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded bg-burgundy hover:bg-[#5B192C] text-ivory text-sm font-semibold transition-colors shadow disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Access System</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Panel */}
        <div className="mt-8 pt-5 border-t border-[#333030]">
          <p className="text-[11px] font-bold text-[#8C8880] uppercase tracking-wider mb-2.5 flex items-center space-x-1">
            <ShieldAlert className="w-3.5 h-3.5 text-forest" />
            <span>Demonstration & Evaluation Accounts</span>
          </p>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@chaintrace.local', 'admin123')}
              className="text-left p-2 rounded bg-[#171616] hover:bg-[#252323] border border-[#333030] text-xs transition-colors flex items-center justify-between"
            >
              <div>
                <span className="font-semibold text-ivory">Administrator</span>
                <p className="text-[11px] text-[#8C8880]">admin@chaintrace.local / admin123</p>
              </div>
              <span className="text-[10px] bg-burgundy px-2 py-0.5 rounded text-white font-bold">Role 1</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('investigator@chaintrace.com', 'investigator123')}
              className="text-left p-2 rounded bg-[#171616] hover:bg-[#252323] border border-[#333030] text-xs transition-colors flex items-center justify-between"
            >
              <div>
                <span className="font-semibold text-ivory">Investigator</span>
                <p className="text-[11px] text-[#8C8880]">investigator@chaintrace.com / investigator123</p>
              </div>
              <span className="text-[10px] bg-forest px-2 py-0.5 rounded text-white font-bold">Role 2</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('analyst@chaintrace.com', 'analyst123')}
              className="text-left p-2 rounded bg-[#171616] hover:bg-[#252323] border border-[#333030] text-xs transition-colors flex items-center justify-between"
            >
              <div>
                <span className="font-semibold text-ivory">Forensic Analyst</span>
                <p className="text-[11px] text-[#8C8880]">analyst@chaintrace.com / analyst123</p>
              </div>
              <span className="text-[10px] bg-[#3B3835] px-2 py-0.5 rounded text-white font-bold">Role 3</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
