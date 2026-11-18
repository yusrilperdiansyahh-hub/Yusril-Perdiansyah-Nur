import {
  MODUL_A_QUESTIONS,
  MODUL_B_QUESTIONS,
  MODUL_C_QUESTIONS,
  computeAgeYears,
  type QuestionDef,
} from '../data/instrument';
import type {
  MemberAnswers,
  PiiRecord,
  SurveyResponseRecord,
  ValidationIssue,
} from '../types/census';

export function isQuestionRelevant(
  q: QuestionDef,
  data: Record<string, unknown>
): boolean {
  if (!q.relevant) return true;
  try {
    return q.relevant(data);
  } catch {
    return false;
  }
}

export function applyDefaultsAndCalculations(
  questions: QuestionDef[],
  raw: Record<string, unknown>
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...raw };

  for (const q of questions) {
    if (q.defaultValue !== undefined && (next[q.code] === undefined || next[q.code] === '')) {
      next[q.code] = q.defaultValue;
    }
  }

  for (const q of questions) {
    if (q.type === 'calculate' && q.calculate) {
      const val = q.calculate(next);
      if (val !== undefined) {
        next[q.code] = val;
      } else {
        delete next[q.code];
      }
    }
  }

  return next;
}

export function pruneHiddenFields(
  questions: QuestionDef[],
  raw: Record<string, unknown>
): Record<string, unknown> {
  const computed = applyDefaultsAndCalculations(questions, raw);
  const cleaned: Record<string, unknown> = {};

  for (const q of questions) {
    if (q.type === 'note' || q.isPii) continue;
    if (!isQuestionRelevant(q, computed)) continue;
    const val = computed[q.code];
    if (val !== undefined && val !== '') {
      if (Array.isArray(val) && val.length === 0) continue;
      cleaned[q.code] = val;
    }
  }

  return cleaned;
}

export function validateSingleQuestion(
  q: QuestionDef,
  data: Record<string, unknown>
): string | null {
  if (!isQuestionRelevant(q, data)) return null;
  if (q.type === 'note' || q.type === 'calculate') return null;

  const val = data[q.code];
  const isEmpty =
    val === undefined ||
    val === null ||
    val === '' ||
    (Array.isArray(val) && val.length === 0);

  if (q.required && isEmpty) {
    return `${q.label} wajib diisi.`;
  }
  if (isEmpty) return null;

  if (q.type === 'integer' || q.type === 'decimal') {
    const n = Number(val);
    if (!Number.isFinite(n)) return `${q.label} harus berupa angka yang valid.`;
    if (q.type === 'integer' && !Number.isInteger(n)) {
      return `${q.label} harus berupa bilangan bulat.`;
    }
    if (q.min !== undefined && n < q.min) {
      return `${q.label} minimal ${q.min}.`;
    }
    if (q.max !== undefined && n > q.max) {
      return `${q.label} maksimal ${q.max}.`;
    }
    if (q.exclusiveMin !== undefined && n <= q.exclusiveMin) {
      return `${q.label} harus lebih dari ${q.exclusiveMin}.`;
    }
    if (q.exclusiveMax !== undefined && n >= q.exclusiveMax) {
      return `${q.label} harus kurang dari ${q.exclusiveMax}.`;
    }
  }

  if (q.type === 'text' && q.regex) {
    const str = String(val).trim();
    const re = new RegExp(q.regex);
    if (!re.test(str)) {
      return q.regexMessage || `${q.label} tidak sesuai format.`;
    }
  }

  if (q.type === 'date' && q.code === 'tgl_lahir') {
    const str = String(val);
    const todayStr = new Date().toISOString().slice(0, 10);
    if (str > todayStr || str < '1900-01-01') {
      return 'Tanggal lahir tidak valid (tidak boleh di masa depan atau sebelum 1900).';
    }
  }

  if (q.type === 'select_multiple' && Array.isArray(val) && q.exclusiveCodes?.length) {
    const hasExclusive = q.exclusiveCodes.some((c) => val.includes(c));
    if (hasExclusive && val.length > 1) {
      return q.exclusiveMessage || "Opsi 'Tidak ada' / 'Tidak pernah' tidak boleh dipilih bersama opsi lain.";
    }
  }

  return null;
}

export function buildMemberWithPii(
  member: MemberAnswers,
  memberIndex: number,
  pii?: PiiRecord
): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    ...member,
    nik: pii?.nik_anggota?.[memberIndex] ?? member.nik ?? '',
    no_kk: member.hubungan === 'kk' ? pii?.no_kk ?? member.no_kk ?? '' : '',
  };
  return applyDefaultsAndCalculations(MODUL_B_QUESTIONS, merged);
}

export function isMemberComplete(
  member: MemberAnswers,
  memberIndex: number,
  pii?: PiiRecord
): boolean {
  const data = buildMemberWithPii(member, memberIndex, pii);
  for (const q of MODUL_B_QUESTIONS) {
    if (validateSingleQuestion(q, data) !== null) {
      return false;
    }
  }
  return true;
}

export function maskIdNumber(raw?: string): string {
  if (!raw) return '—';
  const clean = raw.trim();
  if (clean.length <= 4) return clean;
  return `${'*'.repeat(clean.length - 4)}${clean.slice(-4)}`;
}

export function validateSurveyComplete(
  survey: SurveyResponseRecord,
  pii?: PiiRecord
): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // Modul 0 validation
  if (!survey.modul0.lokasi) {
    errors.push({
      id: 'm0-lokasi',
      severity: 'error',
      module: 'modul0',
      fieldCode: 'lokasi',
      message: 'Titik lokasi rumah wajib diambil (GPS atau pin manual di peta).',
    });
  } else if (survey.modul0.lokasi.method === 'manual' && !survey.modul0.lokasi.manual_reason?.trim()) {
    errors.push({
      id: 'm0-lokasi-reason',
      severity: 'error',
      module: 'modul0',
      fieldCode: 'lokasi',
      message: 'Alasan penempatan titik manual wajib diisi.',
    });
  } else if (survey.modul0.lokasi.method === 'gps' && survey.modul0.lokasi.accuracy > 20) {
    warnings.push({
      id: 'm0-lokasi-acc',
      severity: 'warning',
      module: 'modul0',
      fieldCode: 'lokasi',
      message: `Akurasi GPS (${Math.round(survey.modul0.lokasi.accuracy)} m) masih di atas 20 meter.`,
    });
  } else if (survey.modul0.lokasi.method === 'gps' && survey.modul0.lokasi.accuracy > 10) {
    warnings.push({
      id: 'm0-lokasi-acc-10',
      severity: 'warning',
      module: 'modul0',
      fieldCode: 'lokasi',
      message: `Akurasi GPS ${Math.round(survey.modul0.lokasi.accuracy)} m (disarankan ≤ 10 m, diterima ≤ 20 m).`,
    });
  }

  const sk = survey.modul0.status_kunjungan;
  if (!sk) {
    errors.push({
      id: 'm0-status',
      severity: 'error',
      module: 'modul0',
      fieldCode: 'status_kunjungan',
      message: 'Hasil kunjungan wajib dipilih.',
    });
    return { errors, warnings };
  }

  if (sk === 'tidak_ditemui') {
    const ke = Number(survey.modul0.kunjungan_ke);
    if (!Number.isInteger(ke) || ke < 1 || ke > 3) {
      errors.push({
        id: 'm0-kunjungan-ke',
        severity: 'error',
        module: 'modul0',
        fieldCode: 'kunjungan_ke',
        message: 'Kunjungan ke- wajib diisi antara 1 hingga 3.',
      });
    }
    return { errors, warnings };
  }

  if (sk === 'rumah_kosong') {
    return { errors, warnings };
  }

  if (!survey.modul0.persetujuan) {
    errors.push({
      id: 'm0-persetujuan',
      severity: 'error',
      module: 'modul0',
      fieldCode: 'persetujuan',
      message: 'Jawaban kesediaan wawancara (persetujuan) wajib dipilih.',
    });
    return { errors, warnings };
  }

  if (survey.modul0.persetujuan === 'tidak') {
    return { errors, warnings };
  }

  // Modul A validation
  const dataA = applyDefaultsAndCalculations(MODUL_A_QUESTIONS, survey.modulA);
  for (const q of MODUL_A_QUESTIONS) {
    const msg = validateSingleQuestion(q, dataA);
    if (msg) {
      errors.push({
        id: `ma-${q.code}`,
        severity: 'error',
        module: 'modulA',
        fieldCode: q.code,
        message: `Modul A (${q.code}): ${msg}`,
      });
    }
  }

  const luasPerKapita = Number(dataA.luas_per_kapita);
  if (Number.isFinite(luasPerKapita) && luasPerKapita < 7.2) {
    warnings.push({
      id: 'warn-luas-kapita',
      severity: 'warning',
      module: 'modulA',
      fieldCode: 'luas_bangunan',
      message: `Luas bangunan per kapita (${luasPerKapita} m²) kurang dari 7,2 m².`,
    });
  }

  if (dataA.keluar_pangan !== undefined && Number(dataA.keluar_pangan) === 0) {
    warnings.push({
      id: 'warn-pangan-0',
      severity: 'warning',
      module: 'modulA',
      fieldCode: 'keluar_pangan',
      message: 'Pengeluaran makanan sebulan terakhir tercatat Rp 0.',
    });
  }

  // Modul B cross-checks & member validations
  const jumlahArt = Number(dataA.jumlah_art || 0);
  if (jumlahArt > 0 && survey.modulB.length !== jumlahArt) {
    errors.push({
      id: 'lintas-art-count',
      severity: 'error',
      module: 'lintas',
      fieldCode: 'jumlah_art',
      message: `Jumlah kartu anggota (${survey.modulB.length}) tidak sama dengan isian jumlah_art (${jumlahArt}).`,
    });
  }

  let kkCount = 0;
  survey.modulB.forEach((rawMember, idx) => {
    const member = buildMemberWithPii(rawMember, idx, pii);
    if (member.hubungan === 'kk') kkCount += 1;

    for (const q of MODUL_B_QUESTIONS) {
      const msg = validateSingleQuestion(q, member);
      if (msg) {
        errors.push({
          id: `mb-${idx}-${q.code}`,
          severity: 'error',
          module: 'modulB',
          memberIndex: idx,
          fieldCode: q.code,
          message: `Anggota #${idx + 1} (${String(member.nama || 'Belum bernama')} · ${q.code}): ${msg}`,
        });
      }
    }

    const usia = computeAgeYears(member.tgl_lahir);
    if (usia !== undefined && usia >= 0) {
      if (usia < 15 && member.status_kawin === 'kawin') {
        warnings.push({
          id: `warn-kawin-muda-${idx}`,
          severity: 'warning',
          module: 'modulB',
          memberIndex: idx,
          message: `Anggota #${idx + 1} (${String(member.nama || '')}) berusia ${usia} tahun (< 15) berstatus kawin.`,
        });
      }
      if (
        usia < 17 &&
        (member.ijazah === 'd1_d3' || member.ijazah === 's1' || member.ijazah === 's2_s3')
      ) {
        warnings.push({
          id: `warn-ijazah-pt-${idx}`,
          severity: 'warning',
          module: 'modulB',
          memberIndex: idx,
          message: `Anggota #${idx + 1} (${String(member.nama || '')}) berusia ${usia} tahun (< 17) dengan ijazah perguruan tinggi.`,
        });
      }
      if (member.hubungan === 'kk' && usia < 17) {
        warnings.push({
          id: `warn-kk-muda-${idx}`,
          severity: 'warning',
          module: 'modulB',
          memberIndex: idx,
          message: `Kepala rumah tangga (${String(member.nama || '')}) berusia ${usia} tahun (< 17).`,
        });
      }
      if (member.hamil === 'ya' && (usia < 15 || usia > 49)) {
        warnings.push({
          id: `warn-hamil-usia-${idx}`,
          severity: 'warning',
          module: 'modulB',
          memberIndex: idx,
          message: `Anggota #${idx + 1} sedang hamil di usia ${usia} tahun (< 15 atau > 49).`,
        });
      }
    }
  });

  if (survey.modulB.length > 0 && kkCount !== 1) {
    errors.push({
      id: 'lintas-kk-count',
      severity: 'error',
      module: 'lintas',
      message:
        kkCount === 0
          ? 'Harus ada tepat 1 anggota berstatus Kepala rumah tangga (kk).'
          : `Terdapat ${kkCount} Kepala rumah tangga; harus tepat 1 Kepala rumah tangga.`,
    });
  }

  // Modul C validation
  const dataC = applyDefaultsAndCalculations(MODUL_C_QUESTIONS, survey.modulC);
  for (const q of MODUL_C_QUESTIONS) {
    const msg = validateSingleQuestion(q, dataC);
    if (msg) {
      errors.push({
        id: `mc-${q.code}`,
        severity: 'error',
        module: 'modulC',
        fieldCode: q.code,
        message: `Modul C (${q.code}): ${msg}`,
      });
    }
  }

  return { errors, warnings };
}
