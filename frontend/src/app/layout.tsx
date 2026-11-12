import React from 'react';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export const metadata = {
  title: 'ChainTrace — Digital Evidence Provenance & Integrity Management System',
  description: 'DBMS Level 3 Academic Project — Forensics Evidence Integrity & Chain of Custody Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-ivory text-charcoal min-h-screen">
        <AuthProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
              <Header />
              <main className="flex-1 p-6 bg-ivory">{children}</main>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
