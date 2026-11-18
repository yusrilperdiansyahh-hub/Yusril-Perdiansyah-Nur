import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  MapPin,
  Save,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import {
  CONSENT_TEXT,
  MODUL_A_QUESTIONS,
  MODUL_B_QUESTIONS,
  MODUL_C_QUESTIONS,
  OPTION_LISTS,
  computeAgeYears,
} from '../data/instrument';
import {
  deleteLocalPhoto,
  getLocalPhoto,
  getSurveyAndPii,
  listVisits,
  saveLocalPhoto,
  saveSurveyDraft,
  submitVisitAndSurvey,
} from '../lib/idb';
import { syncSingleAssessment } from '../lib/syncManager';
import {
  applyDefaultsAndCalculations,
  buildMemberWithPii,
  isMemberComplete,
  validateSurveyComplete,
} from '../lib/xlsform';
import type {
  AnswerValue,
  AppSyncStatus,
  HouseholdRecord,
  MemberAnswers,
  PhotoRecord,
  PiiRecord,
  SurveyResponseRecord,
  VisitRecord,
} from '../types/census';
import { LocationCapture } from './LocationCapture';
import { QuestionRenderer } from './QuestionRenderer';

type StepKey = 'modul0' | 'modulA' | 'modulB' | 'modulC' | 'penutup' | 'ringkasan';

const STEPS: { key: StepKey; label: string }[] = [
  { key: 'modul0', label: 'Modul 0' },
  { key: 'modulA', label: 'Modul A' },
  { key: 'modulB', label: 'Modul B' },
  { key: 'modulC', label: 'Modul C' },
  { key: 'penutup', label: 'Penutup' },
  { key: 'ringkasan', label: 'Ringkasan' },
];

interface SurveyWizardProps {
  household: HouseholdRecord;
  userEmail: string;
  onSyncStatusChange: (status: AppSyncStatus) => void;
  onQueueChanged?: () => Promise<void>;
  onBack: () => void;
  onSubmitted: (updatedHousehold: HouseholdRecord) => void;
}

export const SurveyWizard: React.FC<SurveyWizardProps> = ({
  household,
  userEmail,
  onSyncStatusChange,
  onQueueChanged,
  onBack,
  onSubmitted,
}) => {
  const [step, setStep] = useState<StepKey>('modul0');
  const [loading, setLoading] = useState(true);
  const [survey, setSurvey] = useState<SurveyResponseRecord | null>(null);
  const [pii, setPii] = useState<PiiRecord>({
    id_rt: household.id_rt,
    no_kk: '',
    nik_anggota: {},
    updatedAt: new Date().toISOString(),
  });
  const [photo, setPhoto] = useState<PhotoRecord | null>(null);
  const [photoDisabledMsg, setPhotoDisabledMsg] = useState<string | null>(null);
  const [visitHistory, setVisitHistory] = useState<VisitRecord[]>([]);
  const [activeMemberIdx, setActiveMemberIdx] = useState<number | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [{ survey: existingSurvey, pii: existingPii }, existingPhoto, visits] =
        await Promise.all([
          getSurveyAndPii(household.id_rt),
          getLocalPhoto(household.id_rt),
          listVisits(household.id_rt),
        ]);

      if (!mounted) return;

      const initialSurvey: SurveyResponseRecord = existingSurvey ?? {
        id_rt: household.id_rt,
        modul0: {
          id_rt: household.id_rt,
          dusun: household.dusun,
          rw: household.rw,
          rt: household.rt,
          no_bangunan: household.no_bangunan,
          nama_kk_daftar: household.nama_kk,
          enumerator: userEmail,
          lokasi: household.koordinat_terakhir,
        },
        modulA: applyDefaultsAndCalculations(MODUL_A_QUESTIONS, {
          nama_kk: household.nama_kk,
          jumlah_art: 1,
          jumlah_kk: 1,
        }) as SurveyResponseRecord['modulA'],
        modulB: [
          {
            nama: household.nama_kk,
            hubungan: 'kk',
          },
        ],
        modulC: {},
        warningsConfirmed: false,
        updatedAt: new Date().toISOString(),
        enumeratorEmail: userEmail,
      };

      // Pastikan identitas Modul 0 selalu sinkron dengan daftar induk
      initialSurvey.modul0.id_rt = household.id_rt;
      initialSurvey.modul0.dusun = household.dusun;
      initialSurvey.modul0.rw = household.rw;
      initialSurvey.modul0.rt = household.rt;
      initialSurvey.modul0.no_bangunan = household.no_bangunan;
      initialSurvey.modul0.nama_kk_daftar = household.nama_kk;
      initialSurvey.modul0.enumerator = userEmail;

      setSurvey(initialSurvey);
      if (existingPii) setPii(existingPii);
      setPhoto(existingPhoto);
      setVisitHistory(visits);
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [household, userEmail]);

  // Auto-save draft whenever survey or PII updates
  useEffect(() => {
    if (loading || !survey) return;
    onSyncStatusChange('saving');
    const timer = window.setTimeout(async () => {
      try {
        await saveSurveyDraft(survey, pii);
        onSyncStatusChange('saved_local');
      } catch {
        // Ignore transient write lock
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [survey, pii, loading, onSyncStatusChange]);

  // Sinkronkan jumlah kartu Modul B ketika jumlah_art berubah
  const jumlahArt = Number(survey?.modulA?.jumlah_art || 0);
  useEffect(() => {
    if (!survey || jumlahArt < 1 || jumlahArt > 30) return;
    if (survey.modulB.length === jumlahArt) return;

    setSurvey((prev) => {
      if (!prev) return prev;
      const current = [...prev.modulB];
      if (current.length < jumlahArt) {
        while (current.length < jumlahArt) {
          const isFirst = current.length === 0;
          current.push(
            isFirst
              ? {
                  nama: String(prev.modulA.nama_kk || household.nama_kk || ''),
                  hubungan: 'kk',
                }
              : {}
          );
        }
      } else if (current.length > jumlahArt) {
        current.length = jumlahArt;
      }
      return { ...prev, modulB: current };
    });
  }, [jumlahArt, survey, household.nama_kk]);

  const computedModulA = useMemo(() => {
    if (!survey) return {};
    return applyDefaultsAndCalculations(MODUL_A_QUESTIONS, survey.modulA);
  }, [survey]);

  const validation = useMemo(() => {
    if (!survey) return { errors: [], warnings: [] };
    return validateSurveyComplete(survey, pii);
  }, [survey, pii]);

  if (loading || !survey) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
        Memuat instrumen sensus rumah tangga…
      </div>
    );
  }

  const isEarlyStop =
    (survey.modul0.status_kunjungan && survey.modul0.status_kunjungan !== 'ditemui') ||
    survey.modul0.persetujuan === 'tidak';

  const updateModulA = (code: string, val: AnswerValue) => {
    setSurvey((prev) => {
      if (!prev) return prev;
      const nextA = applyDefaultsAndCalculations(MODUL_A_QUESTIONS, {
        ...prev.modulA,
        [code]: val,
      }) as Record<string, AnswerValue>;
      return { ...prev, modulA: nextA };
    });
  };

  const updateModulB = (memberIdx: number, code: string, val: AnswerValue) => {
    if (code === 'nik') {
      setPii((prev) => ({
        ...prev,
        nik_anggota: { ...prev.nik_anggota, [memberIdx]: String(val || '') },
      }));
      return;
    }
    if (code === 'no_kk') {
      setPii((prev) => ({ ...prev, no_kk: String(val || '') }));
      return;
    }

    setSurvey((prev) => {
      if (!prev) return prev;
      const nextList = [...prev.modulB];
      const updatedMember: MemberAnswers = {
        ...(nextList[memberIdx] || {}),
        [code]: val,
      };
      // Hitung ulang usia bila tanggal lahir berubah
      if (code === 'tgl_lahir') {
        const u = computeAgeYears(val);
        if (u !== undefined) updatedMember.usia = u;
      }
      nextList[memberIdx] = updatedMember;
      return { ...prev, modulB: nextList };
    });
  };

  const updateModulC = (code: string, val: AnswerValue) => {
    setSurvey((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        modulC: { ...prev.modulC, [code]: val },
      };
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const saved = await saveLocalPhoto(household.id_rt, file);
      setPhoto(saved);
      setPhotoDisabledMsg(null);
      setSurvey((prev) =>
        prev
          ? {
              ...prev,
              modul0: {
                ...prev.modul0,
                foto_tersimpan_lokal: true,
                foto_waktu: saved.updatedAt,
              },
            }
          : prev
      );
    } catch {
      setPhotoDisabledMsg(
        'Penyimpanan berkas lokal tidak tersedia/penuh. Isian foto dinonaktifkan agar wawancara tetap dapat dilanjutkan.'
      );
    }
  };

  const handleRemovePhoto = async () => {
    await deleteLocalPhoto(household.id_rt);
    setPhoto(null);
    setSurvey((prev) =>
      prev
        ? {
            ...prev,
            modul0: {
              ...prev.modul0,
              foto_tersimpan_lokal: false,
              foto_waktu: undefined,
            },
          }
        : prev
    );
  };

  const handleSubmitFinal = async () => {
    setShowErrors(true);
    setSubmitError(null);

    const check = validateSurveyComplete(survey, pii);
    if (check.errors.length > 0) {
      setSubmitError(
        `Masih ada ${check.errors.length} galat wajib diperbaiki sebelum mengirim.`
      );
      return;
    }

    if (check.warnings.length > 0 && !survey.warningsConfirmed) {
      setSubmitError('Harap centang konfirmasi peringatan pemeriksaan silang terlebih dahulu.');
      return;
    }

    try {
      setSubmitting(true);
      const { household: updatedHh } = await submitVisitAndSurvey(survey, pii);
      onSyncStatusChange('syncing_gdrive');
      const outcome = await syncSingleAssessment(household.id_rt);
      if (outcome === 'synced') {
        onSyncStatusChange('synced_gdrive');
      } else if (outcome === 'queued' || outcome === 'error') {
        onSyncStatusChange('queued_gdrive');
      } else {
        onSyncStatusChange('submitted');
      }
      if (onQueueChanged) await onQueueChanged();
      onSubmitted(updatedHh);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Gagal menyimpan hasil pencacahan.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const modulASections = Array.from(new Set(MODUL_A_QUESTIONS.map((q) => q.section)));
  const modulBSections = Array.from(new Set(MODUL_B_QUESTIONS.map((q) => q.section)));
  const modulCOnlyQuestions = MODUL_C_QUESTIONS.filter((q) => q.section !== 'Penutup');
  const modulCSections = Array.from(new Set(modulCOnlyQuestions.map((q) => q.section)));
  const penutupQuestions = MODUL_C_QUESTIONS.filter((q) => q.section === 'Penutup');

  const currentStepIdx = STEPS.findIndex((s) => s.key === step);

  const goNextStep = () => {
    if (step === 'modul0' && isEarlyStop) {
      setStep('ringkasan');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (currentStepIdx < STEPS.length - 1) {
      setActiveMemberIdx(null);
      setStep(STEPS[currentStepIdx + 1].key);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goPrevStep = () => {
    if (step === 'ringkasan' && isEarlyStop) {
      setStep('modul0');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (currentStepIdx > 0) {
      setActiveMemberIdx(null);
      setStep(STEPS[currentStepIdx - 1].key);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header navigasi kuesioner & bilah kemajuan */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Daftar RT</span>
          </button>

          <div className="text-right">
            <div className="font-mono text-sm font-bold text-emerald-800 tabular-nums">
              {household.id_rt}
            </div>
            <div className="text-xs text-slate-600">
              Bangunan {household.no_bangunan} · {household.nama_kk}
            </div>
          </div>
        </div>

        {/* Pengawas return note */}
        {household.status_verifikasi === 'dikembalikan' && household.catatan_pengawas && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-950">
            <p className="font-bold">Catatan Pengembalian Pengawas:</p>
            <p className="mt-0.5">{household.catatan_pengawas}</p>
          </div>
        )}

        {/* Stepper progress bar */}
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {STEPS.map((s, idx) => {
            const disabled = isEarlyStop && s.key !== 'modul0' && s.key !== 'ringkasan';
            const active = step === s.key;
            const passed = idx < currentStepIdx && !disabled;
            return (
              <button
                key={s.key}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setActiveMemberIdx(null);
                  setStep(s.key);
                }}
                className={`min-h-[44px] rounded-xl border px-2 py-1.5 text-xs font-bold transition ${
                  active
                    ? 'border-emerald-800 bg-emerald-700 text-white'
                    : disabled
                    ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                    : passed
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* MODUL 0 */}
      {step === 'modul0' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <h2 className="text-lg font-bold text-slate-900">
              Modul 0. Identitas Pencacahan (Otomatis dari Daftar Induk)
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <div className="text-xs text-slate-500">ID Rumah Tangga (id_rt)</div>
                <div className="font-mono font-bold text-slate-900 tabular-nums">
                  {survey.modul0.id_rt}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <div className="text-xs text-slate-500">Wilayah (Dusun / RW / RT)</div>
                <div className="font-mono font-bold text-slate-900 tabular-nums">
                  {survey.modul0.dusun} / {survey.modul0.rw} / {survey.modul0.rt}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <div className="text-xs text-slate-500">No. Bangunan</div>
                <div className="font-mono font-bold text-slate-900">
                  {survey.modul0.no_bangunan}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                <div className="text-xs text-slate-500">Nama KK (Daftar)</div>
                <div className="font-semibold text-slate-900">
                  {survey.modul0.nama_kk_daftar}
                </div>
              </div>
              <div className="col-span-2 rounded-xl bg-slate-50 p-3 border border-slate-200">
                <div className="text-xs text-slate-500">Enumerator</div>
                <div className="font-semibold text-slate-900 truncate">
                  {survey.modul0.enumerator}
                </div>
              </div>
            </div>
          </div>

          <LocationCapture
            value={survey.modul0.lokasi}
            onChange={(coord) =>
              setSurvey((prev) =>
                prev
                  ? { ...prev, modul0: { ...prev.modul0, lokasi: coord } }
                  : prev
              )
            }
          />

          {/* status_kunjungan */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <label className="block text-base font-bold text-slate-900">
              Hasil kunjungan (status_kunjungan) <span className="text-rose-700">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {OPTION_LISTS.kunjungan.map((opt) => {
                const selected = survey.modul0.status_kunjungan === opt.code;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() =>
                      setSurvey((prev) =>
                        prev
                          ? {
                              ...prev,
                              modul0: {
                                ...prev.modul0,
                                status_kunjungan: opt.code as
                                  | 'ditemui'
                                  | 'tidak_ditemui'
                                  | 'rumah_kosong',
                              },
                            }
                          : prev
                      )
                    }
                    className={`min-h-[52px] rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                      selected
                        ? 'border-emerald-800 bg-emerald-700 text-white'
                        : 'border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* kunjungan_ke jika tidak_ditemui */}
          {survey.modul0.status_kunjungan === 'tidak_ditemui' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <label className="block text-base font-bold text-slate-900">
                Kunjungan ke- (kunjungan_ke) <span className="text-rose-700">*</span>
              </label>
              <p className="text-sm text-slate-600">Maksimal tiga kali kunjungan</p>
              <div className="grid grid-cols-3 gap-2.5">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      setSurvey((prev) =>
                        prev
                          ? { ...prev, modul0: { ...prev.modul0, kunjungan_ke: n } }
                          : prev
                      )
                    }
                    className={`min-h-[52px] rounded-xl border font-mono text-lg font-bold ${
                      survey.modul0.kunjungan_ke === n
                        ? 'border-emerald-800 bg-emerald-700 text-white'
                        : 'border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    Ke-{n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Persetujuan jika ditemui */}
          {survey.modul0.status_kunjungan === 'ditemui' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                  Bacakan kepada responden (teks_persetujuan)
                </p>
                <p className="text-base leading-relaxed text-slate-900">{CONSENT_TEXT}</p>
              </div>

              <div className="space-y-2">
                <label className="block text-base font-bold text-slate-900">
                  Apakah Bapak/Ibu bersedia diwawancarai? (persetujuan){' '}
                  <span className="text-rose-700">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {OPTION_LISTS.ya_tidak.map((opt) => {
                    const selected = survey.modul0.persetujuan === opt.code;
                    return (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() =>
                          setSurvey((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  modul0: {
                                    ...prev.modul0,
                                    persetujuan: opt.code as 'ya' | 'tidak',
                                    persetujuan_waktu: new Date().toISOString(),
                                  },
                                }
                              : prev
                          )
                        }
                        className={`min-h-[52px] rounded-xl border px-4 py-3 text-base font-bold transition ${
                          selected
                            ? opt.code === 'ya'
                              ? 'border-emerald-800 bg-emerald-700 text-white'
                              : 'border-rose-800 bg-rose-700 text-white'
                            : 'border-slate-300 bg-slate-50 text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {survey.modul0.persetujuan_waktu && (
                  <p className="text-xs text-slate-600 tabular-nums">
                    Waktu persetujuan tercatat:{' '}
                    {new Date(survey.modul0.persetujuan_waktu).toLocaleString('id-ID')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Foto bagian depan rumah jika bersedia */}
          {survey.modul0.status_kunjungan === 'ditemui' &&
            survey.modul0.persetujuan === 'ya' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div>
                  <p className="text-base font-bold text-slate-900">
                    Foto bagian depan rumah (foto_rumah)
                  </p>
                  <p className="text-sm text-slate-600">
                    Ambil setelah warga setuju. Hindari wajah orang dalam foto. Otomatis
                    dikompresi ke sisi terpanjang 1024 piksel dan disimpan di perangkat
                    (IndexedDB).
                  </p>
                </div>

                {photoDisabledMsg ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    {photoDisabledMsg}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {photo ? (
                      <div className="space-y-2">
                        <img
                          src={photo.dataUrl}
                          alt={`Foto rumah ${household.id_rt}`}
                          className="max-h-64 w-full rounded-xl border border-slate-300 object-cover"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 tabular-nums">
                          <span>
                            {photo.width}×{photo.height} px ·{' '}
                            {Math.round(photo.sizeBytes / 1024)} KB (Tersimpan lokal)
                          </span>
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-rose-300 px-3 py-1.5 font-semibold text-rose-800 hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Hapus Foto</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex min-h-[56px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-800 hover:bg-slate-100">
                        <Camera className="h-5 w-5 text-emerald-700" />
                        <span>Ambil / Pilih Foto Bagian Depan Rumah</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoUpload}
                          className="sr-only"
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            )}

          {/* Pemberitahuan berhenti awal */}
          {isEarlyStop && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-bold">Kuesioner Berhenti di Modul 0</p>
              <p className="mt-1">
                Karena status kunjungan bukan &ldquo;Ditemui&rdquo; atau responden tidak
                bersedia diwawancarai, Anda akan langsung diarahkan ke layar Ringkasan untuk
                mencatat kunjungan ini.
              </p>
            </div>
          )}

          {/* Riwayat Kunjungan Sebelumnya */}
          {visitHistory.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
              <h3 className="text-sm font-bold text-slate-900">
                Riwayat Kunjungan Sebelumnya ({visitHistory.length})
              </h3>
              <div className="divide-y divide-slate-100">
                {visitHistory.map((v) => (
                  <div key={v.id} className="py-2 text-xs text-slate-700 flex flex-wrap justify-between gap-2">
                    <span>
                      <strong>{v.status_kunjungan}</strong>
                      {v.kunjungan_ke ? ` (ke-${v.kunjungan_ke})` : ''}
                      {v.persetujuan ? ` · Persetujuan: ${v.persetujuan}` : ''}
                    </span>
                    <span className="font-mono tabular-nums text-slate-500">
                      {new Date(v.createdAt).toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODUL A */}
      {step === 'modulA' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-bold text-slate-900">
              Modul A. Rumah Tangga, Perumahan & Ekonomi
            </h2>
            <p className="text-sm text-slate-600">
              Isian bersyarat muncul otomatis sesuai jawaban sebelumnya.
            </p>
          </div>

          {modulASections.map((sec) => (
            <section key={sec} className="space-y-3">
              <h3 className="text-base font-bold text-emerald-900 px-1">{sec}</h3>
              {MODUL_A_QUESTIONS.filter((q) => q.section === sec).map((q) => (
                <QuestionRenderer
                  key={q.code}
                  question={q}
                  data={computedModulA}
                  value={computedModulA[q.code] as AnswerValue}
                  onChange={updateModulA}
                  showValidation={showErrors}
                />
              ))}
            </section>
          ))}
        </div>
      )}

      {/* MODUL B */}
      {step === 'modulB' && (
        <div className="space-y-4">
          {activeMemberIdx === null ? (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    Modul B. Daftar Anggota Rumah Tangga
                  </h2>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-300 px-2.5 py-1 font-mono text-xs font-bold text-emerald-900 tabular-nums">
                    <Users className="h-3.5 w-3.5" />
                    {survey.modulB.length} / {jumlahArt || 0} Anggota
                  </span>
                </div>
                <p className="text-sm text-slate-600">
                  Ketuk kartu setiap anggota untuk mengisi rincian individu. Anggota pertama
                  adalah kepala rumah tangga.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {survey.modulB.map((m, idx) => {
                  const complete = isMemberComplete(m, idx, pii);
                  const age = computeAgeYears(m.tgl_lahir);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActiveMemberIdx(idx);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition hover:bg-slate-50 ${
                        complete
                          ? 'border-emerald-400 bg-emerald-50/40'
                          : 'border-amber-300 bg-white'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-500 tabular-nums">
                            #{idx + 1}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                              complete
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {complete ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" /> Selesai
                              </>
                            ) : (
                              'Belum lengkap'
                            )}
                          </span>
                        </div>
                        <div className="truncate text-base font-bold text-slate-900">
                          {String(m.nama || `Anggota #${idx + 1} (belum dinamai)`)}
                        </div>
                        <div className="text-xs text-slate-600 tabular-nums">
                          {OPTION_LISTS.hubungan.find((o) => o.code === m.hubungan)?.label ||
                            'Hubungan belum dipilih'}
                          {age !== undefined && age >= 0 ? ` · ${age} tahun` : ''}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveMemberIdx(null)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Semua Kartu Anggota</span>
                </button>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-emerald-700" />
                  <span className="text-base font-bold text-slate-900">
                    Anggota #{activeMemberIdx + 1} dari {survey.modulB.length}
                  </span>
                </div>
              </div>

              {(() => {
                const memberData = buildMemberWithPii(
                  survey.modulB[activeMemberIdx] || {},
                  activeMemberIdx,
                  pii
                );
                return modulBSections.map((sec) => {
                  const secQuestions = MODUL_B_QUESTIONS.filter((q) => q.section === sec);
                  return (
                    <section key={sec} className="space-y-3">
                      <h3 className="text-base font-bold text-emerald-900 px-1">{sec}</h3>
                      {secQuestions.map((q) => (
                        <QuestionRenderer
                          key={`${activeMemberIdx}-${q.code}`}
                          question={q}
                          data={memberData}
                          value={memberData[q.code] as AnswerValue}
                          onChange={(code, val) => updateModulB(activeMemberIdx, code, val)}
                          showValidation={showErrors}
                        />
                      ))}
                    </section>
                  );
                });
              })()}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <button
                  type="button"
                  disabled={activeMemberIdx === 0}
                  onClick={() => {
                    setActiveMemberIdx((i) => (i !== null && i > 0 ? i - 1 : i));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="min-h-[48px] rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800 disabled:opacity-40"
                >
                  Anggota Sebelumnya
                </button>
                {activeMemberIdx < survey.modulB.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMemberIdx((i) => (i !== null ? i + 1 : 0));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="min-h-[48px] rounded-xl bg-emerald-700 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                  >
                    Anggota Berikutnya
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMemberIdx(null);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="min-h-[48px] rounded-xl bg-emerald-700 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                  >
                    Selesai Anggota Ini
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODUL C */}
      {step === 'modulC' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-bold text-slate-900">
              Modul C. Persepsi Sampah & Kehidupan Keagamaan
            </h2>
            <p className="text-sm text-slate-600">
              Diisi oleh satu responden dewasa (usia 17 tahun ke atas) dalam rumah tangga.
            </p>
          </div>

          {modulCSections.map((sec) => (
            <section key={sec} className="space-y-3">
              <h3 className="text-base font-bold text-emerald-900 px-1">{sec}</h3>
              {modulCOnlyQuestions
                .filter((q) => q.section === sec)
                .map((q) => (
                  <QuestionRenderer
                    key={q.code}
                    question={q}
                    data={survey.modulC}
                    value={survey.modulC[q.code]}
                    onChange={updateModulC}
                    showValidation={showErrors}
                  />
                ))}
            </section>
          ))}
        </div>
      )}

      {/* PENUTUP */}
      {step === 'penutup' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-bold text-slate-900">Penutup Wawancara</h2>
            <p className="text-sm text-slate-600">
              Catat kendala lapangan atau hal khusus sebelum memeriksa Ringkasan.
            </p>
          </div>
          {penutupQuestions.map((q) => (
            <QuestionRenderer
              key={q.code}
              question={q}
              data={survey.modulC}
              value={survey.modulC[q.code]}
              onChange={updateModulC}
              showValidation={showErrors}
            />
          ))}
        </div>
      )}

      {/* RINGKASAN */}
      {step === 'ringkasan' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-emerald-700" />
              <h2 className="text-lg font-bold text-slate-900">
                Ringkasan & Pemeriksaan Validasi
              </h2>
            </div>
            <p className="text-sm text-slate-600">
              Periksa seluruh galat dan peringatan sebelum menyimpan hasil kunjungan ke
              perangkat.
            </p>
          </div>

          {/* Ringkasan Kunjungan */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="text-slate-600">Status Kunjungan:</span>
              <span className="font-bold text-slate-900">
                {OPTION_LISTS.kunjungan.find(
                  (o) => o.code === survey.modul0.status_kunjungan
                )?.label || 'Belum dipilih'}
              </span>
            </div>
            {survey.modul0.status_kunjungan === 'ditemui' && (
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-slate-600">Persetujuan Wawancara:</span>
                <span className="font-bold text-slate-900">
                  {survey.modul0.persetujuan === 'ya'
                    ? 'Ya (Bersedia)'
                    : survey.modul0.persetujuan === 'tidak'
                    ? 'Tidak bersedia'
                    : 'Belum dipilih'}
                </span>
              </div>
            )}
            <div className="flex flex-wrap justify-between gap-2">
              <span className="text-slate-600">Koordinat Lokasi:</span>
              <span className="inline-flex items-center gap-1 font-mono font-semibold text-slate-900 tabular-nums">
                <MapPin className="h-4 w-4 text-emerald-700" />
                {survey.modul0.lokasi
                  ? `${survey.modul0.lokasi.lat.toFixed(6)}, ${survey.modul0.lokasi.lng.toFixed(6)} (${survey.modul0.lokasi.method})`
                  : 'Belum diambil'}
              </span>
            </div>
          </div>

          {/* Galat Memblokir */}
          {validation.errors.length > 0 ? (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-base font-bold text-rose-900">
                <XCircle className="h-5 w-5 shrink-0" />
                <span>
                  {validation.errors.length} Galat Wajib Diperbaiki (Memblokir Kirim)
                </span>
              </div>
              <ul className="space-y-2">
                {validation.errors.map((err) => (
                  <li
                    key={err.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-white p-3 text-sm text-rose-950"
                  >
                    <span>{err.message}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowErrors(true);
                        if (err.module === 'modul0') setStep('modul0');
                        else if (err.module === 'modulA' || err.module === 'lintas')
                          setStep('modulA');
                        else if (err.module === 'modulB') {
                          setStep('modulB');
                          if (err.memberIndex !== undefined)
                            setActiveMemberIdx(err.memberIndex);
                        } else if (err.module === 'modulC') setStep('modulC');
                      }}
                      className="min-h-[36px] rounded-lg bg-rose-700 px-3 py-1 text-xs font-bold text-white hover:bg-rose-800"
                    >
                      Perbaiki
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 flex items-center gap-3 text-emerald-950">
              <CheckCircle2 className="h-6 w-6 text-emerald-700 shrink-0" />
              <div>
                <p className="font-bold">Tidak ada galat pemblokir</p>
                <p className="text-sm">Seluruh isian wajib dan aturan silang terpenuhi.</p>
              </div>
            </div>
          )}

          {/* Peringatan Konfirmasi */}
          {validation.warnings.length > 0 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-base font-bold text-amber-950">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700" />
                <span>
                  {validation.warnings.length} Peringatan (Boleh Dilanjutkan dengan Konfirmasi)
                </span>
              </div>
              <ul className="space-y-1.5 list-disc pl-5 text-sm text-amber-950">
                {validation.warnings.map((w) => (
                  <li key={w.id}>{w.message}</li>
                ))}
              </ul>
              <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border border-amber-300 bg-white p-3 text-sm font-bold text-slate-900">
                <input
                  type="checkbox"
                  checked={survey.warningsConfirmed}
                  onChange={(e) =>
                    setSurvey((prev) =>
                      prev ? { ...prev, warningsConfirmed: e.target.checked } : prev
                    )
                  }
                  className="h-5 w-5 accent-emerald-700"
                />
                <span>
                  Saya telah memverifikasi kondisi lapangan dan tetap melanjutkan simpan data.
                </span>
              </label>
            </div>
          )}

          {submitError && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-bold text-rose-900">
              {submitError}
            </div>
          )}

          <button
            type="button"
            disabled={
              submitting ||
              validation.errors.length > 0 ||
              (validation.warnings.length > 0 && !survey.warningsConfirmed)
            }
            onClick={handleSubmitFinal}
            className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-3.5 text-base font-bold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
          >
            <Save className="h-5 w-5" />
            <span>
              {submitting
                ? 'Menyimpan Kunjungan…'
                : isEarlyStop
                ? 'Simpan Catatan Kunjungan'
                : 'Kirim & Simpan Hasil Pencacahan'}
            </span>
          </button>
        </div>
      )}

      {/* Bilah navigasi bawah ringkas (<= 15% cap) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md px-4 py-2.5">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <button
            type="button"
            disabled={step === 'modul0'}
            onClick={goPrevStep}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Sebelumnya</span>
          </button>

          <span className="text-xs font-semibold text-slate-600 tabular-nums">
            {STEPS[currentStepIdx]?.label} ({currentStepIdx + 1}/{STEPS.length})
          </span>

          {step !== 'ringkasan' ? (
            <button
              type="button"
              onClick={goNextStep}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-800"
            >
              <span>{isEarlyStop ? 'Ke Ringkasan' : 'Lanjut'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={
                submitting ||
                validation.errors.length > 0 ||
                (validation.warnings.length > 0 && !survey.warningsConfirmed)
              }
              onClick={handleSubmitFinal}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:bg-slate-300 disabled:text-slate-600"
            >
              <Save className="h-4 w-4" />
              <span>Kirim</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
