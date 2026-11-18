import React, { useMemo, useState } from 'react';
import {
  Building2,
  ClipboardList,
  Copy,
  FileEdit,
  Plus,
  Search,
  Tag,
  X,
} from 'lucide-react';
import { DUSUN_OPTIONS, HOUSEHOLD_SOURCE_OPTIONS } from '../data/instrument';
import {
  createHouseholdAtomic,
  makeRtKey,
  updateHouseholdRegistryStatus,
} from '../lib/idb';
import { syncSingleAssessment } from '../lib/syncManager';
import type {
  AppSyncStatus,
  DusunCode,
  HouseholdRecord,
  HouseholdSource,
  RegistryStatus,
  StaffMember,
  TerritoryRwMapping,
} from '../types/census';
import {
  EnumerationStatusBadge,
  RegistryStatusLabel,
  VerificationStatusBadge,
} from './StatusBadge';
import { SurveyWizard } from './SurveyWizard';

interface EnumeratorWorkspaceProps {
  user: StaffMember;
  mappings: TerritoryRwMapping[];
  households: HouseholdRecord[];
  onRefresh: () => Promise<void>;
  onSyncStatusChange: (status: AppSyncStatus) => void;
  onQueueChanged?: () => Promise<void>;
}

export const EnumeratorWorkspace: React.FC<EnumeratorWorkspaceProps> = ({
  user,
  mappings,
  households,
  onRefresh,
  onSyncStatusChange,
  onQueueChanged,
}) => {
  // Build allowed RT list from user.rt_tugas (Admin can view all if testing enumerator tab)
  const allowedRtKeys = useMemo(() => {
    if (user.peran === 'admin') {
      const all: string[] = [];
      for (const m of mappings) {
        for (let r = 1; r <= m.jumlah_rt; r++) {
          all.push(makeRtKey(m.dusun, m.rw, String(r)));
        }
      }
      return all;
    }
    return user.rt_tugas;
  }, [user, mappings]);

  const availableDusun = useMemo(() => {
    const set = new Set(allowedRtKeys.map((k) => k.split('-')[0] as DusunCode));
    return DUSUN_OPTIONS.filter((d) => set.has(d.code));
  }, [allowedRtKeys]);

  const [selectedDusun, setSelectedDusun] = useState<DusunCode | ''>(
    () => availableDusun[0]?.code ?? ''
  );

  const availableRw = useMemo(() => {
    if (!selectedDusun) return [];
    const rwSet = new Set(
      allowedRtKeys
        .filter((k) => k.startsWith(`${selectedDusun}-`))
        .map((k) => k.split('-')[1])
    );
    return mappings
      .filter((m) => m.dusun === selectedDusun && rwSet.has(m.rw))
      .map((m) => m.rw);
  }, [selectedDusun, allowedRtKeys, mappings]);

  const [selectedRw, setSelectedRw] = useState<string>(() => availableRw[0] ?? '');

  const availableRt = useMemo(() => {
    if (!selectedDusun || !selectedRw) return [];
    const rwMap = mappings.find((m) => m.dusun === selectedDusun && m.rw === selectedRw);
    if (!rwMap) return [];
    const allowedSet = new Set(allowedRtKeys);
    const list: string[] = [];
    for (let i = 1; i <= rwMap.jumlah_rt; i++) {
      const rt2 = String(i).padStart(2, '0');
      const key = `${selectedDusun}-${selectedRw}-${rt2}`;
      if (allowedSet.has(key)) list.push(rt2);
    }
    return list;
  }, [selectedDusun, selectedRw, allowedRtKeys, mappings]);

  const [selectedRt, setSelectedRt] = useState<string>(() => availableRt[0] ?? '');

  // Keep selections valid when mappings or user changes
  const activeDusun = availableDusun.some((d) => d.code === selectedDusun)
    ? selectedDusun
    : availableDusun[0]?.code ?? '';
  const activeRw = availableRw.includes(selectedRw) ? selectedRw : availableRw[0] ?? '';
  const activeRt = availableRt.includes(selectedRt) ? selectedRt : availableRt[0] ?? '';
  const activeRtKey =
    activeDusun && activeRw && activeRt ? `${activeDusun}-${activeRw}-${activeRt}` : '';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeHousehold, setActiveHousehold] = useState<HouseholdRecord | null>(null);

  // Mode Listing state
  const [showListingModal, setShowListingModal] = useState(false);
  const [noBangunan, setNoBangunan] = useState('');
  const [namaKk, setNamaKk] = useState('');
  const [alamat, setAlamat] = useState('');
  const [sumber, setSumber] = useState<HouseholdSource>('listing_lapangan');
  const [listingError, setListingError] = useState<string | null>(null);
  const [listingSaving, setListingSaving] = useState(false);

  // Status daftar modal
  const [editingStatusHh, setEditingStatusHh] = useState<HouseholdRecord | null>(null);
  const [nextRegistryStatus, setNextRegistryStatus] = useState<RegistryStatus>('aktif');
  const [registryNote, setRegistryNote] = useState('');

  const rtHouseholds = useMemo(() => {
    return households.filter((h) => h.rt_key === activeRtKey);
  }, [households, activeRtKey]);

  const lastBuildingNo = useMemo(() => {
    if (rtHouseholds.length === 0) return 'B-001';
    const sorted = [...rtHouseholds].sort((a, b) => a.id_rt.localeCompare(b.id_rt));
    return sorted[sorted.length - 1].no_bangunan;
  }, [rtHouseholds]);

  const suggestNextBuildingNo = () => {
    if (rtHouseholds.length === 0) return 'B-001';
    let maxNum = 0;
    for (const h of rtHouseholds) {
      const m = h.no_bangunan.match(/(\d+)/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    }
    return `B-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const filteredHouseholds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rtHouseholds.filter((h) => {
      if (statusFilter !== 'all' && h.status_pencacahan !== statusFilter) return false;
      if (!q) return true;
      return (
        h.nama_kk.toLowerCase().includes(q) ||
        h.no_bangunan.toLowerCase().includes(q) ||
        h.id_rt.toLowerCase().includes(q) ||
        h.alamat.toLowerCase().includes(q)
      );
    });
  }, [rtHouseholds, searchQuery, statusFilter]);

  if (activeHousehold) {
    return (
      <SurveyWizard
        household={activeHousehold}
        userEmail={user.email}
        onSyncStatusChange={onSyncStatusChange}
        onQueueChanged={onQueueChanged}
        onBack={async () => {
          await onRefresh();
          setActiveHousehold(null);
        }}
        onSubmitted={async () => {
          await onRefresh();
          setActiveHousehold(null);
        }}
      />
    );
  }

  if (allowedRtKeys.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-center space-y-2">
        <ClipboardList className="mx-auto h-10 w-10 text-amber-700" />
        <h2 className="text-lg font-bold text-slate-900">Belum Ada RT Tugas</h2>
        <p className="text-sm text-slate-700">
          Akun Anda belum ditugaskan ke RT mana pun. Hubungi Admin I&apos;ComDev untuk
          penugasan wilayah RT.
        </p>
      </div>
    );
  }

  const openListingModal = () => {
    setNoBangunan(suggestNextBuildingNo());
    setNamaKk('');
    setAlamat('');
    setSumber('listing_lapangan');
    setListingError(null);
    setShowListingModal(true);
  };

  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDusun || !activeRw || !activeRt) return;
    if (!noBangunan.trim() || !namaKk.trim()) {
      setListingError('Nomor bangunan dan nama kepala rumah tangga wajib diisi.');
      return;
    }

    try {
      setListingSaving(true);
      setListingError(null);
      const created = await createHouseholdAtomic({
        dusun: activeDusun,
        rw: activeRw,
        rt: activeRt,
        no_bangunan: noBangunan,
        nama_kk: namaKk,
        alamat,
        sumber,
        createdBy: user.email,
      });
      await onRefresh();
      setShowListingModal(false);
      syncSingleAssessment(created.id_rt).then((outcome) => {
        if (outcome === 'synced') onSyncStatusChange('synced_gdrive');
        else if (outcome === 'queued' || outcome === 'error') onSyncStatusChange('queued_gdrive');
        if (onQueueChanged) void onQueueChanged();
      });
    } catch (err) {
      setListingError(
        err instanceof Error ? err.message : 'Gagal menambahkan rumah tangga.'
      );
    } finally {
      setListingSaving(false);
    }
  };

  const handleUpdateRegistryStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStatusHh) return;
    const targetId = editingStatusHh.id_rt;
    await updateHouseholdRegistryStatus(
      targetId,
      nextRegistryStatus,
      registryNote
    );
    await onRefresh();
    setEditingStatusHh(null);
    syncSingleAssessment(targetId).then((outcome) => {
      if (outcome === 'synced') onSyncStatusChange('synced_gdrive');
      else if (outcome === 'queued' || outcome === 'error') onSyncStatusChange('queued_gdrive');
      if (onQueueChanged) void onQueueChanged();
    });
  };

  const counts = {
    total: rtHouseholds.length,
    tercacah: rtHouseholds.filter((h) => h.status_pencacahan === 'tercacah').length,
    draf: rtHouseholds.filter((h) => h.status_pencacahan === 'draf').length,
    belum: rtHouseholds.filter((h) => h.status_pencacahan === 'belum_dikunjungi').length,
  };

  return (
    <div className="space-y-4">
      {/* Pemilih Wilayah Bertingkat (Dusun -> RW -> RT) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">Wilayah Tugas RT</h2>
            <p className="text-xs text-slate-600">
              Pilihan RW disaring berdasarkan Dusun, dan RT disaring sesuai pemetaan RW.
            </p>
          </div>
          <button
            type="button"
            disabled={!activeRtKey}
            onClick={openListingModal}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 active:scale-[0.99] disabled:opacity-40"
          >
            <Plus className="h-5 w-5" />
            <span>Mode Listing (+ Rumah Tangga)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Dusun</label>
            <div className="flex flex-wrap gap-1.5">
              {availableDusun.map((d) => (
                <button
                  key={d.code}
                  type="button"
                  onClick={() => {
                    setSelectedDusun(d.code);
                    setSelectedRw('');
                    setSelectedRt('');
                  }}
                  className={`min-h-[44px] flex-1 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                    activeDusun === d.code
                      ? 'border-emerald-800 bg-emerald-700 text-white'
                      : 'border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {d.code}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">RW</label>
            <div className="flex flex-wrap gap-1.5">
              {availableRw.map((rw) => (
                <button
                  key={rw}
                  type="button"
                  onClick={() => {
                    setSelectedRw(rw);
                    setSelectedRt('');
                  }}
                  className={`min-h-[44px] min-w-[52px] rounded-xl border px-3 py-2 font-mono text-sm font-bold tabular-nums transition ${
                    activeRw === rw
                      ? 'border-emerald-800 bg-emerald-700 text-white'
                      : 'border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {rw}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">RT</label>
            <div className="flex flex-wrap gap-1.5">
              {availableRt.map((rt) => (
                <button
                  key={rt}
                  type="button"
                  onClick={() => setSelectedRt(rt)}
                  className={`min-h-[44px] min-w-[52px] rounded-xl border px-3 py-2 font-mono text-sm font-bold tabular-nums transition ${
                    activeRt === rt
                      ? 'border-emerald-800 bg-emerald-700 text-white'
                      : 'border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {rt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ringkasan Angka RT */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <div className="text-xs font-semibold text-slate-600">Total Daftar Induk</div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {counts.total}
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5">
          <div className="text-xs font-semibold text-emerald-900">Tercacah</div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-800 tabular-nums">
            {counts.tercacah}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5">
          <div className="text-xs font-semibold text-amber-900">Draf</div>
          <div className="mt-1 font-mono text-2xl font-bold text-amber-800 tabular-nums">
            {counts.draf}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
          <div className="text-xs font-semibold text-slate-600">Belum Dikunjungi</div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {counts.belum}
          </div>
        </div>
      </div>

      {/* Pencarian & Filter Status */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama kepala rumah tangga, nomor bangunan (B-001), atau ID…"
            className="w-full min-h-[48px] rounded-xl border border-slate-300 bg-slate-50 pl-11 pr-4 text-base text-slate-900 focus:border-emerald-700 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { code: 'all', label: 'Semua' },
            { code: 'belum_dikunjungi', label: 'Belum dikunjungi' },
            { code: 'draf', label: 'Draf' },
            { code: 'tercacah', label: 'Tercacah' },
            { code: 'tidak_ditemui', label: 'Tidak ditemui' },
            { code: 'menolak', label: 'Menolak' },
            { code: 'rumah_kosong', label: 'Rumah kosong' },
          ].map((f) => (
            <button
              key={f.code}
              type="button"
              onClick={() => setStatusFilter(f.code)}
              className={`min-h-[40px] rounded-xl border px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                statusFilter === f.code
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Daftar Rumah Tangga */}
      {filteredHouseholds.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-3">
          <Building2 className="mx-auto h-10 w-10 text-slate-400" />
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Belum ada rumah tangga di RT {activeRt}/RW {activeRw}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Mulai pendataan lapangan dengan menekan tombol Mode Listing untuk menambahkan
              rumah tangga sesuai urutan berjalan.
            </p>
          </div>
          <button
            type="button"
            onClick={openListingModal}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
          >
            <Plus className="h-5 w-5" />
            <span>Tambah Rumah Tangga Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredHouseholds.map((h) => (
            <div
              key={h.id_rt}
              className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-emerald-800 tabular-nums">
                    {h.id_rt}
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-md px-2 py-0.5">
                    {h.no_bangunan}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {h.nama_kk}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {h.alamat || 'Alamat/gang belum dicatat'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <EnumerationStatusBadge status={h.status_pencacahan} />
                  {h.status_pencacahan === 'tercacah' && (
                    <VerificationStatusBadge status={h.status_verifikasi} />
                  )}
                  <RegistryStatusLabel status={h.status_daftar} />
                </div>

                {h.status_verifikasi === 'dikembalikan' && h.catatan_pengawas && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
                    <strong>Catatan Pengawas:</strong> {h.catatan_pengawas}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveHousehold(h)}
                  className="flex-1 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  <FileEdit className="h-4 w-4" />
                  <span>
                    {h.status_pencacahan === 'draf'
                      ? 'Lanjutkan Draf'
                      : h.status_pencacahan === 'belum_dikunjungi'
                      ? 'Mulai Cacah'
                      : 'Buka / Perbarui'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingStatusHh(h);
                    setNextRegistryStatus(h.status_daftar);
                    setRegistryNote(h.catatan_daftar || '');
                  }}
                  className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100"
                >
                  <Tag className="h-4 w-4" />
                  <span>Status Daftar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Mode Listing */}
      {showListingModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4">
          <form
            onSubmit={handleSaveListing}
            className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white p-5 space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Mode Listing — Tambah Rumah Tangga
                </h3>
                <p className="text-xs text-slate-600 font-mono tabular-nums">
                  Wilayah: {activeDusun} · RW {activeRw} · RT {activeRt} (ID otomatis)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowListingModal(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-bold text-slate-900">
                  Nomor Bangunan <span className="text-rose-700">*</span>
                </label>
                {rtHouseholds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setNoBangunan(lastBuildingNo)}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-emerald-700 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900 hover:bg-emerald-100"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Rumah tangga lain di bangunan yang sama ({lastBuildingNo})</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                value={noBangunan}
                onChange={(e) => setNoBangunan(e.target.value)}
                placeholder="Contoh: B-001"
                className="w-full min-h-[48px] rounded-xl border border-slate-300 px-3.5 font-mono text-base font-bold text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-900">
                Nama Kepala Rumah Tangga <span className="text-rose-700">*</span>
              </label>
              <input
                type="text"
                required
                value={namaKk}
                onChange={(e) => setNamaKk(e.target.value)}
                placeholder="Nama lengkap kepala rumah tangga"
                className="w-full min-h-[48px] rounded-xl border border-slate-300 px-3.5 text-base text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-900">
                Alamat / Gang
              </label>
              <input
                type="text"
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Contoh: Kp. Cibiru Tonggoh Gg. Melati No. 4"
                className="w-full min-h-[48px] rounded-xl border border-slate-300 px-3.5 text-base text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-900">
                Sumber Data <span className="text-rose-700">*</span>
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {HOUSEHOLD_SOURCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => setSumber(opt.code)}
                    className={`min-h-[48px] rounded-xl border px-3 py-2 text-left text-sm font-bold ${
                      sumber === opt.code
                        ? 'border-emerald-800 bg-emerald-700 text-white'
                        : 'border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {listingError && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-bold text-rose-900">
                {listingError}
              </div>
            )}

            <button
              type="submit"
              disabled={listingSaving}
              className="w-full min-h-[52px] rounded-xl bg-emerald-700 py-3 text-base font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {listingSaving ? 'Menerbitkan ID…' : 'Simpan ke Daftar Induk'}
            </button>
          </form>
        </div>
      )}

      {/* Modal Ubah Status Daftar (Tidak Pernah Menghapus ID) */}
      {editingStatusHh && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <form
            onSubmit={handleUpdateRegistryStatus}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Tandai Status Daftar Induk
                </h3>
                <p className="font-mono text-xs text-emerald-800 font-bold">
                  {editingStatusHh.id_rt} · {editingStatusHh.nama_kk}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStatusHh(null)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              ID rumah tangga bersifat tetap dan tidak pernah dihapus. Tandai status jika
              rumah tangga pindah, ganda, atau tidak ada di lapangan.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { code: 'aktif', label: 'Aktif' },
                  { code: 'pindah', label: 'Pindah' },
                  { code: 'ganda', label: 'Ganda / Duplikat' },
                  { code: 'tidak_ada', label: 'Tidak ada' },
                ] as { code: RegistryStatus; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => setNextRegistryStatus(opt.code)}
                  className={`min-h-[48px] rounded-xl border px-3 py-2 text-sm font-bold ${
                    nextRegistryStatus === opt.code
                      ? 'border-emerald-800 bg-emerald-700 text-white'
                      : 'border-slate-300 bg-slate-50 text-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1">
                Catatan Status Daftar
              </label>
              <textarea
                rows={3}
                value={registryNote}
                onChange={(e) => setRegistryNote(e.target.value)}
                placeholder="Tuliskan keterangan pindah, nomor ID ganda, dll."
                className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
            >
              Simpan Perubahan Status
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
