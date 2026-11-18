import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardPaste,
  CloudOff,
  CloudUpload,
  HardDrive,
  HardDriveUpload,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldAlert,
  Wifi,
  X,
} from 'lucide-react';
import { AdminWorkspace } from './components/AdminWorkspace';
import { EnumeratorWorkspace } from './components/EnumeratorWorkspace';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SupervisorWorkspace } from './components/SupervisorWorkspace';
import { BOOTSTRAP_ADMIN_EMAIL } from './data/instrument';
import { useOnlineStatus } from './hooks/usePWA';
import { normalizeConfigInputToJson } from './lib/configShare';
import {
  getStaffByEmail,
  getTerritoryConfig,
  importFullBackupJson,
  initializeLocalDatabase,
  listHouseholds,
  listStaff,
} from './lib/idb';
import { flushSyncQueue, getPendingSyncCount } from './lib/syncManager';
import type {
  AppSyncStatus,
  HouseholdRecord,
  StaffMember,
  TerritoryRwMapping,
  UserRole,
} from './types/census';

const SESSION_KEY = 'cbw_sensus_active_email';

export default function App() {
  const isOnline = useOnlineStatus();

  const [booting, setBooting] = useState(true);
  const [currentUser, setCurrentUser] = useState<StaffMember | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [mappings, setMappings] = useState<TerritoryRwMapping[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [households, setHouseholds] = useState<HouseholdRecord[]>([]);
  const [activeViewRole, setActiveViewRole] = useState<UserRole>('enumerator');
  const [syncStatus, setSyncStatus] = useState<AppSyncStatus>('saved_local');
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [configImportMsg, setConfigImportMsg] = useState<string | null>(null);
  const [showPasteConfigModal, setShowPasteConfigModal] = useState(false);
  const [pasteConfigText, setPasteConfigText] = useState('');
  const [pasteConfigError, setPasteConfigError] = useState<string | null>(null);

  const refreshPendingSync = useCallback(async () => {
    const count = await getPendingSyncCount();
    setPendingSyncCount(count);
  }, []);

  const loadAuthorizedData = useCallback(
    async (user: StaffMember) => {
      const [territory, allStaff] = await Promise.all([
        getTerritoryConfig(),
        listStaff(),
      ]);
      setMappings(territory.mappings);
      setStaffList(allStaff);

      if (user.peran === 'admin') {
        const hh = await listHouseholds();
        setHouseholds(hh);
      } else {
        const hh = await listHouseholds(user.rt_tugas);
        setHouseholds(hh);
      }
      await refreshPendingSync();
    },
    [refreshPendingSync]
  );

  const applySetupFromHash = useCallback(async () => {
    const hash = window.location.hash || '';
    if (!hash.startsWith('#setup=')) return false;
    try {
      const normalizedJson = normalizeConfigInputToJson(hash);
      await importFullBackupJson(normalizedJson);
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search
      );
      setConfigImportMsg(
        'Konfigurasi dari Admin otomatis terpasang lewat Link Setup (wilayah, akun petugas, & tautan Spreadsheet). Silakan masuk dengan email Anda.'
      );
      setLoginError(null);
      return true;
    } catch (err) {
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search
      );
      setLoginError(
        err instanceof Error
          ? err.message
          : 'Link Setup konfigurasi tidak valid atau terpotong.'
      );
      return false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function boot() {
      await initializeLocalDatabase();
      await applySetupFromHash();
      const savedEmail = localStorage.getItem(SESSION_KEY);
      if (savedEmail) {
        const staff = await getStaffByEmail(savedEmail);
        if (staff && staff.aktif && mounted) {
          setCurrentUser(staff);
          setActiveViewRole(staff.peran);
          await loadAuthorizedData(staff);
        }
      }
      if (mounted) {
        await refreshPendingSync();
        setBooting(false);
      }
    }
    boot();

    const onHashChange = async () => {
      const imported = await applySetupFromHash();
      if (imported) {
        const savedEmail = localStorage.getItem(SESSION_KEY);
        if (savedEmail) {
          const staff = await getStaffByEmail(savedEmail);
          if (staff && staff.aktif) {
            setCurrentUser(staff);
            await loadAuthorizedData(staff);
          }
        }
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => {
      mounted = false;
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [applySetupFromHash, loadAuthorizedData, refreshPendingSync]);

  // Otomatis kirim antrean tertunda saat aplikasi online
  useEffect(() => {
    if (booting || !isOnline) return;
    let active = true;
    async function runFlush() {
      const pending = await getPendingSyncCount();
      if (pending === 0) return;
      if (active) setSyncStatus('syncing_gdrive');
      const res = await flushSyncQueue();
      if (!active) return;
      setPendingSyncCount(res.remaining);
      if (res.synced > 0 && res.remaining === 0) {
        setSyncStatus('synced_gdrive');
      } else if (res.remaining > 0) {
        setSyncStatus('queued_gdrive');
      }
    }
    void runFlush();
    return () => {
      active = false;
    };
  }, [booting, isOnline, currentUser?.email]);

  const handleLogin = async (emailToTry: string) => {
    setLoginError(null);
    const normalized = emailToTry.trim().toLowerCase();
    if (!normalized) {
      setLoginError('Masukkan alamat email petugas.');
      return;
    }

    const staff = await getStaffByEmail(normalized);
    if (!staff) {
      setLoginError(
        'Akses ditolak: Email ini belum didaftarkan oleh Admin I\'ComDev dan tidak dapat melihat data apa pun.'
      );
      return;
    }
    if (!staff.aktif) {
      setLoginError('Akun petugas ini sedang dinonaktifkan oleh Admin.');
      return;
    }

    localStorage.setItem(SESSION_KEY, staff.email);
    setCurrentUser(staff);
    setActiveViewRole(staff.peran);
    await loadAuthorizedData(staff);
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
    setHouseholds([]);
    setLoginEmail('');
    setLoginError(null);
  };

  const handleRefreshData = useCallback(async () => {
    if (!currentUser) return;
    const latestUser = (await getStaffByEmail(currentUser.email)) || currentUser;
    setCurrentUser(latestUser);
    await loadAuthorizedData(latestUser);
  }, [currentUser, loadAuthorizedData]);

  const handleManualFlush = async () => {
    if (!isOnline) return;
    setSyncStatus('syncing_gdrive');
    const res = await flushSyncQueue();
    setPendingSyncCount(res.remaining);
    setSyncStatus(
      res.remaining === 0 && res.synced > 0 ? 'synced_gdrive' : 'queued_gdrive'
    );
  };

  const handlePreLoginImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const normalizedJson = normalizeConfigInputToJson(text);
      await importFullBackupJson(normalizedJson);
      setConfigImportMsg(
        'Konfigurasi petugas, wilayah, dan tautan Spreadsheet Admin berhasil dimuat. Silakan masuk dengan email Anda.'
      );
      setLoginError(null);
    } catch (err) {
      setLoginError(
        err instanceof Error ? err.message : 'Gagal memuat berkas konfigurasi.'
      );
    }
  };

  const handlePasteConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasteConfigError(null);
    try {
      const normalizedJson = normalizeConfigInputToJson(pasteConfigText);
      await importFullBackupJson(normalizedJson);
      setShowPasteConfigModal(false);
      setPasteConfigText('');
      setConfigImportMsg(
        'Konfigurasi dari Admin berhasil dimuat melalui tempel teks/tautan. Silakan masuk dengan email Anda.'
      );
      setLoginError(null);
    } catch (err) {
      setPasteConfigError(
        err instanceof Error ? err.message : 'Teks konfigurasi tidak valid.'
      );
    }
  };

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center space-y-2">
          <div className="mx-auto h-10 w-10 rounded-xl bg-emerald-700" />
          <p className="text-sm font-semibold text-slate-700">
            Menyiapkan penyimpanan lokal Sensus CBW 2026…
          </p>
        </div>
      </div>
    );
  }

  // Layar Masuk (jika belum login atau belum terdaftar)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-8">
        <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4">
          <div className="font-display text-lg font-extrabold tracking-tight text-slate-900">
            Sensus Desa Cibiru Wetan 2026
          </div>
          <PWAInstallButton />
        </header>

        <main className="mx-auto w-full max-w-md my-auto py-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                I&apos;ComDev Institute · Kec. Cileunyi, Kab. Bandung
              </p>
              <h1 className="font-display text-2xl font-extrabold text-slate-900 leading-tight">
                Masuk Aplikasi Pendataan Lapangan
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Aplikasi berjalan penuh secara luring (offline) di perangkat Anda. Hanya
                petugas dengan email terdaftar oleh Admin yang dapat mengakses daftar
                rumah tangga dan kuesioner.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin(loginEmail);
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-900">
                  Email Petugas Terdaftar
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full min-h-[50px] rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              </div>

              {loginError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-sm font-semibold text-rose-900">
                  <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-base font-bold text-white hover:bg-emerald-800 active:scale-[0.99]"
              >
                <LogIn className="h-5 w-5" />
                <span>Masuk</span>
              </button>
            </form>

            <div className="border-t border-slate-200 pt-4 space-y-2.5">
              <p className="text-xs text-slate-600">
                Akses cepat Admin awal (pemilik ruang kerja):
              </p>
              <button
                type="button"
                onClick={() => handleLogin(BOOTSTRAP_ADMIN_EMAIL)}
                className="flex min-h-[46px] w-full items-center justify-between rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-left text-xs font-bold text-slate-900 hover:bg-slate-100"
              >
                <span className="truncate font-mono">{BOOTSTRAP_ADMIN_EMAIL}</span>
                <span className="shrink-0 text-emerald-800">Admin Awal →</span>
              </button>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setPasteConfigError(null);
                    setShowPasteConfigModal(true);
                  }}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100"
                >
                  <ClipboardPaste className="h-4 w-4 shrink-0" />
                  <span>Tempel Link / Teks Konfigurasi</span>
                </button>

                <label className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                  <HardDriveUpload className="h-4 w-4 shrink-0 text-emerald-700" />
                  <span>Pilih Berkas .json</span>
                  <input
                    type="file"
                    onChange={handlePreLoginImport}
                    className="sr-only"
                  />
                </label>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Pengguna <strong>iPhone</strong>: disarankan membuka Link Setup dari WhatsApp langsung di <strong>Safari</strong> lalu pilih <strong>Bagikan &rarr; Tambahkan ke Layar Utama</strong>.
              </p>

              {configImportMsg && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">
                  {configImportMsg}
                </div>
              )}
            </div>
          </div>
        </main>

        {showPasteConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Tempel Link / Teks Konfigurasi Admin
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Cocok untuk pengguna iPhone &amp; Android agar tidak perlu mencari berkas .json di folder Unduhan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasteConfigModal(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                  aria-label="Tutup"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handlePasteConfigSubmit} className="space-y-3">
                <textarea
                  rows={5}
                  value={pasteConfigText}
                  onChange={(e) => setPasteConfigText(e.target.value)}
                  placeholder="Tempel di sini Link Setup (https://.../#setup=...) atau Teks Konfigurasi JSON yang dikirim Admin lewat WhatsApp..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-900 focus:border-emerald-700 focus:bg-white focus:outline-none"
                />

                {pasteConfigError && (
                  <div className="rounded-xl border border-rose-300 bg-rose-50 p-2.5 text-xs font-semibold text-rose-900">
                    {pasteConfigError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasteConfigModal(false)}
                    className="min-h-[42px] rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="min-h-[42px] rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                  >
                    Pasang Konfigurasi
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <footer className="mx-auto w-full max-w-4xl text-center text-xs text-slate-500">
          Penyimpanan lokal perangkat (IndexedDB) aktif · Desa Cibiru Wetan 2026
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Bilah Atas Ringkas (<= 56px agar gabungan sticky <= 15% layar ponsel) */}
      <header className="sticky top-0 z-30 h-14 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-display text-base font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
              Sensus CBW 2026
            </span>

            {/* Indikator Status Sinkronisasi Selalu Terlihat */}
            <div
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                syncStatus === 'saving' || syncStatus === 'syncing_gdrive'
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : syncStatus === 'synced_gdrive' || syncStatus === 'submitted'
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                  : syncStatus === 'queued_gdrive'
                  ? 'border-sky-300 bg-sky-50 text-sky-900'
                  : 'border-slate-300 bg-slate-100 text-slate-800'
              }`}
            >
              {syncStatus === 'syncing_gdrive' ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-700" />
              ) : syncStatus === 'synced_gdrive' ? (
                <CloudUpload className="h-3.5 w-3.5 text-emerald-700" />
              ) : syncStatus === 'submitted' ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
              ) : (
                <HardDrive className="h-3.5 w-3.5 text-slate-700" />
              )}
              <span>
                {syncStatus === 'saving'
                  ? 'Menyimpan ke perangkat…'
                  : syncStatus === 'syncing_gdrive'
                  ? 'Mengirim ke Spreadsheet…'
                  : syncStatus === 'synced_gdrive'
                  ? 'Tersinkron ke G Drive'
                  : syncStatus === 'queued_gdrive'
                  ? `Antrean G Drive (${pendingSyncCount})`
                  : syncStatus === 'submitted'
                  ? 'Terkirim (Lokal)'
                  : 'Tersimpan di perangkat'}
              </span>
              <span className="text-slate-400">·</span>
              {isOnline ? (
                <span className="inline-flex items-center gap-1 text-emerald-800">
                  <Wifi className="h-3 w-3" /> Daring
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-800">
                  <CloudOff className="h-3 w-3" /> Luring
                </span>
              )}
            </div>

            {pendingSyncCount > 0 && isOnline && (
              <button
                type="button"
                onClick={handleManualFlush}
                className="hidden md:inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-800 whitespace-nowrap"
              >
                <CloudUpload className="h-3.5 w-3.5" />
                <span>Sync ({pendingSyncCount})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 whitespace-nowrap"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4 space-y-4">
        {/* Bilah Identitas Petugas & Indikator Sinkronisasi Mobile */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900">{currentUser.nama}</span>
              <span className="text-xs font-bold uppercase text-emerald-800">
                · {currentUser.peran}
              </span>
            </div>
            <div className="text-xs text-slate-600 truncate font-mono">
              {currentUser.email}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mobile sync status */}
            <div className="sm:hidden inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-800">
              <HardDrive className="h-3.5 w-3.5 text-emerald-700" />
              <span>
                {syncStatus === 'saving'
                  ? 'Menyimpan…'
                  : syncStatus === 'syncing_gdrive'
                  ? 'Sync G Drive…'
                  : syncStatus === 'synced_gdrive'
                  ? 'Tersinkron G Drive'
                  : syncStatus === 'queued_gdrive'
                  ? `Antrean (${pendingSyncCount})`
                  : syncStatus === 'submitted'
                  ? 'Terkirim (Lokal)'
                  : 'Tersimpan lokal'}
              </span>
              <span>·</span>
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {pendingSyncCount > 0 && isOnline && (
              <button
                type="button"
                onClick={handleManualFlush}
                className="md:hidden inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-800 whitespace-nowrap"
              >
                <CloudUpload className="h-3.5 w-3.5" />
                <span>Sync ({pendingSyncCount})</span>
              </button>
            )}

            {/* Role switcher for Admin */}
            {currentUser.peran === 'admin' && (
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                {(
                  [
                    { role: 'admin', label: 'Admin' },
                    { role: 'pengawas', label: 'Pengawas' },
                    { role: 'enumerator', label: 'Enumerator' },
                  ] as { role: UserRole; label: string }[]
                ).map((r) => (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => setActiveViewRole(r.role)}
                    className={`min-h-[36px] rounded-lg px-3 py-1 text-xs font-bold transition whitespace-nowrap ${
                      activeViewRole === r.role
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}

            {/* Pengawas can also open Enumerator mode if assigned RTs */}
            {currentUser.peran === 'pengawas' && currentUser.rt_tugas.length > 0 && (
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setActiveViewRole('pengawas')}
                  className={`min-h-[36px] rounded-lg px-3 py-1 text-xs font-bold ${
                    activeViewRole === 'pengawas'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Mode Pengawas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewRole('enumerator')}
                  className={`min-h-[36px] rounded-lg px-3 py-1 text-xs font-bold ${
                    activeViewRole === 'enumerator'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Mode Enumerator
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Ruang Kerja Aktif */}
        {activeViewRole === 'admin' && currentUser.peran === 'admin' ? (
          <AdminWorkspace
            user={currentUser}
            mappings={mappings}
            staffList={staffList}
            households={households}
            onRefresh={handleRefreshData}
            onQueueChanged={refreshPendingSync}
          />
        ) : activeViewRole === 'pengawas' &&
          (currentUser.peran === 'pengawas' || currentUser.peran === 'admin') ? (
          <SupervisorWorkspace
            user={currentUser}
            households={households}
            onRefresh={handleRefreshData}
            onQueueChanged={refreshPendingSync}
          />
        ) : (
          <EnumeratorWorkspace
            user={currentUser}
            mappings={mappings}
            households={households}
            onRefresh={handleRefreshData}
            onSyncStatusChange={setSyncStatus}
            onQueueChanged={refreshPendingSync}
          />
        )}
      </main>
    </div>
  );
}
