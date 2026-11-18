import { MODUL_A_QUESTIONS, MODUL_B_QUESTIONS, MODUL_C_QUESTIONS } from '../data/instrument';
import type {
  HouseholdRecord,
  PiiRecord,
  SurveyResponseRecord,
  VisitRecord,
} from '../types/census';
import { maskIdNumber } from './xlsform';

export const SHEET_TABS = {
  households: 'Rumah_Tangga',
  members: 'Anggota_RT',
  visits: 'Kunjungan',
} as const;

export const HOUSEHOLD_SHEET_HEADERS = [
  'id_rt',
  'dusun',
  'rw',
  'rt',
  'no_bangunan',
  'nama_kk_daftar',
  'alamat_daftar',
  'sumber_daftar',
  'status_pencacahan',
  'status_daftar',
  'status_verifikasi',
  'catatan_pengawas',
  'enumerator',
  'lokasi_lat',
  'lokasi_lng',
  'lokasi_akurasi_m',
  'lokasi_metode',
  'lokasi_alasan_manual',
  'lokasi_waktu',
  'status_kunjungan',
  'kunjungan_ke',
  'persetujuan',
  'persetujuan_waktu',
  'foto_tersimpan_lokal',
  'no_kk',
  ...MODUL_A_QUESTIONS.filter((q) => q.type !== 'note').map((q) => q.code),
  ...MODUL_C_QUESTIONS.map((q) => q.code),
  'submittedAt',
  'updatedAt',
];

export const MEMBER_SHEET_HEADERS = [
  'id_rt',
  'dusun',
  'rw',
  'rt',
  'no_bangunan',
  'anggota_ke',
  ...MODUL_B_QUESTIONS.filter((q) => q.type !== 'note' && !q.isPii).map((q) => q.code),
  'nik',
  'no_kk',
  'updatedAt',
];

export const VISIT_SHEET_HEADERS = [
  'visit_id',
  'id_rt',
  'rt_key',
  'status_kunjungan',
  'kunjungan_ke',
  'persetujuan',
  'persetujuan_waktu',
  'lat',
  'lng',
  'accuracy_m',
  'method',
  'manual_reason',
  'enumerator',
  'createdAt',
];

function serializeCell(val: unknown): string | number {
  if (val === undefined || val === null) return '';
  if (typeof val === 'number') return val;
  if (Array.isArray(val)) return val.join(' ');
  return String(val);
}

export function buildHouseholdSheetRow(
  h: HouseholdRecord,
  s: SurveyResponseRecord | null | undefined,
  p: PiiRecord | null | undefined,
  includeRawPii: boolean
): (string | number)[] {
  const aCodes = MODUL_A_QUESTIONS.filter((q) => q.type !== 'note').map((q) => q.code);
  const cCodes = MODUL_C_QUESTIONS.map((q) => q.code);
  const noKk = p?.no_kk ? (includeRawPii ? p.no_kk : maskIdNumber(p.no_kk)) : '';

  return [
    h.id_rt,
    h.dusun,
    h.rw,
    h.rt,
    h.no_bangunan,
    h.nama_kk,
    h.alamat,
    h.sumber,
    h.status_pencacahan,
    h.status_daftar,
    h.status_verifikasi,
    h.catatan_pengawas || '',
    s?.modul0.enumerator || h.createdBy || '',
    s?.modul0.lokasi?.lat ?? h.koordinat_terakhir?.lat ?? '',
    s?.modul0.lokasi?.lng ?? h.koordinat_terakhir?.lng ?? '',
    s?.modul0.lokasi?.accuracy ?? h.koordinat_terakhir?.accuracy ?? '',
    s?.modul0.lokasi?.method ?? h.koordinat_terakhir?.method ?? '',
    s?.modul0.lokasi?.manual_reason ?? h.koordinat_terakhir?.manual_reason ?? '',
    s?.modul0.lokasi?.timestamp ?? h.koordinat_terakhir?.timestamp ?? '',
    s?.modul0.status_kunjungan ?? '',
    s?.modul0.kunjungan_ke ?? '',
    s?.modul0.persetujuan ?? '',
    s?.modul0.persetujuan_waktu ?? '',
    s?.modul0.foto_tersimpan_lokal ? 'ya' : 'tidak',
    noKk,
    ...aCodes.map((c) => serializeCell(s?.modulA?.[c])),
    ...cCodes.map((c) => serializeCell(s?.modulC?.[c])),
    s?.submittedAt ?? '',
    h.updatedAt,
  ];
}

export function buildMemberSheetRows(
  h: HouseholdRecord,
  s: SurveyResponseRecord | null | undefined,
  p: PiiRecord | null | undefined,
  includeRawPii: boolean
): (string | number)[][] {
  if (!s || !s.modulB?.length) return [];
  const bCodes = MODUL_B_QUESTIONS.filter((q) => q.type !== 'note' && !q.isPii).map(
    (q) => q.code
  );
  return s.modulB.map((m, idx) => {
    const rawNik = p?.nik_anggota?.[idx] || '';
    const nikVal = rawNik ? (includeRawPii ? rawNik : maskIdNumber(rawNik)) : '';
    const rawKk = m.hubungan === 'kk' ? p?.no_kk || '' : '';
    const kkVal = rawKk ? (includeRawPii ? rawKk : maskIdNumber(rawKk)) : '';
    return [
      h.id_rt,
      h.dusun,
      h.rw,
      h.rt,
      h.no_bangunan,
      idx + 1,
      ...bCodes.map((c) => serializeCell(m[c])),
      nikVal,
      kkVal,
      s.updatedAt,
    ];
  });
}

export function buildVisitSheetRows(visits: VisitRecord[]): (string | number)[][] {
  return visits.map((v) => [
    v.id,
    v.id_rt,
    v.rt_key,
    v.status_kunjungan,
    v.kunjungan_ke ?? '',
    v.persetujuan ?? '',
    v.persetujuan_waktu ?? '',
    v.lokasi.lat,
    v.lokasi.lng,
    v.lokasi.accuracy,
    v.lokasi.method,
    v.lokasi.manual_reason ?? '',
    v.enumeratorEmail,
    v.createdAt,
  ]);
}

export function extractSpreadsheetIdFromInput(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return trimmed;
}

async function googleFetch(url: string, accessToken: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : '';
    if (detail.toLowerCase().includes('failed to fetch')) {
      throw new Error(
        'Gagal menghubungi server Google Sheets API. Periksa koneksi internet Anda atau coba lagi.'
      );
    }
    throw err;
  }
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const json = await res.json();
      detail = json?.error?.message || detail;
    } catch {
      // ignore parse failure
    }
    throw new Error(`Google Sheets API: ${detail}`);
  }
  return res.json();
}

export async function createCensusSpreadsheet(
  accessToken: string,
  title = "Sensus Rumah Tangga Desa Cibiru Wetan 2026 (I'ComDev)"
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> {
  const data = await googleFetch(
    'https://sheets.googleapis.com/v4/spreadsheets',
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        properties: { title, locale: 'id_ID' },
        sheets: [
          { properties: { title: SHEET_TABS.households } },
          { properties: { title: SHEET_TABS.members } },
          { properties: { title: SHEET_TABS.visits } },
        ],
      }),
    }
  );

  const spreadsheetId = data.spreadsheetId as string;
  const spreadsheetUrl =
    (data.spreadsheetUrl as string) ||
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Tulis baris header ke 3 tab
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: [
          { range: `'${SHEET_TABS.households}'!A1`, values: [HOUSEHOLD_SHEET_HEADERS] },
          { range: `'${SHEET_TABS.members}'!A1`, values: [MEMBER_SHEET_HEADERS] },
          { range: `'${SHEET_TABS.visits}'!A1`, values: [VISIT_SHEET_HEADERS] },
        ],
      }),
    }
  );

  return { spreadsheetId, spreadsheetUrl, title };
}

async function ensureRequiredSheetTabs(
  spreadsheetId: string,
  accessToken: string
): Promise<void> {
  const meta = await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title,properties.title`,
    accessToken
  );
  const existingTitles = new Set<string>(
    (meta.sheets || []).map((s: { properties?: { title?: string } }) => s.properties?.title || '')
  );

  const requiredTabs = [SHEET_TABS.households, SHEET_TABS.members, SHEET_TABS.visits];
  const missingTabs = requiredTabs.filter((t) => !existingTitles.has(t));

  if (missingTabs.length > 0) {
    await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      accessToken,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: missingTabs.map((t) => ({ addSheet: { properties: { title: t } } })),
        }),
      }
    );
  }
}

export async function syncAllToGoogleSheets(params: {
  spreadsheetId: string;
  accessToken: string;
  households: HouseholdRecord[];
  surveys: SurveyResponseRecord[];
  piiList: PiiRecord[];
  visits: VisitRecord[];
  includeRawPii: boolean;
}): Promise<{ householdsCount: number; membersCount: number; visitsCount: number }> {
  const {
    spreadsheetId,
    accessToken,
    households,
    surveys,
    piiList,
    visits,
    includeRawPii,
  } = params;

  await ensureRequiredSheetTabs(spreadsheetId, accessToken);

  const surveyMap = new Map(surveys.map((s) => [s.id_rt, s]));
  const piiMap = new Map(piiList.map((p) => [p.id_rt, p]));

  const hhRows = households.map((h) =>
    buildHouseholdSheetRow(h, surveyMap.get(h.id_rt), piiMap.get(h.id_rt), includeRawPii)
  );
  const memberRows = households.flatMap((h) =>
    buildMemberSheetRows(h, surveyMap.get(h.id_rt), piiMap.get(h.id_rt), includeRawPii)
  );
  const visitRows = buildVisitSheetRows(visits);

  // Bersihkan isi lama lalu tulis ulang secara atomik agar sinkron sempurna tanpa duplikasi
  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        ranges: [
          `'${SHEET_TABS.households}'!A:ZZ`,
          `'${SHEET_TABS.members}'!A:ZZ`,
          `'${SHEET_TABS.visits}'!A:ZZ`,
        ],
      }),
    }
  );

  await googleFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: `'${SHEET_TABS.households}'!A1`,
            values: [HOUSEHOLD_SHEET_HEADERS, ...hhRows],
          },
          {
            range: `'${SHEET_TABS.members}'!A1`,
            values: [MEMBER_SHEET_HEADERS, ...memberRows],
          },
          {
            range: `'${SHEET_TABS.visits}'!A1`,
            values: [VISIT_SHEET_HEADERS, ...visitRows],
          },
        ],
      }),
    }
  );

  return {
    householdsCount: hhRows.length,
    membersCount: memberRows.length,
    visitsCount: visitRows.length,
  };
}

export function validateAppsScriptUrl(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    throw new Error('URL Web App Apps Script belum diisi.');
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(
      'Format URL Apps Script tidak valid. Gunakan URL Web App berakhiran /exec.'
    );
  }
  if (parsed.hostname === 'docs.google.com') {
    throw new Error(
      'URL yang dimasukkan adalah tautan Google Spreadsheet, bukan URL Web App Apps Script. Salin URL Web App berakhiran /exec dari menu Deploy → Web app.'
    );
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'script.google.com') {
    throw new Error(
      'URL Apps Script harus berasal dari https://script.google.com/macros/s/.../exec.'
    );
  }
  if (parsed.pathname.endsWith('/dev')) {
    throw new Error(
      'URL berakhiran /dev adalah tautan uji coba pribadi yang diblokir CORS. Salin URL Web App berakhiran /exec dari Deploy → Manage deployments.'
    );
  }
  if (parsed.pathname.includes('/edit') || parsed.pathname.startsWith('/home/')) {
    throw new Error(
      'URL editor Apps Script tidak dapat dipakai. Klik Deploy → New deployment → Web app lalu salin URL /exec.'
    );
  }
  return parsed.toString();
}

interface AppsScriptResponse {
  ok?: boolean;
  error?: string;
  id_rt?: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  spreadsheetName?: string;
  householdsCount?: number;
  membersCount?: number;
  visitsCount?: number;
}

async function callAppsScript(
  appsScriptUrl: string,
  payload: Record<string, unknown>
): Promise<AppsScriptResponse> {
  const targetUrl = validateAppsScriptUrl(appsScriptUrl);

  // 1. Coba lewat proxy server lokal (/api/apps-script-proxy) agar bebas kendala CORS & redirect browser/iframe
  try {
    const proxyRes = await fetch('/api/apps-script-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appsScriptUrl: targetUrl, payload }),
    });

    const contentType = proxyRes.headers.get('content-type') || '';
    if (proxyRes.status !== 404 && contentType.includes('application/json')) {
      const json = (await proxyRes.json()) as AppsScriptResponse;
      if (!proxyRes.ok && json?.error) {
        throw new Error(json.error);
      }
      return json;
    }
  } catch (err) {
    // Jika error berasal dari diagnosis server proxy (400/403/502 JSON), lempar langsung ke pengguna
    if (
      err instanceof Error &&
      !err.message.toLowerCase().includes('failed to fetch') &&
      !err.message.toLowerCase().includes('networkerror')
    ) {
      throw err;
    }
    // Jika /api tidak tersedia (misal host statis murni), lanjut ke fallback direct fetch
  }

  // 2. Fallback langsung ke Google Apps Script Web App dari browser
  let res: Response;
  try {
    res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : '';
    if (detail.toLowerCase().includes('failed to fetch')) {
      throw new Error(
        'Gagal terhubung ke Apps Script (Failed to fetch). Pastikan internet aktif, URL berakhiran /exec (bukan /dev), dan Web App di-deploy dengan akses "Anyone" (Siapa saja).'
      );
    }
    throw err;
  }

  if (!res.ok) {
    throw new Error(`Apps Script HTTP ${res.status}`);
  }
  const text = await res.text();
  try {
    return JSON.parse(text) as AppsScriptResponse;
  } catch {
    throw new Error(
      'Respon Apps Script tidak valid. Pastikan kode sudah disimpan dan di-deploy dengan akses "Anyone" (Siapa saja).'
    );
  }
}

export async function upsertSingleAssessmentToAppsScript(params: {
  appsScriptUrl: string;
  household: HouseholdRecord;
  survey: SurveyResponseRecord | null;
  pii: PiiRecord | null;
  visits: VisitRecord[];
  includeRawPii: boolean;
}): Promise<void> {
  const { appsScriptUrl, household, survey, pii, visits, includeRawPii } = params;
  const parsed = await callAppsScript(appsScriptUrl, {
    action: 'upsert_assessment',
    id_rt: household.id_rt,
    householdHeaders: HOUSEHOLD_SHEET_HEADERS,
    householdRow: buildHouseholdSheetRow(household, survey, pii, includeRawPii),
    memberHeaders: MEMBER_SHEET_HEADERS,
    memberRows: buildMemberSheetRows(household, survey, pii, includeRawPii),
    visitHeaders: VISIT_SHEET_HEADERS,
    visitRows: buildVisitSheetRows(visits),
  });

  if (parsed?.ok === false) {
    throw new Error(parsed.error || 'Gagal menulis ke Apps Script.');
  }
}

export async function syncAllViaAppsScript(params: {
  appsScriptUrl: string;
  households: HouseholdRecord[];
  surveys: SurveyResponseRecord[];
  piiList: PiiRecord[];
  visits: VisitRecord[];
  includeRawPii: boolean;
}): Promise<{ householdsCount: number; membersCount: number; visitsCount: number }> {
  const {
    appsScriptUrl,
    households,
    surveys,
    piiList,
    visits,
    includeRawPii,
  } = params;

  const surveyMap = new Map(surveys.map((s) => [s.id_rt, s]));
  const piiMap = new Map(piiList.map((p) => [p.id_rt, p]));

  const hhRows = households.map((h) =>
    buildHouseholdSheetRow(h, surveyMap.get(h.id_rt), piiMap.get(h.id_rt), includeRawPii)
  );
  const memberRows = households.flatMap((h) =>
    buildMemberSheetRows(h, surveyMap.get(h.id_rt), piiMap.get(h.id_rt), includeRawPii)
  );
  const visitRows = buildVisitSheetRows(visits);

  const parsed = await callAppsScript(appsScriptUrl, {
    action: 'sync_all',
    householdHeaders: HOUSEHOLD_SHEET_HEADERS,
    householdRows: hhRows,
    memberHeaders: MEMBER_SHEET_HEADERS,
    memberRows,
    visitHeaders: VISIT_SHEET_HEADERS,
    visitRows,
  });

  if (parsed?.ok === false) {
    // Fallback otomatis bila Admin masih memakai versi skrip lama tanpa action sync_all
    if (String(parsed.error || '').includes('Aksi tidak dikenal')) {
      for (const h of households) {
        const hhVisits = visits.filter((v) => v.id_rt === h.id_rt);
        await upsertSingleAssessmentToAppsScript({
          appsScriptUrl,
          household: h,
          survey: surveyMap.get(h.id_rt) ?? null,
          pii: piiMap.get(h.id_rt) ?? null,
          visits: hhVisits,
          includeRawPii,
        });
      }
      return {
        householdsCount: hhRows.length,
        membersCount: memberRows.length,
        visitsCount: visitRows.length,
      };
    }
    throw new Error(parsed.error || 'Gagal menyinkronkan ke Apps Script.');
  }

  return {
    householdsCount: hhRows.length,
    membersCount: memberRows.length,
    visitsCount: visitRows.length,
  };
}

export interface AppsScriptPingResult {
  message: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  spreadsheetName?: string;
}

export async function testAppsScriptConnection(
  appsScriptUrl: string
): Promise<AppsScriptPingResult> {
  const parsed = await callAppsScript(appsScriptUrl, { action: 'ping' });
  if (parsed?.ok) {
    return {
      message: parsed.spreadsheetName
        ? `Terhubung ke Spreadsheet "${parsed.spreadsheetName}"`
        : 'Koneksi Apps Script berhasil.',
      spreadsheetId: parsed.spreadsheetId,
      spreadsheetUrl: parsed.spreadsheetUrl,
      spreadsheetName: parsed.spreadsheetName,
    };
  }
  throw new Error(
    parsed?.error ||
      'Respon Apps Script tidak valid. Pastikan Web App di-deploy dengan akses "Anyone" (Siapa saja).'
  );
}

export const APPS_SCRIPT_CODE = `// Tempel kode ini di Google Spreadsheet Admin -> Ekstensi -> Apps Script
// Lalu klik Deploy -> New deployment -> Web app -> Execute as: Me -> Who has access: Anyone

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (payload.action === 'ping') {
      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        spreadsheetId: ss.getId(),
        spreadsheetUrl: ss.getUrl(),
        spreadsheetName: ss.getName()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (payload.action === 'upsert_assessment') {
      upsertRowByKey_(ss, 'Rumah_Tangga', payload.householdHeaders, payload.householdRow, 0, payload.id_rt);
      replaceRowsByKey_(ss, 'Anggota_RT', payload.memberHeaders, payload.memberRows || [], 0, payload.id_rt);
      replaceRowsByKey_(ss, 'Kunjungan', payload.visitHeaders, payload.visitRows || [], 1, payload.id_rt);

      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        id_rt: payload.id_rt
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (payload.action === 'sync_all') {
      replaceEntireSheet_(ss, 'Rumah_Tangga', payload.householdHeaders, payload.householdRows || []);
      replaceEntireSheet_(ss, 'Anggota_RT', payload.memberHeaders, payload.memberRows || []);
      replaceEntireSheet_(ss, 'Kunjungan', payload.visitHeaders, payload.visitRows || []);

      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        householdsCount: (payload.householdRows || []).length,
        membersCount: (payload.memberRows || []).length,
        visitsCount: (payload.visitRows || []).length
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'Aksi tidak dikenal' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0 && headers && headers.length > 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}

function replaceEntireSheet_(ss, sheetName, headers, rows) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  sheet.clearContents();
  var allRows = [];
  if (headers && headers.length > 0) {
    allRows.push(headers);
  }
  for (var i = 0; i < rows.length; i++) {
    allRows.push(rows[i]);
  }
  if (allRows.length > 0) {
    sheet.getRange(1, 1, allRows.length, allRows[0].length).setValues(allRows);
  }
}

function upsertRowByKey_(ss, sheetName, headers, rowValues, keyColIdx, keyVal) {
  var sheet = getOrCreateSheet_(ss, sheetName, headers);
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var keys = sheet.getRange(2, keyColIdx + 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) {
      if (String(keys[i][0]) === String(keyVal)) {
        sheet.getRange(i + 2, 1, 1, rowValues.length).setValues([rowValues]);
        return;
      }
    }
  }
  sheet.appendRow(rowValues);
}

function replaceRowsByKey_(ss, sheetName, headers, newRows, keyColIdx, keyVal) {
  var sheet = getOrCreateSheet_(ss, sheetName, headers);
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var keys = sheet.getRange(2, keyColIdx + 1, lastRow - 1, 1).getValues();
    for (var i = keys.length - 1; i >= 0; i--) {
      if (String(keys[i][0]) === String(keyVal)) {
        sheet.deleteRow(i + 2);
      }
    }
  }
  if (newRows.length > 0) {
    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, newRows.length, newRows[0].length).setValues(newRows);
  }
}
`;

