import { getStore } from '@netlify/blobs';

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-fm-pin',
      },
    });
  }

  let store: ReturnType<typeof getStore>;
  try {
    store = getStore('fm-pay-rates');
  } catch (error) {
    return Response.json({ error: 'Rate store unavailable' }, { status: 503, headers });
  }

  if (req.method === 'GET') {
    const data = await store.get('current', { type: 'json' });
    if (!data) return new Response('', { status: 204, headers });
    return Response.json(data, { headers });
  }

  if (req.method === 'PUT') {
    const expected = process.env.TECH_PAY_PIN || process.env.PUBLIC_TECH_PAY_PIN || '';
    const provided = req.headers.get('x-fm-pin') || '';
    if (expected && provided !== expected) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400, headers });
    }

    if (!body || typeof body !== 'object' || !Array.isArray((body as { installationTasks?: unknown }).installationTasks)) {
      return Response.json({ error: 'Invalid rates payload' }, { status: 400, headers });
    }

    await store.setJSON('current', body);
    return Response.json({ ok: true }, { headers });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405, headers });
};

export const config = {
  path: '/api/pay-rates',
};
