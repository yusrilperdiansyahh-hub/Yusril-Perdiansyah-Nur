import { forwardAppsScriptRequest } from '../../shared/appsScriptProxy.ts';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, error: 'Method tidak diizinkan.' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }

  let parsedBody: Record<string, unknown> = {};
  try {
    parsedBody = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Payload JSON tidak valid.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }

  const result = await forwardAppsScriptRequest(
    parsedBody.appsScriptUrl,
    parsedBody.payload
  );
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
