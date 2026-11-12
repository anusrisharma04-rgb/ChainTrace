'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User, apiRequest } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAdmin: boolean;
  isInvestigator: boolean;
  isAnalyst: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: async () => {},
  isLoading: true,
  isAdmin: false,
  isInvestigator: false,
  isAnalyst: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const savedToken = localStorage.getItem('chaintrace_token');
    const savedUser = localStorage.getItem('chaintrace_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('chaintrace_token');
        localStorage.removeItem('chaintrace_user');
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!user && pathname !== '/login') {
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push('/');
      }
    }
  }, [user, isLoading, pathname, router]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('chaintrace_token', newToken);
    localStorage.setItem('chaintrace_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    router.push('/');
  };

  const logout = async () => {
    try {
      if (token) {
        await apiRequest('/auth/logout', { method: 'POST' });
      }
    } catch {
      // Ignore error during logout
    } finally {
      localStorage.removeItem('chaintrace_token');
      localStorage.removeItem('chaintrace_user');
      setToken(null);
      setUser(null);
      router.push('/login');
    }
  };

  const roleName = user?.role_name?.toLowerCase() || '';
  const isAdmin = user?.role_id === 1 || roleName.includes('admin');
  const isInvestigator = user?.role_id === 2 || roleName.includes('investigator');
  const isAnalyst = user?.role_id === 3 || roleName.includes('analyst');

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isLoading,
        isAdmin,
        isInvestigator,
        isAnalyst,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
