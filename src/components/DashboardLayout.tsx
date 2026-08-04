import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Cpu, Network, Settings, Wifi } from 'lucide-react';
import { fleetMetrics, mockPrinters, telemetryData } from '../data/mockPrinters';
import type { PrinterSnapshot } from '../types/printer';
import { PrinterCard } from './PrinterCard';
import { QuickActionsModal } from './QuickActionsModal';
import { TelemetryCharts } from './TelemetryCharts';

export function DashboardLayout() {
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterSnapshot | null>(null);
  const counts = useMemo(() => ({ active: mockPrinters.length, printing: mockPrinters.filter((p) => p.status === 'printing').length, idle: mockPrinters.filter((p) => p.status === 'idle').length, error: mockPrinters.filter((p) => p.status === 'error').length }), []);
  return (
    <main className="kiosk-shell relative bg-slate-950 p-8 text-white">
      <header className="flex h-[180px] items-center justify-between rounded-[36px] border border-white/10 bg-slate-900/90 p-8 shadow-glow">
        <div><p className="text-xl uppercase tracking-[0.4em] text-cyan-300">Totem 3D Print Hub</p><h1 className="text-6xl font-black">Dashboard Central</h1></div>
        <div className="grid grid-cols-4 gap-4 text-center">{[['Activas', counts.active], ['Printing', counts.printing], ['Idle', counts.idle], ['Error', counts.error]].map(([label, value]) => <div className="min-w-28 rounded-3xl bg-slate-950 p-4" key={label}><p className="text-4xl font-black">{value}</p><p className="text-lg text-slate-400">{label}</p></div>)}</div>
        <div className="flex gap-4"><IconButton icon={<Wifi/>} label="LAN"/><IconButton icon={<Network/>} label="Local"/><IconButton icon={<Settings/>} label="Sys"/></div>
      </header>

      <section className="mt-8 grid h-[700px] grid-cols-2 gap-6 overflow-hidden">{mockPrinters.map((printer) => <PrinterCard key={printer.id} printer={printer} onSelect={setSelectedPrinter} />)}</section>

      <section className="mt-8 rounded-[36px] border border-white/10 bg-slate-900/80 p-7"><div className="mb-5 flex items-center gap-3"><Cpu className="text-cyan-300"/><h2 className="text-4xl font-black">Acciones rápidas flota</h2></div><div className="grid grid-cols-4 gap-5">{['Pausar Todo', 'Reanudar', 'Cancelar Error', 'Precalentar PLA', 'Precalentar PETG', 'Precalentar ABS', 'Home XYZ', 'Lanzar Slicer'].map((action) => <button key={action} className="min-h-24 rounded-3xl bg-white/10 text-2xl font-black active:bg-cyan-500/30">{action}</button>)}</div></section>

      <div className="mt-8"><TelemetryCharts data={telemetryData} metrics={fleetMetrics}/></div>
      <QuickActionsModal printer={selectedPrinter} onClose={() => setSelectedPrinter(null)} />
    </main>
  );
}

function IconButton({ icon, label }: { icon: ReactNode; label: string }) { return <button className="flex min-h-24 min-w-24 flex-col items-center justify-center gap-2 rounded-3xl bg-white/10 text-lg font-bold">{icon}{label}</button>; }
