import type { FleetMetrics, PrinterSnapshot, TelemetryPoint } from '../types/printer';

export const mockPrinters: PrinterSnapshot[] = [
  { id: 'mk4-a', name: 'Prusa MK4 - A', status: 'printing', progress: 68, hotend: { current: 214, target: 215 }, bed: { current: 59, target: 60 }, elapsed: '03:42', remaining: '01:48', activeJob: 'bracket_v7.gcode', cameraUrl: 'mjpeg://mk4-a' },
  { id: 'x1c-b', name: 'Bambu X1C - B', status: 'printing', progress: 41, hotend: { current: 252, target: 255 }, bed: { current: 78, target: 80 }, elapsed: '01:16', remaining: '02:02', activeJob: 'gearbox_housing.3mf', cameraUrl: 'webrtc://x1c-b' },
  { id: 'ender-c', name: 'Ender 3 S1 - C', status: 'paused', progress: 22, hotend: { current: 198, target: 205 }, bed: { current: 55, target: 60 }, elapsed: '00:54', remaining: '03:11', activeJob: 'sensor_clip.gcode' },
  { id: 'voron-d', name: 'Voron 2.4 - D', status: 'error', progress: 12, hotend: { current: 32, target: 240 }, bed: { current: 29, target: 105 }, elapsed: '00:18', remaining: '--:--', activeJob: 'nylon_jig.gcode', cameraUrl: 'mjpeg://voron-d' },
];

export const telemetryData: TelemetryPoint[] = Array.from({ length: 12 }, (_, index) => ({
  time: `${String(index * 5).padStart(2, '0')}m`,
  hotend: 190 + Math.round(Math.sin(index / 2) * 18) + index * 3,
  bed: 50 + Math.round(Math.cos(index / 3) * 8) + index,
}));

export const fleetMetrics: FleetMetrics = { filamentFlow: 18.6, fanSpeed: 72, successRate: 94, failureRate: 6, estimatedConsumptionKwh: 12.8 };
