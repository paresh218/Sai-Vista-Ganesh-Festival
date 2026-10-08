// Optional Cloudflare Worker: captures the connecting IP and forwards to the private logger.
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const allowed = (env.ALLOWED_ORIGINS || 'https://saivistaculturalcommittee.in,https://www.saivistaculturalcommittee.in').split(',').map(value => value.trim());
    if (!allowed.includes(origin)) return new Response('Origin not allowed', { status: 403 });
    const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return new Response('{"ok":false}', { status: 405, headers });
    try {
      if (!env.LOG_SCRIPT_URL || !env.LOG_INGRESS_SECRET) throw Error('Missing configuration');
      const reader = request.body.getReader(); let size = 0, chunks = [];
      while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 14000) { await reader.cancel(); return new Response('{"ok":false}', { status: 413, headers }); } chunks.push(part.value); }
      const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const data = JSON.parse(new TextDecoder().decode(bytes));
      data.trustedIp = request.headers.get('CF-Connecting-IP') || '';
      data.ingressSecret = env.LOG_INGRESS_SECRET;
      const response = await fetch(env.LOG_SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data), redirect: 'follow', signal: AbortSignal.timeout(12000) });
      const result = await response.json();
      return new Response(JSON.stringify({ ok: response.ok && result.ok === true }), { headers, status: response.ok && result.ok === true ? 200 : 502 });
    } catch (_) { return new Response('{"ok":false}', { status: 502, headers }); }
  }
};
