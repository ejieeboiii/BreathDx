import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';

export function useLogout() {
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const notify = useCallback((title, message) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  }, []);

  const performLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      const result = await logout();
      if (result && !result.success) {
        notify(
          'Signed out locally',
          result.message || 'Your session was cleared on this device.',
        );
      }
    } catch (err) {
      notify(
        'Sign out issue',
        err?.message || 'Something went wrong, but you were signed out on this device.',
      );
    } finally {
      setLoggingOut(false);
    }
  }, [logout, notify]);

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm('Sign out\n\nAre you sure you want to log out?')) {
        await performLogout();
      }
      return;
    }

    Alert.alert('Sign out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => { void performLogout(); } },
    ]);
  }, [loggingOut, performLogout]);

  return { handleLogout, loggingOut };
}
