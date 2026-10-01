import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { TOKEN_KEY } from '../api/client';
import { authService } from '../services';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));
  const [notice, setNotice] = useState('');

  // Restore the session on first load.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    authService.me().then((d) => setUser(d.user)).catch(() => localStorage.removeItem(TOKEN_KEY)).finally(() => setBooting(false));
  }, []);

  // Any 401 from the API (expired token, deactivated account) signs the user out.
  useEffect(() => {
    const onExpired = (e) => { setUser(null); setNotice(e.detail || 'Your session has ended. Please sign in again.'); };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authService.login({ email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setNotice('');
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setNotice('');
  }, []);

  const value = useMemo(() => ({ user, booting, notice, login, logout, isAdmin: user?.role === 'ADMIN' }), [user, booting, notice, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
