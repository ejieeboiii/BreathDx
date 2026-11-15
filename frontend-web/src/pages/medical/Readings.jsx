import { useEffect, useState } from 'react';
import { getAllReadings, getPatients, deleteReading } from '../../utils/api';
import { useSearchParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const levelColor = { Normal: 'text-emerald-700', 'Pre-Diabetic': 'text-amber-700', Diabetic: 'text-red-700' };
const levelBg = { Normal: 'bg-emerald-50 border-emerald-200', 'Pre-Diabetic': 'bg-amber-50 border-amber-200', Diabetic: 'bg-red-50 border-red-200' };
const READINGS_PREVIEW = 5;

export default function Readings() {
  const [readings, setReadings] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState('all');
  const [showAllReadings, setShowAllReadings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const pid = searchParams.get('patient');
    if (pid) setSelected(pid);
    Promise.all([getAllReadings(), getPatients()])
      .then(([r, p]) => { setReadings(r.data); setPatients(p.data); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = selected === 'all' ? readings : readings.filter(r => r.patient_id === parseInt(selected));
  const visibleReadings = showAllReadings ? filtered : filtered.slice(0, READINGS_PREVIEW);

  const chartData = [...filtered].reverse().slice(-20).map(r => ({
    time: new Date(r.taken_at).toLocaleDateString(),
    ppm: r.acetone_ppm,
  }));

  const remove = async (id) => {
    if (!confirm('Delete this reading?')) return;
    await deleteReading(id);
    const r = await getAllReadings();
    setReadings(r.data);
  };

  const patientName = (id) => patients.find(p => p.id === id)?.full_name || `Patient #${id}`;

  if (loading) return <div className="grid min-h-full place-items-center bg-[#eef3f8]"><div className="text-sm text-slate-600">Loading...</div></div>;

  return (
    <div className="min-h-full bg-[#eef3f8] px-4 py-7 text-slate-900 sm:px-6 xl:px-8 xl:py-6 xl:text-[13px]">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-6">
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-sky-700 sm:text-[13px]">Monitoring records</p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-[30px]">Readings History</h1>
          <p className="mt-1 text-[13px] text-slate-600">{filtered.length} total readings</p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <button onClick={() => { setSelected('all'); setShowAllReadings(false); }}
            className={`min-h-10 rounded-2xl border px-4 text-[13px] transition-colors ${selected === 'all' ? 'border-transparent bg-sky-600 text-white' : 'border-[#dbe4ef] bg-white text-slate-500 hover:bg-sky-50 hover:text-sky-700'}`}>
            All Patients
          </button>
          {patients.map(p => (
            <button key={p.id} onClick={() => { setSelected(String(p.id)); setShowAllReadings(false); }}
              className={`min-h-10 rounded-2xl border px-4 text-[13px] transition-colors ${selected === String(p.id) ? 'border-transparent bg-sky-600 text-white' : 'border-[#dbe4ef] bg-white text-slate-500 hover:bg-sky-50 hover:text-sky-700'}`}>
              {p.full_name}
            </button>
          ))}
        </div>

        {chartData.length > 1 && (
          <div className="mb-6 rounded-[24px] border border-[#dbe4ef] bg-white px-4 pb-5 pt-5 shadow-sm sm:px-6">
            <h3 className="mb-4 text-[18px] font-semibold leading-tight">Acetone PPM Trend</h3>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={chartData} margin={{ top: 10, right: 6, bottom: 5, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbe4ef" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #dbe4ef', borderRadius: '12px', color: '#0f172a' }} />
                <ReferenceLine y={1.8} stroke="rgba(234,179,8,0.4)" strokeDasharray="4 4" label={{ value: 'Pre-Diabetic', fill: '#a16207', fontSize: 12, position: 'insideTop' }} />
                <ReferenceLine y={3.5} stroke="rgba(239,68,68,0.4)" strokeDasharray="4 4" label={{ value: 'Diabetic', fill: '#dc2626', fontSize: 12, position: 'insideTop' }} />
                <Line type="monotone" dataKey="ppm" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="overflow-hidden rounded-[24px] border border-[#dbe4ef] bg-white shadow-sm">
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-sm text-slate-500">No readings found.</div>
          ) : (
            <div className="overflow-x-auto [scrollbar-color:#94a3b8_transparent]" tabIndex={0} role="region" aria-label="Readings history table">
              <table className="w-full min-w-[1000px] whitespace-nowrap text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#f5f7fa]">
                    {['Patient', 'Acetone PPM', 'Est. Glucose', 'Temp', 'Humidity', 'Level', 'Date', ''].map(h => (
                      <th key={h} scope="col" aria-label={h || 'Actions'} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleReadings.map((r) => (
                    <tr key={r.id} className="h-12 border-b border-slate-200 text-[13px] transition-colors last:border-b-0 hover:bg-slate-50">
                      <td className="px-4 text-slate-700">{patientName(r.patient_id)}</td>
                      <td className="px-4 font-mono">{r.acetone_ppm}</td>
                      <td className="px-4 font-medium">
                        {(r.estimated_glucose_mg_dl ?? r.predicted_bgl) != null
                          ? `${r.estimated_glucose_mg_dl ?? r.predicted_bgl} mg/dL`
                          : '—'}
                        {r.glucose_level && <span className="ml-1 text-xs text-slate-600">({r.glucose_level})</span>}
                      </td>
                      <td className="px-4 text-slate-600">{r.temperature}°C</td>
                      <td className="px-4 text-slate-600">{r.humidity}%</td>
                      <td className="px-4">
                        <span className={`inline-flex rounded-[10px] border px-2 py-0.5 text-xs ${levelBg[r.diabetes_level]} ${levelColor[r.diabetes_level]}`}>
                          {r.diabetes_level}
                        </span>
                      </td>
                      <td className="px-4 text-xs text-slate-500">{new Date(r.taken_at).toLocaleString()}</td>
                      <td className="px-4">
                        <button type="button" aria-label="Delete reading" onClick={() => remove(r.id)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-700">
                          <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filtered.length > READINGS_PREVIEW && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:px-6">
              <button
                type="button"
                aria-expanded={showAllReadings}
                onClick={() => setShowAllReadings((shown) => !shown)}
                className="font-medium text-sky-700 hover:underline"
              >
                {showAllReadings ? 'Show less' : `See more (${filtered.length - READINGS_PREVIEW} more)`}
              </button>
              <span className="text-xs text-slate-500">
                Showing {visibleReadings.length} of {filtered.length} readings
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}