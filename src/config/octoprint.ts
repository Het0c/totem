import type { OctoprintInstanceConfig } from '../services/octoprintService';

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function loadOctoprintInstances(): OctoprintInstanceConfig[] {
  const baseUrl = normalizeBaseUrl(import.meta.env.VITE_OCTOPRINT_URL ?? '');
  if (!baseUrl) return [];

  const cameraUrl = (import.meta.env.VITE_OCTOPRINT_CAMERA_URL ?? '').trim();
  return [{
    id: (import.meta.env.VITE_OCTOPRINT_ID ?? 'octoprint-debug').trim(),
    name: (import.meta.env.VITE_OCTOPRINT_NAME ?? 'OctoPrint Debug').trim(),
    baseUrl,
    cameraUrl: cameraUrl || undefined,
  }];
}
