'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  profileType: 'personal' | 'business';
  isVerified: boolean;
  avatar: string;
  role: 'user' | 'business' | 'admin';
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
    try {
      const savedUser = localStorage.getItem(STORAGE_KEY_USER);
      const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
      if (savedUser && savedToken) {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } else {
        setUser(null);
        setToken(null);
      }
    } catch {
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
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
