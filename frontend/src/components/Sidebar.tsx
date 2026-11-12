'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  ShieldCheck, 
  FolderKanban, 
  HardDrive, 
  GitCommit, 
  Microscope, 
  FileText, 
  Activity, 
  Users, 
  LogOut,
  LayoutDashboard
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout, isAdmin, isInvestigator, isAnalyst } = useAuth();

  if (pathname === '/login') return null;

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Cases', href: '/cases', icon: FolderKanban },
    { label: 'Evidence Vault', href: '/evidence', icon: HardDrive },
    { label: 'Chain of Custody', href: '/transfers', icon: GitCommit },
    { label: 'Examinations (NoSQL)', href: '/examinations', icon: Microscope },
    { label: 'Access Logs', href: '/access-logs', icon: Activity },
    { label: 'Audit Trail', href: '/audit-logs', icon: FileText },
    { label: 'Users & Roles', href: '/users', icon: Users, adminOnly: true },
  ];

  const getRoleBadgeColor = () => {
    if (isAdmin) return 'bg-burgundy text-ivory';
    if (isInvestigator) return 'bg-forest text-ivory';
    return 'bg-[#403B38] text-ivory';
  };

  return (
    <aside className="w-64 bg-charcoal text-[#E6E5E5] flex flex-col justify-between shrink-0 h-screen sticky top-0 border-r border-[#3F3D3D]">
      <div>
        {/* Brand / Logo Header */}
        <div className="p-5 border-b border-[#3F3D3D] flex items-center space-x-3">
          <div className="w-10 h-10 rounded bg-burgundy flex items-center justify-center text-ivory shadow">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wide text-ivory">ChainTrace</h1>
            <p className="text-xs text-[#A8A49D]">Digital Evidence Provenance</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-burgundy text-white font-semibold shadow-sm'
                    : 'text-[#C8C7C7] hover:bg-[#383535] hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#A8A49D]'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Info & Logout Footer */}
      <div className="p-4 border-t border-[#3F3D3D] bg-[#222020]">
        <div className="flex items-center justify-between mb-3">
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-ivory truncate">{user?.name || 'Authorized User'}</p>
            <p className="text-xs text-[#9B9999] truncate">{user?.email || ''}</p>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getRoleBadgeColor()}`}>
            {user?.role_name || (isAdmin ? 'Admin' : isInvestigator ? 'Investigator' : 'Analyst')}
          </span>
        </div>
        <button
          onClick={() => logout()}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 text-xs font-semibold rounded bg-[#333030] hover:bg-burgundy text-ivory transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
