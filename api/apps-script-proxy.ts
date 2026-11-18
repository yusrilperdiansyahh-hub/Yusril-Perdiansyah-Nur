import { forwardAppsScriptRequest } from '../shared/appsScriptProxy.ts';

interface VercelRequestLike {
  method?: string;
  body?: unknown;
}

interface VercelResponseLike {
  status: (code: number) => VercelResponseLike;
  json: (body: unknown) => void;
}

export default async function handler(
  req: VercelRequestLike,
  res: VercelResponseLike
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method tidak diizinkan.' });
    return;
  }

  let parsedBody: Record<string, unknown> = {};
  if (typeof req.body === 'string') {
    try {
      parsedBody = JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      res.status(400).json({ ok: false, error: 'Payload JSON tidak valid.' });
      return;
    }
  } else if (req.body && typeof req.body === 'object') {
    parsedBody = req.body as Record<string, unknown>;
  }

  const result = await forwardAppsScriptRequest(
    parsedBody.appsScriptUrl,
    parsedBody.payload
  );
  res.status(result.status).json(result.body);
}
