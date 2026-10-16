import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setRestaurant(data.restaurant);
    } catch {
      setUser(null);
      setRestaurant(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (credentials) => {
    await api.post('/auth/login', credentials);
    await refresh();
  };

  const register = async (payload) => {
    await api.post('/auth/register', payload);
    await refresh();
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
    setRestaurant(null);
  };

  return (
    <AuthContext.Provider value={{ user, restaurant, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
