import { useCallback, useEffect, useMemo, useState } from 'react';
import { Cpu, LoaderCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { loadOctoprintInstances } from '../config/octoprint';
import { mockPrinters, telemetryData } from '../data/mockPrinters';
import {
  OctoprintApiError,
  OctoprintService,
} from '../services/octoprintService';
import type { FleetMetrics, PrinterSnapshot } from '../types/printer';
import { PrinterCard } from './PrinterCard';
import {
  QuickActionsModal,
  type OctoprintAction,
} from './QuickActionsModal';
import { TelemetryCharts } from './TelemetryCharts';

type FleetAction =
  | 'pause'
  | 'resume'
  | 'cancel'
  | 'preheat-pla'
  | 'preheat-petg'
  | 'preheat-abs'
  | 'cooldown'
  | 'home';

const POLL_INTERVAL_MS = 5000;

export function DashboardLayout() {
  const instances = useMemo(loadOctoprintInstances, []);
  const demoMode = instances.length === 0;
  const service = useMemo(
    () => instances.length > 0 ? new OctoprintService(instances) : null,
    [instances],
  );
  const [printers, setPrinters] = useState<PrinterSnapshot[]>(() => (
    service
      ? instances.map((instance) => service.getInitialSnapshot(instance.id))
      : mockPrinters
  ));
  const [selectedPrinterId, setSelectedPrinterId] = useState<string | null>(null);
  const [busy, setBusy] = useState<{ printerId: string; action: OctoprintAction } | null>(null);
  const [fleetBusy, setFleetBusy] = useState<FleetAction | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshPrinter = useCallback(async (printerId: string) => {
    if (!service) return;
    try {
      const snapshot = await service.getPrinterSnapshot(printerId);
      setPrinters((current) => current.map((printer) => (
        printer.id === printerId ? snapshot : printer
      )));
    } catch (error) {
      const snapshot = service.getUnavailableSnapshot(printerId, error);
      setPrinters((current) => current.map((printer) => (
        printer.id === printerId ? snapshot : printer
      )));
    }
  }, [service]);

  const refreshAll = useCallback(async () => {
    if (!service) return;
    setRefreshing(true);
    try {
      await Promise.all(instances.map((instance) => refreshPrinter(instance.id)));
    } finally {
      setRefreshing(false);
    }
  }, [instances, refreshPrinter, service]);

  useEffect(() => {
    if (!service) return undefined;
    let stopped = false;
    let timer: number | undefined;

    const poll = async () => {
      await Promise.all(instances.map((instance) => refreshPrinter(instance.id)));
      if (!stopped) timer = window.setTimeout(poll, POLL_INTERVAL_MS);
    };

    void poll();
    return () => {
      stopped = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [instances, refreshPrinter, service]);

  const selectedPrinter = selectedPrinterId
    ? printers.find((printer) => printer.id === selectedPrinterId) ?? null
    : null;

  const counts = useMemo(() => ({
    configured: printers.length,
    connected: printers.filter((printer) => printer.connection === 'connected').length,
    printing: printers.filter((printer) => printer.status === 'printing').length,
    errors: printers.filter((printer) => printer.status === 'error').length,
  }), [printers]);

  const metrics = useMemo<FleetMetrics>(() => ({
    connected: counts.connected,
    printing: counts.printing,
    paused: printers.filter((printer) => printer.status === 'paused').length,
    errors: counts.errors,
  }), [counts, printers]);

  const telemetrySource = selectedPrinter
    ?? printers.find((printer) => printer.telemetry.length > 0)
    ?? printers[0];
  const chartData = demoMode ? telemetryData : telemetrySource?.telemetry ?? [];

  const handlePrinterSelect = (printer: PrinterSnapshot) => {
    if (demoMode) {
      setNotice('Modo demo: configura VITE_OCTOPRINT_URL para habilitar los controles.');
      return;
    }
    setSelectedPrinterId(printer.id);
  };

  const handleAction = async (action: OctoprintAction) => {
    if (!service || !selectedPrinter) return;
    if (action === 'cancel' && !window.confirm(`¿Cancelar el trabajo de ${selectedPrinter.name}?`)) {
      return;
    }
    if (action === 'disconnect' && !window.confirm(`¿Desconectar ${selectedPrinter.name} de OctoPrint?`)) {
      return;
    }

    setBusy({ printerId: selectedPrinter.id, action });
    setNotice(null);
    try {
      await executeAction(service, selectedPrinter.id, action);
      setNotice(`${actionLabel(action)} enviado a ${selectedPrinter.name}.`);
      await refreshPrinter(selectedPrinter.id);
    } catch (error) {
      setNotice(describeError(error));
    } finally {
      setBusy(null);
    }
  };

  const handleFleetAction = async (action: FleetAction) => {
    if (!service) return;
    const targets = printers.filter((printer) => isFleetTarget(printer, action));
    if (targets.length === 0) {
      setNotice('No hay impresoras compatibles con esta acción en su estado actual.');
      return;
    }
    if (action === 'cancel' && !window.confirm(`¿Cancelar ${targets.length} trabajo(s) activo(s)?`)) {
      return;
    }

    setFleetBusy(action);
    setNotice(null);
    const results = await Promise.allSettled(
      targets.map((printer) => executeAction(service, printer.id, action)),
    );
    const failures = results.filter((result) => result.status === 'rejected').length;
    setNotice(failures === 0
      ? `${actionLabel(action)} enviado a ${targets.length} impresora(s).`
      : `Acción completada con ${failures} error(es) de ${targets.length}.`);
    await refreshAll();
    setFleetBusy(null);
  };

  const apiReachable = printers.some((printer) => printer.connection !== 'unreachable');

  return (
    <main className="kiosk-shell relative bg-slate-950 p-8 text-white">
      <header className="flex h-[180px] items-center justify-between rounded-[36px] border border-white/10 bg-slate-900/90 p-8 shadow-glow">
        <div>
          <p className="text-xl uppercase tracking-[0.4em] text-cyan-300">Totem 3D Print Hub</p>
          <h1 className="text-6xl font-black">Dashboard Central</h1>
        </div>
        <div className="grid grid-cols-4 gap-4 text-center">
          {[
            ['Configuradas', counts.configured],
            ['Conectadas', counts.connected],
            ['Printing', counts.printing],
            ['Error', counts.errors],
          ].map(([label, value]) => (
            <div className="min-w-28 rounded-3xl bg-slate-950 p-4" key={label}>
              <p className="text-4xl font-black">{value}</p>
              <p className="text-lg text-slate-400">{label}</p>
            </div>
          ))}
        </div>
        <button
          aria-label="Actualizar OctoPrint"
          disabled={demoMode || refreshing}
          onClick={() => void refreshAll()}
          className="flex min-h-24 min-w-24 flex-col items-center justify-center gap-2 rounded-3xl bg-white/10 text-lg font-bold disabled:opacity-40"
        >
          {refreshing ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
          Actualizar
        </button>
      </header>

      <div className={`mt-5 flex items-center gap-3 rounded-2xl border px-5 py-4 text-lg ${demoMode ? 'border-amber-400/30 bg-amber-400/10 text-amber-100' : apiReachable ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100' : 'border-rose-400/30 bg-rose-400/10 text-rose-100'}`}>
        {demoMode ? <WifiOff /> : apiReachable ? <Wifi /> : <WifiOff />}
        {demoMode
          ? 'Modo demo activo. Copia .env.example a .env.local para conectar OctoPrint.'
          : apiReachable
            ? 'Servidor OctoPrint disponible. La impresora física puede permanecer desconectada.'
            : printers.map((printer) => printer.stateText).join(' · ')}
      </div>

      {notice && (
        <div role="status" className="mt-4 rounded-2xl bg-cyan-400/10 px-5 py-4 text-lg text-cyan-100">
          {notice}
        </div>
      )}

      <section className={`mt-6 grid h-[620px] gap-6 overflow-auto ${printers.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {printers.map((printer) => (
          <PrinterCard key={printer.id} printer={printer} onSelect={handlePrinterSelect} />
        ))}
      </section>

      <section className="mt-6 rounded-[36px] border border-white/10 bg-slate-900/80 p-7">
        <div className="mb-5 flex items-center gap-3">
          <Cpu className="text-cyan-300" />
          <h2 className="text-4xl font-black">Acciones rápidas flota</h2>
        </div>
        <div className="grid grid-cols-4 gap-5">
          {([
            ['pause', 'Pausar activas'],
            ['resume', 'Reanudar pausadas'],
            ['cancel', 'Cancelar trabajos'],
            ['preheat-pla', 'Precalentar PLA'],
            ['preheat-petg', 'Precalentar PETG'],
            ['preheat-abs', 'Precalentar ABS'],
            ['cooldown', 'Enfriar todo'],
            ['home', 'Home XYZ'],
          ] as Array<[FleetAction, string]>).map(([action, label]) => (
            <button
              key={action}
              disabled={demoMode || fleetBusy !== null}
              onClick={() => void handleFleetAction(action)}
              className="flex min-h-24 items-center justify-center gap-3 rounded-3xl bg-white/10 px-3 text-2xl font-black active:bg-cyan-500/30 disabled:opacity-35"
            >
              {fleetBusy === action && <LoaderCircle className="animate-spin" />}
              {label}
            </button>
          ))}
        </div>
      </section>

      <div className="mt-6">
        <TelemetryCharts
          data={chartData}
          metrics={metrics}
          sourceName={demoMode ? 'Datos de demostración' : telemetrySource?.name ?? 'Sin impresora'}
        />
      </div>
      <QuickActionsModal
        printer={selectedPrinter}
        busyAction={busy?.printerId === selectedPrinter?.id ? busy?.action ?? null : null}
        onAction={handleAction}
        onClose={() => setSelectedPrinterId(null)}
      />
    </main>
  );
}

async function executeAction(
  service: OctoprintService,
  printerId: string,
  action: OctoprintAction,
): Promise<void> {
  switch (action) {
    case 'pause': return service.pauseJob(printerId);
    case 'resume': return service.resumeJob(printerId);
    case 'cancel': return service.cancelJob(printerId);
    case 'preheat-pla': return service.setTemperaturePreset(printerId, 215, 60);
    case 'preheat-petg': return service.setTemperaturePreset(printerId, 245, 80);
    case 'preheat-abs': return service.setTemperaturePreset(printerId, 255, 105);
    case 'cooldown': return service.setTemperaturePreset(printerId, 0, 0);
    case 'home': return service.home(printerId);
    case 'x-minus': return service.jog(printerId, 'x', -10);
    case 'x-plus': return service.jog(printerId, 'x', 10);
    case 'y-minus': return service.jog(printerId, 'y', -10);
    case 'y-plus': return service.jog(printerId, 'y', 10);
    case 'z-minus': return service.jog(printerId, 'z', -10);
    case 'z-plus': return service.jog(printerId, 'z', 10);
    case 'extrude': return service.extrude(printerId, 5);
    case 'retract': return service.extrude(printerId, -5);
    case 'connect': return service.connect(printerId);
    case 'disconnect': return service.disconnect(printerId);
  }
}

function isFleetTarget(printer: PrinterSnapshot, action: FleetAction): boolean {
  if (action === 'pause') return printer.status === 'printing';
  if (action === 'resume') return printer.status === 'paused';
  if (action === 'cancel') return ['printing', 'paused'].includes(printer.status);
  return printer.status === 'idle';
}

function actionLabel(action: OctoprintAction): string {
  const labels: Record<OctoprintAction, string> = {
    pause: 'Pausa',
    resume: 'Reanudación',
    cancel: 'Cancelación',
    'preheat-pla': 'Precalentamiento PLA',
    'preheat-petg': 'Precalentamiento PETG',
    'preheat-abs': 'Precalentamiento ABS',
    cooldown: 'Enfriamiento',
    home: 'Home XYZ',
    'x-minus': 'Movimiento X−',
    'x-plus': 'Movimiento X+',
    'y-minus': 'Movimiento Y−',
    'y-plus': 'Movimiento Y+',
    'z-minus': 'Movimiento Z−',
    'z-plus': 'Movimiento Z+',
    extrude: 'Extrusión',
    retract: 'Retracción',
    connect: 'Conexión',
    disconnect: 'Desconexión',
  };
  return labels[action];
}

function describeError(error: unknown): string {
  if (error instanceof OctoprintApiError) return error.message;
  return error instanceof Error ? error.message : 'Error desconocido al comunicarse con OctoPrint.';
}
