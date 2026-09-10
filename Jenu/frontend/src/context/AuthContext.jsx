import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [passwordReminder, setPasswordReminder] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.me();
      setUser(data.user);
      setPasswordReminder(data.password_reminder);
    } catch {
      setUser(null);
      setPasswordReminder(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (username, password) => {
    const data = await api.login(username, password);
    setUser(data.user);
    setPasswordReminder(data.password_reminder);
    return data;
  };

  const register = async (username, password) => api.register(username, password);

  const logout = async () => {
    await api.logout();
    setUser(null);
    setPasswordReminder(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, passwordReminder, loading, login, register, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
