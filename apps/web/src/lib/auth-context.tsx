'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Role = 'USER' | 'BUSINESS' | 'ADMIN';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  profileType: 'personal' | 'business';
  isVerified: boolean;
  avatar: string | null;
  coverImage?: string | null;
  bio?: string | null;
  role: Role;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    pass: string,
    profileType: 'personal' | 'business'
  ) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: {
    name: string;
    email: string;
    avatar: string | null;
    coverImage?: string | null;
    bio?: string | null;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_USER = 'promexa_auth_user';
const STORAGE_KEY_TOKEN = 'promexa_auth_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
        if (!savedToken) return;
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${savedToken}` },
          cache: 'no-store',
        });
        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem(STORAGE_KEY_USER);
            localStorage.removeItem(STORAGE_KEY_TOKEN);
          }
          return;
        }
        const profile: UserProfile = await res.json();
        if (active) {
          setUser(profile);
          setToken(savedToken);
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
        }
      } catch {
        // Do not restore stale profile data when the server cannot validate it.
      } finally {
        if (active) setIsLoading(false);
      }
    };
    restoreSession();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const syncSession = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY_TOKEN) return;
      if (!event.newValue) { setToken(null); setUser(null); }
      else if (event.newValue !== token) window.location.reload();
    };
    window.addEventListener('storage', syncSession);
    return () => window.removeEventListener('storage', syncSession);
  }, [token]);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Error al iniciar sesión' };
      }

      setUser(data.user);
      setToken(data.accessToken);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
      localStorage.setItem(STORAGE_KEY_TOKEN, data.accessToken);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: 'No se pudo conectar con el servidor de autenticación' };
    }
  };

  const register = async (
    name: string,
    email: string,
    pass: string,
    profileType: 'personal' | 'business'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password: pass, profileType }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.message || 'Error al registrar la cuenta' };
      }

      setUser(data.user);
      setToken(data.accessToken);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
      localStorage.setItem(STORAGE_KEY_TOKEN, data.accessToken);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: 'No se pudo conectar con el servidor de autenticación' };
    }
  };

  const updateProfile = async (data: { name: string; email: string; avatar: string | null }) => {
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(Array.isArray(result.message) ? result.message.join('. ') : result.message || 'No se pudo guardar el perfil');
    setUser(result);
    try { localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(result)); } catch {}
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
