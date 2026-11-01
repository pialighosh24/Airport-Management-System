// AeroNexus Admin Panel — authentication context (backend-issued admin JWT).

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { api } from '../api/client';
import type { User } from '../api/types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  loginWithPin: (pin: string) => Promise<void>;
  loginWithCredentials: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'aeronexus_admin_token';
const USER_KEY = 'aeronexus_admin_user';

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setLoading(false);
      return;
    }
    setToken(storedToken);
    setUser(readStoredUser());

    api
      .get<{ success: boolean; user: User }>('/api/auth/me')
      .then((res) => {
        if (res?.success && res.user) {
          setUser(res.user);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        }
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const loginWithPin = async (pin: string) => {
    const res = await api.post<{ success: boolean; token: string; user: User }>('/api/auth/staff-login', { pin });
    if (!res?.success || !res.token || !res.user) {
      throw new ApiError('Staff authentication failed.', 401);
    }
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  };

  const loginWithCredentials = async (identifier: string, password: string) => {
    const res = await api.post<{ success: boolean; token: string; user: User }>('/api/auth/login', { identifier, password });
    if (!res?.success || !res.token || !res.user) {
      throw new ApiError('Authentication failed.', 401);
    }
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, token, loading, loginWithPin, loginWithCredentials, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
