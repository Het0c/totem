import { invoke, isTauri } from '@tauri-apps/api/core';
import type {
  PrinterConnection,
  PrinterSnapshot,
  PrinterStatus,
  TelemetryPoint,
  TemperatureReading,
} from '../types/printer';

export interface OctoprintInstanceConfig {
  id: string;
  name: string;
  baseUrl: string;
  cameraUrl?: string;
}

interface OctoprintConnectionResponse {
  current?: { state?: string };
}

interface OctoprintStateFlags {
  printing?: boolean;
  paused?: boolean;
  error?: boolean;
  closedOrError?: boolean;
  operational?: boolean;
  ready?: boolean;
}

interface OctoprintHistoryPoint {
  time?: number;
  tool0?: { actual?: number | null };
  bed?: { actual?: number | null };
}

interface OctoprintPrinterResponse {
  temperature?: {
    tool0?: { actual?: number | null; target?: number | null };
    bed?: { actual?: number | null; target?: number | null };
    history?: OctoprintHistoryPoint[];
  };
  state?: { text?: string; flags?: OctoprintStateFlags };
}

interface OctoprintJobResponse {
  job?: { file?: { display?: string; name?: string; path?: string } };
  progress?: {
    completion?: number | null;
    printTime?: number | null;
    printTimeLeft?: number | null;
  };
}

interface TauriOctoprintResponse {
  status: number;
  contentType?: string;
  body?: unknown;
}

export class OctoprintApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly endpoint?: string,
  ) {
    super(message);
    this.name = 'OctoprintApiError';
  }
}

const EMPTY_TEMPERATURE: TemperatureReading = { current: 0, target: 0 };

export class OctoprintService {
  private readonly instances: Map<string, OctoprintInstanceConfig>;

  constructor(configs: OctoprintInstanceConfig[]) {
    this.instances = new Map(configs.map((config) => [config.id, {
      ...config,
      baseUrl: config.baseUrl.replace(/\/+$/, ''),
    }]));
  }

  getInitialSnapshot(printerId: string): PrinterSnapshot {
    return this.unavailableSnapshot(
      this.getInstance(printerId),
      'Comprobando OctoPrint…',
      'unreachable',
    );
  }

  getUnavailableSnapshot(printerId: string, error: unknown): PrinterSnapshot {
    const instance = this.getInstance(printerId);
    const stateText = error instanceof OctoprintApiError && error.status === 401
      ? 'API key no autorizada'
      : error instanceof OctoprintApiError && error.status === 403
        ? 'OctoPrint requiere una API key válida'
        : error instanceof Error ? error.message : 'OctoPrint no disponible';
    return this.unavailableSnapshot(instance, stateText, 'unreachable');
  }

  async getPrinterSnapshot(printerId: string): Promise<PrinterSnapshot> {
    const instance = this.getInstance(printerId);
    const connectionData = await this.request<OctoprintConnectionResponse>(
      instance,
      '/api/connection',
    );
    const connectionState = connectionData.current?.state?.trim() || 'Desconocido';
    const connection = this.normalizeConnection(connectionState);

    const jobPromise = this.request<OctoprintJobResponse>(instance, '/api/job');
    const printerPromise = connection === 'connected'
      ? this.request<OctoprintPrinterResponse>(
          instance,
          '/api/printer?history=true&limit=30',
        ).catch((error: unknown) => {
          if (error instanceof OctoprintApiError && error.status === 409) return undefined;
          throw error;
        })
      : Promise.resolve(undefined);

    const [jobData, printerData] = await Promise.all([jobPromise, printerPromise]);
    return this.normalizeSnapshot(
      instance,
      connection,
      connectionState,
      printerData,
      jobData,
    );
  }

  pauseJob(printerId: string): Promise<void> {
    return this.post(printerId, '/api/job', { command: 'pause', action: 'pause' });
  }

  resumeJob(printerId: string): Promise<void> {
    return this.post(printerId, '/api/job', { command: 'pause', action: 'resume' });
  }

  cancelJob(printerId: string): Promise<void> {
    return this.post(printerId, '/api/job', { command: 'cancel' });
  }

  async setTemperaturePreset(printerId: string, tool: number, bed: number): Promise<void> {
    await Promise.all([
      this.post(printerId, '/api/printer/tool', {
        command: 'target',
        targets: { tool0: tool },
      }),
      this.post(printerId, '/api/printer/bed', { command: 'target', target: bed }),
    ]);
  }

  home(printerId: string, axes: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z']): Promise<void> {
    return this.post(printerId, '/api/printer/printhead', { command: 'home', axes });
  }

  jog(printerId: string, axis: 'x' | 'y' | 'z', distance: number): Promise<void> {
    return this.post(printerId, '/api/printer/printhead', {
      command: 'jog',
      [axis]: distance,
    });
  }

  extrude(printerId: string, amount: number): Promise<void> {
    return this.post(printerId, '/api/printer/tool', { command: 'extrude', amount });
  }

  connect(printerId: string): Promise<void> {
    return this.post(printerId, '/api/connection', { command: 'connect' });
  }

  disconnect(printerId: string): Promise<void> {
    return this.post(printerId, '/api/connection', { command: 'disconnect' });
  }

  private post(
    printerId: string,
    endpoint: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    return this.request<void>(this.getInstance(printerId), endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private async request<T>(
    instance: OctoprintInstanceConfig,
    endpoint: string,
    init: RequestInit = {},
  ): Promise<T> {
    if (isTauri()) return this.requestThroughTauri<T>(instance, endpoint, init);

    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`${instance.baseUrl}${endpoint}`, {
        ...init,
        signal: controller.signal,
        headers: { Accept: 'application/json', ...init.headers },
      });

      if (!response.ok) {
        throw new OctoprintApiError(
          this.httpErrorMessage(instance.name, response.status),
          response.status,
          endpoint,
        );
      }

      if (response.status === 204) return undefined as T;
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        throw new OctoprintApiError(
          `Respuesta no válida de ${instance.name}`,
          response.status,
          endpoint,
        );
      }
      return await response.json() as T;
    } catch (error) {
      if (error instanceof OctoprintApiError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new OctoprintApiError(
          `${instance.name} no respondió a tiempo`,
          undefined,
          endpoint,
        );
      }
      throw new OctoprintApiError(
        error instanceof Error
          ? `No se pudo contactar con ${instance.name}: ${error.message}`
          : `No se pudo contactar con ${instance.name}`,
        undefined,
        endpoint,
      );
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }

  private async requestThroughTauri<T>(
    instance: OctoprintInstanceConfig,
    endpoint: string,
    init: RequestInit,
  ): Promise<T> {
    let body: unknown;
    if (typeof init.body === 'string' && init.body.length > 0) {
      body = JSON.parse(init.body) as unknown;
    }

    try {
      const response = await invoke<TauriOctoprintResponse>('octoprint_request', {
        request: {
          endpoint,
          method: init.method ?? 'GET',
          body,
        },
      });

      if (response.status < 200 || response.status >= 300) {
        throw new OctoprintApiError(
          this.httpErrorMessage(instance.name, response.status),
          response.status,
          endpoint,
        );
      }
      if (response.status === 204) return undefined as T;
      return response.body as T;
    } catch (error) {
      if (error instanceof OctoprintApiError) throw error;
      throw new OctoprintApiError(
        error instanceof Error
          ? `No se pudo contactar con ${instance.name}: ${error.message}`
          : `No se pudo contactar con ${instance.name}: ${String(error)}`,
        undefined,
        endpoint,
      );
    }
  }

  private httpErrorMessage(name: string, status: number): string {
    if (status === 401 || status === 403) return `${name}: autenticación rechazada`;
    if (status === 409) return `${name}: operación no disponible en el estado actual`;
    return `${name} respondió con HTTP ${status}`;
  }

  private getInstance(printerId: string): OctoprintInstanceConfig {
    const instance = this.instances.get(printerId);
    if (!instance) {
      throw new OctoprintApiError(`Instancia OctoPrint desconocida: ${printerId}`);
    }
    return instance;
  }

  private normalizeSnapshot(
    instance: OctoprintInstanceConfig,
    connection: PrinterConnection,
    connectionState: string,
    printerData?: OctoprintPrinterResponse,
    jobData?: OctoprintJobResponse,
  ): PrinterSnapshot {
    const flags = printerData?.state?.flags;
    const progress = this.clamp(jobData?.progress?.completion ?? 0, 0, 100);
    const activeJob = jobData?.job?.file?.display
      || jobData?.job?.file?.name
      || jobData?.job?.file?.path
      || 'Sin trabajo activo';

    return {
      id: instance.id,
      name: instance.name,
      status: this.normalizeStatus(connection, connectionState, flags),
      progress: Math.round(progress * 10) / 10,
      hotend: this.normalizeTemperature(printerData?.temperature?.tool0),
      bed: this.normalizeTemperature(printerData?.temperature?.bed),
      elapsed: this.formatDuration(jobData?.progress?.printTime),
      remaining: this.formatDuration(jobData?.progress?.printTimeLeft),
      cameraUrl: instance.cameraUrl,
      activeJob,
      connection,
      stateText: printerData?.state?.text || connectionState,
      telemetry: this.normalizeTelemetry(printerData?.temperature?.history),
      updatedAt: Date.now(),
    };
  }

  private normalizeStatus(
    connection: PrinterConnection,
    stateText: string,
    flags?: OctoprintStateFlags,
  ): PrinterStatus {
    if (connection !== 'connected') return 'disconnected';
    if (flags?.error || flags?.closedOrError || /error|offline/i.test(stateText)) return 'error';
    if (flags?.paused || /paused?/i.test(stateText)) return 'paused';
    if (flags?.printing || /printing/i.test(stateText)) return 'printing';
    return 'idle';
  }

  private normalizeConnection(state: string): PrinterConnection {
    return /closed|offline|unknown/i.test(state) ? 'disconnected' : 'connected';
  }

  private normalizeTemperature(
    value?: { actual?: number | null; target?: number | null },
  ): TemperatureReading {
    return {
      current: this.roundTemperature(value?.actual),
      target: this.roundTemperature(value?.target),
    };
  }

  private normalizeTelemetry(history?: OctoprintHistoryPoint[]): TelemetryPoint[] {
    if (!history) return [];
    return history
      .filter((point): point is OctoprintHistoryPoint & { time: number } => (
        typeof point.time === 'number'
      ))
      .map((point) => ({
        time: new Date(point.time * 1000).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        hotend: this.roundTemperature(point.tool0?.actual),
        bed: this.roundTemperature(point.bed?.actual),
      }));
  }

  private roundTemperature(value?: number | null): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
    return Math.round(value * 10) / 10;
  }

  private clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
  }

  private formatDuration(seconds?: number | null): string {
    if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
      return '--:--';
    }
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private unavailableSnapshot(
    instance: OctoprintInstanceConfig,
    stateText: string,
    connection: PrinterConnection,
  ): PrinterSnapshot {
    return {
      id: instance.id,
      name: instance.name,
      status: 'disconnected',
      progress: 0,
      hotend: { ...EMPTY_TEMPERATURE },
      bed: { ...EMPTY_TEMPERATURE },
      elapsed: '--:--',
      remaining: '--:--',
      cameraUrl: instance.cameraUrl,
      activeJob: 'Sin trabajo activo',
      connection,
      stateText,
      telemetry: [],
      updatedAt: Date.now(),
    };
  }
}
