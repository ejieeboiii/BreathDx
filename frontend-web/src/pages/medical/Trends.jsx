import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPatients, getAllReadings } from '../../utils/api';
import TrendChart from '../../components/TrendChart';
import { filterByDays, toChartData } from '../../utils/monitoring';

export default function Trends() {
  const [patients, setPatients] = useState([]);
  const [readings, setReadings] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('all');
  const [range, setRange] = useState(30);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const pid = searchParams.get('patient');
    if (pid) setSelectedPatient(pid);
    Promise.all([getPatients(), getAllReadings()])
      .then(([p, r]) => { setPatients(p.data); setReadings(r.data); })
      .finally(() => setLoading(false));
  }, [searchParams]);

  const filteredReadings = selectedPatient === 'all'
    ? readings
    : readings.filter((r) => r.patient_id === parseInt(selectedPatient));

  const ranged = filterByDays(filteredReadings, range);
  const chartData = toChartData(ranged, 60);

  const bandCounts = {
    Normal: ranged.filter((r) => r.diabetes_level === 'Normal').length,
    'Pre-Diabetic': ranged.filter((r) => r.diabetes_level === 'Pre-Diabetic').length,
    Diabetic: ranged.filter((r) => r.diabetes_level === 'Diabetic').length,
  };

  if (loading) {
    return (
      <div className="grid min-h-full place-items-center bg-[#eef3f8]">
        <div className="text-sm text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#eef3f8] px-4 py-7 text-slate-900 sm:px-6 xl:px-8 xl:py-6 xl:text-[13px]">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-sky-700 sm:text-[13px]">Analytics workspace</p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-[30px]">Clinic Trends</h1>
          <p className="mt-1 text-[13px] text-slate-500">Population and per-patient acetone monitoring trends</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            aria-pressed={selectedPatient === 'all'} onClick={() => setSelectedPatient('all')}
            className={`min-h-10 rounded-2xl border px-4 text-[13px] transition-colors ${
              selectedPatient === 'all' ? 'border-transparent bg-sky-600 text-white' : 'border-[#dbe4ef] bg-white text-slate-500 hover:bg-sky-50 hover:text-sky-700'
            }`}
          >
            All patients
          </button>
          {patients.map((p) => (
            <button
              key={p.id}
              aria-pressed={selectedPatient === String(p.id)} onClick={() => setSelectedPatient(String(p.id))}
              className={`min-h-10 rounded-2xl border px-4 text-[13px] transition-colors ${
                selectedPatient === String(p.id) ? 'border-transparent bg-sky-600 text-white' : 'border-[#dbe4ef] bg-white text-slate-500 hover:bg-sky-50 hover:text-sky-700'
              }`}
            >
              {p.full_name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              aria-pressed={range === days} onClick={() => setRange(days)}
              className={`min-h-10 rounded-2xl border px-4 text-[13px] transition-colors ${
                range === days ? 'border-transparent bg-slate-900 text-white' : 'border-[#dbe4ef] bg-white text-slate-500 hover:bg-slate-100'
              }`}
            >
              {days} days
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Normal band', badge: 'Normal', value: bandCounts.Normal, tone: 'bg-emerald-50 text-emerald-700', icon: 'm4 12 5 5L20 6' },
            { label: 'Elevated band', badge: 'Elevated', value: bandCounts['Pre-Diabetic'], tone: 'bg-amber-50 text-amber-700', icon: 'm3 17 6-6 4 4 7-8m-5 0h5v5' },
            { label: 'High band', badge: 'High', value: bandCounts.Diabetic, tone: 'bg-rose-50 text-rose-700', icon: 'M12 3 3 20h18L12 3Zm0 6v5m0 3h.01' },
          ].map((band) => (
            <div key={band.label} className="rounded-[20px] border border-[#dbe4ef] bg-white p-4 shadow-sm xl:p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[26px] font-bold leading-none">{band.value}</p>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${band.tone}`}>
                  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={band.icon} /></svg>
                </span>
              </div>
              <p className="mt-3 text-[13px] text-slate-700">{band.label}</p>
              <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${band.tone}`}>{band.badge}</span>
            </div>
          ))}
        </div>

        <section className="rounded-[24px] border border-[#dbe4ef] bg-white px-4 pb-5 pt-5 shadow-sm sm:px-6">
          <h2 className="mb-4 text-[18px] font-semibold leading-tight">Acetone PPM trend</h2>
          <TrendChart data={chartData} height={280} light />
        </section>
      </div>
    </div>
  );
}
