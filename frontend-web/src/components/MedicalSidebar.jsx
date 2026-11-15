import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLogout } from '../hooks/useLogout';

const links = [
  { to: '/medical/dashboard', label: 'Dashboard', icon: 'M3 11l9-8 9 8M5 10v10h14V10' },
  { to: '/medical/patients', label: 'Patients', icon: 'M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m19 0v-2a4 4 0 0 0-3-4m-3-12a4 4 0 0 1 0 8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z' },
  { to: '/medical/readings', label: 'Readings', icon: 'M5 4h14v16H5zM8 8h8m-8 4h8' },
  { to: '/medical/trends', label: 'Trends', icon: 'm3 17 6-6 4 4 7-8m-5 0h5v5' },
  { to: '/medical/livescan', label: 'Live Scan', icon: 'M3 6h18v14H3zM3 10h18M8 3v5m8-5v5m-4 4v6m-3-3h6' },
];

export default function MedicalSidebar() {
  const { user } = useAuth();
  const { handleLogout, loggingOut } = useLogout();

  return (
    <aside className="flex h-full w-[72px] shrink-0 flex-col overflow-y-auto border-r border-slate-700 bg-[#1c2637] text-slate-100 md:w-[220px] xl:w-[clamp(240px,19.2vw,344px)]">
      <div className="flex items-center justify-center gap-[14px] border-b border-slate-700 py-[29px] md:justify-start md:px-6">
        <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-[19px] bg-[#0ba6de] xl:h-14 xl:w-14">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M12 5h10a6 6 0 0 1 0 12H12m0-12v26h10a7 7 0 0 0 0-14" stroke="white" strokeWidth="4" />
            <path d="M4 16c4 4 8 5 13 4M4 21c4 4 7 5 12 4m8-5s-3 4-3 6a3 3 0 1 0 6 0c0-2-3-6-3-6Z" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <div className="hidden md:block">
          <p className="text-[20px] font-bold leading-tight">BreathDx</p>
          <p className="mt-0.5 text-[12px] uppercase tracking-[0.18em] text-slate-400">Provider</p>
        </div>
      </div>
      <nav aria-label="Provider navigation" className="space-y-[10px] px-2 pt-5 md:pl-[14px] md:pr-[19px]">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            aria-label={link.label}
            title={link.label}
            className={({ isActive }) =>
              `group flex min-h-[65px] items-center justify-center gap-[15px] rounded-[20px] border text-[15px] transition-colors md:justify-start md:px-[14px] ${
                isActive
                  ? 'border-sky-300 bg-[#203d54] text-sky-200'
                  : 'border-transparent text-slate-300 hover:bg-slate-700/60 hover:text-white'
              }`
            }
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-700 text-slate-400 group-aria-[current=page]:bg-[#245570] group-aria-[current=page]:text-sky-200">
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d={link.icon} /></svg>
            </span>
            <span className="hidden md:inline">{link.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mx-2 mb-5 mt-[60px] flex items-center justify-center gap-2 rounded-[20px] bg-slate-700 py-3 md:ml-[14px] md:mr-[19px] md:justify-between md:px-[15px]">
        <div className="hidden min-w-0 md:block">
          <p className="truncate text-[15px] font-semibold">{user?.full_name || 'Provider'}</p>
          <p className="text-[14px] text-slate-300">Healthcare provider</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="shrink-0 rounded-2xl border border-slate-500 bg-[#1c2637] px-1.5 py-2 text-xs transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 xl:px-[18px] xl:text-sm"
        >
          {loggingOut ? 'Signing out…' : 'Logout'}
        </button>
      </div>
    </aside>
  );
}
