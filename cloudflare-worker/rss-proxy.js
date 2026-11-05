/**
 * Cloudflare Worker — RSS Proxy
 *
 * Kullanım: GET https://<worker>.workers.dev/rss?url=<encoded-rss-url>
 *
 * ── Rate Limiting ──────────────────────────────────────────────────────────
 * Cloudflare native Rate Limiting API kullanılır (wrangler.toml'da tanımlı).
 * In-memory Map değil — Cloudflare'in dağıtık altyapısı üzerinde çalışır.
 * Key: istemci IP — her IP için dakikada 60 istek limiti.
 * Referans: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
 *
 * ── Cache ──────────────────────────────────────────────────────────────────
 * Cache API (caches.default) + cf fetch options ile edge'de 15 dk cache.
 * Referans: https://developers.cloudflare.com/cache/how-to/cache-using-fetch/
 *
 * ── Deploy ─────────────────────────────────────────────────────────────────
 * 1. npm install -g wrangler
 * 2. wrangler login
 * 3. wrangler.toml içindeki name / account_id alanlarını doldurun.
 * 4. cloudflare-worker/ klasöründen: wrangler deploy
 * 5. Worker URL'sini env.js dosyasına yazın:
 *      window.ENV_CF_WORKER_URL = 'https://rss-proxy.yourname.workers.dev';
 */

const CACHE_TTL_SECONDS = 15 * 60; // 15 dakika

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Max-Age':       '86400',
};

export default {
  /**
   * @param {Request}     request
   * @param {{ RSS_RATE_LIMITER: RateLimit }} env
   * @param {ExecutionContext} ctx
   */
  async fetch(request, env, ctx) {

    // ── OPTIONS preflight ───────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
    }

    // ── Native Rate Limiting ────────────────────────────────────────────
    // Key olarak istemci IP kullanılır; her Cloudflare lokasyonunda ayrı sayılır.
    // https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';

    const { success } = await env.RSS_RATE_LIMITER.limit({ key: clientIp });
    if (!success) {
      return new Response('Too Many Requests — rate limit exceeded', {
        status:  429,
        headers: { ...CORS_HEADERS, 'Retry-After': '60' },
      });
    }

    // ── Parametre kontrolü ──────────────────────────────────────────────
    const reqUrl  = new URL(request.url);
    const feedUrl = reqUrl.searchParams.get('url');

    if (!feedUrl) {
      return new Response('Missing ?url= parameter', { status: 400, headers: CORS_HEADERS });
    }

    let parsedFeedUrl;
    try {
      parsedFeedUrl = new URL(feedUrl);
      if (parsedFeedUrl.protocol !== 'http:' && parsedFeedUrl.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
    } catch (_) {
      return new Response('Invalid URL', { status: 400, headers: CORS_HEADERS });
    }

    // ── Cache API — edge cache lookup ───────────────────────────────────
    // https://developers.cloudflare.com/cache/how-to/cache-using-fetch/
    const cache    = caches.default;
    const cacheKey = new Request(parsedFeedUrl.toString(), { method: 'GET' });

    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      const headers = new Headers(cachedResponse.headers);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v));
      headers.set('X-Cache', 'HIT');
      return new Response(cachedResponse.body, {
        status:  cachedResponse.status,
        headers,
      });
    }

    // ── Cache MISS — origin fetch ───────────────────────────────────────
    // cf objesi Cloudflare edge cache'ini de devreye alır.
    // https://developers.cloudflare.com/cache/how-to/cache-using-fetch/#caching-html-resources
    let originResponse;
    try {
      originResponse = await fetch(parsedFeedUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NewRssFeed/1.0)',
          'Accept':     'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        },
        cf: {
          cacheTtl:        CACHE_TTL_SECONDS,
          cacheEverything: true,
        },
        signal: AbortSignal.timeout(10000),
      });
    } catch (err) {
      return new Response('Upstream fetch failed: ' + err.message, {
        status:  502,
        headers: CORS_HEADERS,
      });
    }

    if (!originResponse.ok) {
      return new Response('Upstream returned ' + originResponse.status, {
        status:  502,
        headers: CORS_HEADERS,
      });
    }

    const contentType = originResponse.headers.get('Content-Type') || 'text/xml; charset=utf-8';
    const body        = await originResponse.text();

    // Cache'e yaz — ctx.waitUntil response'u bloklamaz
    // https://developers.cloudflare.com/workers/runtime-apis/context/#waituntil
    const responseToCache = new Response(body, {
      status:  200,
      headers: {
        'Content-Type':  contentType,
        'Cache-Control': 'public, max-age=' + CACHE_TTL_SECONDS,
      },
    });
    ctx.waitUntil(cache.put(cacheKey, responseToCache));

    return new Response(body, {
      status:  200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type':  contentType,
        'X-Cache':       'MISS',
        'Cache-Control': 'public, max-age=' + CACHE_TTL_SECONDS,
      },
    });
  },
};
