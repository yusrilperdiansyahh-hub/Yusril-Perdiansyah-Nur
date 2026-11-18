import {
  getGDriveSyncConfig,
  getTerritoryConfig,
  listStaff,
} from './idb';
import type { GDriveSyncConfig, StaffMember, TerritoryConfig } from '../types/census';

export interface EnumeratorConfigBundle {
  app: 'cbw-sensus-2026';
  exportedAt: string;
  config: [TerritoryConfig, GDriveSyncConfig];
  staff: StaffMember[];
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  const padded =
    b64url.replace(/-/g, '+').replace(/_/g, '/') +
    '==='.slice((b64url.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function buildEnumeratorConfigBundle(
  overrides?: Partial<GDriveSyncConfig>
): Promise<EnumeratorConfigBundle> {
  const [territory, cfg, staff] = await Promise.all([
    getTerritoryConfig(),
    getGDriveSyncConfig(),
    listStaff(),
  ]);
  const mergedCfg: GDriveSyncConfig = {
    ...cfg,
    ...overrides,
    id: 'gdrive_sync',
  };
  return {
    app: 'cbw-sensus-2026',
    exportedAt: new Date().toISOString(),
    config: [territory, mergedCfg],
    staff,
  };
}

export function encodeConfigBundleToBase64Url(bundle: EnumeratorConfigBundle): string {
  const compactJson = JSON.stringify(bundle);
  const bytes = new TextEncoder().encode(compactJson);
  return bytesToBase64Url(bytes);
}

export function buildEnumeratorSetupUrl(
  bundle: EnumeratorConfigBundle,
  origin: string = window.location.origin
): string {
  const encoded = encodeConfigBundleToBase64Url(bundle);
  return `${origin}/#setup=${encoded}`;
}

/**
 * Menerima berbagai format konfigurasi dari Admin:
 * 1. Link lengkap berisi `#setup=...`
 * 2. Hash `#setup=...` atau `setup=...`
 * 3. Teks JSON utuh (`{"app":"cbw-sensus-2026",...}`)
 * 4. Teks Base64URL mentah hasil salin konfigurasi
 * Mengembalikan JSON string tervalidasi siap diteruskan ke `importFullBackupJson`.
 */
export function normalizeConfigInputToJson(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error('Teks atau tautan konfigurasi kosong.');
  }

  let jsonCandidate = trimmed;

  // Ekstrak bagian setelah `#setup=` atau `setup=` jika berupa URL/hash
  const setupMatch = trimmed.match(/(?:#|&)setup=([A-Za-z0-9\-_]+)/);
  if (setupMatch?.[1]) {
    const bytes = base64UrlToBytes(setupMatch[1]);
    jsonCandidate = new TextDecoder().decode(bytes);
  } else if (trimmed.startsWith('setup=')) {
    const payload = trimmed.slice('setup='.length).trim();
    const bytes = base64UrlToBytes(payload);
    jsonCandidate = new TextDecoder().decode(bytes);
  } else if (!trimmed.startsWith('{')) {
    // Coba decode sebagai base64url langsung
    try {
      const bytes = base64UrlToBytes(trimmed.replace(/\s+/g, ''));
      jsonCandidate = new TextDecoder().decode(bytes);
    } catch {
      throw new Error(
        'Format konfigurasi tidak dikenali. Tempel Link Setup lengkap atau isi teks berkas JSON dari Admin.'
      );
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonCandidate);
  } catch {
    throw new Error(
      'Isi konfigurasi rusak atau terpotong. Pastikan menyalin tautan atau teks konfigurasi secara utuh.'
    );
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    (parsed as { app?: unknown }).app !== 'cbw-sensus-2026'
  ) {
    throw new Error('Konfigurasi bukan milik aplikasi Sensus CBW 2026.');
  }

  return jsonCandidate;
}
