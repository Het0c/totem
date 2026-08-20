import { Camera, LoaderCircle, Plug, Power, X } from 'lucide-react';
import type { PrinterSnapshot } from '../types/printer';

export type OctoprintAction =
  | 'pause'
  | 'resume'
  | 'cancel'
  | 'preheat-pla'
  | 'preheat-petg'
  | 'preheat-abs'
  | 'cooldown'
  | 'home'
  | 'x-minus'
  | 'x-plus'
  | 'y-minus'
  | 'y-plus'
  | 'z-minus'
  | 'z-plus'
  | 'extrude'
  | 'retract'
  | 'connect'
  | 'disconnect';

interface ActionDefinition {
  id: OctoprintAction;
  label: string;
  disabled?: boolean;
  danger?: boolean;
}

export function QuickActionsModal({
  printer,
  busyAction,
  onAction,
  onClose,
}: {
  printer: PrinterSnapshot | null;
  busyAction: OctoprintAction | null;
  onAction: (action: OctoprintAction) => Promise<void>;
  onClose: () => void;
}) {
  if (!printer) return null;

  const connected = printer.connection === 'connected';
  const idle = printer.status === 'idle';
  const canExtrude = idle && printer.hotend.current >= 170;
  const actions: ActionDefinition[] = [
    { id: 'pause', label: 'Pausar', disabled: printer.status !== 'printing' },
    { id: 'resume', label: 'Reanudar', disabled: printer.status !== 'paused' },
    {
      id: 'cancel',
      label: 'Cancelar',
      disabled: !['printing', 'paused', 'error'].includes(printer.status),
      danger: true,
    },
    { id: 'preheat-pla', label: 'PLA 215/60', disabled: !idle },
    { id: 'preheat-petg', label: 'PETG 245/80', disabled: !idle },
    { id: 'preheat-abs', label: 'ABS 255/105', disabled: !idle },
    { id: 'cooldown', label: 'Enfriar 0/0', disabled: !idle },
  ];
  const movementActions: ActionDefinition[] = [
    { id: 'z-plus', label: 'Z+', disabled: !idle },
    { id: 'y-plus', label: 'Y+', disabled: !idle },
    { id: 'extrude', label: 'E+', disabled: !canExtrude },
    { id: 'x-minus', label: 'X−', disabled: !idle },
    { id: 'home', label: 'Home', disabled: !idle },
    { id: 'x-plus', label: 'X+', disabled: !idle },
    { id: 'z-minus', label: 'Z−', disabled: !idle },
    { id: 'y-minus', label: 'Y−', disabled: !idle },
    { id: 'retract', label: 'E−', disabled: !canExtrude },
  ];

  const connectionAction: OctoprintAction | null = printer.connection === 'disconnected'
    ? 'connect'
    : printer.connection === 'connected' ? 'disconnect' : null;

  return (
    <div className="absolute inset-0 z-50 flex items-end bg-black/70 p-8 backdrop-blur-sm">
      <section
        aria-modal="true"
        role="dialog"
        aria-label={`Control directo de ${printer.name}`}
        className="w-full rounded-[40px] border border-cyan-300/20 bg-slate-950 p-8 shadow-glow"
      >
        <div className="flex items-center justify-between gap-6">
          <div>
            <h2 className="text-5xl font-black text-white">Control directo</h2>
            <p className="text-2xl text-slate-400">{printer.name} · {printer.activeJob}</p>
            <p className="mt-2 text-lg text-cyan-200">{printer.stateText}</p>
          </div>
          <div className="flex items-center gap-4">
            {connectionAction && (
              <button
                disabled={busyAction !== null || (connectionAction === 'disconnect' && !idle)}
                onClick={() => void onAction(connectionAction)}
                className="flex min-h-20 items-center gap-3 rounded-2xl bg-white/10 px-6 text-xl font-bold disabled:opacity-40"
              >
                {connectionAction === 'connect' ? <Plug /> : <Power />}
                {connectionAction === 'connect' ? 'Conectar' : 'Desconectar'}
              </button>
            )}
            <button aria-label="Cerrar" onClick={onClose} className="rounded-full bg-white/10 p-5">
              <X size={42} />
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-4 gap-5">
          {actions.map((action) => (
            <ActionButton
              key={action.id}
              action={action}
              busyAction={busyAction}
              onAction={onAction}
            />
          ))}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-8">
          <div className="rounded-[32px] bg-slate-900 p-6">
            <h3 className="mb-4 text-3xl font-bold">Pad XYZ · pasos de 10 mm</h3>
            <div className="grid grid-cols-3 gap-4">
              {movementActions.map((action) => (
                <ActionButton
                  key={action.id}
                  action={action}
                  busyAction={busyAction}
                  onAction={onAction}
                  compact
                />
              ))}
            </div>
            {!canExtrude && (
              <p className="mt-4 text-base text-slate-400">
                La extrusión se habilita en reposo y con el hotend a 170°C o más.
              </p>
            )}
          </div>
          <div className="overflow-hidden rounded-[32px] bg-slate-900 p-6">
            <h3 className="mb-4 flex items-center gap-3 text-3xl font-bold">
              <Camera /> Cámara
            </h3>
            {printer.cameraUrl ? (
              <img
                alt={`Cámara de ${printer.name}`}
                className="h-[310px] w-full rounded-2xl bg-slate-950 object-cover"
                src={printer.cameraUrl}
              />
            ) : (
              <div className="flex h-[310px] items-center justify-center rounded-2xl bg-slate-950 text-2xl text-slate-500">
                Stream no configurado
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function ActionButton({
  action,
  busyAction,
  compact = false,
  onAction,
}: {
  action: ActionDefinition;
  busyAction: OctoprintAction | null;
  compact?: boolean;
  onAction: (action: OctoprintAction) => Promise<void>;
}) {
  const busy = busyAction === action.id;
  return (
    <button
      disabled={action.disabled || busyAction !== null}
      onClick={() => void onAction(action.id)}
      className={`${compact ? 'h-24 text-2xl' : 'min-h-24 text-2xl'} flex items-center justify-center gap-3 rounded-2xl font-black disabled:cursor-not-allowed disabled:opacity-35 ${action.danger ? 'bg-rose-500/20 text-rose-100' : 'bg-cyan-500/15 text-cyan-100'}`}
    >
      {busy && <LoaderCircle className="animate-spin" />}
      {action.label}
    </button>
  );
}
