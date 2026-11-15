import { createContext, useContext, useState, useEffect } from 'react';
import {
  loginProvider,
  registerProvider,
  loginPatient,
  getProviderMe,
  getPatientMe,
} from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedRole = localStorage.getItem('role');

    if (!token || !savedRole) {
      setLoading(false);
      return;
    }

    const fetchMe = savedRole === 'patient' ? getPatientMe : getProviderMe;

    fetchMe()
      .then((res) => {
        setUser(res.data);
        setRole(savedRole);
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
      })
      .finally(() => setLoading(false));
  }, []);

  const applyAuth = (res) => {
    localStorage.setItem('token', res.data.access_token);
    localStorage.setItem('role', res.data.role);
    setUser(res.data.user);
    setRole(res.data.role);
    return res.data;
  };

  const login = async (email, password, userRole) => {
    const res = userRole === 'patient'
      ? await loginPatient({ email, password })
      : await loginProvider({ email, password });
    return applyAuth(res);
  };

  const register = async (full_name, email, password) => {
    const res = await registerProvider({ full_name, email, password });
    return applyAuth(res);
  };

  const logout = async () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
    } catch (err) {
      console.error('Logout storage error:', err);
      setUser(null);
      setRole(null);
      return {
        success: false,
        message: 'Could not clear browser storage. You have been signed out on this page.',
      };
    }
    setUser(null);
    setRole(null);
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, role, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
