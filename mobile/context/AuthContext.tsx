import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  isLoggedIn as checkLoggedIn,
  login as loginRequest,
  logout as logoutRequest,
  getCurrentUser,
  type CurrentUser,
} from '@/lib/auth';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: CurrentUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    checkLoggedIn().then(async (logged) => {
      setIsAuthenticated(logged);
      if (logged) {
        const me = await getCurrentUser();
        setUser(me);
      }
      setIsLoading(false);
    });
  }, []);

  const login = async (username: string, password: string) => {
    await loginRequest(username, password);
    setIsAuthenticated(true);
    const me = await getCurrentUser();
    setUser(me);
  };

  const logout = async () => {
    await logoutRequest();
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}