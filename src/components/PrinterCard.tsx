import { AlertTriangle, Camera, PauseCircle, PlayCircle, Thermometer } from 'lucide-react';
import type { PrinterSnapshot, PrinterStatus } from '../types/printer';

const statusStyles: Record<PrinterStatus, string> = {
  printing: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
  idle: 'bg-slate-500/20 text-slate-300 border-slate-400/40',
  paused: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
  error: 'bg-rose-500/20 text-rose-300 border-rose-400/40',
};

export function PrinterCard({ printer, onSelect }: { printer: PrinterSnapshot; onSelect: (printer: PrinterSnapshot) => void }) {
  const Icon = printer.status === 'error' ? AlertTriangle : printer.status === 'paused' ? PauseCircle : PlayCircle;
  return (
    <button onClick={() => onSelect(printer)} className="min-h-[300px] rounded-[32px] border border-white/10 bg-slate-900/80 p-6 text-left shadow-glow transition active:scale-[0.98]">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-3xl font-bold text-white">{printer.name}</p><p className="mt-2 text-xl text-slate-400">{printer.activeJob}</p></div>
        <span className={`flex items-center gap-2 rounded-full border px-4 py-2 text-lg font-semibold ${statusStyles[printer.status]}`}><Icon size={24} />{printer.status.toUpperCase()}</span>
      </div>
      <div className="mt-6 h-5 rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${printer.progress}%` }} /></div>
      <div className="mt-3 flex justify-between text-xl"><span>{printer.progress}% completado</span><span>{printer.elapsed} / {printer.remaining}</span></div>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <Temp label="Hotend" current={printer.hotend.current} target={printer.hotend.target} />
        <Temp label="Bed" current={printer.bed.current} target={printer.bed.target} />
      </div>
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-950/70 p-4 text-xl text-slate-300"><span className="flex items-center gap-3"><Camera /> Cámara</span><span>{printer.cameraUrl ? 'Stream listo' : 'Sin stream'}</span></div>
    </button>
  );
}

function Temp({ label, current, target }: { label: string; current: number; target: number }) {
  return <div className="rounded-2xl bg-slate-800/80 p-4"><p className="flex items-center gap-2 text-lg text-slate-400"><Thermometer size={20}/>{label}</p><p className="mt-2 text-3xl font-bold text-white">{current}°<span className="text-xl text-slate-400"> / {target}°C</span></p></div>;
}
