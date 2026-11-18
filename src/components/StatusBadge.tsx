import React from 'react';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  FileEdit,
  Home,
  RotateCcw,
  UserX,
} from 'lucide-react';
import type {
  EnumerationStatus,
  RegistryStatus,
  VerificationStatus,
} from '../types/census';

const ENUM_META: Record<
  EnumerationStatus,
  { label: string; bg: string; text: string; border: string; Icon: React.ElementType }
> = {
  belum_dikunjungi: {
    label: 'Belum dikunjungi',
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-300',
    Icon: Clock,
  },
  draf: {
    label: 'Draf tersimpan',
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    border: 'border-amber-300',
    Icon: FileEdit,
  },
  tercacah: {
    label: 'Tercacah',
    bg: 'bg-emerald-50',
    text: 'text-emerald-900',
    border: 'border-emerald-400',
    Icon: CheckCircle2,
  },
  menolak: {
    label: 'Menolak',
    bg: 'bg-rose-50',
    text: 'text-rose-900',
    border: 'border-rose-300',
    Icon: Ban,
  },
  tidak_ditemui: {
    label: 'Tidak ditemui',
    bg: 'bg-sky-50',
    text: 'text-sky-900',
    border: 'border-sky-300',
    Icon: UserX,
  },
  rumah_kosong: {
    label: 'Rumah kosong',
    bg: 'bg-stone-100',
    text: 'text-stone-800',
    border: 'border-stone-300',
    Icon: Home,
  },
};

export const EnumerationStatusBadge: React.FC<{ status: EnumerationStatus }> = ({
  status,
}) => {
  const m = ENUM_META[status];
  const Icon = m.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${m.bg} ${m.text} ${m.border}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{m.label}</span>
    </span>
  );
};

export const VerificationStatusBadge: React.FC<{ status: VerificationStatus }> = ({
  status,
}) => {
  if (status === 'terverifikasi') {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900 whitespace-nowrap">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>Terverifikasi</span>
      </span>
    );
  }
  if (status === 'dikembalikan') {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-rose-400 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-900 whitespace-nowrap">
        <RotateCcw className="h-3.5 w-3.5" />
        <span>Dikembalikan</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 whitespace-nowrap">
      <AlertCircle className="h-3.5 w-3.5" />
      <span>Menunggu tinjauan</span>
    </span>
  );
};

export const RegistryStatusLabel: React.FC<{ status: RegistryStatus }> = ({ status }) => {
  const labels: Record<RegistryStatus, string> = {
    aktif: 'Aktif',
    pindah: 'Pindah',
    ganda: 'Ganda',
    tidak_ada: 'Tidak ada di lapangan',
  };
  if (status === 'aktif') return null;
  return (
    <span className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900 whitespace-nowrap">
      Status daftar: {labels[status]}
    </span>
  );
};
