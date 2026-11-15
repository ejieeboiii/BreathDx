import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { getPatients, getPatientReadings, sendSensorData, getReadingsWebSocketUrl } from '../../utils/api';
import { API_BASE_URL } from '../../utils/api';
import LevelBadge from '../../components/LevelBadge';

const levelConfig = {
  Normal: { color: '#178365', bg: '#eff8f4', border: '#ccebdd', icon: '✓' },
  'Pre-Diabetic': { color: '#9a6e06', bg: '#fff8e6', border: '#f0dba2', icon: '⚠' },
  Diabetic: { color: '#b42336', bg: '#fff0f1', border: '#f5c2c7', icon: '!' },
};

export default function LiveScanScreen() {
  const route = useRoute();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [form, setForm] = useState({ raw_sensor_value: '', temperature: '', humidity: '' });
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [mode, setMode] = useState('manual');
  const [listenerActive, setListenerActive] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [listenerStatus, setListenerStatus] = useState('idle');
  const [listenerMessage, setListenerMessage] = useState('Select a patient, then start listening for ESP32 packets.');
  const [error, setError] = useState('');
  const latestSeenReadingId = useRef(null);
  const pollTimerRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    getPatients().then((r) => {
      setPatients(r.data);
      const pid = route.params?.patientId;
      if (pid) {
        const p = r.data.find((x) => x.id === pid || x.id === parseInt(String(pid), 10));
        if (p) setSelectedPatient(p);
      }
    });
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, [route.params?.patientId]);

  const selectedPatientName = selectedPatient?.full_name || 'Unknown patient';

  const handle = (key, val) => setForm({ ...form, [key]: val });

  const mapReadingToResult = (reading, originMessage = 'Received from ESP32 listener') => ({
    patient_name: selectedPatientName,
    acetone_ppm: reading.acetone_ppm,
    diabetes_level: reading.diabetes_level,
    suggestion: reading.suggestion || 'No suggestion available.',
    source: originMessage,
    reading,
  });

  const pollLatestReading = async () => {
    if (socketConnected || !selectedPatient) return;
    try {
      const res = await getPatientReadings(selectedPatient.id);
      const latest = res.data?.[0];
      if (!latest) return;

      if (latestSeenReadingId.current === null) {
        latestSeenReadingId.current = latest.id;
        setListenerStatus('armed');
        setListenerMessage('Listener armed. Waiting for the next ESP32 upload...');
        return;
      }

      if (latest.id !== latestSeenReadingId.current) {
        latestSeenReadingId.current = latest.id;
        setResult(mapReadingToResult(latest));
        setListenerStatus('packet');
        setListenerMessage(`New packet at ${new Date(latest.taken_at).toLocaleTimeString()}.`);
      }
    } catch (err) {
      setListenerStatus('error');
      setListenerMessage(err.response?.data?.detail || 'Failed to poll readings.');
    }
  };

  const connectWebSocket = async () => {
    if (!selectedPatient) return;
    try {
      const wsUrl = await getReadingsWebSocketUrl({ patientId: selectedPatient.id });
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setSocketConnected(true);
        setListenerStatus('connected');
        setListenerMessage('WebSocket connected. Waiting for ESP32 packets...');
        ws.send('ping');
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'connected' || payload.type === 'pong') return;
          if (payload.type !== 'reading_created') return;
          if (selectedPatient.id !== payload.patient_id) return;

          latestSeenReadingId.current = payload.reading.id;
          setResult({
            patient_name: payload.patient_name || selectedPatientName,
            acetone_ppm: payload.acetone_ppm,
            diabetes_level: payload.diabetes_level,
            suggestion: payload.suggestion || 'No suggestion available.',
            source: 'WebSocket push (ESP32 real-time)',
            reading: {
              id: payload.reading.id,
              temperature: payload.reading.temperature,
              humidity: payload.reading.humidity,
              taken_at: payload.reading.taken_at,
              acetone_ppm: payload.acetone_ppm,
              diabetes_level: payload.diabetes_level,
            },
          });
          setListenerStatus('packet');
          setListenerMessage(`Real-time packet at ${new Date(payload.reading.taken_at).toLocaleTimeString()}.`);
        } catch {
          // ignore malformed
        }
      };

      ws.onerror = () => {
        setSocketConnected(false);
        setListenerStatus('fallback');
        setListenerMessage('WebSocket unavailable. Polling fallback is active.');
      };

      ws.onclose = () => {
        setSocketConnected(false);
        if (listenerActive) {
          setListenerStatus('fallback');
          setListenerMessage('WebSocket disconnected. Polling fallback is active.');
        }
      };
    } catch {
      setListenerStatus('fallback');
      setListenerMessage('Could not open WebSocket. Polling fallback is active.');
    }
  };

  const startListening = async () => {
    if (!selectedPatient) {
      setError('Please select a patient before starting listener mode.');
      return;
    }
    setError('');
    setListenerActive(true);
    setListenerStatus('starting');
    setListenerMessage('Initializing listener...');
    latestSeenReadingId.current = null;
    await pollLatestReading();
    await connectWebSocket();
    pollTimerRef.current = setInterval(pollLatestReading, 3000);
  };

  const stopListening = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setSocketConnected(false);
    setListenerActive(false);
    setListenerStatus('idle');
    setListenerMessage('Listener stopped.');
  };

  const scan = async () => {
    if (!selectedPatient) { setError('Please select a patient first.'); return; }
    if (!form.raw_sensor_value || !form.temperature || !form.humidity) {
      setError('All sensor fields are required.');
      return;
    }
    setScanning(true);
    setError('');
    setResult(null);
    try {
      const res = await sendSensorData({
        patient_id: selectedPatient.id,
        raw_sensor_value: parseInt(form.raw_sensor_value, 10),
        temperature: parseFloat(form.temperature),
        humidity: parseFloat(form.humidity),
      });
      setResult({ ...res.data, suggestion: res.data.suggestion || res.data.advice, source: 'Manual scan' });
    } catch (err) {
      setError(err.response?.data?.detail || 'Scan failed. Check your inputs.');
    } finally {
      setScanning(false);
    }
  };

  const cfg = result ? levelConfig[result.diabetes_level] : null;
  const suggestion = result?.suggestion || result?.advice;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Live Scan</Text>
          <Text style={styles.sub}>Record sensor readings and assign a monitoring band</Text>
        </View>

        <View style={styles.modeRow}>
          {['manual', 'listener'].map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => { setMode(m); if (m === 'manual') stopListening(); }}
            >
              <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
                {m === 'manual' ? 'Manual Entry' : 'ESP32 Listener'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SELECT PATIENT</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {patients.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.patientBtn, selectedPatient?.id === p.id && styles.patientBtnActive]}
                onPress={() => {
                  if (listenerActive) stopListening();
                  setSelectedPatient(p);
                  setResult(null);
                }}
              >
                <Text style={[styles.patientText, selectedPatient?.id === p.id && styles.patientTextActive]}>
                  {p.full_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.form}>
          {mode === 'manual' ? (
            <>
              {[
                { key: 'raw_sensor_value', label: 'RAW ADC (0–4095)', placeholder: 'e.g. 1200' },
                { key: 'temperature', label: 'TEMPERATURE (°C)', placeholder: 'e.g. 28.5' },
                { key: 'humidity', label: 'HUMIDITY (%)', placeholder: 'e.g. 65.0' },
              ].map((f) => (
                <View key={f.key} style={styles.field}>
                  <Text style={styles.label}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={f.placeholder}
                    placeholderTextColor="#91a0b0"
                    keyboardType="numeric"
                    value={form[f.key]}
                    onChangeText={(v) => handle(f.key, v)}
                  />
                </View>
              ))}
              <TouchableOpacity style={styles.scanBtn} onPress={scan} disabled={scanning}>
                {scanning ? <ActivityIndicator color="#fff" /> : <Text style={styles.scanBtnText}>Run Manual Scan</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>ESP32 UPLOAD ENDPOINT</Text>
                <Text style={styles.infoMono}>POST {API_BASE_URL}/readings/sensor</Text>
                <Text style={styles.infoHint}>JSON: patient_id, raw_sensor_value, temperature, humidity</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>LISTENER STATUS</Text>
                <Text style={styles.infoStatus}>{listenerMessage}</Text>
                <View style={styles.statusDotRow}>
                  <View style={[styles.dot, { backgroundColor: socketConnected ? '#34d399' : '#fbbf24' }]} />
                  <Text style={styles.dotText}>{socketConnected ? 'WebSocket connected' : 'Polling fallback'}</Text>
                </View>
              </View>
              <View style={styles.listenerBtns}>
                {!listenerActive ? (
                  <TouchableOpacity style={styles.scanBtn} onPress={startListening}>
                    <Text style={styles.scanBtnText}>Start Listening</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.scanBtn, styles.stopBtn]} onPress={stopListening}>
                    <Text style={styles.scanBtnText}>Stop Listening</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        {result && cfg && (
          <View style={[styles.result, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <View style={styles.resultHeader}>
              <View>
                <Text style={styles.resultPatientLabel}>PATIENT</Text>
                <Text style={styles.resultPatient}>{result.patient_name}</Text>
              </View>
              <Text style={[styles.resultIconText, { color: cfg.color }]}>{cfg.icon}</Text>
            </View>
            <View style={styles.resultStats}>
              {[
                { label: 'Acetone PPM', value: `${result.acetone_ppm}` },
                { label: 'Temp', value: `${result.reading?.temperature}°C` },
                { label: 'Humidity', value: `${result.reading?.humidity}%` },
              ].map((s) => (
                <View key={s.label} style={styles.statBox}>
                  <Text style={styles.statLabel}>{s.label}</Text>
                  <Text style={styles.statVal}>{s.value}</Text>
                </View>
              ))}
            </View>
            {result.predicted_bgl && (
              <View style={styles.bglBox}>
                <Text style={styles.bglLabel}>Predicted Blood Glucose</Text>
                <Text style={styles.bglValue}>{result.predicted_bgl.toFixed(1)} mg/dL</Text>
              </View>
            )}
            <View style={[styles.levelBox, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
              <Text style={[styles.levelTitle, { color: cfg.color }]}>{result.diabetes_level}</Text>
              <LevelBadge level={result.diabetes_level} small />
              <Text style={styles.levelAdvice}>{suggestion}</Text>
              {result.source ? <Text style={styles.source}>{result.source}</Text> : null}
            </View>
          </View>
        )}

        <View style={styles.reference}>
          <Text style={styles.refTitle}>ACETONE PPM REFERENCE</Text>
          {[
            { label: 'Normal', range: '< 1.8 PPM', color: '#34d399' },
            { label: 'Pre-Diabetic', range: '1.8 – 3.5 PPM', color: '#fbbf24' },
            { label: 'Diabetic', range: '> 3.5 PPM', color: '#f87171' },
          ].map((r) => (
            <View key={r.label} style={styles.refRow}>
              <Text style={[styles.refLabel, { color: r.color }]}>{r.label}</Text>
              <Text style={styles.refRange}>{r.range}</Text>
            </View>
          ))}
        </View>
        <View style={{ height: 116 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f6fb' },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 28, backgroundColor: '#1556ad', borderBottomLeftRadius: 38, borderBottomRightRadius: 22 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.82)', marginTop: 5 },
  modeRow: { flexDirection: 'row', marginHorizontal: 16, gap: 8, marginBottom: 12 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dfe7ef', alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#1d5fd0', borderColor: '#1d5fd0' },
  modeText: { color: '#65778a', fontWeight: '600', fontSize: 12 },
  modeTextActive: { color: '#fff' },
  section: { paddingHorizontal: 16, marginBottom: 12 },
  sectionLabel: { fontSize: 10, color: '#526a83', fontWeight: '600', letterSpacing: 1, marginBottom: 10 },
  patientBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dfe7ef' },
  patientBtnActive: { backgroundColor: '#e8f0fb', borderColor: '#b7cfee' },
  patientText: { color: '#65778a', fontWeight: '600', fontSize: 13 },
  patientTextActive: { color: '#1d5fd0' },
  form: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 22, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#e1e9f1' },
  field: { marginBottom: 14 },
  label: { fontSize: 10, color: '#526a83', fontWeight: '600', letterSpacing: 1, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d7e2ec', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, color: '#263b50', fontSize: 15 },
  errorText: { color: '#b42336', fontSize: 13, marginTop: 12, backgroundColor: '#fff0f1', padding: 12, borderRadius: 12 },
  scanBtn: { backgroundColor: '#1d5fd0', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  stopBtn: { backgroundColor: '#b42336' },
  scanBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  listenerBtns: { flexDirection: 'row', gap: 8 },
  infoBox: { backgroundColor: '#f3f6fb', borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e1e9f1' },
  infoLabel: { fontSize: 10, color: '#718196', fontWeight: '600', letterSpacing: 1 },
  infoMono: { color: '#263b50', fontSize: 11, marginTop: 6, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  infoHint: { color: '#718196', fontSize: 11, marginTop: 4 },
  infoStatus: { color: '#178365', fontSize: 13, marginTop: 6 },
  statusDotRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotText: { color: '#65778a', fontSize: 11 },
  result: { marginHorizontal: 16, borderRadius: 22, padding: 18, marginBottom: 16, borderWidth: 1 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  resultPatientLabel: { fontSize: 10, color: '#718196', fontWeight: '600', letterSpacing: 1 },
  resultPatient: { color: '#263b50', fontWeight: '700', fontSize: 16, marginTop: 2 },
  resultIconText: { fontSize: 28, fontWeight: 'bold' },
  resultStats: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 14, padding: 12, alignItems: 'center' },
  statLabel: { color: '#718196', fontSize: 10, fontWeight: '600' },
  statVal: { color: '#263b50', fontWeight: '700', fontSize: 16, marginTop: 4 },
  bglBox: { backgroundColor: '#eef4fc', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#dce8f6', marginBottom: 14 },
  bglLabel: { color: '#1d5fd0', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  bglValue: { color: '#1e293b', fontWeight: '700', fontSize: 22, marginTop: 4 },
  levelBox: { borderRadius: 14, padding: 14, borderWidth: 1 },
  levelTitle: { fontWeight: 'bold', fontSize: 18, marginBottom: 6 },
  levelAdvice: { color: '#526477', fontSize: 13, lineHeight: 18, marginTop: 8 },
  source: { color: '#718196', fontSize: 11, marginTop: 8 },
  reference: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e1e9f1' },
  refTitle: { fontSize: 10, color: '#718196', fontWeight: '600', letterSpacing: 1, marginBottom: 12 },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#edf1f5' },
  refLabel: { fontWeight: '700', fontSize: 13 },
  refRange: { color: '#526477', fontSize: 13 },
});
