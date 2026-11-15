import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../utils/api';
import { getApiSetupHint } from '../utils/apiBaseUrl';

function formatAuthError(err) {
  if (err.message === 'Invalid response from server') {
    return 'Login succeeded but server response was unexpected. Check backend is running.';
  }
  const detail = err.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => e.msg).join(', ');
  }
  if (typeof detail === 'string') {
    return detail;
  }
  if (!err.response) {
    return `Cannot reach the server at ${API_BASE_URL}. ${getApiSetupHint()}`;
  }
  return 'Something went wrong. Try again.';
}

export default function AuthScreen() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handle = (key, val) => setForm({ ...form, [key]: val });

  const submit = async () => {
    setError('');
    if (!form.email || !form.password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const buttonLabel = loading ? 'Please wait...' : 'Login as Patient';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroShapeOne} />
          <View style={styles.heroShapeTwo} />
          <View style={styles.logoContainer}>
            <View style={[styles.logoBox, { backgroundColor: '#14a9d8' }]}>
              <Text style={styles.logoIcon}>⚕</Text>
            </View>
            <Text style={styles.logoTitle}>BreathDx</Text>
            <Text style={styles.logoSub}>Health Monitoring System</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.roleHint}>For personal health monitoring</Text>

          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="patient@email.com"
              placeholderTextColor="#9aaaba"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(v) => handle('email', v)}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#9aaaba"
              secureTextEntry
              value={form.password}
              onChangeText={(v) => handle('password', v)}
            />
          </View>

          <Text style={styles.patientNote}>
            Patient accounts are created by your healthcare provider. Use the credentials they gave you.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{buttonLabel}</Text>}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f2f6fb', paddingHorizontal: 22, paddingBottom: 24 },
  hero: { height: 365, marginHorizontal: -22, marginTop: 0, marginBottom: -28, backgroundColor: '#1556ad', borderBottomLeftRadius: 52, borderBottomRightRadius: 20, overflow: 'hidden' },
  heroShapeOne: { position: 'absolute', width: 510, height: 190, top: 215, left: -150, borderRadius: 120, backgroundColor: 'rgba(64,143,224,0.28)', transform: [{ rotate: '-6deg' }] },
  heroShapeTwo: { position: 'absolute', width: 460, height: 150, top: 265, right: -190, borderRadius: 100, backgroundColor: 'rgba(87,164,235,0.2)', transform: [{ rotate: '4deg' }] },
  logoContainer: { alignItems: 'center', paddingTop: 48 },
  logoBox: { width: 94, height: 94, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 18, shadowColor: '#062b67', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 12, elevation: 7 },
  logoIcon: { fontSize: 42, color: '#fff' },
  logoTitle: { fontSize: 32, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  logoSub: { fontSize: 16, color: 'rgba(255,255,255,0.76)', marginTop: 6 },
  card: { backgroundColor: '#fff', borderRadius: 30, padding: 24, shadowColor: '#17324d', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.14, shadowRadius: 20, elevation: 8 },
  roleHint: { textAlign: 'center', color: '#53677b', fontSize: 15, fontWeight: '600', marginBottom: 24 },
  patientNote: { color: '#5d7083', fontSize: 13, marginBottom: 18, lineHeight: 20 },
  field: { marginBottom: 18 },
  label: { fontSize: 12, color: '#455d73', fontWeight: '700', letterSpacing: 1.2, marginBottom: 9 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#d7e2ec', borderRadius: 20, minHeight: 62, paddingHorizontal: 18, paddingVertical: 15, color: '#263b50', fontSize: 16 },
  error: { color: '#b42336', fontSize: 13, marginBottom: 12, backgroundColor: '#fff0f1', padding: 12, borderRadius: 10 },
  btn: { backgroundColor: '#1d5fd0', borderRadius: 20, paddingVertical: 17, alignItems: 'center', marginTop: 4, shadowColor: '#164b9f', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
