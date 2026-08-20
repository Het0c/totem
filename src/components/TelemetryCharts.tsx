import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { FleetMetrics, TelemetryPoint } from '../types/printer';

export function TelemetryCharts({
  data,
  metrics,
  sourceName,
}: {
  data: TelemetryPoint[];
  metrics: FleetMetrics;
  sourceName: string;
}) {
  const cards = [
    ['Conectadas', metrics.connected],
    ['Imprimiendo', metrics.printing],
    ['Pausadas', metrics.paused],
    ['Errores', metrics.errors],
  ];

  return (
    <section className="rounded-[36px] border border-white/10 bg-slate-900/80 p-8 shadow-glow">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-white">Telemetría térmica</h2>
          <p className="text-xl text-slate-400">{sourceName}</p>
        </div>
        <span className="rounded-full bg-cyan-400/15 px-5 py-3 text-xl text-cyan-200">
          OctoPrint
        </span>
      </div>
      <div className="h-[300px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="hot" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: '#020617', border: '1px solid #334155' }} />
              <Area dataKey="hotend" name="Hotend" stroke="#22d3ee" fill="url(#hot)" strokeWidth={4} />
              <Area dataKey="bed" name="Cama" stroke="#f59e0b" fill="#f59e0b22" strokeWidth={4} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-3xl bg-slate-950/70 px-8 text-center text-2xl text-slate-500">
            Sin muestras térmicas. Conecta una impresora para recibir el historial de OctoPrint.
          </div>
        )}
      </div>
      <div className="mt-6 grid grid-cols-4 gap-4 text-center">
        {cards.map(([label, value]) => (
          <div className="rounded-3xl bg-slate-950/70 p-5" key={label}>
            <p className="text-lg text-slate-400">{label}</p>
            <p className="text-3xl font-black text-white">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
