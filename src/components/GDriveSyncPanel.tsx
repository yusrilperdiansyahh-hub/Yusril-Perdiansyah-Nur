import React, { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CloudUpload,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Link2,
  Lock,
  LogOut,
  RefreshCw,
  Send,
  Share2,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import {
  getGoogleAccessToken,
  googleWorkspaceSignIn,
  googleWorkspaceSignOut,
  initGoogleAuth,
} from '../lib/googleAuth';
import {
  buildEnumeratorConfigBundle,
  buildEnumeratorSetupUrl,
} from '../lib/configShare';
import {
  enqueueAllHouseholdsForSync,
  getGDriveSyncConfig,
  listAllPii,
  listAllSurveys,
  listSyncQueue,
  listVisits,
  markAllSyncQueueSynced,
  saveGDriveSyncConfig,
} from '../lib/idb';
import {
  APPS_SCRIPT_CODE,
  createCensusSpreadsheet,
  extractSpreadsheetIdFromInput,
  syncAllToGoogleSheets,
  syncAllViaAppsScript,
  testAppsScriptConnection,
} from '../lib/sheetsSync';
import { flushSyncQueue } from '../lib/syncManager';
import type {
  GDriveSyncConfig,
  HouseholdRecord,
  StaffMember,
  SyncQueueItem,
} from '../types/census';
import { GoogleSignInButton } from './GoogleSignInButton';

interface GDriveSyncPanelProps {
  user: StaffMember;
  households: HouseholdRecord[];
  onRefresh: () => Promise<void>;
  onQueueChanged?: () => Promise<void>;
}

export const GDriveSyncPanel: React.FC<GDriveSyncPanelProps> = ({
  user,
  households,
  onRefresh,
  onQueueChanged,
}) => {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [config, setConfig] = useState<GDriveSyncConfig | null>(null);
  const [sheetInput, setSheetInput] = useState('');
  const [appsScriptInput, setAppsScriptInput] = useState('');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [includePiiInSheet, setIncludePiiInSheet] = useState(false);

  const [queue, setQueue] = useState<SyncQueueItem[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [copiedConfigText, setCopiedConfigText] = useState(false);
  const [confirmSyncMode, setConfirmSyncMode] = useState<'apps_script' | 'oauth' | null>(
    null
  );
  const [syncStats, setSyncStats] = useState<{
    households: number;
    surveys: number;
    visits: number;
  } | null>(null);

  const loadState = useCallback(async () => {
    const [cfg, q] = await Promise.all([getGDriveSyncConfig(), listSyncQueue()]);
    setConfig(cfg);
    setSheetInput(cfg.spreadsheetUrl || cfg.spreadsheetId || '');
    setAppsScriptInput(cfg.appsScriptUrl || '');
    setAutoSyncEnabled(cfg.autoSyncEnabled);
    setIncludePiiInSheet(cfg.includePiiInSheet);
    setQueue(q);
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    const unsub = initGoogleAuth(
      (u, token) => {
        setGoogleUser(u);
        setHasToken(Boolean(token));
      },
      () => {
        setGoogleUser(null);
        setHasToken(false);
      }
    );
    return () => unsub();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setAuthBusy(true);
      setAuthError(null);
      const { user: gUser, accessToken } = await googleWorkspaceSignIn();
      setGoogleUser(gUser);
      setHasToken(Boolean(accessToken));
      setFeedback({
        type: 'success',
        text: `Berhasil terhubung ke Google Drive sebagai ${gUser.email || gUser.displayName}.`,
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal masuk dengan akun Google Workspace.';
      setAuthError(
        `${msg} Jika muncul "Akses diblokir: ... belum menyelesaikan proses verifikasi Google", gunakan Bagian 1 (Apps Script Web App) di atas — langsung terhubung ke Google Drive Spreadsheet Admin tanpa verifikasi Google Cloud.`
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await googleWorkspaceSignOut();
    setGoogleUser(null);
    setHasToken(false);
    setFeedback({ type: 'info', text: 'Sesi Google Drive Admin telah diputus.' });
  };

  const handleCreateSpreadsheet = async () => {
    const token = getGoogleAccessToken();
    if (!token) {
      setAuthError('Silakan hubungkan akun Google Drive Admin terlebih dahulu.');
      return;
    }
    try {
      setBusyAction('create_sheet');
      setFeedback(null);
      const created = await createCensusSpreadsheet(token);
      await saveGDriveSyncConfig(
        {
          spreadsheetId: created.spreadsheetId,
          spreadsheetUrl: created.spreadsheetUrl,
          spreadsheetTitle: created.title,
        },
        user.email
      );
      await loadState();
      setFeedback({
        type: 'success',
        text: `Spreadsheet baru berhasil dibuat di Google Drive Anda: "${created.title}".`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal membuat spreadsheet baru.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveSheetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const extractedId = extractSpreadsheetIdFromInput(sheetInput);
    if (!extractedId) {
      setFeedback({
        type: 'error',
        text: 'Masukkan URL atau ID Google Spreadsheet yang valid.',
      });
      return;
    }
    const url = sheetInput.includes('docs.google.com')
      ? sheetInput.trim()
      : `https://docs.google.com/spreadsheets/d/${extractedId}/edit`;
    await saveGDriveSyncConfig(
      {
        spreadsheetId: extractedId,
        spreadsheetUrl: url,
      },
      user.email
    );
    await loadState();
    setFeedback({
      type: 'success',
      text: `Spreadsheet (${extractedId}) berhasil ditautkan.`,
    });
  };

  const handleOpenConfirmFullSync = async (mode: 'apps_script' | 'oauth') => {
    if (mode === 'oauth') {
      const token = getGoogleAccessToken();
      if (!token) {
        setAuthError('Silakan masuk dengan akun Google Drive Admin terlebih dahulu.');
        return;
      }
      if (!config?.spreadsheetId) {
        setFeedback({
          type: 'error',
          text: 'Buat spreadsheet baru atau tautkan URL Spreadsheet terlebih dahulu.',
        });
        return;
      }
    } else {
      if (!appsScriptInput.trim()) {
        setFeedback({
          type: 'error',
          text: 'Isi dan simpan URL Web App Apps Script terlebih dahulu.',
        });
        return;
      }
    }

    const [surveys, visits] = await Promise.all([listAllSurveys(), listVisits()]);
    setSyncStats({
      households: households.length,
      surveys: surveys.length,
      visits: visits.length,
    });
    setConfirmSyncMode(mode);
  };

  const handleExecuteConfirmedSync = async () => {
    const mode = confirmSyncMode;
    if (!mode) return;
    setConfirmSyncMode(null);

    try {
      setBusyAction('full_sync');
      setFeedback(null);
      const [surveys, piiList, visits] = await Promise.all([
        listAllSurveys(),
        listAllPii(),
        listVisits(),
      ]);

      let res: { householdsCount: number; membersCount: number; visitsCount: number };

      if (mode === 'apps_script') {
        await saveGDriveSyncConfig(
          {
            appsScriptUrl: appsScriptInput.trim(),
            autoSyncEnabled,
            includePiiInSheet,
          },
          user.email
        );
        res = await syncAllViaAppsScript({
          appsScriptUrl: appsScriptInput.trim(),
          households,
          surveys,
          piiList,
          visits,
          includeRawPii: includePiiInSheet,
        });
      } else {
        const token = getGoogleAccessToken();
        if (!token || !config?.spreadsheetId) {
          throw new Error('Token OAuth atau ID Spreadsheet belum tersedia.');
        }
        res = await syncAllToGoogleSheets({
          spreadsheetId: config.spreadsheetId,
          accessToken: token,
          households,
          surveys,
          piiList,
          visits,
          includeRawPii: includePiiInSheet,
        });
      }

      await saveGDriveSyncConfig(
        { lastSyncedAt: new Date().toISOString(), includePiiInSheet },
        user.email
      );
      await markAllSyncQueueSynced();
      await loadState();
      if (onQueueChanged) await onQueueChanged();
      await onRefresh();
      setFeedback({
        type: 'success',
        text: `Sinkronisasi penuh berhasil: ${res.householdsCount} rumah tangga, ${res.membersCount} anggota RT, dan ${res.visitsCount} catatan kunjungan tertulis ke Google Spreadsheet Admin.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Gagal menyinkronkan data ke Google Sheets.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveAppsScriptSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const extractedId = sheetInput.trim()
      ? extractSpreadsheetIdFromInput(sheetInput)
      : config?.spreadsheetId || '';
    const sheetUrl = sheetInput.includes('docs.google.com')
      ? sheetInput.trim()
      : extractedId
      ? `https://docs.google.com/spreadsheets/d/${extractedId}/edit`
      : '';

    await saveGDriveSyncConfig(
      {
        spreadsheetId: extractedId,
        spreadsheetUrl: sheetUrl,
        appsScriptUrl: appsScriptInput.trim(),
        autoSyncEnabled,
        includePiiInSheet,
      },
      user.email
    );
    await loadState();
    setFeedback({
      type: 'success',
      text: 'Pengaturan sinkronisasi otomatis Google Spreadsheet tersimpan.',
    });
  };

  const handleTestAppsScript = async () => {
    if (!appsScriptInput.trim()) {
      setFeedback({
        type: 'error',
        text: 'Tempel URL Web App Apps Script terlebih dahulu.',
      });
      return;
    }
    try {
      setBusyAction('test_script');
      setFeedback(null);
      const ping = await testAppsScriptConnection(appsScriptInput.trim());
      await saveGDriveSyncConfig(
        {
          appsScriptUrl: appsScriptInput.trim(),
          autoSyncEnabled,
          includePiiInSheet,
          ...(ping.spreadsheetId ? { spreadsheetId: ping.spreadsheetId } : {}),
          ...(ping.spreadsheetUrl ? { spreadsheetUrl: ping.spreadsheetUrl } : {}),
          ...(ping.spreadsheetName ? { spreadsheetTitle: ping.spreadsheetName } : {}),
        },
        user.email
      );
      await loadState();
      setFeedback({ type: 'success', text: ping.message });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menguji koneksi Apps Script.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleFlushQueue = async () => {
    if (!appsScriptInput.trim()) {
      setFeedback({
        type: 'error',
        text: 'URL Web App Apps Script belum diisi. Simpan URL terlebih dahulu untuk mengirim antrean.',
      });
      return;
    }
    try {
      setBusyAction('flush_queue');
      setFeedback(null);
      await saveGDriveSyncConfig(
        {
          appsScriptUrl: appsScriptInput.trim(),
          autoSyncEnabled: true,
          includePiiInSheet,
        },
        user.email
      );
      const res = await flushSyncQueue();
      await loadState();
      if (onQueueChanged) await onQueueChanged();
      setFeedback({
        type: res.failed > 0 ? 'error' : 'success',
        text: `Pengiriman antrean selesai: ${res.synced} berhasil dikirim ke Spreadsheet, ${res.failed} gagal, ${res.remaining} tersisa.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memproses antrean sinkronisasi.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleEnqueueAll = async () => {
    const total = await enqueueAllHouseholdsForSync();
    await loadState();
    if (onQueueChanged) await onQueueChanged();
    setFeedback({
      type: 'info',
      text: `${total} data rumah tangga ditambahkan ke antrean sinkronisasi.`,
    });
  };

  const handleCopyScript = async () => {
    await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopiedScript(true);
    window.setTimeout(() => setCopiedScript(false), 2500);
  };

  const getCurrentShareOverrides = () => ({
    appsScriptUrl: appsScriptInput.trim() || config?.appsScriptUrl || '',
    autoSyncEnabled,
    includePiiInSheet,
  });

  const handleCopyEnumeratorSetupLink = async () => {
    const overrides = getCurrentShareOverrides();
    if (!overrides.appsScriptUrl) {
      setFeedback({
        type: 'error',
        text: 'Isi dan uji URL Web App Apps Script terlebih dahulu sebelum membagikan Link Setup ke HP enumerator.',
      });
      return;
    }
    const bundle = await buildEnumeratorConfigBundle(overrides);
    const setupUrl = buildEnumeratorSetupUrl(bundle);
    await navigator.clipboard.writeText(setupUrl);
    setCopiedShareLink(true);
    window.setTimeout(() => setCopiedShareLink(false), 3000);
    setFeedback({
      type: 'success',
      text: 'Link Setup Enumerator (kompatibel iPhone Safari & Android Chrome) disalin ke clipboard. Kirim ke WhatsApp petugas — cukup ketuk link, konfigurasi terpasang otomatis tanpa perlu memilih file .json.',
    });
  };

  const handleCopyEnumeratorConfigText = async () => {
    const bundle = await buildEnumeratorConfigBundle(getCurrentShareOverrides());
    await navigator.clipboard.writeText(JSON.stringify(bundle));
    setCopiedConfigText(true);
    window.setTimeout(() => setCopiedConfigText(false), 3000);
    setFeedback({
      type: 'success',
      text: 'Teks konfigurasi disalin. Enumerator (iPhone/Android) dapat menempelkannya lewat tombol "Tempel Link / Teks Konfigurasi" di layar masuk.',
    });
  };

  const handleDownloadEnumeratorConfig = async () => {
    const bundle = await buildEnumeratorConfigBundle(getCurrentShareOverrides());
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `konfigurasi_enumerator_cbw_2026.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFeedback({
      type: 'success',
      text: 'Berkas konfigurasi_enumerator_cbw_2026.json diunduh (tanpa PII responden). Untuk pengguna iPhone, disarankan memakai "Salin Link Setup HP" agar lebih praktis tanpa iOS File Picker.',
    });
  };

  const syncedCount = queue.filter((q) => q.status === 'synced').length;
  const pendingCount = queue.filter((q) => q.status === 'pending').length;
  const errorCount = queue.filter((q) => q.status === 'error').length;

  return (
    <div className="space-y-5">
      {feedback && (
        <div
          className={`flex items-start gap-2.5 rounded-2xl border p-4 text-sm font-semibold ${
            feedback.type === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
              : feedback.type === 'error'
              ? 'border-rose-300 bg-rose-50 text-rose-950'
              : 'border-sky-300 bg-sky-50 text-sky-950'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* BAGIAN 1 (UTAMA & BEBAS BLOKIR VERIFIKASI GOOGLE): APPS SCRIPT WEB APP BRIDGE */}
      <section className="rounded-2xl border-2 border-emerald-600/30 bg-white p-5 space-y-4">
        <div className="space-y-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900 mb-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Jalur Utama · Bebas Blokir Verifikasi Google OAuth</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Send className="h-5 w-5 text-emerald-700" />
              <span>
                1. Hubungkan Spreadsheet Google Drive Admin &amp; Auto-Sync Enumerator
              </span>
            </h3>
            <p className="text-sm text-slate-600 mt-0.5">
              Metode ini langsung menulis data ke Spreadsheet Google Drive milik Admin tanpa
              membutuhkan verifikasi aplikasi Google Cloud (<code className="font-mono text-xs">firebaseapp.com</code>) dan bekerja otomatis dari ponsel Android maupun iPhone enumerator.
            </p>
          </div>

          {/* Kartu Distribusi Konfigurasi Universal (iPhone & Android) */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                <Smartphone className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>Bagikan Konfigurasi ke HP Enumerator (Support iPhone &amp; Android)</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-800">
                Tanpa PII responden · Isi: wilayah, akun petugas, &amp; URL Spreadsheet
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyEnumeratorSetupLink}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-800"
              >
                {copiedShareLink ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Link Setup Disalin</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    <span>Salin Link Setup HP (Disarankan untuk iPhone)</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCopyEnumeratorConfigText}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-emerald-700 bg-white px-3.5 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-50"
              >
                {copiedConfigText ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Teks Disalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Salin Teks Konfigurasi</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownloadEnumeratorConfig}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                <span>Unduh File .json</span>
              </button>
            </div>
            <p className="text-[11px] text-emerald-900 leading-relaxed">
              <strong>Tips iPhone:</strong> Minta enumerator iPhone membuka <strong>Link Setup</strong> langsung di <strong>Safari</strong> (bukan peramban dalam WhatsApp), lalu pilih <strong>Bagikan &rarr; Tambahkan ke Layar Utama</strong> agar data survei luring tetap tersimpan permanen.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Cara Pasang Sekali di Google Spreadsheet Milik Admin
            </span>
            <button
              type="button"
              onClick={handleCopyScript}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-900 hover:bg-slate-100"
            >
              {copiedScript ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Kode Disalin</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Salin Kode Apps Script</span>
                </>
              )}
            </button>
          </div>
          <ol className="list-decimal pl-5 text-xs text-slate-700 space-y-1.5">
            <li>
              Buat atau buka Google Spreadsheet baru di Google Drive Admin (misal nama:{' '}
              <strong>Sensus CBW 2026</strong>).
            </li>
            <li>
              Klik menu <strong>Ekstensi &rarr; Apps Script</strong>, hapus kode bawaan,
              tempel kode di bawah, lalu klik ikon <strong>Simpan</strong>.
            </li>
            <li>
              Klik <strong>Deploy &rarr; New deployment &rarr; Web app</strong>. Atur{' '}
              <em>Execute as: Me</em> dan <em>Who has access: Anyone</em>. Jika muncul
              peringatan Google pada skrip buatan Anda sendiri, klik{' '}
              <strong>Lanjutan (Advanced) &rarr; Buka proyek (tidak aman) &rarr; Izinkan</strong>.
            </li>
            <li>
              Salin URL Web App (<code className="font-mono">https://script.google.com/macros/s/.../exec</code>) ke kolom di bawah lalu klik{' '}
              <strong>Uji Koneksi Apps Script</strong> (tautan Spreadsheet akan terisi otomatis).
            </li>
          </ol>
          <pre className="max-h-40 overflow-auto rounded-lg border border-slate-300 bg-slate-900 p-3 font-mono text-[11px] text-slate-100">
            {APPS_SCRIPT_CODE}
          </pre>
        </div>

        <form onSubmit={handleSaveAppsScriptSettings} className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-slate-900">
              URL Web App Apps Script Admin
            </label>
            <input
              type="url"
              value={appsScriptInput}
              onChange={(e) => setAppsScriptInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-white px-3.5 font-mono text-xs text-slate-900"
            />
          </div>

          {config?.spreadsheetUrl && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs">
              <div className="font-semibold text-emerald-950">
                Spreadsheet Terhubung:{' '}
                <strong className="font-bold">
                  {config.spreadsheetTitle || config.spreadsheetId}
                </strong>
              </div>
              <a
                href={config.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-bold text-emerald-800 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Buka Spreadsheet di Google Drive</span>
              </a>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex min-h-[48px] cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800">
              <input
                type="checkbox"
                checked={autoSyncEnabled}
                onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                className="h-4 w-4 accent-emerald-700"
              />
              <span>Aktifkan sinkronisasi otomatis saat asesmen dikirim</span>
            </label>

            <label className="flex min-h-[48px] cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800">
              <input
                type="checkbox"
                checked={includePiiInSheet}
                onChange={(e) => setIncludePiiInSheet(e.target.checked)}
                className="h-4 w-4 accent-emerald-700"
              />
              <Lock className="h-4 w-4 shrink-0 text-emerald-700" />
              <span>Sertakan NIK &amp; No. KK penuh (tidak disamarkan)</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Simpan Pengaturan</span>
              </button>
              <button
                type="button"
                disabled={busyAction !== null}
                onClick={handleTestAppsScript}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${busyAction === 'test_script' ? 'animate-spin' : ''}`}
                />
                <span>Uji Koneksi Apps Script</span>
              </button>
            </div>

            <button
              type="button"
              disabled={!appsScriptInput.trim() || busyAction !== null}
              onClick={() => handleOpenConfirmFullSync('apps_script')}
              className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-600"
            >
              <CloudUpload className="h-4 w-4" />
              <span>
                {busyAction === 'full_sync'
                  ? 'Menyinkronkan…'
                  : 'Sinkronkan Semua Data ke Spreadsheet'}
              </span>
            </button>
          </div>
        </form>
      </section>

      {/* BAGIAN 2: ANTREAN & LOG SINKRONISASI PERANGKAT */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              2. Antrean Sinkronisasi ke Spreadsheet ({queue.length} item)
            </h3>
            <p className="text-xs text-slate-600 tabular-nums">
              Tersinkron: <strong>{syncedCount}</strong> · Menunggu / Offline:{' '}
              <strong>{pendingCount}</strong> · Gagal: <strong>{errorCount}</strong>
              {config?.lastSyncedAt && (
                <>
                  {' · '}Sinkron terakhir:{' '}
                  <strong>{new Date(config.lastSyncedAt).toLocaleString('id-ID')}</strong>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleEnqueueAll}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100"
            >
              <span>Antrekan Semua Data Lokal ({households.length})</span>
            </button>
            <button
              type="button"
              disabled={busyAction !== null || (pendingCount === 0 && errorCount === 0)}
              onClick={handleFlushQueue}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:bg-slate-300 disabled:text-slate-600"
            >
              <CloudUpload className="h-4 w-4" />
              <span>
                {busyAction === 'flush_queue'
                  ? 'Mengirim Antrean…'
                  : `Kirim Antrean (${pendingCount + errorCount})`}
              </span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
              <tr>
                <th className="px-3 py-2.5">ID Rumah Tangga</th>
                <th className="px-3 py-2.5">Status Sync</th>
                <th className="px-3 py-2.5">Percobaan</th>
                <th className="px-3 py-2.5">Terakhir Tersinkron / Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                    Belum ada aktivitas sinkronisasi. Data baru atau asesmen yang dikirim
                    otomatis tercatat di antrean ini.
                  </td>
                </tr>
              ) : (
                queue.slice(0, 50).map((item) => (
                  <tr key={item.id_rt}>
                    <td className="px-3 py-2 font-mono font-bold text-emerald-800 tabular-nums">
                      {item.id_rt}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 font-bold ${
                          item.status === 'synced'
                            ? 'bg-emerald-100 text-emerald-900'
                            : item.status === 'error'
                            ? 'bg-rose-100 text-rose-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {item.status === 'synced'
                          ? 'Tersinkron'
                          : item.status === 'error'
                          ? 'Gagal'
                          : 'Menunggu'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums">{item.attempts}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {item.lastError ? (
                        <span className="text-rose-800 font-semibold">
                          {item.lastError}
                        </span>
                      ) : item.lastSyncedAt ? (
                        new Date(item.lastSyncedAt).toLocaleString('id-ID')
                      ) : (
                        'Menunggu pengiriman'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* BAGIAN 3 (OPSIONAL): OAUTH LANGSUNG GOOGLE SHEETS API */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-slate-700" />
              <span>
                3. Koneksi Langsung Google Sheets API (Opsional — Memerlukan Verifikasi / Test User GCP)
              </span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Bila muncul pesan{' '}
              <em>
                &ldquo;Akses diblokir: ai-studio-applet-webapp-d0113.firebaseapp.com belum
                menyelesaikan proses verifikasi Google&rdquo;
              </em>
              , Anda cukup gunakan <strong>Bagian 1 (Apps Script)</strong> di atas tanpa
              perlu masuk lewat tombol ini — atau tambahkan email{' '}
              <code className="font-mono bg-slate-100 px-1 rounded">{user.email}</code> sebagai{' '}
              <strong>Test User</strong> di Google Cloud Console proyek{' '}
              <code className="font-mono bg-slate-100 px-1 rounded">
                ai-studio-applet-webapp-d0113
              </code>{' '}
              (APIs &amp; Services &rarr; OAuth consent screen).
            </p>
          </div>

          {googleUser && hasToken ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs">
              <span className="font-bold text-emerald-950">
                Google: {googleUser.email || googleUser.displayName}
              </span>
              <button
                type="button"
                onClick={handleGoogleSignOut}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-bold text-slate-800 hover:bg-slate-100"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Putus</span>
              </button>
            </div>
          ) : (
            <GoogleSignInButton
              onClick={handleGoogleSignIn}
              disabled={authBusy}
              label={authBusy ? 'Menghubungkan…' : 'Masuk Google Drive Admin'}
            />
          )}
        </div>

        {authError && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950 space-y-1">
            <p className="font-bold">Catatan Izin OAuth Google Cloud:</p>
            <p>{authError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="text-sm font-bold text-slate-900">
              Buat Spreadsheet Baru (via OAuth)
            </div>
            <button
              type="button"
              disabled={!hasToken || busyAction !== null}
              onClick={handleCreateSpreadsheet}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:bg-slate-300 disabled:text-slate-600"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>
                {busyAction === 'create_sheet'
                  ? 'Membuat Spreadsheet…'
                  : 'Buat Spreadsheet Sensus 2026'}
              </span>
            </button>
          </div>

          <form
            onSubmit={handleSaveSheetLink}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3"
          >
            <label className="block text-sm font-bold text-slate-900">
              Tautkan URL / ID Google Spreadsheet
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sheetInput}
                onChange={(e) => setSheetInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="flex-1 min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-xs font-mono text-slate-900"
              />
              <button
                type="submit"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-900 hover:bg-slate-100"
              >
                <Link2 className="h-4 w-4" />
                <span>Tautkan</span>
              </button>
            </div>
          </form>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={!hasToken || !config?.spreadsheetId || busyAction !== null}
            onClick={() => handleOpenConfirmFullSync('oauth')}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-900 hover:bg-slate-50 disabled:opacity-50"
          >
            <CloudUpload className="h-4 w-4" />
            <span>Sinkronkan Semua via OAuth API</span>
          </button>
        </div>
      </section>

      {/* MODAL KONFIRMASI SINKRONISASI PENUH KE GOOGLE SHEETS */}
      {confirmSyncMode && syncStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Konfirmasi Sinkronisasi Google Sheets
              </h3>
              <button
                type="button"
                onClick={() => setConfirmSyncMode(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              Aplikasi akan memperbarui tab{' '}
              <code className="font-mono bg-slate-100 px-1 rounded">Rumah_Tangga</code>,{' '}
              <code className="font-mono bg-slate-100 px-1 rounded">Anggota_RT</code>, dan{' '}
              <code className="font-mono bg-slate-100 px-1 rounded">Kunjungan</code> pada
              Spreadsheet Anda (
              <strong>
                {confirmSyncMode === 'apps_script'
                  ? 'melalui Apps Script Admin'
                  : 'melalui OAuth Google Sheets API'}
              </strong>
              ) dengan data berikut:
            </p>
            <ul className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 space-y-1 tabular-nums">
              <li>
                • Rumah Tangga: <strong>{syncStats.households}</strong> baris
              </li>
              <li>
                • Kuesioner terisi: <strong>{syncStats.surveys}</strong> rumah tangga
              </li>
              <li>
                • Riwayat kunjungan: <strong>{syncStats.visits}</strong> catatan
              </li>
              <li>
                • Status NIK &amp; No. KK:{' '}
                <strong>
                  {includePiiInSheet ? 'Penuh (Admin)' : 'Disamarkan (************1234)'}
                </strong>
              </li>
            </ul>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmSyncMode(null)}
                className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmedSync}
                className="min-h-[44px] rounded-xl bg-emerald-700 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-800"
              >
                Ya, Sinkronkan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
