import {
  getGDriveSyncConfig,
  getHouseholdById,
  getSurveyAndPii,
  listSyncQueue,
  listVisits,
  markSyncError,
  markSyncSuccess,
  saveGDriveSyncConfig,
} from './idb';
import { upsertSingleAssessmentToAppsScript } from './sheetsSync';

let activeFlushPromise: Promise<{ synced: number; failed: number; remaining: number }> | null =
  null;

export type SyncSingleOutcome = 'synced' | 'queued' | 'skipped' | 'error';

export async function syncSingleAssessment(id_rt: string): Promise<SyncSingleOutcome> {
  const cfg = await getGDriveSyncConfig();
  const scriptUrl = cfg.appsScriptUrl.trim();
  if (!cfg.autoSyncEnabled || !scriptUrl) {
    return 'skipped';
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'queued';
  }

  const household = await getHouseholdById(id_rt);
  if (!household) {
    return 'skipped';
  }

  const [{ survey, pii }, visits] = await Promise.all([
    getSurveyAndPii(id_rt),
    listVisits(id_rt),
  ]);

  try {
    await upsertSingleAssessmentToAppsScript({
      appsScriptUrl: scriptUrl,
      household,
      survey,
      pii,
      visits,
      includeRawPii: cfg.includePiiInSheet,
    });
    await markSyncSuccess(id_rt);
    await saveGDriveSyncConfig({ lastSyncedAt: new Date().toISOString() }, cfg.updatedBy);
    return 'synced';
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal mengirim ke Google Sheets.';
    await markSyncError(id_rt, msg);
    return 'error';
  }
}

export async function flushSyncQueue(): Promise<{
  synced: number;
  failed: number;
  remaining: number;
}> {
  if (activeFlushPromise) {
    return activeFlushPromise;
  }

  activeFlushPromise = (async () => {
    const cfg = await getGDriveSyncConfig();
    const queue = await listSyncQueue();
    const targets = queue.filter(
      (item) => item.status === 'pending' || item.status === 'error'
    );

    const scriptUrl = cfg.appsScriptUrl.trim();
    if (
      targets.length === 0 ||
      !cfg.autoSyncEnabled ||
      !scriptUrl ||
      (typeof navigator !== 'undefined' && !navigator.onLine)
    ) {
      return { synced: 0, failed: 0, remaining: targets.length };
    }

    let synced = 0;
    let failed = 0;

    for (const item of targets) {
      const outcome = await syncSingleAssessment(item.id_rt);
      if (outcome === 'synced') synced += 1;
      else if (outcome === 'error') failed += 1;
    }

    const updatedQueue = await listSyncQueue();
    const remaining = updatedQueue.filter(
      (item) => item.status === 'pending' || item.status === 'error'
    ).length;

    return { synced, failed, remaining };
  })();

  try {
    return await activeFlushPromise;
  } finally {
    activeFlushPromise = null;
  }
}

export async function getPendingSyncCount(): Promise<number> {
  const queue = await listSyncQueue();
  return queue.filter((item) => item.status === 'pending' || item.status === 'error').length;
}
