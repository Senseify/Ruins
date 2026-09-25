import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../services/apiClient';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  xp: number;
  level: number;
  gamesPlayed: number;
  wins: number;
  totalScore: number;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (emailOrUsername: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  loginAsQuickOperative: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initAuth = async () => {
    setIsLoading(true);
    await apiClient.init();
    const token = apiClient.getToken();
    if (token) {
      const res = await apiClient.auth.getMe();
      if (res.data?.user) {
        setUser(res.data.user);
      } else {
        await apiClient.setToken(null);
        setUser(null);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (emailOrUsername: string, password: string) => {
    const res = await apiClient.auth.login({ emailOrUsername, password });
    if (res.data?.token && res.data?.user) {
      await apiClient.setToken(res.data.token);
      setUser(res.data.user);
      return { success: true };
    }
    return { success: false, error: res.error || 'Login failed' };
  };

  const register = async (username: string, email: string, password: string, displayName?: string) => {
    const res = await apiClient.auth.register({ username, email, password, displayName });
    if (res.data?.token && res.data?.user) {
      await apiClient.setToken(res.data.token);
      setUser(res.data.user);
      return { success: true };
    }
    return { success: false, error: res.error || 'Registration failed' };
  };

  const loginAsQuickOperative = async () => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const username = `Agent_${randomSuffix}`;
    const email = `agent${randomSuffix}@ruins.network`;
    const password = 'Password123!';
    return register(username, email, password, `Operative ${randomSuffix}`);
  };

  const logout = async () => {
    await apiClient.setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const res = await apiClient.auth.getMe();
    if (res.data?.user) {
      setUser(res.data.user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        loginAsQuickOperative,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
