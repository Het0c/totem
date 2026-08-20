export type PrinterStatus = 'printing' | 'idle' | 'paused' | 'error' | 'disconnected';
export type PrinterConnection = 'connected' | 'disconnected' | 'unreachable';

export interface TemperatureReading { current: number; target: number; }
export interface TelemetryPoint { time: string; hotend: number; bed: number; }

export interface PrinterSnapshot {
  id: string;
  name: string;
  status: PrinterStatus;
  progress: number;
  hotend: TemperatureReading;
  bed: TemperatureReading;
  elapsed: string;
  remaining: string;
  cameraUrl?: string;
  activeJob: string;
  connection: PrinterConnection;
  stateText: string;
  telemetry: TelemetryPoint[];
  updatedAt: number;
}

export interface FleetMetrics {
  connected: number;
  printing: number;
  paused: number;
  errors: number;
}
