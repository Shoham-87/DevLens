import React, { createContext, useCallback, useContext, useState } from 'react';
import { setAuthToken, clearAuthToken } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [user, setUser]   = useState(null);

  const login = useCallback((jwt, refresh, profile) => {
    setToken(jwt);
    setRefreshToken(refreshToken);
    setUser(profile);
    setAuthToken(jwt);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setRefreshToken(null);
    clearAuthToken();
  }, []);

  return (
    <AuthContext.Provider value={{ token, refreshToken , user, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
