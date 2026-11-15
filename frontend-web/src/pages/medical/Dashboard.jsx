import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const RECENT_PREVIEW = 5;
import { getPatients, getAllReadings } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import LevelBadge from '../../components/LevelBadge';
import { getProviderAlerts } from '../../utils/monitoring';

export default function Dashboard() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getPatients(), getAllReadings()])
      .then(([p, r]) => { setPatients(p.data); setReadings(r.data); })
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: patients.length,
    normal: readings.filter((r) => r.diabetes_level === 'Normal').length,
    preDiabetic: readings.filter((r) => r.diabetes_level === 'Pre-Diabetic').length,
    diabetic: readings.filter((r) => r.diabetes_level === 'Diabetic').length,
  };

  const alerts = getProviderAlerts(patients, readings);
  const displayedRecent = showAllRecent ? readings : readings.slice(0, RECENT_PREVIEW);
  const hasMoreRecent = readings.length > RECENT_PREVIEW;
  const patientName = (id) => patients.find((p) => p.id === id)?.full_name || `Patient #${id}`;

  if (loading) {
    return <div className="grid min-h-full place-items-center bg-[#eef3f8] text-sm text-slate-600">Loading...</div>;
  }

  const cards = [
    { label: 'Total patients', value: stats.total, badge: 'Primary', tone: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500', icon: 'M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m19 0v-2a4 4 0 0 0-3-4m-3-12a4 4 0 0 1 0 8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z' },
    { label: 'Normal band', value: stats.normal, badge: 'Normal', tone: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', icon: 'm4 12 5 5L20 6' },
    { label: 'Elevated band', value: stats.preDiabetic, badge: 'Elevated', tone: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', icon: 'm3 17 6-6 4 4 7-8m-5 0h5v5' },
    { label: 'High band', value: stats.diabetic, badge: 'High', tone: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500', icon: 'M12 3 3 20h18L12 3Zm0 6v5m0 3h.01' },
  ];
  const quickLinks = [
    { to: '/medical/patients', label: 'View patients', tone: 'bg-sky-600 text-white' },
    { to: '/medical/readings', label: 'Open readings', tone: 'bg-slate-900 text-white' },
    { to: '/medical/livescan', label: 'Live scan', tone: 'bg-slate-100 text-slate-700' },
    { to: '/medical/trends', label: 'View trends', tone: 'bg-emerald-50 text-emerald-700' },
  ];
  const panel = 'overflow-hidden rounded-[24px] border border-[#dbe4ef] bg-white shadow-sm';
  const heading = 'text-[18px] font-semibold leading-tight';
  const button = 'inline-flex items-center rounded-2xl border border-[#dbe4ef] px-[15px] py-3 font-medium transition-colors';

  return (
    <div className="min-h-full bg-[#eef3f8] px-4 py-7 text-slate-900 sm:px-6 xl:px-8 xl:py-6 xl:text-[13px]">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 xl:mb-8">
        <div>
          <p className="mb-2 uppercase tracking-[0.16em] text-sky-700">Healthcare provider</p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-[30px]">Good day, {user?.full_name?.split(' ')[0]}!</h1>
        </div>
        <div className="flex flex-wrap gap-3 pb-1">
          <Link to="/medical/readings" className={`${button} bg-white text-slate-700 hover:bg-slate-50`}>View readings</Link>
          <Link to="/medical/livescan" className={`${button} border-transparent bg-sky-600 text-white hover:bg-sky-700`}>Live scan</Link>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-[20px] border border-[#dbe4ef] bg-white p-4 shadow-sm xl:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[26px] font-bold leading-none">{card.value}</p>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${card.tone}`}>
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d={card.icon} /></svg>
              </span>
            </div>
            <p className="mt-3 font-medium text-slate-700">{card.label}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className={`rounded-full px-2.5 py-1 font-bold uppercase tracking-wider ${card.tone}`}>{card.badge}</span>
              <span className="inline-flex items-center gap-2"><span className={`h-[7px] w-[7px] rounded-full ${card.dot}`} />Live</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.88fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <section className={panel}>
            <div className="border-b border-slate-200 px-5 pb-3 pt-5 sm:px-6">
              <h2 className={heading}>Patients needing review</h2>
              <p className="mt-1 text-slate-500">Based on missed scans, rising trends, and latest monitoring bands.</p>
            </div>
            {alerts.length === 0 ? (
              <p className="px-5 py-6 text-center text-slate-500">No alerts right now. All patients look stable.</p>
            ) : (
              <div className="divide-y divide-slate-200">
                {alerts.map((alert, i) => (
                  <div key={`${alert.patientId}-${i}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
                    <div>
                      <p className="font-semibold">{alert.patientName}</p>
                      <p className="mt-1 text-slate-500">{alert.message}</p>
                    </div>
                    <button onClick={() => navigate(`/medical/readings?patient=${alert.patientId}`)} className={`${button} bg-slate-50 text-slate-700 hover:bg-slate-100`}>Review</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={panel}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4 sm:px-6">
              <h2 className={heading}>Recent readings</h2>
              <button onClick={() => navigate('/medical/readings')} className="font-medium text-sky-700 hover:underline">View all</button>
            </div>
            {readings.length === 0 ? (
              <p className="px-5 py-16 text-center text-slate-500">No readings yet. Start a live scan!</p>
            ) : (
              <>
                <div className="overflow-x-auto pb-4 [scrollbar-color:#94a3b8_transparent]" tabIndex={0} role="region" aria-label="Recent readings table">
                  <table className="w-full min-w-[1000px] whitespace-nowrap text-left">
                    <thead className="bg-[#f5f7fa] text-xs uppercase tracking-wider text-slate-500">
                      <tr>
                        {['Patient', 'Acetone PPM', 'Est. Glucose', 'Temperature', 'Humidity', 'Band', 'Date'].map((label) => (
                          <th key={label} scope="col" className="px-4 py-3 font-semibold">{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-slate-700">
                      {displayedRecent.map((r) => (
                        <tr key={r.id} className="h-12 border-t border-slate-200 hover:bg-slate-50">
                          <td className="px-4">{patientName(r.patient_id)}</td>
                          <td className="px-4 font-mono text-slate-900">{r.acetone_ppm} ppm</td>
                          <td className="px-4 font-medium text-slate-900">
                            {(r.estimated_glucose_mg_dl ?? r.predicted_bgl) != null
                              ? `${r.estimated_glucose_mg_dl ?? r.predicted_bgl} mg/dL`
                              : '—'}
                            {r.glucose_level && <span className="ml-1 text-xs text-slate-600">({r.glucose_level})</span>}
                          </td>
                          <td className="px-4">{r.temperature} °C</td>
                          <td className="px-4">{r.humidity} %</td>
                          <td className="px-4"><LevelBadge level={r.diabetes_level} /></td>
                          <td className="px-4 text-xs text-slate-600">{new Date(r.taken_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {hasMoreRecent && (
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-5 py-4 sm:px-6">
                    <button type="button" onClick={() => setShowAllRecent((v) => !v)} className="font-medium text-sky-700 hover:underline">
                      {showAllRecent ? 'Show less' : `See more (${readings.length - RECENT_PREVIEW} more)`}
                    </button>
                    <Link to="/medical/readings" className="text-slate-500 hover:underline">Open full readings list →</Link>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className={`${panel} p-5`}>
            <h2 className={heading}>Quick access</h2>
            <div className="mt-4 grid gap-3">
              {quickLinks.map((link) => (
                <Link key={link.to} to={link.to} className={`flex min-h-11 items-center justify-between gap-3 rounded-2xl px-4 font-medium transition-opacity hover:opacity-85 ${link.tone}`}>
                  {link.label}
                  <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h16m-8-8 8 8-8 8" /></svg>
                </Link>
              ))}
            </div>
          </section>

          <section className={`${panel} p-5`}>
            <h2 className={heading}>Overview</h2>
            <dl className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-[#f5f7fa] px-4 py-3">
                <dt className="text-sm font-bold uppercase tracking-wider text-slate-500">Active patients</dt>
                <dd className="mt-1 text-2xl font-bold leading-tight">{stats.total}</dd>
              </div>
              <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sky-700">
                <dt className="text-sm font-bold uppercase tracking-wider">Review queue</dt>
                <dd className="mt-1 text-2xl font-bold leading-tight">{new Set(alerts.map((alert) => alert.patientId)).size}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
