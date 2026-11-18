import {
  BOOTSTRAP_ADMIN_EMAIL,
  DEFAULT_RW_MAPPINGS,
  MODUL_A_QUESTIONS,
  MODUL_B_QUESTIONS,
  MODUL_C_QUESTIONS,
} from '../data/instrument';
import type {
  DusunCode,
  GDriveSyncConfig,
  HouseholdRecord,
  HouseholdSource,
  PhotoRecord,
  PiiRecord,
  RegistryStatus,
  StaffMember,
  SurveyResponseRecord,
  SyncQueueItem,
  TerritoryConfig,
  TerritoryRwMapping,
  VerificationStatus,
  VisitRecord,
} from '../types/census';
import { pruneHiddenFields } from './xlsform';

const DB_NAME = 'cbw_sensus_2026_db';
const DB_VERSION = 2;

const STORES = {
  config: 'config',
  staff: 'staff',
  rt_counters: 'rt_counters',
  households: 'households',
  surveys: 'surveys',
  pii: 'pii',
  visits: 'visits',
  photos: 'photos',
  sync_queue: 'sync_queue',
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.config)) {
        db.createObjectStore(STORES.config, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.staff)) {
        db.createObjectStore(STORES.staff, { keyPath: 'email' });
      }
      if (!db.objectStoreNames.contains(STORES.rt_counters)) {
        db.createObjectStore(STORES.rt_counters, { keyPath: 'rtKey' });
      }
      if (!db.objectStoreNames.contains(STORES.households)) {
        const hs = db.createObjectStore(STORES.households, { keyPath: 'id_rt' });
        hs.createIndex('rt_key', 'rt_key', { unique: false });
        hs.createIndex('dusun', 'dusun', { unique: false });
        hs.createIndex('status_pencacahan', 'status_pencacahan', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.surveys)) {
        db.createObjectStore(STORES.surveys, { keyPath: 'id_rt' });
      }
      if (!db.objectStoreNames.contains(STORES.pii)) {
        db.createObjectStore(STORES.pii, { keyPath: 'id_rt' });
      }
      if (!db.objectStoreNames.contains(STORES.visits)) {
        const vs = db.createObjectStore(STORES.visits, { keyPath: 'id' });
        vs.createIndex('id_rt', 'id_rt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.photos)) {
        db.createObjectStore(STORES.photos, { keyPath: 'id_rt' });
      }
      if (!db.objectStoreNames.contains(STORES.sync_queue)) {
        db.createObjectStore(STORES.sync_queue, { keyPath: 'id_rt' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function initializeLocalDatabase(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([STORES.config, STORES.staff], 'readwrite');
  const configStore = tx.objectStore(STORES.config);
  const staffStore = tx.objectStore(STORES.staff);

  const existingTerritory = await reqToPromise(configStore.get('territory'));
  if (!existingTerritory) {
    const initialTerritory: TerritoryConfig = {
      id: 'territory',
      mappings: DEFAULT_RW_MAPPINGS,
      updatedAt: new Date().toISOString(),
      updatedBy: BOOTSTRAP_ADMIN_EMAIL,
    };
    configStore.put(initialTerritory);
  }

  const adminEmail = BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
  const existingAdmin = await reqToPromise(staffStore.get(adminEmail));
  if (!existingAdmin) {
    const now = new Date().toISOString();
    const adminStaff: StaffMember = {
      email: adminEmail,
      nama: "Koordinator I'ComDev (Admin)",
      peran: 'admin',
      rt_tugas: [],
      aktif: true,
      createdAt: now,
      updatedAt: now,
    };
    staffStore.put(adminStaff);
  }

  await txDone(tx);
}

export async function getTerritoryConfig(): Promise<TerritoryConfig> {
  const db = await openDb();
  const tx = db.transaction(STORES.config, 'readonly');
  const data = (await reqToPromise(tx.objectStore(STORES.config).get('territory'))) as
    | TerritoryConfig
    | undefined;
  return (
    data ?? {
      id: 'territory',
      mappings: DEFAULT_RW_MAPPINGS,
      updatedAt: new Date().toISOString(),
      updatedBy: BOOTSTRAP_ADMIN_EMAIL,
    }
  );
}

export async function saveTerritoryMappings(
  mappings: TerritoryRwMapping[],
  updatedBy: string
): Promise<TerritoryConfig> {
  const db = await openDb();
  const tx = db.transaction(STORES.config, 'readwrite');
  const next: TerritoryConfig = {
    id: 'territory',
    mappings,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  tx.objectStore(STORES.config).put(next);
  await txDone(tx);
  return next;
}

export const DEFAULT_GDRIVE_SYNC_CONFIG: GDriveSyncConfig = {
  id: 'gdrive_sync',
  spreadsheetId: '',
  spreadsheetUrl: '',
  spreadsheetTitle: '',
  appsScriptUrl: '',
  autoSyncEnabled: true,
  includePiiInSheet: false,
  updatedAt: new Date().toISOString(),
  updatedBy: BOOTSTRAP_ADMIN_EMAIL,
};

export async function getGDriveSyncConfig(): Promise<GDriveSyncConfig> {
  const db = await openDb();
  const tx = db.transaction(STORES.config, 'readonly');
  const data = (await reqToPromise(tx.objectStore(STORES.config).get('gdrive_sync'))) as
    | GDriveSyncConfig
    | undefined;
  return data ?? { ...DEFAULT_GDRIVE_SYNC_CONFIG };
}

export async function saveGDriveSyncConfig(
  partial: Partial<Omit<GDriveSyncConfig, 'id'>>,
  updatedBy: string
): Promise<GDriveSyncConfig> {
  const current = await getGDriveSyncConfig();
  const db = await openDb();
  const tx = db.transaction(STORES.config, 'readwrite');
  const next: GDriveSyncConfig = {
    ...current,
    ...partial,
    id: 'gdrive_sync',
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  tx.objectStore(STORES.config).put(next);
  await txDone(tx);
  return next;
}

export async function getStaffByEmail(email: string): Promise<StaffMember | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const db = await openDb();
  const tx = db.transaction(STORES.staff, 'readonly');
  const found = (await reqToPromise(tx.objectStore(STORES.staff).get(normalized))) as
    | StaffMember
    | undefined;
  return found ?? null;
}

export async function listStaff(): Promise<StaffMember[]> {
  const db = await openDb();
  const tx = db.transaction(STORES.staff, 'readonly');
  const all = (await reqToPromise(tx.objectStore(STORES.staff).getAll())) as StaffMember[];
  return all.sort((a, b) => a.email.localeCompare(b.email));
}

export async function upsertStaff(member: StaffMember): Promise<void> {
  const normalized: StaffMember = {
    ...member,
    email: member.email.trim().toLowerCase(),
    updatedAt: new Date().toISOString(),
  };
  const db = await openDb();
  const tx = db.transaction(STORES.staff, 'readwrite');
  tx.objectStore(STORES.staff).put(normalized);
  await txDone(tx);
}

export async function deleteStaff(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (normalized === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
    throw new Error('Admin utama sistem tidak dapat dihapus.');
  }
  const db = await openDb();
  const tx = db.transaction(STORES.staff, 'readwrite');
  tx.objectStore(STORES.staff).delete(normalized);
  await txDone(tx);
}

export function makeRtKey(dusun: DusunCode, rw: string, rt: string): string {
  const rw2 = rw.padStart(2, '0');
  const rt2 = rt.padStart(2, '0');
  return `${dusun}-${rw2}-${rt2}`;
}

export async function createHouseholdAtomic(input: {
  dusun: DusunCode;
  rw: string;
  rt: string;
  no_bangunan: string;
  nama_kk: string;
  alamat: string;
  sumber: HouseholdSource;
  createdBy: string;
}): Promise<HouseholdRecord> {
  const db = await openDb();
  const tx = db.transaction(
    [STORES.rt_counters, STORES.households, STORES.sync_queue],
    'readwrite'
  );
  const counterStore = tx.objectStore(STORES.rt_counters);
  const hhStore = tx.objectStore(STORES.households);
  const queueStore = tx.objectStore(STORES.sync_queue);

  const rw2 = input.rw.padStart(2, '0');
  const rt2 = input.rt.padStart(2, '0');
  const rt_key = `${input.dusun}-${rw2}-${rt2}`;
  const counterKey = `${input.dusun}_${rw2}_${rt2}`;

  const currentCounter = (await reqToPromise(counterStore.get(counterKey))) as
    | { rtKey: string; lastSeq: number }
    | undefined;
  const nextSeq = (currentCounter?.lastSeq ?? 0) + 1;
  counterStore.put({ rtKey: counterKey, lastSeq: nextSeq });

  const seq3 = String(nextSeq).padStart(3, '0');
  const id_rt = `CBW-${input.dusun}-${rw2}-${rt2}-${seq3}`;
  const now = new Date().toISOString();

  const record: HouseholdRecord = {
    id_rt,
    dusun: input.dusun,
    rw: rw2,
    rt: rt2,
    rt_key,
    no_bangunan: input.no_bangunan.trim().toUpperCase(),
    nama_kk: input.nama_kk.trim(),
    alamat: input.alamat.trim(),
    sumber: input.sumber,
    status_pencacahan: 'belum_dikunjungi',
    status_daftar: 'aktif',
    status_verifikasi: 'menunggu',
    createdAt: now,
    createdBy: input.createdBy,
    updatedAt: now,
  };

  hhStore.add(record);
  queueStore.put({
    id_rt,
    status: 'pending',
    attempts: 0,
    updatedAt: now,
  } satisfies SyncQueueItem);

  await txDone(tx);
  return record;
}

export async function importHouseholdsAtomic(
  rows: Array<{
    dusun: DusunCode;
    rw: string;
    rt: string;
    no_bangunan: string;
    nama_kk: string;
    alamat: string;
    sumber: HouseholdSource;
  }>,
  createdBy: string
): Promise<HouseholdRecord[]> {
  const db = await openDb();
  const tx = db.transaction(
    [STORES.rt_counters, STORES.households, STORES.sync_queue],
    'readwrite'
  );
  const counterStore = tx.objectStore(STORES.rt_counters);
  const hhStore = tx.objectStore(STORES.households);
  const queueStore = tx.objectStore(STORES.sync_queue);

  const seqCache: Record<string, number> = {};
  const created: HouseholdRecord[] = [];
  const now = new Date().toISOString();

  for (const row of rows) {
    const rw2 = row.rw.padStart(2, '0');
    const rt2 = row.rt.padStart(2, '0');
    const rt_key = `${row.dusun}-${rw2}-${rt2}`;
    const counterKey = `${row.dusun}_${rw2}_${rt2}`;

    if (seqCache[counterKey] === undefined) {
      const existing = (await reqToPromise(counterStore.get(counterKey))) as
        | { rtKey: string; lastSeq: number }
        | undefined;
      seqCache[counterKey] = existing?.lastSeq ?? 0;
    }

    seqCache[counterKey] += 1;
    const seq3 = String(seqCache[counterKey]).padStart(3, '0');
    const id_rt = `CBW-${row.dusun}-${rw2}-${rt2}-${seq3}`;

    const record: HouseholdRecord = {
      id_rt,
      dusun: row.dusun,
      rw: rw2,
      rt: rt2,
      rt_key,
      no_bangunan: row.no_bangunan.trim().toUpperCase(),
      nama_kk: row.nama_kk.trim(),
      alamat: row.alamat.trim(),
      sumber: row.sumber,
      status_pencacahan: 'belum_dikunjungi',
      status_daftar: 'aktif',
      status_verifikasi: 'menunggu',
      createdAt: now,
      createdBy,
      updatedAt: now,
    };

    hhStore.add(record);
    queueStore.put({
      id_rt,
      status: 'pending',
      attempts: 0,
      updatedAt: now,
    } satisfies SyncQueueItem);
    created.push(record);
  }

  for (const [counterKey, lastSeq] of Object.entries(seqCache)) {
    counterStore.put({ rtKey: counterKey, lastSeq });
  }

  await txDone(tx);
  return created;
}

export async function listHouseholds(allowedRtKeys?: string[]): Promise<HouseholdRecord[]> {
  const db = await openDb();
  const tx = db.transaction(STORES.households, 'readonly');
  const all = (await reqToPromise(tx.objectStore(STORES.households).getAll())) as HouseholdRecord[];
  const filtered = allowedRtKeys
    ? all.filter((h) => allowedRtKeys.includes(h.rt_key))
    : all;
  return filtered.sort((a, b) => a.id_rt.localeCompare(b.id_rt));
}

export async function getHouseholdById(id_rt: string): Promise<HouseholdRecord | null> {
  const db = await openDb();
  const tx = db.transaction(STORES.households, 'readonly');
  const found = (await reqToPromise(tx.objectStore(STORES.households).get(id_rt))) as
    | HouseholdRecord
    | undefined;
  return found ?? null;
}

export async function updateHouseholdRegistryStatus(
  id_rt: string,
  status_daftar: RegistryStatus,
  catatan_daftar: string
): Promise<HouseholdRecord> {
  const db = await openDb();
  const tx = db.transaction([STORES.households, STORES.sync_queue], 'readwrite');
  const store = tx.objectStore(STORES.households);
  const existing = (await reqToPromise(store.get(id_rt))) as HouseholdRecord | undefined;
  if (!existing) throw new Error('Rumah tangga tidak ditemukan.');

  const now = new Date().toISOString();
  const updated: HouseholdRecord = {
    ...existing,
    status_daftar,
    catatan_daftar: catatan_daftar.trim(),
    updatedAt: now,
  };
  store.put(updated);
  tx.objectStore(STORES.sync_queue).put({
    id_rt,
    status: 'pending',
    attempts: 0,
    updatedAt: now,
  } satisfies SyncQueueItem);
  await txDone(tx);
  return updated;
}

export async function updateHouseholdVerification(
  id_rt: string,
  status_verifikasi: VerificationStatus,
  catatan_pengawas: string,
  verifiedBy: string
): Promise<HouseholdRecord> {
  const db = await openDb();
  const tx = db.transaction([STORES.households, STORES.sync_queue], 'readwrite');
  const store = tx.objectStore(STORES.households);
  const existing = (await reqToPromise(store.get(id_rt))) as HouseholdRecord | undefined;
  if (!existing) throw new Error('Rumah tangga tidak ditemukan.');

  const now = new Date().toISOString();
  const updated: HouseholdRecord = {
    ...existing,
    status_verifikasi,
    catatan_pengawas: catatan_pengawas.trim(),
    verifiedBy,
    verifiedAt: now,
    updatedAt: now,
  };
  store.put(updated);
  tx.objectStore(STORES.sync_queue).put({
    id_rt,
    status: 'pending',
    attempts: 0,
    updatedAt: now,
  } satisfies SyncQueueItem);
  await txDone(tx);
  return updated;
}

export async function getSurveyAndPii(id_rt: string): Promise<{
  survey: SurveyResponseRecord | null;
  pii: PiiRecord | null;
}> {
  const db = await openDb();
  const tx = db.transaction([STORES.surveys, STORES.pii], 'readonly');
  const survey = (await reqToPromise(tx.objectStore(STORES.surveys).get(id_rt))) as
    | SurveyResponseRecord
    | undefined;
  const pii = (await reqToPromise(tx.objectStore(STORES.pii).get(id_rt))) as
    | PiiRecord
    | undefined;
  return { survey: survey ?? null, pii: pii ?? null };
}

export async function saveSurveyDraft(
  survey: SurveyResponseRecord,
  pii: PiiRecord
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([STORES.surveys, STORES.pii, STORES.households], 'readwrite');
  const now = new Date().toISOString();

  const sanitizedSurvey: SurveyResponseRecord = {
    ...survey,
    modulA: pruneHiddenFields(MODUL_A_QUESTIONS, survey.modulA) as SurveyResponseRecord['modulA'],
    modulB: survey.modulB.map((m) => pruneHiddenFields(MODUL_B_QUESTIONS, m) as SurveyResponseRecord['modulB'][number]),
    modulC: pruneHiddenFields(MODUL_C_QUESTIONS, survey.modulC) as SurveyResponseRecord['modulC'],
    updatedAt: now,
  };

  tx.objectStore(STORES.surveys).put(sanitizedSurvey);
  tx.objectStore(STORES.pii).put({ ...pii, updatedAt: now });

  const hhStore = tx.objectStore(STORES.households);
  const hh = (await reqToPromise(hhStore.get(survey.id_rt))) as HouseholdRecord | undefined;
  if (hh && (hh.status_pencacahan === 'belum_dikunjungi' || hh.status_pencacahan === 'draf')) {
    hhStore.put({
      ...hh,
      status_pencacahan: 'draf',
      koordinat_terakhir: survey.modul0.lokasi ?? hh.koordinat_terakhir,
      updatedAt: now,
    });
  }

  await txDone(tx);
}

export async function submitVisitAndSurvey(
  survey: SurveyResponseRecord,
  pii: PiiRecord
): Promise<{ household: HouseholdRecord; visit: VisitRecord }> {
  const db = await openDb();
  const tx = db.transaction(
    [STORES.surveys, STORES.pii, STORES.households, STORES.visits, STORES.sync_queue],
    'readwrite'
  );
  const now = new Date().toISOString();

  const hhStore = tx.objectStore(STORES.households);
  const hh = (await reqToPromise(hhStore.get(survey.id_rt))) as HouseholdRecord | undefined;
  if (!hh) throw new Error('Rumah tangga tidak ditemukan.');

  const sk = survey.modul0.status_kunjungan || 'ditemui';
  const consented = sk === 'ditemui' && survey.modul0.persetujuan === 'ya';

  let nextStatus: HouseholdRecord['status_pencacahan'] = 'draf';
  if (sk === 'tidak_ditemui') nextStatus = 'tidak_ditemui';
  else if (sk === 'rumah_kosong') nextStatus = 'rumah_kosong';
  else if (survey.modul0.persetujuan === 'tidak') nextStatus = 'menolak';
  else if (consented) nextStatus = 'tercacah';

  const sanitizedSurvey: SurveyResponseRecord = {
    ...survey,
    modulA: consented
      ? (pruneHiddenFields(MODUL_A_QUESTIONS, survey.modulA) as SurveyResponseRecord['modulA'])
      : {},
    modulB: consented
      ? survey.modulB.map(
          (m) => pruneHiddenFields(MODUL_B_QUESTIONS, m) as SurveyResponseRecord['modulB'][number]
        )
      : [],
    modulC: consented
      ? (pruneHiddenFields(MODUL_C_QUESTIONS, survey.modulC) as SurveyResponseRecord['modulC'])
      : {},
    submittedAt: now,
    updatedAt: now,
  };

  tx.objectStore(STORES.surveys).put(sanitizedSurvey);
  tx.objectStore(STORES.pii).put({ ...pii, updatedAt: now });

  const visit: VisitRecord = {
    id: `VIS-${survey.id_rt}-${Date.now()}`,
    id_rt: survey.id_rt,
    rt_key: hh.rt_key,
    status_kunjungan: sk,
    kunjungan_ke: sk === 'tidak_ditemui' ? survey.modul0.kunjungan_ke : undefined,
    persetujuan: sk === 'ditemui' ? survey.modul0.persetujuan : undefined,
    persetujuan_waktu: survey.modul0.persetujuan_waktu,
    lokasi: survey.modul0.lokasi!,
    enumeratorEmail: survey.enumeratorEmail,
    catatan: String(survey.modulC.catatan_enumerator || ''),
    createdAt: now,
  };
  tx.objectStore(STORES.visits).put(visit);

  const updatedHousehold: HouseholdRecord = {
    ...hh,
    nama_kk:
      consented && typeof sanitizedSurvey.modulA.nama_kk === 'string' && sanitizedSurvey.modulA.nama_kk.trim()
        ? sanitizedSurvey.modulA.nama_kk.trim()
        : hh.nama_kk,
    status_pencacahan: nextStatus,
    status_verifikasi:
      hh.status_verifikasi === 'dikembalikan' && nextStatus === 'tercacah'
        ? 'menunggu'
        : hh.status_verifikasi,
    koordinat_terakhir: survey.modul0.lokasi ?? hh.koordinat_terakhir,
    updatedAt: now,
  };
  hhStore.put(updatedHousehold);
  tx.objectStore(STORES.sync_queue).put({
    id_rt: survey.id_rt,
    status: 'pending',
    attempts: 0,
    updatedAt: now,
  } satisfies SyncQueueItem);

  await txDone(tx);
  return { household: updatedHousehold, visit };
}

export async function enqueueAssessmentSync(id_rt: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORES.sync_queue, 'readwrite');
  const now = new Date().toISOString();
  tx.objectStore(STORES.sync_queue).put({
    id_rt,
    status: 'pending',
    attempts: 0,
    updatedAt: now,
  } satisfies SyncQueueItem);
  await txDone(tx);
}

export async function enqueueAllHouseholdsForSync(): Promise<number> {
  const db = await openDb();
  const tx = db.transaction([STORES.households, STORES.sync_queue], 'readwrite');
  const households = (await reqToPromise(
    tx.objectStore(STORES.households).getAll()
  )) as HouseholdRecord[];
  const queueStore = tx.objectStore(STORES.sync_queue);
  const now = new Date().toISOString();
  for (const h of households) {
    queueStore.put({
      id_rt: h.id_rt,
      status: 'pending',
      attempts: 0,
      updatedAt: now,
    } satisfies SyncQueueItem);
  }
  await txDone(tx);
  return households.length;
}

export async function listSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await openDb();
  const tx = db.transaction(STORES.sync_queue, 'readonly');
  const all = (await reqToPromise(tx.objectStore(STORES.sync_queue).getAll())) as SyncQueueItem[];
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function markSyncSuccess(id_rt: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORES.sync_queue, 'readwrite');
  const store = tx.objectStore(STORES.sync_queue);
  const existing = (await reqToPromise(store.get(id_rt))) as SyncQueueItem | undefined;
  const now = new Date().toISOString();
  store.put({
    id_rt,
    status: 'synced',
    attempts: (existing?.attempts ?? 0) + 1,
    lastSyncedAt: now,
    updatedAt: now,
  } satisfies SyncQueueItem);
  await txDone(tx);
}

export async function markSyncError(id_rt: string, errMsg: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORES.sync_queue, 'readwrite');
  const store = tx.objectStore(STORES.sync_queue);
  const existing = (await reqToPromise(store.get(id_rt))) as SyncQueueItem | undefined;
  const now = new Date().toISOString();
  store.put({
    id_rt,
    status: 'error',
    attempts: (existing?.attempts ?? 0) + 1,
    lastError: errMsg,
    lastSyncedAt: existing?.lastSyncedAt,
    updatedAt: now,
  } satisfies SyncQueueItem);
  await txDone(tx);
}

export async function markAllSyncQueueSynced(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([STORES.households, STORES.sync_queue], 'readwrite');
  const households = (await reqToPromise(
    tx.objectStore(STORES.households).getAll()
  )) as HouseholdRecord[];
  const queueStore = tx.objectStore(STORES.sync_queue);
  const now = new Date().toISOString();
  for (const h of households) {
    queueStore.put({
      id_rt: h.id_rt,
      status: 'synced',
      attempts: 1,
      lastSyncedAt: now,
      updatedAt: now,
    } satisfies SyncQueueItem);
  }
  await txDone(tx);
}

export async function listVisits(id_rt?: string): Promise<VisitRecord[]> {
  const db = await openDb();
  const tx = db.transaction(STORES.visits, 'readonly');
  const all = (await reqToPromise(tx.objectStore(STORES.visits).getAll())) as VisitRecord[];
  const filtered = id_rt ? all.filter((v) => v.id_rt === id_rt) : all;
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listAllSurveys(): Promise<SurveyResponseRecord[]> {
  const db = await openDb();
  const tx = db.transaction(STORES.surveys, 'readonly');
  return (await reqToPromise(tx.objectStore(STORES.surveys).getAll())) as SurveyResponseRecord[];
}

export async function listAllPii(): Promise<PiiRecord[]> {
  const db = await openDb();
  const tx = db.transaction(STORES.pii, 'readonly');
  return (await reqToPromise(tx.objectStore(STORES.pii).getAll())) as PiiRecord[];
}

async function compressImageTo1024(file: File): Promise<{
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}> {
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
      el.src = bitmapUrl;
    });

    const maxSide = 1024;
    let targetW = img.naturalWidth || img.width;
    let targetH = img.naturalHeight || img.height;
    if (targetW > maxSide || targetH > maxSide) {
      if (targetW >= targetH) {
        targetH = Math.round((targetH * maxSide) / targetW);
        targetW = maxSide;
      } else {
        targetW = Math.round((targetW * maxSide) / targetH);
        targetH = maxSide;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas tidak tersedia pada perangkat.');
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
    const sizeBytes = Math.round((dataUrl.length * 3) / 4);
    return { dataUrl, width: targetW, height: targetH, sizeBytes };
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

export async function saveLocalPhoto(id_rt: string, file: File): Promise<PhotoRecord> {
  const compressed = await compressImageTo1024(file);
  const record: PhotoRecord = {
    id_rt,
    ...compressed,
    updatedAt: new Date().toISOString(),
  };
  const db = await openDb();
  const tx = db.transaction(STORES.photos, 'readwrite');
  tx.objectStore(STORES.photos).put(record);
  await txDone(tx);
  return record;
}

export async function getLocalPhoto(id_rt: string): Promise<PhotoRecord | null> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORES.photos, 'readonly');
    const found = (await reqToPromise(tx.objectStore(STORES.photos).get(id_rt))) as
      | PhotoRecord
      | undefined;
    return found ?? null;
  } catch {
    return null;
  }
}

export async function deleteLocalPhoto(id_rt: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORES.photos, 'readwrite');
  tx.objectStore(STORES.photos).delete(id_rt);
  await txDone(tx);
}

export async function exportFullBackupJson(): Promise<string> {
  const db = await openDb();
  const tx = db.transaction(
    [
      STORES.config,
      STORES.staff,
      STORES.rt_counters,
      STORES.households,
      STORES.surveys,
      STORES.pii,
      STORES.visits,
    ],
    'readonly'
  );
  const payload = {
    app: 'cbw-sensus-2026',
    exportedAt: new Date().toISOString(),
    config: await reqToPromise(tx.objectStore(STORES.config).getAll()),
    staff: await reqToPromise(tx.objectStore(STORES.staff).getAll()),
    rt_counters: await reqToPromise(tx.objectStore(STORES.rt_counters).getAll()),
    households: await reqToPromise(tx.objectStore(STORES.households).getAll()),
    surveys: await reqToPromise(tx.objectStore(STORES.surveys).getAll()),
    pii: await reqToPromise(tx.objectStore(STORES.pii).getAll()),
    visits: await reqToPromise(tx.objectStore(STORES.visits).getAll()),
  };
  return JSON.stringify(payload, null, 2);
}

export async function importFullBackupJson(rawJson: string): Promise<{
  households: number;
  surveys: number;
  visits: number;
}> {
  const parsed = JSON.parse(rawJson);
  if (parsed?.app !== 'cbw-sensus-2026') {
    throw new Error('Format berkas cadangan tidak valid untuk Sensus CBW 2026.');
  }
  const db = await openDb();
  const tx = db.transaction(
    [
      STORES.config,
      STORES.staff,
      STORES.rt_counters,
      STORES.households,
      STORES.surveys,
      STORES.pii,
      STORES.visits,
    ],
    'readwrite'
  );

  for (const item of parsed.config || []) tx.objectStore(STORES.config).put(item);
  for (const item of parsed.staff || []) tx.objectStore(STORES.staff).put(item);
  for (const item of parsed.rt_counters || []) {
    const existing = (await reqToPromise(tx.objectStore(STORES.rt_counters).get(item.rtKey))) as
      | { rtKey: string; lastSeq: number }
      | undefined;
    const maxSeq = Math.max(existing?.lastSeq ?? 0, Number(item.lastSeq ?? 0));
    tx.objectStore(STORES.rt_counters).put({ rtKey: item.rtKey, lastSeq: maxSeq });
  }
  for (const item of parsed.households || []) tx.objectStore(STORES.households).put(item);
  for (const item of parsed.surveys || []) tx.objectStore(STORES.surveys).put(item);
  for (const item of parsed.pii || []) tx.objectStore(STORES.pii).put(item);
  for (const item of parsed.visits || []) tx.objectStore(STORES.visits).put(item);

  await txDone(tx);
  return {
    households: (parsed.households || []).length,
    surveys: (parsed.surveys || []).length,
    visits: (parsed.visits || []).length,
  };
}
