import React from 'react';
import { AlertCircle, Check, Lock } from 'lucide-react';
import { OPTION_LISTS, type QuestionDef } from '../data/instrument';
import { isQuestionRelevant, maskIdNumber, validateSingleQuestion } from '../lib/xlsform';
import type { AnswerValue } from '../types/census';

interface QuestionRendererProps {
  question: QuestionDef;
  data: Record<string, unknown>;
  value: AnswerValue;
  onChange: (code: string, val: AnswerValue) => void;
  showValidation?: boolean;
  readOnly?: boolean;
  maskPii?: boolean;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  data,
  value,
  onChange,
  showValidation = false,
  readOnly = false,
  maskPii = false,
}) => {
  if (!isQuestionRelevant(question, data)) {
    return null;
  }

  const error = showValidation ? validateSingleQuestion(question, data) : null;

  if (question.type === 'note') {
    let displayNote = question.label;
    if (question.code === 'info_usia') {
      const usiaVal = data.usia;
      displayNote =
        usiaVal !== undefined && usiaVal !== ''
          ? `Usia terhitung otomatis: ${usiaVal} tahun`
          : 'Usia akan dihitung otomatis setelah tanggal lahir diisi.';
    }
    return (
      <div className="rounded-xl border border-slate-300 bg-slate-100/80 p-3.5 text-sm font-medium text-slate-800">
        {displayNote}
      </div>
    );
  }

  if (question.type === 'calculate') {
    const computedVal = data[question.code];
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-emerald-950">{question.label}</span>
          <span className="font-mono text-lg font-bold text-emerald-800 tabular-nums">
            {computedVal !== undefined && computedVal !== '' ? String(computedVal) : '—'}
          </span>
        </div>
      </div>
    );
  }

  const options = question.listName ? OPTION_LISTS[question.listName] || [] : [];

  const toggleMultiOption = (optCode: string) => {
    if (readOnly) return;
    const current = Array.isArray(value) ? [...value] : [];
    const exists = current.includes(optCode);
    const next = exists ? current.filter((c) => c !== optCode) : [...current, optCode];
    onChange(question.code, next);
  };

  // Evaluate live multi-select exclusivity warning immediately even before submit
  const liveExclusiveError =
    question.type === 'select_multiple' &&
    Array.isArray(value) &&
    question.exclusiveCodes?.some((c) => value.includes(c)) &&
    value.length > 1
      ? question.exclusiveMessage || "Opsi 'Tidak ada' tidak boleh dipilih bersama opsi lain."
      : null;

  const activeError = liveExclusiveError || error;

  const displayedTextValue =
    question.isPii && maskPii && typeof value === 'string' && value.length > 0
      ? maskIdNumber(value)
      : value !== undefined
      ? String(value)
      : '';

  return (
    <div
      id={`q-${question.code}`}
      className={`space-y-2.5 rounded-2xl border bg-white p-4 transition-colors ${
        activeError ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
      }`}
    >
      <div className="space-y-1">
        <label className="block text-base font-bold leading-snug text-slate-900">
          {question.label}{' '}
          {question.required && <span className="text-rose-700" aria-hidden="true">*</span>}
        </label>
        {question.hint && <p className="text-sm text-slate-600">{question.hint}</p>}
        {question.isPii && (
          <p className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
            <Lock className="h-3.5 w-3.5" />
            <span>Disimpan terpisah dari data analisis dan disamarkan bagi non-Admin.</span>
          </p>
        )}
      </div>

      {question.type === 'text' && (
        <input
          type="text"
          readOnly={readOnly || (question.isPii && maskPii)}
          inputMode={question.isPii ? 'numeric' : 'text'}
          maxLength={question.isPii ? 16 : 250}
          value={displayedTextValue}
          onChange={(e) => {
            const raw = question.isPii ? e.target.value.replace(/\D/g, '') : e.target.value;
            onChange(question.code, raw);
          }}
          placeholder={question.isPii ? '16 digit angka (opsional)' : 'Ketik jawaban…'}
          className="w-full min-h-[50px] rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 disabled:bg-slate-100"
        />
      )}

      {(question.type === 'integer' || question.type === 'decimal') && (
        <input
          type="number"
          readOnly={readOnly}
          inputMode={question.type === 'integer' ? 'numeric' : 'decimal'}
          step={question.type === 'integer' ? '1' : '0.1'}
          min={question.min}
          max={question.max}
          value={value !== undefined ? String(value) : ''}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              onChange(question.code, undefined);
              return;
            }
            const parsed = question.type === 'integer' ? parseInt(raw, 10) : parseFloat(raw);
            if (!Number.isNaN(parsed)) {
              onChange(question.code, parsed);
            }
          }}
          placeholder="0"
          className="w-full min-h-[50px] rounded-xl border border-slate-300 bg-white px-4 font-mono text-lg font-semibold text-slate-900 tabular-nums focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
        />
      )}

      {question.type === 'date' && (
        <input
          type="date"
          readOnly={readOnly}
          min="1900-01-01"
          max={new Date().toISOString().slice(0, 10)}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(question.code, e.target.value)}
          className="w-full min-h-[50px] rounded-xl border border-slate-300 bg-white px-4 font-mono text-base font-semibold text-slate-900 tabular-nums focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
        />
      )}

      {question.type === 'select_one' && (
        <div
          className={`grid gap-2.5 ${
            options.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'
          }`}
        >
          {options.map((opt) => {
            const selected = value === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                disabled={readOnly}
                onClick={() => onChange(question.code, opt.code)}
                className={`flex min-h-[50px] w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition active:scale-[0.99] ${
                  selected
                    ? 'border-emerald-800 bg-emerald-700 text-white shadow-sm'
                    : 'border-slate-300 bg-slate-50/70 text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className="leading-snug">{opt.label}</span>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    selected
                      ? 'border-white bg-white text-emerald-800'
                      : 'border-slate-400 bg-white'
                  }`}
                >
                  {selected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {question.type === 'select_multiple' && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {options.map((opt) => {
            const currentArr = Array.isArray(value) ? value : [];
            const selected = currentArr.includes(opt.code);
            return (
              <button
                key={opt.code}
                type="button"
                disabled={readOnly}
                onClick={() => toggleMultiOption(opt.code)}
                className={`flex min-h-[50px] w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition active:scale-[0.99] ${
                  selected
                    ? 'border-emerald-800 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-700'
                    : 'border-slate-300 bg-slate-50/70 text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className="leading-snug">{opt.label}</span>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                    selected
                      ? 'border-emerald-700 bg-emerald-700 text-white'
                      : 'border-slate-400 bg-white'
                  }`}
                >
                  {selected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {activeError && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{activeError}</span>
        </div>
      )}
    </div>
  );
};
