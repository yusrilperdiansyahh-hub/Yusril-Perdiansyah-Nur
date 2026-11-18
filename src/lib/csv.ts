import { MODUL_A_QUESTIONS, MODUL_B_QUESTIONS, MODUL_C_QUESTIONS } from '../data/instrument';
import type {
  DusunCode,
  HouseholdRecord,
  HouseholdSource,
  PiiRecord,
  SurveyResponseRecord,
  TerritoryRwMapping,
  VisitRecord,
} from '../types/census';

export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  const cleanText = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',' || ch === ';') {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\r' && next === '\n') {
      row.push(cell.trim());
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      cell = '';
      i++;
    } else if (ch === '\n' || ch === '\r') {
      row.push(cell.trim());
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  row.push(cell.trim());
  if (row.some((c) => c !== '')) rows.push(row);
  return rows;
}

const SOURCE_ALIASES: Record<string, HouseholdSource> = {
  listing_lapangan: 'listing_lapangan',
  'listing lapangan': 'listing_lapangan',
  daftar_kk_rt: 'daftar_kk_rt',
  'daftar kk rt': 'daftar_kk_rt',
  data_kependudukan: 'data_kependudukan',
  'data kependudukan desa': 'data_kependudukan',
  temuan_lapangan: 'temuan_lapangan',
  'temuan lapangan': 'temuan_lapangan',
};

export interface ParsedMasterCsvRow {
  line: number;
  dusun: DusunCode;
  rw: string;
  rt: string;
  no_bangunan: string;
  nama_kk: string;
  alamat: string;
  sumber: HouseholdSource;
}

export function validateMasterCsv(
  text: string,
  mappings: TerritoryRwMapping[]
): { valid: ParsedMasterCsvRow[]; errors: string[] } {
  const matrix = parseCsvText(text);
  if (matrix.length < 2) {
    return { valid: [], errors: ['Berkas CSV harus berisi baris header dan minimal 1 baris data.'] };
  }

  const headers = matrix[0].map((h) => h.toLowerCase().trim());
  const required = ['kode_dusun', 'rw', 'rt', 'no_bangunan', 'nama_kk', 'alamat', 'sumber'];
  const missing = required.filter((col) => !headers.includes(col));
  if (missing.length > 0) {
    return {
      valid: [],
      errors: [`Kolom wajib tidak ditemukan: ${missing.join(', ')}`],
    };
  }

  const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
  const valid: ParsedMasterCsvRow[] = [];
  const errors: string[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const line = r + 1;
    const cols = matrix[r];
    const dusunRaw = (cols[idx.kode_dusun] || '').toUpperCase().trim() as DusunCode;
    const rwRaw = (cols[idx.rw] || '').replace(/\D/g, '').padStart(2, '0');
    const rtRaw = (cols[idx.rt] || '').replace(/\D/g, '').padStart(2, '0');
    const no_bangunan = (cols[idx.no_bangunan] || '').trim();
    const nama_kk = (cols[idx.nama_kk] || '').trim();
    const alamat = (cols[idx.alamat] || '').trim();
    const sumberRaw = (cols[idx.sumber] || '').toLowerCase().trim();

    if (!['D1', 'D2', 'D3', 'D4', 'D5'].includes(dusunRaw)) {
      errors.push(`Baris ${line}: kode_dusun "${dusunRaw}" tidak valid (harus D1–D5).`);
      continue;
    }

    const rwMap = mappings.find((m) => m.rw === rwRaw);
    if (!rwMap) {
      errors.push(`Baris ${line}: RW "${rwRaw}" tidak ada dalam pemetaan 01–19.`);
      continue;
    }
    if (rwMap.dusun !== dusunRaw) {
      errors.push(
        `Baris ${line}: RW ${rwRaw} terdaftar pada ${rwMap.dusun}, bukan ${dusunRaw}.`
      );
      continue;
    }
    const rtNum = Number(rtRaw);
    if (!Number.isInteger(rtNum) || rtNum < 1 || rtNum > rwMap.jumlah_rt) {
      errors.push(
        `Baris ${line}: RT ${rtRaw} melebihi jumlah RT pada RW ${rwRaw} (maks ${rwMap.jumlah_rt}).`
      );
      continue;
    }
    if (!no_bangunan || !nama_kk) {
      errors.push(`Baris ${line}: no_bangunan dan nama_kk wajib diisi.`);
      continue;
    }

    const sumber = SOURCE_ALIASES[sumberRaw] ?? 'daftar_kk_rt';
    valid.push({
      line,
      dusun: dusunRaw,
      rw: rwRaw,
      rt: rtRaw,
      no_bangunan,
      nama_kk,
      alamat,
      sumber,
    });
  }

  return { valid, errors };
}

function escapeCsvCell(val: unknown): string {
  if (val === undefined || val === null) return '';
  const str = Array.isArray(val) ? val.join(' ') : String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCsvFile(filename: string, headers: string[], rows: unknown[][]): void {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportHouseholdsCsv(
  households: HouseholdRecord[],
  surveys: SurveyResponseRecord[],
  piiList: PiiRecord[],
  includeRawPii: boolean
): void {
  const surveyMap = new Map(surveys.map((s) => [s.id_rt, s]));
  const piiMap = new Map(piiList.map((p) => [p.id_rt, p]));

  const aCodes = MODUL_A_QUESTIONS.filter((q) => q.type !== 'note').map((q) => q.code);
  const cCodes = MODUL_C_QUESTIONS.map((q) => q.code);

  const headers = [
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
    ...(includeRawPii ? ['no_kk_pii'] : []),
    ...aCodes,
    ...cCodes,
    'submittedAt',
  ];

  const rows = households.map((h) => {
    const s = surveyMap.get(h.id_rt);
    const p = piiMap.get(h.id_rt);
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
      s?.modul0.enumerator || '',
      s?.modul0.lokasi?.lat ?? h.koordinat_terakhir?.lat ?? '',
      s?.modul0.lokasi?.lng ?? h.koordinat_terakhir?.lng ?? '',
      s?.modul0.lokasi?.accuracy ?? h.koordinat_terakhir?.accuracy ?? '',
      s?.modul0.lokasi?.method ?? h.koordinat_terakhir?.method ?? '',
      s?.modul0.lokasi?.manual_reason ?? '',
      s?.modul0.lokasi?.timestamp ?? '',
      s?.modul0.status_kunjungan ?? '',
      s?.modul0.kunjungan_ke ?? '',
      s?.modul0.persetujuan ?? '',
      s?.modul0.persetujuan_waktu ?? '',
      s?.modul0.foto_tersimpan_lokal ? 'ya' : 'tidak',
      ...(includeRawPii ? [p?.no_kk || ''] : []),
      ...aCodes.map((c) => s?.modulA?.[c] ?? ''),
      ...cCodes.map((c) => s?.modulC?.[c] ?? ''),
      s?.submittedAt ?? '',
    ];
  });

  downloadCsvFile(
    `cbw_2026_rumahtangga_${new Date().toISOString().slice(0, 10)}.csv`,
    headers,
    rows
  );
}

export function exportMembersCsv(
  households: HouseholdRecord[],
  surveys: SurveyResponseRecord[],
  piiList: PiiRecord[],
  includeRawPii: boolean
): void {
  const hhMap = new Map(households.map((h) => [h.id_rt, h]));
  const piiMap = new Map(piiList.map((p) => [p.id_rt, p]));

  const bCodes = MODUL_B_QUESTIONS.filter((q) => q.type !== 'note' && !q.isPii).map(
    (q) => q.code
  );

  const headers = [
    'id_rt',
    'dusun',
    'rw',
    'rt',
    'no_bangunan',
    'anggota_ke',
    ...bCodes,
    ...(includeRawPii ? ['nik_pii', 'no_kk_pii'] : []),
  ];

  const rows: unknown[][] = [];
  for (const s of surveys) {
    const h = hhMap.get(s.id_rt);
    if (!h) continue;
    const p = piiMap.get(s.id_rt);
    s.modulB.forEach((m, idx) => {
      rows.push([
        s.id_rt,
        h.dusun,
        h.rw,
        h.rt,
        h.no_bangunan,
        idx + 1,
        ...bCodes.map((c) => m[c] ?? ''),
        ...(includeRawPii
          ? [p?.nik_anggota?.[idx] || '', m.hubungan === 'kk' ? p?.no_kk || '' : '']
          : []),
      ]);
    });
  }

  downloadCsvFile(
    `cbw_2026_anggota_rt_${new Date().toISOString().slice(0, 10)}.csv`,
    headers,
    rows
  );
}

export function exportVisitsCsv(visits: VisitRecord[]): void {
  const headers = [
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
  const rows = visits.map((v) => [
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
  downloadCsvFile(
    `cbw_2026_kunjungan_${new Date().toISOString().slice(0, 10)}.csv`,
    headers,
    rows
  );
}
