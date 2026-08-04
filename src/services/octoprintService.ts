import type { PrinterSnapshot } from '../types/printer';

export interface OctoprintInstanceConfig { id: string; name: string; baseUrl: string; apiKey: string; }
export interface OctoprintCommand { printerId: string; command: string; payload?: Record<string, unknown>; }
export type PrinterUpdateHandler = (printer: PrinterSnapshot) => void;

export class OctoprintService {
  private readonly instances: Map<string, OctoprintInstanceConfig>;
  private pollingHandles = new Map<string, number>();

  constructor(configs: OctoprintInstanceConfig[]) {
    this.instances = new Map(configs.map((config) => [config.id, config]));
  }

  async getPrinterSnapshot(printerId: string): Promise<PrinterSnapshot> {
    const instance = this.getInstance(printerId);
    const response = await fetch(`${instance.baseUrl}/api/printer`, { headers: this.authHeaders(instance) });
    if (!response.ok) throw new Error(`OctoPrint ${instance.name} responded ${response.status}`);
    const data = await response.json();
    return this.normalizePrinterState(instance, data);
  }

  async sendCommand({ printerId, command, payload }: OctoprintCommand): Promise<void> {
    const instance = this.getInstance(printerId);
    const response = await fetch(`${instance.baseUrl}/api/printer/command`, {
      method: 'POST', headers: { ...this.authHeaders(instance), 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, ...payload }),
    });
    if (!response.ok) throw new Error(`Command ${command} failed for ${instance.name}`);
  }

  subscribe(printerId: string, handler: PrinterUpdateHandler, intervalMs = 5000): () => void {
    const poll = async () => handler(await this.getPrinterSnapshot(printerId));
    void poll();
    const handle = window.setInterval(() => void poll(), intervalMs);
    this.pollingHandles.set(printerId, handle);
    return () => { window.clearInterval(handle); this.pollingHandles.delete(printerId); };
  }

  private getInstance(printerId: string): OctoprintInstanceConfig {
    const instance = this.instances.get(printerId);
    if (!instance) throw new Error(`Unknown OctoPrint instance: ${printerId}`);
    return instance;
  }

  private authHeaders(instance: OctoprintInstanceConfig): HeadersInit { return { 'X-Api-Key': instance.apiKey }; }

  private normalizePrinterState(instance: OctoprintInstanceConfig, data: any): PrinterSnapshot {
    const hotend = data.temperature?.tool0 ?? { actual: 0, target: 0 };
    const bed = data.temperature?.bed ?? { actual: 0, target: 0 };
    return { id: instance.id, name: instance.name, status: data.state?.flags?.printing ? 'printing' : 'idle', progress: 0, hotend: { current: hotend.actual, target: hotend.target }, bed: { current: bed.actual, target: bed.target }, elapsed: '--:--', remaining: '--:--', activeJob: 'OctoPrint job' };
  }
}
