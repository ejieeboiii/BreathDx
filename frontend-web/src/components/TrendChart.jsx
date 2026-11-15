import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function TrendChart({ data, height = 220, light = false }) {
  if (!data?.length) {
    return (
      <div className={`py-12 text-center text-sm ${light ? 'text-slate-500' : 'text-white/20'}`}>
        Not enough readings to display a trend chart yet.
      </div>
    );
  }

  const tick = { fill: light ? '#64748b' : 'rgba(255,255,255,0.3)', fontSize: light ? 13 : 11 };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={light ? { top: 10, right: 6, bottom: 4, left: 20 } : undefined}>
        <CartesianGrid strokeDasharray="3 3" stroke={light ? '#dbe4ef' : 'rgba(255,255,255,0.05)'} />
        <XAxis dataKey="date" tick={tick} />
        <YAxis tick={tick} />
        <Tooltip
          contentStyle={{
            background: light ? '#fff' : '#1e293b',
            border: light ? '1px solid #dbe4ef' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            color: light ? '#0f172a' : 'white',
          }}
        />
        <ReferenceLine y={1.8} stroke="rgba(234,179,8,0.35)" strokeDasharray="4 4" />
        <ReferenceLine y={3.5} stroke="rgba(239,68,68,0.35)" strokeDasharray="4 4" />
        <Line type="monotone" dataKey="ppm" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: light ? 4 : 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
