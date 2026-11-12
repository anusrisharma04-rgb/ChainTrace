'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Database, Shield, Server } from 'lucide-react';

export const Header: React.FC = () => {
  const pathname = usePathname();

  if (pathname === '/login') return null;

  const getPageTitle = () => {
    switch (pathname) {
      case '/':
        return 'Forensic Overview & Integrity Dashboard';
      case '/cases':
        return 'Investigation Case Management';
      case '/evidence':
        return 'Digital Evidence Vault & Integrity Verification';
      case '/transfers':
        return 'Chain of Custody & Custody Transfers';
      case '/examinations':
        return 'Forensic Examinations & NoSQL Artifact Reports';
      case '/access-logs':
        return 'Evidence Access Audit Logs';
      case '/audit-logs':
        return 'Immutable System Audit Trail (Tamper-Resistant)';
      case '/users':
        return 'User & Access Role Administration';
      default:
        return 'Forensic Evidence Platform';
    }
  };

  return (
    <header className="h-16 bg-[#F8F5EE] border-b border-[#E0D8CB] px-6 flex items-center justify-between shrink-0">
      <div>
        <h2 className="text-base font-bold text-charcoal">{getPageTitle()}</h2>
        <p className="text-xs text-[#6E6A63]">ChainTrace DBMS Level 3 Forensic Provenance Platform</p>
      </div>

      <div className="flex items-center space-x-3 text-xs">
        {/* PostgreSQL Node */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#EAE2D3] text-charcoal border border-[#D9D0BF]">
          <Database className="w-3.5 h-3.5 text-forest" />
          <span className="font-semibold">PostgreSQL:</span>
          <span className="text-forest font-bold">Connected</span>
        </div>

        {/* MongoDB Node */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#EAE2D3] text-charcoal border border-[#D9D0BF]">
          <Server className="w-3.5 h-3.5 text-burgundy" />
          <span className="font-semibold">MongoDB:</span>
          <span className="text-forest font-bold">Active</span>
        </div>

        {/* SHA-256 Engine */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-forest text-ivory font-semibold shadow-sm">
          <Shield className="w-3.5 h-3.5" />
          <span>SHA-256 Hashing Engine</span>
        </div>
      </div>
    </header>
  );
};
