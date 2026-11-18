import React, { useMemo, useState } from 'react';
import { CheckCircle2, Eye, RotateCcw, Search, X } from 'lucide-react';
import { MODUL_A_QUESTIONS, MODUL_B_QUESTIONS, MODUL_C_QUESTIONS, OPTION_LISTS } from '../data/instrument';
import {
  getLocalPhoto,
  getSurveyAndPii,
  listVisits,
  updateHouseholdVerification,
} from '../lib/idb';
import { syncSingleAssessment } from '../lib/syncManager';
import { maskIdNumber } from '../lib/xlsform';
import type {
  HouseholdRecord,
  PhotoRecord,
  PiiRecord,
  StaffMember,
  SurveyResponseRecord,
  VisitRecord,
} from '../types/census';
import {
  EnumerationStatusBadge,
  VerificationStatusBadge,
} from './StatusBadge';
import { TerritoryMap } from './TerritoryMap';

interface SupervisorWorkspaceProps {
  user: StaffMember;
  households: HouseholdRecord[];
  onRefresh: () => Promise<void>;
  onQueueChanged?: () => Promise<void>;
}

function formatOptionLabel(listName: string | undefined, value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (!listName || !OPTION_LISTS[listName]) {
    return Array.isArray(value) ? value.join(', ') : String(value);
  }
  const map = new Map(OPTION_LISTS[listName].map((o) => [o.code, o.label]));
  if (Array.isArray(value)) {
    return value.map((v) => map.get(String(v)) || String(v)).join(', ');
  }
  return map.get(String(value)) || String(value);
}

export const SupervisorWorkspace: React.FC<SupervisorWorkspaceProps> = ({
  user,
  households,
  onRefresh,
  onQueueChanged,
}) => {
  const supervisedHouseholds = useMemo(() => {
    if (user.peran === 'admin') return households;
    return households.filter((h) => user.rt_tugas.includes(h.rt_key));
  }, [user, households]);

  const [rtFilter, setRtFilter] = useState<string>('all');
  const [verifFilter, setVerifFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  const [inspectHh, setInspectHh] = useState<HouseholdRecord | null>(null);
  const [inspectData, setInspectData] = useState<{
    survey: SurveyResponseRecord | null;
    pii: PiiRecord | null;
    visits: VisitRecord[];
    photo: PhotoRecord | null;
  } | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  const rtKeys = useMemo(
    () => Array.from(new Set(supervisedHouseholds.map((h) => h.rt_key))).sort(),
    [supervisedHouseholds]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return supervisedHouseholds.filter((h) => {
      if (rtFilter !== 'all' && h.rt_key !== rtFilter) return false;
      if (verifFilter === 'perlu_tinjauan') {
        if (!(h.status_pencacahan === 'tercacah' && h.status_verifikasi === 'menunggu'))
          return false;
      } else if (verifFilter !== 'all' && h.status_verifikasi !== verifFilter) {
        return false;
      }
      if (!q) return true;
      return (
        h.id_rt.toLowerCase().includes(q) ||
        h.nama_kk.toLowerCase().includes(q) ||
        h.no_bangunan.toLowerCase().includes(q)
      );
    });
  }, [supervisedHouseholds, rtFilter, verifFilter, query]);

  const openInspector = async (h: HouseholdRecord) => {
    setInspectHh(h);
    setReviewNote(h.catatan_pengawas || '');
    setReviewError(null);
    const [{ survey, pii }, visits, photo] = await Promise.all([
      getSurveyAndPii(h.id_rt),
      listVisits(h.id_rt),
      getLocalPhoto(h.id_rt),
    ]);
    setInspectData({ survey, pii, visits, photo });
  };

  const handleDecision = async (status: 'terverifikasi' | 'dikembalikan') => {
    if (!inspectHh) return;
    if (status === 'dikembalikan' && !reviewNote.trim()) {
      setReviewError('Catatan perbaikan wajib diisi saat mengembalikan isian ke enumerator.');
      return;
    }
    const targetId = inspectHh.id_rt;
    await updateHouseholdVerification(targetId, status, reviewNote, user.email);
    await onRefresh();
    setInspectHh(null);
    setInspectData(null);
    syncSingleAssessment(targetId).then(() => {
      if (onQueueChanged) void onQueueChanged();
    });
  };

  const summary = {
    total: supervisedHouseholds.length,
    perluTinjauan: supervisedHouseholds.filter(
      (h) => h.status_pencacahan === 'tercacah' && h.status_verifikasi === 'menunggu'
    ).length,
    terverifikasi: supervisedHouseholds.filter(
      (h) => h.status_verifikasi === 'terverifikasi'
    ).length,
    dikembalikan: supervisedHouseholds.filter(
      (h) => h.status_verifikasi === 'dikembalikan'
    ).length,
  };

  return (
    <div className="space-y-5">
      {/* KPI pengawasan */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-600">Rumah Tangga Diawasi</div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {summary.total}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-300 bg-amber-50/50 p-4">
          <div className="text-xs font-semibold text-amber-900">Perlu Verifikasi</div>
          <div className="mt-1 font-mono text-2xl font-bold text-amber-800 tabular-nums">
            {summary.perluTinjauan}
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50/50 p-4">
          <div className="text-xs font-semibold text-emerald-900">Terverifikasi</div>
          <div className="mt-1 font-mono text-2xl font-bold text-emerald-800 tabular-nums">
            {summary.terverifikasi}
          </div>
        </div>
        <div className="rounded-2xl border border-rose-300 bg-rose-50/50 p-4">
          <div className="text-xs font-semibold text-rose-900">Dikembalikan</div>
          <div className="mt-1 font-mono text-2xl font-bold text-rose-800 tabular-nums">
            {summary.dikembalikan}
          </div>
        </div>
      </div>

      {/* Filter & Pencarian */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari ID rumah tangga, nama KK, atau bangunan…"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm text-slate-900"
            />
          </div>

          <select
            value={rtFilter}
            onChange={(e) => setRtFilter(e.target.value)}
            className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 font-mono text-sm font-semibold text-slate-900"
          >
            <option value="all">Semua RT Pengawasan ({rtKeys.length})</option>
            {rtKeys.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { code: 'all', label: 'Semua' },
            { code: 'perlu_tinjauan', label: 'Siap Verifikasi' },
            { code: 'terverifikasi', label: 'Terverifikasi' },
            { code: 'dikembalikan', label: 'Dikembalikan' },
          ].map((tab) => (
            <button
              key={tab.code}
              type="button"
              onClick={() => setVerifFilter(tab.code)}
              className={`min-h-[40px] rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
                verifFilter === tab.code
                  ? 'border-emerald-800 bg-emerald-700 text-white'
                  : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabel Pengawasan */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
              <tr>
                <th className="px-4 py-3">ID Rumah Tangga</th>
                <th className="px-4 py-3">Nama KK &amp; Bangunan</th>
                <th className="px-4 py-3">Status Cacah</th>
                <th className="px-4 py-3">Verifikasi</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Tidak ada data rumah tangga yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filtered.map((h) => (
                  <tr key={h.id_rt} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-emerald-800 tabular-nums whitespace-nowrap">
                      {h.id_rt}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{h.nama_kk}</div>
                      <div className="text-xs text-slate-600">
                        {h.no_bangunan} · {h.rt_key}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <EnumerationStatusBadge status={h.status_pencacahan} />
                    </td>
                    <td className="px-4 py-3">
                      <VerificationStatusBadge status={h.status_verifikasi} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openInspector(h)}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Periksa</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TerritoryMap households={supervisedHouseholds} />

      {/* Modal Pemeriksaan Detail Isian (NIK & No KK Disamarkan) */}
      {inspectHh && inspectData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Pemeriksaan Data — {inspectHh.nama_kk}
                </h3>
                <p className="font-mono text-xs font-bold text-emerald-800 tabular-nums">
                  {inspectHh.id_rt} · Bangunan {inspectHh.no_bangunan}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInspectHh(null);
                  setInspectData(null);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
              {/* Foto lokal */}
              {inspectData.photo && (
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-700">Foto Depan Rumah (Lokal)</p>
                  <img
                    src={inspectData.photo.dataUrl}
                    alt={`Foto rumah ${inspectHh.id_rt}`}
                    className="max-h-56 rounded-xl border border-slate-200 object-cover"
                  />
                </div>
              )}

              {/* Riwayat Kunjungan */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900">
                  Catatan Kunjungan ({inspectData.visits.length})
                </h4>
                {inspectData.visits.length === 0 ? (
                  <p className="text-slate-500">Belum ada catatan kunjungan tercatat.</p>
                ) : (
                  <div className="space-y-2">
                    {inspectData.visits.map((v) => (
                      <div
                        key={v.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1"
                      >
                        <div className="flex flex-wrap justify-between gap-2 font-bold text-slate-900">
                          <span>
                            {v.status_kunjungan}
                            {v.kunjungan_ke ? ` (Ke-${v.kunjungan_ke})` : ''}
                            {v.persetujuan ? ` · Setuju: ${v.persetujuan}` : ''}
                          </span>
                          <span className="font-mono tabular-nums text-slate-600">
                            {new Date(v.createdAt).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="text-slate-600 font-mono tabular-nums">
                          Koordinat: {v.lokasi.lat.toFixed(6)}, {v.lokasi.lng.toFixed(6)} (
                          {v.lokasi.method}, akurasi {v.lokasi.accuracy} m)
                          {v.lokasi.manual_reason ? ` — Alasan: ${v.lokasi.manual_reason}` : ''}
                        </div>
                        <div className="text-slate-600">Enumerator: {v.enumeratorEmail}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Isian Modul A, B, C */}
              {inspectData.survey ? (
                <>
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900">
                      Modul A — Rumah Tangga &amp; Ekonomi
                    </h4>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {MODUL_A_QUESTIONS.filter(
                        (q) =>
                          q.type !== 'note' &&
                          inspectData.survey?.modulA[q.code] !== undefined
                      ).map((q) => (
                        <div
                          key={q.code}
                          className="rounded-xl border border-slate-200 p-2.5"
                        >
                          <div className="text-xs text-slate-500">{q.label}</div>
                          <div className="font-semibold text-slate-900">
                            {formatOptionLabel(q.listName, inspectData.survey?.modulA[q.code])}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900">
                      Modul B — Anggota Rumah Tangga ({inspectData.survey.modulB.length})
                    </h4>
                    {inspectData.survey.modulB.map((m, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2"
                      >
                        <div className="font-bold text-slate-900">
                          #{idx + 1} · {String(m.nama || 'Tanpa nama')} (
                          {formatOptionLabel('hubungan', m.hubungan)})
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-500">NIK (Tersamar): </span>
                            <span className="font-mono font-semibold text-slate-900">
                              {maskIdNumber(inspectData.pii?.nik_anggota?.[idx])}
                            </span>
                          </div>
                          {m.hubungan === 'kk' && (
                            <div>
                              <span className="text-slate-500">No. KK (Tersamar): </span>
                              <span className="font-mono font-semibold text-slate-900">
                                {maskIdNumber(inspectData.pii?.no_kk)}
                              </span>
                            </div>
                          )}
                          {MODUL_B_QUESTIONS.filter(
                            (q) =>
                              q.type !== 'note' && !q.isPii && m[q.code] !== undefined
                          ).map((q) => (
                            <div key={q.code}>
                              <span className="text-slate-500">{q.code}: </span>
                              <span className="font-semibold text-slate-800">
                                {formatOptionLabel(q.listName, m[q.code])}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900">
                      Modul C &amp; Catatan Enumerator
                    </h4>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {MODUL_C_QUESTIONS.filter(
                        (q) => inspectData.survey?.modulC[q.code] !== undefined
                      ).map((q) => (
                        <div
                          key={q.code}
                          className="rounded-xl border border-slate-200 p-2.5"
                        >
                          <div className="text-xs text-slate-500">{q.label}</div>
                          <div className="font-semibold text-slate-900">
                            {formatOptionLabel(q.listName, inspectData.survey?.modulC[q.code])}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-slate-500">Belum ada isian kuesioner tersimpan.</p>
              )}

              {/* Panel Keputusan Pengawas */}
              <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4 space-y-3">
                <label className="block text-sm font-bold text-slate-900">
                  Catatan Pengawas (Wajib diisi jika dikembalikan)
                </label>
                <textarea
                  rows={2}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Tuliskan catatan verifikasi atau bagian yang perlu diperbaiki enumerator…"
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                />
                {reviewError && (
                  <p className="text-xs font-bold text-rose-800">{reviewError}</p>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleDecision('terverifikasi')}
                    className="flex-1 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Verifikasi &amp; Setujui</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision('dikembalikan')}
                    className="flex-1 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:bg-rose-800"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Kembalikan ke Enumerator</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
