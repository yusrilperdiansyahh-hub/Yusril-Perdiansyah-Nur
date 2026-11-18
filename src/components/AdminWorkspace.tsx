import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  Download,
  Eye,
  FileSpreadsheet,
  HardDriveDownload,
  HardDriveUpload,
  LockOpen,
  Map as MapIcon,
  Plus,
  Save,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { BOOTSTRAP_ADMIN_EMAIL, DUSUN_OPTIONS } from '../data/instrument';
import {
  downloadCsvFile,
  exportHouseholdsCsv,
  exportMembersCsv,
  exportVisitsCsv,
  validateMasterCsv,
  type ParsedMasterCsvRow,
} from '../lib/csv';
import {
  deleteStaff,
  exportFullBackupJson,
  getSurveyAndPii,
  importFullBackupJson,
  importHouseholdsAtomic,
  listAllPii,
  listAllSurveys,
  listVisits,
  makeRtKey,
  saveTerritoryMappings,
  upsertStaff,
} from '../lib/idb';
import type {
  DusunCode,
  HouseholdRecord,
  PiiRecord,
  StaffMember,
  SurveyResponseRecord,
  TerritoryRwMapping,
  UserRole,
} from '../types/census';
import { GDriveSyncPanel } from './GDriveSyncPanel';
import { EnumerationStatusBadge, VerificationStatusBadge } from './StatusBadge';
import { TerritoryMap } from './TerritoryMap';

interface AdminWorkspaceProps {
  user: StaffMember;
  mappings: TerritoryRwMapping[];
  staffList: StaffMember[];
  households: HouseholdRecord[];
  onRefresh: () => Promise<void>;
  onQueueChanged?: () => Promise<void>;
}

type AdminTab = 'wilayah' | 'petugas' | 'daftar' | 'ekspor' | 'gdrive';

export const AdminWorkspace: React.FC<AdminWorkspaceProps> = ({
  user,
  mappings,
  staffList,
  households,
  onRefresh,
  onQueueChanged,
}) => {
  const [tab, setTab] = useState<AdminTab>('wilayah');

  // Tab Wilayah state
  const [draftMappings, setDraftMappings] = useState<TerritoryRwMapping[]>(mappings);
  const [wilayahSavedMsg, setWilayahSavedMsg] = useState<string | null>(null);

  // Keep draftMappings synced when mappings update
  React.useEffect(() => {
    setDraftMappings(mappings);
  }, [mappings]);

  const totalRt = useMemo(
    () => draftMappings.reduce((sum, m) => sum + (Number(m.jumlah_rt) || 0), 0),
    [draftMappings]
  );

  const dusunSummary = useMemo(() => {
    return DUSUN_OPTIONS.map((d) => {
      const rws = draftMappings.filter((m) => m.dusun === d.code);
      return {
        code: d.code,
        label: d.label,
        rwCount: rws.length,
        rtCount: rws.reduce((s, r) => s + (Number(r.jumlah_rt) || 0), 0),
      };
    });
  }, [draftMappings]);

  const allRtOptions = useMemo(() => {
    const list: { key: string; dusun: DusunCode; rw: string; rt: string }[] = [];
    for (const m of mappings) {
      for (let i = 1; i <= m.jumlah_rt; i++) {
        const rt2 = String(i).padStart(2, '0');
        list.push({
          key: makeRtKey(m.dusun, m.rw, rt2),
          dusun: m.dusun,
          rw: m.rw,
          rt: rt2,
        });
      }
    }
    return list;
  }, [mappings]);

  // Tab Petugas state
  const [staffEmail, setStaffEmail] = useState('');
  const [staffNama, setStaffNama] = useState('');
  const [staffPeran, setStaffPeran] = useState<UserRole>('enumerator');
  const [staffRts, setStaffRts] = useState<string[]>([]);
  const [staffDusunFilter, setStaffDusunFilter] = useState<DusunCode>('D1');
  const [staffRwFilter, setStaffRwFilter] = useState<string>('');
  const [staffFeedback, setStaffFeedback] = useState<string | null>(null);

  // Tab Impor CSV & Daftar Induk
  const [csvPreview, setCsvPreview] = useState<{
    valid: ParsedMasterCsvRow[];
    errors: string[];
  } | null>(null);
  const [csvImportMsg, setCsvImportMsg] = useState<string | null>(null);
  const [hhFilterDusun, setHhFilterDusun] = useState<string>('all');
  const [hhFilterRw, setHhFilterRw] = useState<string>('all');
  const [hhFilterRt, setHhFilterRt] = useState<string>('all');
  const [adminPiiModal, setAdminPiiModal] = useState<{
    hh: HouseholdRecord;
    survey: SurveyResponseRecord | null;
    pii: PiiRecord | null;
  } | null>(null);

  // Tab Ekspor & Cadangan JSON
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [includePiiOnExport, setIncludePiiOnExport] = useState(false);

  const handleSaveMappings = async () => {
    await saveTerritoryMappings(draftMappings, user.email);
    await onRefresh();
    setWilayahSavedMsg('Pemetaan wilayah 19 RW tersimpan.');
    window.setTimeout(() => setWilayahSavedMsg(null), 3500);
  };

  const handleEditStaff = (s: StaffMember) => {
    setStaffEmail(s.email);
    setStaffNama(s.nama);
    setStaffPeran(s.peran);
    setStaffRts(s.rt_tugas);
    setStaffFeedback(null);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffEmail.trim() || !staffNama.trim()) return;
    const existing = staffList.find(
      (s) => s.email.toLowerCase() === staffEmail.trim().toLowerCase()
    );
    await upsertStaff({
      email: staffEmail.trim().toLowerCase(),
      nama: staffNama.trim(),
      peran: staffPeran,
      rt_tugas: staffPeran === 'admin' ? [] : staffRts,
      aktif: existing ? existing.aktif : true,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await onRefresh();
    setStaffEmail('');
    setStaffNama('');
    setStaffPeran('enumerator');
    setStaffRts([]);
    setStaffFeedback('Data petugas dan penugasan RT berhasil disimpan.');
  };

  const handleToggleStaffActive = async (s: StaffMember) => {
    if (s.email === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) return;
    await upsertStaff({ ...s, aktif: !s.aktif });
    await onRefresh();
  };

  const handleDeleteStaff = async (email: string) => {
    try {
      await deleteStaff(email);
      await onRefresh();
    } catch (err) {
      setStaffFeedback(err instanceof Error ? err.message : 'Gagal menghapus petugas.');
    }
  };

  const filteredRtsForPicker = useMemo(() => {
    return allRtOptions.filter((r) => {
      if (r.dusun !== staffDusunFilter) return false;
      if (staffRwFilter && r.rw !== staffRwFilter) return false;
      return true;
    });
  }, [allRtOptions, staffDusunFilter, staffRwFilter]);

  const rwsInSelectedDusun = useMemo(() => {
    return mappings
      .filter((m) => m.dusun === staffDusunFilter)
      .map((m) => m.rw);
  }, [mappings, staffDusunFilter]);

  const handleCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = validateMasterCsv(text, mappings);
    setCsvPreview(res);
    setCsvImportMsg(null);
  };

  const handleExecuteCsvImport = async () => {
    if (!csvPreview || csvPreview.valid.length === 0) return;
    const created = await importHouseholdsAtomic(csvPreview.valid, user.email);
    await onRefresh();
    if (onQueueChanged) await onQueueChanged();
    setCsvImportMsg(
      `Berhasil mengimpor ${created.length} rumah tangga dengan ID otomatis (CBW-...).`
    );
    setCsvPreview(null);
  };

  const handleDownloadSampleCsv = () => {
    const firstRw = mappings[0];
    downloadCsvFile(
      'contoh_daftar_induk_cbw.csv',
      ['kode_dusun', 'rw', 'rt', 'no_bangunan', 'nama_kk', 'alamat', 'sumber'],
      [
        [
          firstRw?.dusun || 'D1',
          firstRw?.rw || '01',
          '01',
          'B-001',
          'Asep Suryana',
          'Kp. Cibiru Tengah No. 12',
          'Daftar KK RT',
        ],
        [
          firstRw?.dusun || 'D1',
          firstRw?.rw || '01',
          '01',
          'B-001',
          'Siti Aminah',
          'Kp. Cibiru Tengah No. 12 (KK Kedua)',
          'Listing lapangan',
        ],
      ]
    );
  };

  const filteredAdminHouseholds = useMemo(() => {
    return households.filter((h) => {
      if (hhFilterDusun !== 'all' && h.dusun !== hhFilterDusun) return false;
      if (hhFilterRw !== 'all' && h.rw !== hhFilterRw) return false;
      if (hhFilterRt !== 'all' && h.rt !== hhFilterRt) return false;
      return true;
    });
  }, [households, hhFilterDusun, hhFilterRw, hhFilterRt]);

  const filterRwOptions = useMemo(() => {
    return mappings
      .filter((m) => hhFilterDusun === 'all' || m.dusun === hhFilterDusun)
      .map((m) => m.rw);
  }, [mappings, hhFilterDusun]);

  const filterRtOptions = useMemo(() => {
    if (hhFilterRw === 'all') return [];
    const rwMap = mappings.find((m) => m.rw === hhFilterRw);
    if (!rwMap) return [];
    return Array.from({ length: rwMap.jumlah_rt }, (_, i) =>
      String(i + 1).padStart(2, '0')
    );
  }, [mappings, hhFilterRw]);

  const handleExportCsv = async (type: 'hh' | 'art' | 'visits') => {
    const [surveys, pii, visits] = await Promise.all([
      listAllSurveys(),
      listAllPii(),
      listVisits(),
    ]);
    if (type === 'hh') {
      exportHouseholdsCsv(households, surveys, pii, includePiiOnExport);
      setExportMsg('Berkas CSV Rumah Tangga berhasil diunduh.');
    } else if (type === 'art') {
      exportMembersCsv(households, surveys, pii, includePiiOnExport);
      setExportMsg('Berkas CSV Anggota Rumah Tangga berhasil diunduh.');
    } else {
      exportVisitsCsv(visits);
      setExportMsg('Berkas CSV Riwayat Kunjungan berhasil diunduh.');
    }
  };

  const handleExportJsonBackup = async () => {
    const json = await exportFullBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cadangan_sensus_cbw_2026_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportMsg('Cadangan JSON lengkap berhasil diunduh.');
  };

  const handleImportJsonBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = await importFullBackupJson(text);
      await onRefresh();
      setExportMsg(
        `Berhasil menggabungkan cadangan: ${res.households} rumah tangga, ${res.surveys} survei, ${res.visits} kunjungan.`
      );
    } catch (err) {
      setExportMsg(err instanceof Error ? err.message : 'Gagal mengimpor cadangan JSON.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Navigasi Tab Admin */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 rounded-2xl border border-slate-200 bg-white p-2">
        {[
          { key: 'wilayah' as AdminTab, label: 'Pemetaan Wilayah', Icon: MapIcon },
          { key: 'petugas' as AdminTab, label: 'Petugas & RT', Icon: Users },
          { key: 'daftar' as AdminTab, label: 'Daftar Induk & CSV', Icon: FileSpreadsheet },
          { key: 'ekspor' as AdminTab, label: 'Peta & Ekspor Data', Icon: Download },
          { key: 'gdrive' as AdminTab, label: 'Spreadsheet G Drive', Icon: CloudUpload },
        ].map((item) => {
          const Icon = item.Icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`flex min-h-[46px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold transition whitespace-nowrap ${
                tab === item.key
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: WILAYAH */}
      {tab === 'wilayah' && (
        <div className="space-y-4">
          {/* Peringatan merah jika total RT != 85 */}
          {totalRt !== 85 ? (
            <div className="flex items-start gap-3 rounded-2xl border-2 border-rose-600 bg-rose-50 p-4 text-rose-950">
              <AlertTriangle className="h-6 w-6 shrink-0 text-rose-700" />
              <div>
                <h3 className="text-base font-bold">
                  Peringatan: Total RT Hasil Pemetaan Tidak Sama Dengan 85!
                </h3>
                <p className="text-sm mt-0.5 tabular-nums">
                  Total RT saat ini adalah <strong>{totalRt} RT</strong> (selisih{' '}
                  {totalRt - 85 > 0 ? `+${totalRt - 85}` : totalRt - 85} RT dari target
                  resmi Desa Cibiru Wetan yaitu 85 RT). Sesuaikan jumlah RT pada tabel RW
                  di bawah.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-400 bg-emerald-50 p-4 text-emerald-950">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-700" />
              <div>
                <h3 className="text-base font-bold tabular-nums">
                  Pemetaan Lengkap: 5 Dusun · 19 RW · 85 RT
                </h3>
                <p className="text-sm">
                  Total RT hasil pemetaan telah tepat 85 RT dan tersinkron ke seluruh
                  pilihan filter aplikasi.
                </p>
              </div>
            </div>
          )}

          {/* Ringkasan per Dusun */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {dusunSummary.map((d) => (
              <div
                key={d.code}
                className="rounded-2xl border border-slate-200 bg-white p-3.5"
              >
                <div className="text-xs font-bold text-slate-500">{d.label}</div>
                <div className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
                  {d.rwCount} RW · {d.rtCount} RT
                </div>
              </div>
            ))}
          </div>

          {/* Tabel Pemetaan RW 01 - 19 */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Tabel Pemetaan RW 01–19 ke Dusun &amp; Jumlah RT
                </h3>
                <p className="text-xs text-slate-600">
                  Total saat ini:{' '}
                  <strong className="font-mono tabular-nums">{totalRt} / 85 RT</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveMappings}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
              >
                <Save className="h-4 w-4" />
                <span>Simpan Pemetaan Wilayah</span>
              </button>
            </div>

            {wilayahSavedMsg && (
              <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-900">
                {wilayahSavedMsg}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-2.5">RW</th>
                    <th className="px-4 py-2.5">Kode Dusun</th>
                    <th className="px-4 py-2.5">Jumlah RT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {draftMappings.map((row, idx) => (
                    <tr key={row.rw} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2 font-mono font-bold text-slate-900 tabular-nums">
                        RW {row.rw}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          {DUSUN_OPTIONS.map((d) => (
                            <button
                              key={d.code}
                              type="button"
                              onClick={() => {
                                setDraftMappings((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, dusun: d.code } : item
                                  )
                                );
                              }}
                              className={`min-h-[36px] rounded-lg border px-2.5 py-1 text-xs font-bold ${
                                row.dusun === d.code
                                  ? 'border-emerald-800 bg-emerald-700 text-white'
                                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {d.code}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min={1}
                          max={25}
                          value={row.jumlah_rt}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value || '0', 10));
                            setDraftMappings((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, jumlah_rt: val } : item
                              )
                            );
                          }}
                          className="w-24 min-h-[40px] rounded-lg border border-slate-300 px-3 font-mono text-sm font-bold text-slate-900 tabular-nums"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PETUGAS & PENUGASAN RT */}
      {tab === 'petugas' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <form
            onSubmit={handleSaveStaff}
            className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-4 space-y-4 h-fit"
          >
            <h3 className="text-base font-bold text-slate-900">
              Daftarkan / Ubah Petugas
            </h3>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Email Petugas <span className="text-rose-700">*</span>
              </label>
              <input
                type="email"
                required
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm text-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Nama Lengkap <span className="text-rose-700">*</span>
              </label>
              <input
                type="text"
                required
                value={staffNama}
                onChange={(e) => setStaffNama(e.target.value)}
                placeholder="Nama mahasiswa / kader desa"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3 text-sm text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Peran</label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { code: 'enumerator', label: 'Enumerator' },
                    { code: 'pengawas', label: 'Pengawas' },
                    { code: 'admin', label: 'Admin' },
                  ] as { code: UserRole; label: string }[]
                ).map((r) => (
                  <button
                    key={r.code}
                    type="button"
                    onClick={() => setStaffPeran(r.code)}
                    className={`min-h-[44px] rounded-xl border px-2 py-2 text-xs font-bold ${
                      staffPeran === r.code
                        ? 'border-emerald-800 bg-emerald-700 text-white'
                        : 'border-slate-300 bg-slate-50 text-slate-800'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {staffPeran !== 'admin' && (
              <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Penugasan RT ({staffRts.length} dipilih)
                  </span>
                  {staffRts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setStaffRts([])}
                      className="text-xs font-semibold text-rose-700 hover:underline"
                    >
                      Kosongkan
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={staffDusunFilter}
                    onChange={(e) => {
                      setStaffDusunFilter(e.target.value as DusunCode);
                      setStaffRwFilter('');
                    }}
                    className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold"
                  >
                    {DUSUN_OPTIONS.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={staffRwFilter}
                    onChange={(e) => setStaffRwFilter(e.target.value)}
                    className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-2 font-mono text-xs font-bold"
                  >
                    <option value="">Semua RW ({staffDusunFilter})</option>
                    {rwsInSelectedDusun.map((rw) => (
                      <option key={rw} value={rw}>
                        RW {rw}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="max-h-44 overflow-y-auto grid grid-cols-3 gap-1.5">
                  {filteredRtsForPicker.map((item) => {
                    const selected = staffRts.includes(item.key);
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() =>
                          setStaffRts((prev) =>
                            selected
                              ? prev.filter((k) => k !== item.key)
                              : [...prev, item.key]
                          )
                        }
                        className={`min-h-[36px] rounded-lg border px-2 py-1 font-mono text-xs font-bold tabular-nums ${
                          selected
                            ? 'border-emerald-800 bg-emerald-700 text-white'
                            : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
                        }`}
                      >
                        {item.key}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {staffFeedback && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-2.5 text-xs font-bold text-emerald-900">
                {staffFeedback}
              </div>
            )}

            <button
              type="submit"
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
            >
              <Plus className="h-4 w-4" />
              <span>Simpan Petugas</span>
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3">
              <h3 className="text-base font-bold text-slate-900">
                Daftar Petugas Terdaftar ({staffList.length})
              </h3>
              <p className="text-xs text-slate-600">
                Pengguna di luar daftar ini tidak dapat masuk atau melihat data sensus.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {staffList.map((s) => (
                <div
                  key={s.email}
                  className="p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900">{s.nama}</span>
                      <span className="rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase text-slate-800">
                        {s.peran}
                      </span>
                      {!s.aktif && (
                        <span className="rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-800">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 font-mono truncate">
                      {s.email}
                    </div>
                    {s.peran !== 'admin' && (
                      <div className="text-xs text-slate-700 font-mono">
                        RT Tugas:{' '}
                        {s.rt_tugas.length > 0 ? s.rt_tugas.join(', ') : 'Belum ada RT'}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditStaff(s)}
                      className="min-h-[38px] rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100"
                    >
                      Ubah
                    </button>
                    {s.email !== BOOTSTRAP_ADMIN_EMAIL.toLowerCase() && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleToggleStaffActive(s)}
                          className="min-h-[38px] rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100"
                        >
                          {s.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(s.email)}
                          className="flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50"
                          aria-label="Hapus petugas"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DAFTAR INDUK & IMPOR CSV */}
      {tab === 'daftar' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Impor Daftar Induk Rumah Tangga dari CSV
                </h3>
                <p className="text-xs text-slate-600">
                  Kolom wajib:{' '}
                  <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">
                    kode_dusun, rw, rt, no_bangunan, nama_kk, alamat, sumber
                  </code>
                  . ID dibuat otomatis oleh sistem per RT.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100"
              >
                <Download className="h-4 w-4" />
                <span>Unduh Contoh CSV</span>
              </button>
            </div>

            <label className="flex min-h-[54px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-100">
              <Upload className="h-5 w-5 text-emerald-700" />
              <span>Pilih Berkas CSV Daftar Induk</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFile}
                className="sr-only"
              />
            </label>

            {csvImportMsg && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-bold text-emerald-900">
                {csvImportMsg}
              </div>
            )}

            {csvPreview && (
              <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900 tabular-nums">
                    Valid: {csvPreview.valid.length} baris · Galat: {csvPreview.errors.length} baris
                  </span>
                  {csvPreview.valid.length > 0 && (
                    <button
                      type="button"
                      onClick={handleExecuteCsvImport}
                      className="min-h-[44px] rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                    >
                      Impor {csvPreview.valid.length} Rumah Tangga Sekarang
                    </button>
                  )}
                </div>

                {csvPreview.errors.length > 0 && (
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900 space-y-1">
                    {csvPreview.errors.map((err, idx) => (
                      <div key={idx}>{err}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Filter Daftar Induk Admin */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900 tabular-nums">
                Semua Rumah Tangga ({filteredAdminHouseholds.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                <select
                  value={hhFilterDusun}
                  onChange={(e) => {
                    setHhFilterDusun(e.target.value);
                    setHhFilterRw('all');
                    setHhFilterRt('all');
                  }}
                  className="min-h-[40px] rounded-xl border border-slate-300 px-3 text-xs font-bold"
                >
                  <option value="all">Semua Dusun</option>
                  {DUSUN_OPTIONS.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <select
                  value={hhFilterRw}
                  onChange={(e) => {
                    setHhFilterRw(e.target.value);
                    setHhFilterRt('all');
                  }}
                  className="min-h-[40px] rounded-xl border border-slate-300 px-3 font-mono text-xs font-bold"
                >
                  <option value="all">Semua RW</option>
                  {filterRwOptions.map((rw) => (
                    <option key={rw} value={rw}>
                      RW {rw}
                    </option>
                  ))}
                </select>
                {hhFilterRw !== 'all' && (
                  <select
                    value={hhFilterRt}
                    onChange={(e) => setHhFilterRt(e.target.value)}
                    className="min-h-[40px] rounded-xl border border-slate-300 px-3 font-mono text-xs font-bold"
                  >
                    <option value="all">Semua RT</option>
                    {filterRtOptions.map((rt) => (
                      <option key={rt} value={rt}>
                        RT {rt}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
                  <tr>
                    <th className="px-3 py-2.5">ID Rumah Tangga</th>
                    <th className="px-3 py-2.5">Bangunan</th>
                    <th className="px-3 py-2.5">Nama KK &amp; Alamat</th>
                    <th className="px-3 py-2.5">Status Cacah</th>
                    <th className="px-3 py-2.5">Verifikasi</th>
                    <th className="px-3 py-2.5 text-right">Data PII (Admin)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAdminHouseholds.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                        Belum ada data rumah tangga pada filter wilayah ini.
                      </td>
                    </tr>
                  ) : (
                    filteredAdminHouseholds.map((h) => (
                      <tr key={h.id_rt} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-mono text-xs font-bold text-emerald-800 tabular-nums whitespace-nowrap">
                          {h.id_rt}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs font-bold text-slate-700">
                          {h.no_bangunan}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-slate-900">{h.nama_kk}</div>
                          <div className="text-xs text-slate-600">{h.alamat || '—'}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <EnumerationStatusBadge status={h.status_pencacahan} />
                        </td>
                        <td className="px-3 py-2.5">
                          <VerificationStatusBadge status={h.status_verifikasi} />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await getSurveyAndPii(h.id_rt);
                              setAdminPiiModal({ hh: h, survey: res.survey, pii: res.pii });
                            }}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Lihat Detail</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PETA & EKSPOR DATA */}
      {tab === 'ekspor' && (
        <div className="space-y-5">
          <TerritoryMap households={households} />

          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Ekspor Data Sensus (Kode Instrumen Resmi)
              </h3>
              <p className="text-sm text-slate-600">
                Seluruh kolom dan nilai opsi diekspor menggunakan kode field persis sesuai
                spesifikasi instrumen.
              </p>
            </div>

            <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={includePiiOnExport}
                onChange={(e) => setIncludePiiOnExport(e.target.checked)}
                className="h-4 w-4 accent-emerald-700"
              />
              <LockOpen className="h-4 w-4 text-emerald-700" />
              <span>
                Sertakan NIK dan Nomor KK penuh (khusus hak akses Admin)
              </span>
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => handleExportCsv('hh')}
                className="min-h-[50px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
              >
                <Download className="h-4 w-4" />
                <span>Ekspor Rumah Tangga (CSV)</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportCsv('art')}
                className="min-h-[50px] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                <span>Ekspor Anggota RT (CSV)</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportCsv('visits')}
                className="min-h-[50px] inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                <span>Ekspor Kunjungan (CSV)</span>
              </button>
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Cadangan &amp; Gabung Data Antar Perangkat (JSON)
                </h4>
                <p className="text-xs text-slate-600">
                  Gunakan untuk memindahkan atau menggabungkan seluruh data luring dari
                  ponsel enumerator ke perangkat Admin.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleExportJsonBackup}
                  className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-100"
                >
                  <HardDriveDownload className="h-4 w-4" />
                  <span>Unduh Cadangan Lengkap (JSON)</span>
                </button>
                <label className="inline-flex min-h-[46px] cursor-pointer items-center gap-2 rounded-xl border border-emerald-700 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-900 hover:bg-emerald-100">
                  <HardDriveUpload className="h-4 w-4" />
                  <span>Impor &amp; Gabung Cadangan (JSON)</span>
                  <input
                    type="file"
                    onChange={handleImportJsonBackup}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {exportMsg && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-bold text-emerald-900">
                {exportMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: SPREADSHEET GOOGLE DRIVE */}
      {tab === 'gdrive' && (
        <GDriveSyncPanel
          user={user}
          households={households}
          onRefresh={onRefresh}
          onQueueChanged={onQueueChanged}
        />
      )}

      {/* Modal Detail PII Penuh Khusus Admin */}
      {adminPiiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Rincian PII &amp; Rumah Tangga (Khusus Admin)
                </h3>
                <p className="font-mono text-xs font-bold text-emerald-800">
                  {adminPiiModal.hh.id_rt} · {adminPiiModal.hh.nama_kk}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdminPiiModal(null)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm space-y-1">
              <div>
                <span className="text-slate-600">Nomor KK (Tidak Disamarkan): </span>
                <span className="font-mono font-bold text-slate-900">
                  {adminPiiModal.pii?.no_kk || '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Status Cacah: </span>
                <span className="font-bold">{adminPiiModal.hh.status_pencacahan}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-900">Daftar NIK Anggota</h4>
              {adminPiiModal.survey?.modulB.length ? (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {adminPiiModal.survey.modulB.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <span className="font-semibold text-slate-900">
                        #{idx + 1} {String(m.nama || '—')}
                      </span>
                      <span className="font-mono font-bold text-slate-800 tabular-nums">
                        {adminPiiModal.pii?.nik_anggota?.[idx] || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Belum ada data anggota tersimpan.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
