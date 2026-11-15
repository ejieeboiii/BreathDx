import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  checkListenerApi,
  getPatientReadings,
  getPatients,
  getReadingsWebSocketUrl,
  startListener,
  stopListener,
} from '../../utils/api';

const levelConfig = {
  Normal: { color: 'text-emerald-700', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', ring: 'ring-emerald-500/20', icon: '✓' },
  'Pre-Diabetic': { color: 'text-amber-700', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', ring: 'ring-yellow-500/20', icon: '⚠' },
  Diabetic: { color: 'text-red-700', bg: 'bg-red-500/10', border: 'border-red-500/30', ring: 'ring-red-500/20', icon: '!' },
};

const formatPhilippinesTime = (date) => new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
}).format(new Date(date));

const apiErrorMessage = (err, fallback) => {
  const detail = err.response?.data?.detail;
  if (err.response?.status === 404) {
    return 'Listener API not found. Stop the old backend window and restart: cd backend → .\\venv\\Scripts\\uvicorn.exe main:app --host 0.0.0.0 --port 8001';
  }
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(', ');
  if (typeof detail === 'string') return detail;
  if (err.request && !err.response) {
    return 'Cannot reach the server. Start the backend on port 8001.';
  }
  return fallback;
};

export default function LiveScan() {
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState({ patient_id: '' });
  const [result, setResult] = useState(null);
  const [listenerActive, setListenerActive] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [listenerStatus, setListenerStatus] = useState('idle');
  const [listenerMessage, setListenerMessage] = useState('Select a patient, then start listening for ESP32 packets.');
  const [error, setError] = useState('');
  const [backendReady, setBackendReady] = useState(true);
  const [lastSensorReadingAt, setLastSensorReadingAt] = useState(null);
  const [statusClock, setStatusClock] = useState(0);
  const latestSeenReadingId = useRef(null);
  const pollTimerRef = useRef(null);
  const socketRef = useRef(null);
  const sessionActiveRef = useRef(false);
  const sessionIdRef = useRef(0);
  const resultAcceptedRef = useRef(false);
  const pollInFlightRef = useRef(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    getPatients().then((r) => {
      setPatients(r.data);
      const pid = searchParams.get('patient');
      if (pid) setForm((f) => ({ ...f, patient_id: pid }));
    });
    checkListenerApi()
      .then(() => setBackendReady(true))
      .catch(() => setBackendReady(false));
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!listenerActive) return undefined;
    const timer = setInterval(() => setStatusClock(Date.now()), 3000);
    return () => clearInterval(timer);
  }, [listenerActive]);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const nameForPatientId = (patientId) =>
    patients.find((p) => p.id == patientId)?.full_name || `Patient #${patientId}`;

  const mapReadingToResult = (reading, originMessage = 'Received from ESP32 listener') => ({
    patient_name: nameForPatientId(reading.patient_id),
    acetone_ppm: reading.acetone_ppm,
    diabetes_level: reading.diabetes_level,
    suggestion: reading.suggestion || 'No suggestion available.',
    source: originMessage,
    reading,
  });

  const acceptReading = (mapped, reading, sessionId, message) => {
    if (
      !sessionActiveRef.current
      || sessionIdRef.current !== sessionId
      || resultAcceptedRef.current
    ) return;

    resultAcceptedRef.current = true;
    latestSeenReadingId.current = reading.id;
    setLastSensorReadingAt(Date.parse(reading.taken_at));
    setResult(mapped);
    setListenerStatus('packet');
    setListenerMessage(message);
    stopListening('Reading received. Session stopped.');
  };

  const pollLatestReading = async (sessionId) => {
    if (
      !sessionActiveRef.current
      || sessionIdRef.current !== sessionId
      || resultAcceptedRef.current
      || socketConnected
      || pollInFlightRef.current
    ) return;
    if (!form.patient_id) return;
    pollInFlightRef.current = true;
    try {
      const res = await getPatientReadings(parseInt(form.patient_id));
      const latest = res.data?.[0];
      if (!latest || !sessionActiveRef.current || sessionIdRef.current !== sessionId) return;

      if (latest.id !== latestSeenReadingId.current) {
        const mapped = mapReadingToResult(latest, 'New ESP32 sensor reading');
        acceptReading(
          mapped,
          latest,
          sessionId,
          `Scan received — ${mapped.patient_name}: ${mapped.acetone_ppm} ppm, ${mapped.diabetes_level} at ${formatPhilippinesTime(latest.taken_at)}.`,
        );
      }
    } catch (err) {
      if (sessionActiveRef.current && sessionIdRef.current === sessionId) {
        setListenerStatus('error');
        setListenerMessage(err.response?.data?.detail || 'Failed to poll readings.');
      }
    } finally {
      pollInFlightRef.current = false;
    }
  };

  const connectWebSocket = (sessionId) => {
    const token = localStorage.getItem('token');
    if (!token || !form.patient_id) return;

    // Close existing WebSocket before creating a new one
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    const wsUrl = getReadingsWebSocketUrl({ token, patientId: parseInt(form.patient_id) });
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      if (!sessionActiveRef.current || sessionIdRef.current !== sessionId) {
        ws.close();
        return;
      }
      setSocketConnected(true);
      setListenerStatus('connected');
      setListenerMessage('WebSocket connected. Waiting for ESP32 packets...');
      ws.send('ping');
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'connected') return;
        if (payload.type === 'pong') return;
        if (payload.type !== 'reading_created') return;
        if (
          !sessionActiveRef.current
          || sessionIdRef.current !== sessionId
          || resultAcceptedRef.current
          || socketRef.current !== ws
        ) return;
        if (parseInt(form.patient_id) !== payload.patient_id) return;

        const mapped = {
          patient_name: payload.patient_name,
          acetone_ppm: payload.acetone_ppm,
          diabetes_level: payload.diabetes_level,
          suggestion: payload.suggestion,
          source: 'Real-time reading received while listener was armed',
          reading: {
            id: payload.reading.id,
            temperature: payload.reading.temperature,
            humidity: payload.reading.humidity,
            taken_at: payload.reading.taken_at,
          },
        };
        acceptReading(
          mapped,
          payload.reading,
          sessionId,
          `Real-time packet received at ${formatPhilippinesTime(payload.reading.taken_at)}.`,
        );
      } catch {
        // Ignore malformed events and keep listener alive.
      }
    };

    ws.onerror = () => {
      if (!sessionActiveRef.current || sessionIdRef.current !== sessionId) return;
      if (ws.readyState === WebSocket.OPEN) return;
      setSocketConnected(false);
      setListenerStatus('fallback');
      setListenerMessage('WebSocket unavailable. Fallback polling is active (updates every 3s).');
    };

    ws.onclose = (event) => {
      if (sessionIdRef.current !== sessionId) return;
      setSocketConnected(false);
      if (!sessionActiveRef.current) return;
      if (event.code === 1008) {
        setListenerStatus('error');
        setListenerMessage(event.reason || 'WebSocket closed. Log in again or check patient access.');
        return;
      }
      setListenerStatus('fallback');
      setListenerMessage('WebSocket disconnected. Fallback polling is active (updates every 3s).');
    };
  };

  const startListening = async () => {
    if (sessionActiveRef.current) return;
    if (!form.patient_id) {
      setError('Please select a patient before starting listener mode.');
      return;
    }
    const sessionId = sessionIdRef.current + 1;
    sessionIdRef.current = sessionId;
    sessionActiveRef.current = true;
    resultAcceptedRef.current = false;
    setError('');
    setResult(null);
    setListenerActive(true);
    setListenerStatus('starting');
    setListenerMessage('Arming the listener for the selected patient...');
    latestSeenReadingId.current = null;
    setLastSensorReadingAt(null);

    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    try {
      const patientId = parseInt(form.patient_id, 10);
      const existingReadings = await getPatientReadings(patientId);
      if (!sessionActiveRef.current || sessionIdRef.current !== sessionId) return;
      latestSeenReadingId.current = existingReadings.data?.[0]?.id ?? null;
      await startListener(patientId);
      if (!sessionActiveRef.current || sessionIdRef.current !== sessionId) {
        await stopListener();
        return;
      }
      setListenerStatus('armed');
      setListenerMessage('Listener armed. Waiting for a new ESP32 upload; allow up to 10 seconds after it samples. Check the ESP32 serial monitor for HTTP errors if no reading arrives.');
      connectWebSocket(sessionId);
      pollTimerRef.current = setInterval(() => pollLatestReading(sessionId), 3000);
      await pollLatestReading(sessionId);
    } catch (err) {
      if (!sessionActiveRef.current || sessionIdRef.current !== sessionId) return;
      sessionActiveRef.current = false;
      sessionIdRef.current += 1;
      setListenerActive(false);
      setListenerStatus('error');
      setError(apiErrorMessage(err, 'Could not prepare the listener. Check that the selected patient readings are accessible.'));
      return;
    }
  };

  const stopListening = async (message = 'Listener stopped.') => {
    sessionActiveRef.current = false;
    sessionIdRef.current += 1;
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    try {
      await stopListener();
    } catch {
      /* best effort */
    }
    setSocketConnected(false);
    setListenerActive(false);
    setListenerStatus('idle');
    setListenerMessage(message);
  };

  const hasRecentReading = Boolean(
    listenerActive && lastSensorReadingAt && statusClock - lastSensorReadingAt < 30000,
  );
  const displayedListenerMessage = listenerActive && !hasRecentReading && listenerStatus !== 'error'
    ? lastSensorReadingAt
      ? 'No recent reading. Check that the ESP32 is powered, connected to Wi-Fi, configured to reach this server, and receiving a successful HTTP response.'
      : 'Listener armed; waiting for the first upload. The ESP32 sends readings over Wi-Fi, typically every 10 seconds; USB serial is not required.'
    : listenerMessage;
  const cfg = result ? levelConfig[result.diabetes_level] : null;

  return (
    <div className="min-h-full bg-[#eef3f8] px-4 py-7 text-slate-900 sm:px-6 xl:px-8 xl:py-6 xl:text-[13px]">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-6">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.16em] text-sky-700 sm:text-[13px]">Monitoring workspace</p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-[30px]">Live Scan</h1>
            <p className="mt-1 text-[13px] text-slate-500">MQ-138 and DHT22 readings arrive from the ESP32 over Wi-Fi; USB serial is not required.</p>
          </div>
        </div>

        <div className="mb-6 rounded-[24px] border border-[#dbe4ef] bg-white px-4 pb-4 pt-5 shadow-sm sm:px-6 sm:pt-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="live-scan-patient" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Select Patient</label>
              <select id="live-scan-patient" name="patient_id" value={form.patient_id} onChange={handle} required
                className="mt-2 min-h-11 w-full rounded-2xl border border-[#dbe4ef] bg-white px-4 text-[13px] shadow-sm focus:border-sky-500 focus:outline-none">
                <option value="">-- Select a patient --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
              {form.patient_id && (
                <div className="mt-2 space-y-1 text-sm leading-relaxed text-emerald-700">
                  <p>1. Click <strong>Start Listening</strong> (patient set here).</p>
                  <p>2. Keep the ESP32 powered and connected to Wi-Fi; allow the MQ-138 to warm up for 5 minutes.</p>
                  <p>3. Exhale steadily near the MQ-138. The ESP32 samples automatically about every 10 seconds while listening.</p>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="rounded-[18px] border border-[#dbe4ef] bg-[#f5f7fa] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Listener Status</p>
                <p className={`mt-1 text-[13px] ${listenerStatus === 'error' ? 'text-red-700' : hasRecentReading ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {displayedListenerMessage}
                </p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-[#dbe4ef] bg-white px-3 py-1">
                  <span className={`h-2.5 w-2.5 rounded-full ${hasRecentReading ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                  <span className="text-xs text-slate-500">
                    {hasRecentReading ? 'Recent reading received' : listenerActive ? 'Waiting for readings' : 'No active session'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {socketConnected ? 'Live updates connected' : 'Polling for readings'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {!listenerActive ? (
                  <button
                    type="button"
                    onClick={startListening}
                    className="min-h-12 rounded-2xl bg-sky-600 px-4 text-sm font-semibold text-white shadow-lg shadow-sky-700/30 transition-colors hover:bg-sky-700"
                  >
                    Start Listening
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopListening}
                    className="min-h-12 rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-200"
                  >
                    Stop Session
                  </button>
                )}
              </div>
            </div>
            {!backendReady && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-amber-800 text-sm">
                Backend is missing the listener API. Restart uvicorn from the project <span className="font-mono">backend</span> folder, then refresh this page.
              </div>
            )}
            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-700 text-sm">{error}</div>}
          </div>
        </div>

        {result && cfg && (
          <div className={`${cfg.bg} border ${cfg.border} rounded-2xl p-5 ring-4 ${cfg.ring} mb-5`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-slate-600 text-xs uppercase tracking-wider">Patient</p>
                <p className="text-slate-900 font-semibold mt-0.5">{result.patient_name}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center text-2xl ${cfg.color} font-bold`}>
                {cfg.icon}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 mb-4">
              {[
                { label: 'Acetone PPM', value: result.acetone_ppm },
                { label: 'Temperature', value: `${result.reading.temperature}°C` },
                { label: 'Humidity', value: `${result.reading.humidity}%` },
              ].map(s => (
                <div key={s.label} className="bg-white/80 rounded-xl p-3 text-center">
                  <p className="text-slate-600 text-xs">{s.label}</p>
                  <p className="text-slate-900 font-bold text-lg mt-1">{s.value}</p>
                </div>
              ))}
            </div>
            {result.predicted_bgl != null && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 mb-4">
                <p className="text-sky-700 text-xs uppercase tracking-wider">Predicted Blood Glucose</p>
                <p className="text-slate-900 font-bold text-2xl mt-1">{result.predicted_bgl.toFixed(1)} mg/dL</p>
              </div>
            )}
            <div className={`rounded-xl p-4 ${cfg.bg} border ${cfg.border}`}>
              <p className={`font-bold text-lg ${cfg.color}`}>{result.diabetes_level}</p>
              <p className="text-slate-700 text-sm mt-1">{result.suggestion}</p>
              {result.source && <p className="text-slate-600 text-xs mt-3">{result.source}</p>}
            </div>
          </div>
        )}

        <div className="rounded-[24px] border border-[#dbe4ef] bg-white p-5 shadow-sm sm:p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Acetone PPM Reference</p>
          <div className="space-y-2">
            {[
              { label: 'Normal', range: '< 1.8 PPM', color: 'text-emerald-700', bg: 'bg-emerald-500/10' },
              { label: 'Pre-Diabetic', range: '1.8 – 3.5 PPM', color: 'text-amber-700', bg: 'bg-yellow-500/10' },
              { label: 'Diabetic', range: '> 3.5 PPM', color: 'text-red-700', bg: 'bg-red-500/10' },
            ].map(r => (
              <div key={r.label} className={`flex items-center justify-between ${r.bg} min-h-11 flex-wrap gap-2 rounded-2xl px-4 py-2`}>
                <span className={`text-[13px] ${r.color}`}>{r.label}</span>
                <span className="font-mono text-[13px] text-slate-500">{r.range}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 text-center mt-4">For health monitoring purposes only. Not for medical diagnosis.</p>
        </div>
      </div>
    </div>
  );
}