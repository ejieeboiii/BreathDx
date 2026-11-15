import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loginPatient,
  getPatientMe,
} from '../utils/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const savedRole = await AsyncStorage.getItem('role');
        if (!token || !savedRole) return;

        if (savedRole !== 'patient') {
          await AsyncStorage.multiRemove(['token', 'role']);
          return;
        }

        const res = await getPatientMe();
        setUser(res.data);
        setRole('patient');
      } catch {
        await AsyncStorage.multiRemove(['token', 'role']);
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const applyAuthResponse = async (data) => {
    const profile = data?.user || data?.doctor;
    if (!data?.access_token || !profile) {
      throw new Error('Invalid response from server');
    }
    await AsyncStorage.setItem('token', data.access_token);
    await AsyncStorage.setItem('role', 'patient');
    setUser(profile);
    setRole('patient');
    return data;
  };

  const login = async (email, password) => {
    const res = await loginPatient({ email, password });
    return applyAuthResponse(res.data);
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['token', 'role']);
    } catch (err) {
      console.error('Logout storage error:', err);
      setUser(null);
      setRole(null);
      return {
        success: false,
        message: 'Could not clear saved session data. You have been signed out on this device.',
      };
    }
    setUser(null);
    setRole(null);
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, doctor: user, role, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
