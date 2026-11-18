export interface ProxyResult {
  status: number;
  body: Record<string, unknown>;
}

export function validateAppsScriptTarget(rawUrl: string): {
  valid: boolean;
  url?: string;
  error?: string;
} {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'URL Web App Apps Script belum diisi.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      error:
        'Format URL Apps Script tidak valid. Harus diawali https://script.google.com/...',
    };
  }

  if (parsed.protocol !== 'https:' || parsed.hostname !== 'script.google.com') {
    if (parsed.hostname === 'docs.google.com') {
      return {
        valid: false,
        error:
          'URL yang Anda masukkan adalah URL Google Spreadsheet, bukan URL Web App Apps Script. Salin URL Web App berakhiran /exec dari Apps Script → Deploy → Web app.',
      };
    }
    return {
      valid: false,
      error:
        'URL harus berasal dari https://script.google.com/macros/s/.../exec.',
    };
  }

  if (parsed.pathname.endsWith('/dev')) {
    return {
      valid: false,
      error:
        'URL berakhiran /dev adalah tautan uji coba pribadi yang memerlukan login Google. Gunakan URL Web App berakhiran /exec dari Deploy → Manage deployments.',
    };
  }

  if (parsed.pathname.includes('/edit') || parsed.pathname.startsWith('/home/')) {
    return {
      valid: false,
      error:
        'URL editor Apps Script tidak dapat dipanggil langsung. Klik Deploy → New deployment → Web app lalu salin URL yang berakhiran /exec.',
    };
  }

  const validExecPattern = /^\/(a\/[^/]+\/)?macros\/s\/[a-zA-Z0-9_-]+\/exec$/;
  if (!validExecPattern.test(parsed.pathname)) {
    return {
      valid: false,
      error:
        'Format URL Apps Script harus berbentuk https://script.google.com/macros/s/.../exec.',
    };
  }

  return { valid: true, url: parsed.toString() };
}

export async function forwardAppsScriptRequest(
  appsScriptUrl: unknown,
  payload: unknown
): Promise<ProxyResult> {
  const check = validateAppsScriptTarget(String(appsScriptUrl || ''));
  if (!check.valid || !check.url) {
    return {
      status: 400,
      body: { ok: false, error: check.error },
    };
  }

  try {
    const upstream = await fetch(check.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload ?? {}),
      redirect: 'follow',
    });

    if (upstream.url && upstream.url.includes('accounts.google.com')) {
      return {
        status: 403,
        body: {
          ok: false,
          error:
            'Akses Web App Apps Script masih dibatasi akun Google. Buka Apps Script → Deploy → Manage deployments → Edit → ubah "Who has access" menjadi "Anyone" (Siapa saja), lalu Deploy.',
        },
      };
    }

    const rawText = await upstream.text();
    try {
      const parsedJson = JSON.parse(rawText) as Record<string, unknown>;
      return {
        status: upstream.ok ? 200 : upstream.status,
        body: parsedJson,
      };
    } catch {
      const lower = rawText.toLowerCase();
      if (lower.includes('script function not found') || lower.includes('dopost')) {
        return {
          status: 400,
          body: {
            ok: false,
            error:
              'Fungsi doPost tidak ditemukan pada deployment Apps Script Anda. Simpan kode dari panel ini di Apps Script lalu buat New deployment.',
          },
        };
      }
      if (lower.includes('servicelogin') || lower.includes('accounts.google.com')) {
        return {
          status: 403,
          body: {
            ok: false,
            error:
              'Apps Script meminta login Google. Pastikan saat Deploy → Web app, "Who has access" dipilih "Anyone" (Siapa saja).',
          },
        };
      }
      return {
        status: 502,
        body: {
          ok: false,
          error: `Respon Apps Script bukan JSON (HTTP ${upstream.status}). Pastikan kode sudah disimpan dan di-deploy sebagai Web app dengan akses "Anyone".`,
        },
      };
    }
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'Gagal menghubungi server Google Apps Script.';
    return {
      status: 502,
      body: {
        ok: false,
        error: `Koneksi ke Google Apps Script gagal: ${msg}`,
      },
    };
  }
}
