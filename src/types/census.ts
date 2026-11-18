export type DusunCode = 'D1' | 'D2' | 'D3' | 'D4' | 'D5';

export type UserRole = 'admin' | 'pengawas' | 'enumerator';

export type HouseholdSource =
  | 'listing_lapangan'
  | 'daftar_kk_rt'
  | 'data_kependudukan'
  | 'temuan_lapangan';

export type EnumerationStatus =
  | 'belum_dikunjungi'
  | 'draf'
  | 'tercacah'
  | 'menolak'
  | 'tidak_ditemui'
  | 'rumah_kosong';

export type RegistryStatus = 'aktif' | 'pindah' | 'ganda' | 'tidak_ada';

export type VerificationStatus = 'menunggu' | 'terverifikasi' | 'dikembalikan';

export interface TerritoryRwMapping {
  rw: string; // "01" .. "19"
  dusun: DusunCode;
  jumlah_rt: number;
}

export interface TerritoryConfig {
  id: 'territory';
  mappings: TerritoryRwMapping[];
  updatedAt: string;
  updatedBy: string;
}

export interface StaffMember {
  email: string; // normalized lowercase primary key
  nama: string;
  peran: UserRole;
  rt_tugas: string[]; // format: "D2-07-03"
  aktif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeoCoordinate {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: string;
  method: 'gps' | 'manual';
  manual_reason?: string;
}

export interface HouseholdRecord {
  id_rt: string; // format: CBW-D2-07-03-015 (immutable)
  dusun: DusunCode;
  rw: string; // 2 digits "01".."19"
  rt: string; // 2 digits "01".."99"
  rt_key: string; // "D2-07-03"
  no_bangunan: string; // e.g. "B-001"
  nama_kk: string;
  alamat: string;
  sumber: HouseholdSource;
  status_pencacahan: EnumerationStatus;
  status_daftar: RegistryStatus;
  catatan_daftar?: string;
  status_verifikasi: VerificationStatus;
  catatan_pengawas?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  koordinat_terakhir?: GeoCoordinate;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface VisitRecord {
  id: string;
  id_rt: string;
  rt_key: string;
  status_kunjungan: 'ditemui' | 'tidak_ditemui' | 'rumah_kosong';
  kunjungan_ke?: number;
  persetujuan?: 'ya' | 'tidak';
  persetujuan_waktu?: string;
  lokasi: GeoCoordinate;
  enumeratorEmail: string;
  catatan?: string;
  createdAt: string;
}

export type AnswerValue = string | number | string[] | undefined;

export interface MemberAnswers {
  [fieldCode: string]: AnswerValue;
}

export interface SurveyResponseRecord {
  id_rt: string;
  modul0: {
    id_rt: string;
    dusun: DusunCode;
    rw: string;
    rt: string;
    no_bangunan: string;
    nama_kk_daftar: string;
    enumerator: string;
    lokasi?: GeoCoordinate;
    status_kunjungan?: 'ditemui' | 'tidak_ditemui' | 'rumah_kosong';
    kunjungan_ke?: number;
    persetujuan?: 'ya' | 'tidak';
    persetujuan_waktu?: string;
    foto_tersimpan_lokal?: boolean;
    foto_waktu?: string;
  };
  modulA: Record<string, AnswerValue>;
  modulB: MemberAnswers[];
  modulC: Record<string, AnswerValue>;
  warningsConfirmed: boolean;
  submittedAt?: string;
  updatedAt: string;
  enumeratorEmail: string;
}

export interface PiiRecord {
  id_rt: string;
  no_kk?: string; // 16 digits for KK
  nik_anggota: Record<number, string>; // member index -> 16 digits NIK
  updatedAt: string;
}

export interface PhotoRecord {
  id_rt: string;
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  updatedAt: string;
}

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning';
  module: 'modul0' | 'modulA' | 'modulB' | 'modulC' | 'lintas';
  memberIndex?: number;
  fieldCode?: string;
  message: string;
}

export interface GDriveSyncConfig {
  id: 'gdrive_sync';
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
  appsScriptUrl: string;
  autoSyncEnabled: boolean;
  includePiiInSheet: boolean;
  lastSyncedAt?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface SyncQueueItem {
  id_rt: string;
  status: 'pending' | 'synced' | 'error';
  attempts: number;
  lastError?: string;
  lastSyncedAt?: string;
  updatedAt: string;
}

export type AppSyncStatus =
  | 'saving'
  | 'saved_local'
  | 'submitted'
  | 'syncing_gdrive'
  | 'synced_gdrive'
  | 'queued_gdrive';
