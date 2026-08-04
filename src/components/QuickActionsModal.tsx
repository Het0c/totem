import { X } from 'lucide-react';
import type { PrinterSnapshot } from '../types/printer';

export function QuickActionsModal({ printer, onClose }: { printer: PrinterSnapshot | null; onClose: () => void }) {
  if (!printer) return null;
  const actions = ['Pausar', 'Reanudar', 'Cancelar', 'PLA 215/60', 'PETG 245/80', 'ABS 255/105'];
  return (
    <div className="absolute inset-0 z-50 flex items-end bg-black/70 p-8 backdrop-blur-sm">
      <section className="w-full rounded-[40px] border border-cyan-300/20 bg-slate-950 p-8 shadow-glow">
        <div className="flex items-center justify-between"><div><h2 className="text-5xl font-black text-white">Control directo</h2><p className="text-2xl text-slate-400">{printer.name} · {printer.activeJob}</p></div><button onClick={onClose} className="rounded-full bg-white/10 p-5"><X size={42}/></button></div>
        <div className="mt-8 grid grid-cols-3 gap-5">{actions.map((action) => <button key={action} className="min-h-28 rounded-3xl bg-cyan-500/15 text-3xl font-black text-cyan-100 active:bg-cyan-400/30">{action}</button>)}</div>
        <div className="mt-8 grid grid-cols-[1fr_1fr] gap-8">
          <div className="rounded-[32px] bg-slate-900 p-6"><h3 className="mb-4 text-3xl font-bold">Pad XYZ</h3><div className="grid grid-cols-3 gap-4">{['Z+', 'Y+', 'E+', 'X-', 'Home', 'X+', 'Z-', 'Y-', 'E-'].map((key) => <button className="h-24 rounded-2xl bg-slate-800 text-2xl font-bold" key={key}>{key}</button>)}</div></div>
          <div className="rounded-[32px] bg-slate-900 p-6"><h3 className="mb-4 text-3xl font-bold">Programas estación</h3>{['Abrir Slicer', 'Exportar G-code', 'Transformar STL', 'Diagnóstico'].map((app) => <button key={app} className="mb-4 block min-h-20 w-full rounded-2xl bg-emerald-500/15 text-2xl font-bold text-emerald-100">{app}</button>)}</div>
        </div>
      </section>
    </div>
  );
}
