import { useEffect, useState } from 'react';
import { getPatients, addPatient, deletePatient } from '../../utils/api';
import PatientDetailModal from '../../components/PatientDetailModal';
import PatientCredentialsBanner from '../../components/PatientCredentialsBanner';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', age: '', gender: 'Male', contact: '', is_diabetic: 'Unknown' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [newAccountCredentials, setNewAccountCredentials] = useState(null);

  const load = () => getPatients().then((r) => setPatients(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const passwordUsed = form.password;
    const emailUsed = form.email;
    try {
      await addPatient({ ...form, age: parseInt(form.age, 10) });
      setNewAccountCredentials({ email: emailUsed, password: passwordUsed });
      setForm({ full_name: '', email: '', password: '', age: '', gender: 'Male', contact: '', is_diabetic: 'Unknown' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add patient.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (e, id, name) => {
    e.stopPropagation();
    if (!confirm(`Delete patient "${name}"?`)) return;
    await deletePatient(id);
    if (selectedPatient?.id === id) setSelectedPatient(null);
    load();
  };

  if (loading) return <div className="grid min-h-full place-items-center bg-[#eef3f8]"><div className="text-sm text-slate-600">Loading...</div></div>;

  return (
    <div className="min-h-full bg-[#eef3f8] px-4 py-7 text-slate-900 sm:px-6 xl:px-8 xl:py-6 xl:text-[13px]">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 xl:mb-8">
          <div>
            <p className="mb-1 text-xs uppercase tracking-[0.16em] text-sky-700 sm:text-[13px]">Care directory</p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-[30px]">Patients</h1>
            <p className="mt-1 text-[13px] text-slate-600">{patients.length} registered · select a patient for details</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="min-h-11 rounded-2xl bg-sky-600 px-4 text-[13px] font-medium text-white transition-colors hover:bg-sky-700 sm:min-w-[160px]">
            + Add Patient
          </button>
        </div>

        {newAccountCredentials && (
          <div className="rounded-2xl bg-slate-900">
            <PatientCredentialsBanner
              email={newAccountCredentials.email}
              password={newAccountCredentials.password}
              title="Patient account created — login credentials"
              onDismiss={() => setNewAccountCredentials(null)}
            />
          </div>
        )}

        {showForm && (
          <div className="mb-5 rounded-[20px] border border-[#dbe4ef] bg-white p-5 shadow-sm">
            <h3 className="mb-1 text-[18px] font-semibold">New Patient Account</h3>
            <p className="mb-4 text-[13px] text-slate-500">Credentials are shown once after you save.</p>
            <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { name: 'full_name', label: 'Full Name', placeholder: 'Juan Dela Cruz', type: 'text' },
                { name: 'email', label: 'Email', placeholder: 'patient@email.com', type: 'email' },
                { name: 'password', label: 'Password', placeholder: 'Set patient password', type: 'password' },
                { name: 'age', label: 'Age', placeholder: '45', type: 'number' },
                { name: 'contact', label: 'Contact (Optional)', placeholder: '09XX-XXX-XXXX', type: 'text' },
              ].map((f) => (
                <div key={f.name}>
                  <label className="text-xs font-medium uppercase tracking-wider text-slate-600">{f.label}</label>
                  <input name={f.name} type={f.type} placeholder={f.placeholder} value={form[f.name]} onChange={handle}
                    required={f.name !== 'contact'}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-[13px] placeholder-slate-500 focus:border-sky-500 focus:outline-none" />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-slate-600">Gender</label>
                <select name="gender" value={form.gender} onChange={handle}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-[13px] focus:border-sky-500 focus:outline-none">
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-slate-600">Diabetes Status</label>
                <select name="is_diabetic" value={form.is_diabetic} onChange={handle}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-[13px] focus:border-sky-500 focus:outline-none">
                  <option>Unknown</option><option>Diabetic</option><option>Non-Diabetic</option>
                </select>
              </div>
              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 sm:col-span-2">{error}</div>}
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <button type="submit" disabled={submitting}
                  className="rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save Patient'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="rounded-xl px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-100">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {patients.length === 0 ? (
          <div className="rounded-[20px] border border-[#dbe4ef] bg-white px-4 py-14 text-center shadow-sm">
            <p className="text-[13px] text-slate-600">No patients yet. Add your first patient!</p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {patients.map((p) => (
              <li key={p.id} className="flex min-h-[80px] items-stretch rounded-[20px] border border-[#dbe4ef] bg-white shadow-sm transition-colors hover:border-sky-200">
                <button
                  type="button"
                  onClick={() => setSelectedPatient(p)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-[20px] py-2 pl-3 text-left hover:bg-sky-50/50 sm:gap-4 sm:pl-4"
                >
                  <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-sky-100 bg-sky-50 text-lg font-bold text-sky-700">
                    {p.full_name[0]}
                  </span>
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-semibold">{p.full_name}</span>
                    <span className="block text-xs text-slate-500">{p.age} yrs • {p.gender} • {p.is_diabetic}</span>
                    <span className="block break-words text-xs text-slate-500">{p.email}{p.contact ? ` • ${p.contact}` : ''}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => remove(e, p.id, p.full_name)}
                  className="my-auto ml-1 mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 sm:mr-[17px]"
                  aria-label={`Delete patient ${p.full_name}`}
                >
                  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedPatient && (
        <PatientDetailModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}
    </div>
  );
}
