export type PrinterStatus = 'printing' | 'idle' | 'paused' | 'error';

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
}

export interface FleetMetrics {
  filamentFlow: number;
  fanSpeed: number;
  successRate: number;
  failureRate: number;
  estimatedConsumptionKwh: number;
}
