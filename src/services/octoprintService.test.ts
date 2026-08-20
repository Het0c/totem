import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OctoprintApiError,
  OctoprintService,
} from './octoprintService';

const config = {
  id: 'debug',
  name: 'OctoPrint Debug',
  baseUrl: '/octoprint/',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('OctoprintService', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('representa el contenedor disponible sin impresora como desconectado', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/api/connection')) {
        return jsonResponse({ current: { state: 'Closed' } });
      }
      if (url.endsWith('/api/job')) {
        return jsonResponse({ job: { file: {} }, progress: {} });
      }
      throw new Error(`Endpoint inesperado: ${url}`);
    });

    const snapshot = await new OctoprintService([config]).getPrinterSnapshot('debug');

    expect(snapshot).toMatchObject({
      status: 'disconnected',
      connection: 'disconnected',
      stateText: 'Closed',
      activeJob: 'Sin trabajo activo',
      progress: 0,
      hotend: { current: 0, target: 0 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('combina conexión, trabajo, progreso, temperaturas e historial', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/api/connection')) {
        return jsonResponse({ current: { state: 'Operational' } });
      }
      if (url.endsWith('/api/job')) {
        return jsonResponse({
          job: { file: { display: 'pieza.gcode' } },
          progress: { completion: 42.34, printTime: 3661, printTimeLeft: 125 },
        });
      }
      if (url.includes('/api/printer?')) {
        return jsonResponse({
          state: { text: 'Printing', flags: { printing: true } },
          temperature: {
            tool0: { actual: 214.87, target: 215 },
            bed: { actual: 59.94, target: 60 },
            history: [{
              time: 1_700_000_000,
              tool0: { actual: 213.44 },
              bed: { actual: 59.51 },
            }],
          },
        });
      }
      throw new Error(`Endpoint inesperado: ${url}`);
    });

    const snapshot = await new OctoprintService([config]).getPrinterSnapshot('debug');

    expect(snapshot).toMatchObject({
      status: 'printing',
      connection: 'connected',
      activeJob: 'pieza.gcode',
      progress: 42.3,
      elapsed: '01:01',
      remaining: '00:02',
      hotend: { current: 214.9, target: 215 },
      bed: { current: 59.9, target: 60 },
    });
    expect(snapshot.telemetry).toHaveLength(1);
    expect(snapshot.telemetry[0]).toMatchObject({ hotend: 213.4, bed: 59.5 });
  });

  it('envía los cuerpos oficiales para pausa y temperaturas', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const service = new OctoprintService([config]);

    await service.pauseJob('debug');
    await service.setTemperaturePreset('debug', 215, 60);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/octoprint/api/job',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ command: 'pause', action: 'pause' }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/octoprint/api/printer/tool',
      expect.objectContaining({
        body: JSON.stringify({ command: 'target', targets: { tool0: 215 } }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/octoprint/api/printer/bed',
      expect.objectContaining({
        body: JSON.stringify({ command: 'target', target: 60 }),
      }),
    );
  });

  it('expone errores de autenticación sin confundirlos con impresora desconectada', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
    const service = new OctoprintService([config]);

    await expect(service.getPrinterSnapshot('debug')).rejects.toMatchObject({
      name: 'OctoprintApiError',
      status: 403,
      endpoint: '/api/connection',
    });
    expect(service.getUnavailableSnapshot('debug', new OctoprintApiError('x', 403)))
      .toMatchObject({
        connection: 'unreachable',
        stateText: 'OctoPrint requiere una API key válida',
      });
  });
});
