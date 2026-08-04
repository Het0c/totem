import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FleetMetrics, TelemetryPoint } from '../types/printer';

export function TelemetryCharts({ data, metrics }: { data: TelemetryPoint[]; metrics: FleetMetrics }) {
  return (
    <section className="rounded-[36px] border border-white/10 bg-slate-900/80 p-8 shadow-glow">
      <div className="mb-6 flex items-center justify-between"><div><h2 className="text-4xl font-black text-white">Telemetría 30-60 min</h2><p className="text-xl text-slate-400">Curvas térmicas y eficiencia global</p></div><span className="rounded-full bg-cyan-400/15 px-5 py-3 text-xl text-cyan-200">Live</span></div>
      <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id="hot" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8}/><stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#1e293b"/><XAxis dataKey="time" stroke="#94a3b8"/><YAxis stroke="#94a3b8"/><Tooltip contentStyle={{ background: '#020617', border: '1px solid #334155' }}/><Area dataKey="hotend" stroke="#22d3ee" fill="url(#hot)" strokeWidth={4}/><Area dataKey="bed" stroke="#f59e0b" fill="#f59e0b22" strokeWidth={4}/></AreaChart></ResponsiveContainer></div>
      <div className="mt-6 grid grid-cols-4 gap-4 text-center">{[['Filamento', `${metrics.filamentFlow} mm³/s`], ['Ventilador', `${metrics.fanSpeed}%`], ['Éxito', `${metrics.successRate}%`], ['Consumo', `${metrics.estimatedConsumptionKwh} kWh`]].map(([label, value]) => <div className="rounded-3xl bg-slate-950/70 p-5" key={label}><p className="text-lg text-slate-400">{label}</p><p className="text-3xl font-black text-white">{value}</p></div>)}</div>
    </section>
  );
}
