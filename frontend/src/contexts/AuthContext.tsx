import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getCurrentUser, logout as apiLogout, verifyToken } from '../api/auth';
import { getSessionToken, setSessionToken, clearSession } from '../api/client';
import type { User } from '../api/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string) => Promise<void>;
  loginWithSession: (sessionToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const refreshUser = useCallback(async () => {
    const token = getSessionToken();
    if (!token) {
      setState({ user: null, isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const { user } = await getCurrentUser();
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch {
      clearSession();
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  const login = useCallback(async (token: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const { user } = await verifyToken(token);
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch (error) {
      setState({ user: null, isLoading: false, isAuthenticated: false });
      throw error;
    }
  }, []);

  const loginWithSession = useCallback(async (token: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    setSessionToken(token);
    try {
      const { user } = await getCurrentUser();
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch (error) {
      clearSession();
      setState({ user: null, isLoading: false, isAuthenticated: false });
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      await apiLogout();
    } finally {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        loginWithSession,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
