/**
 * Cloudflare Worker — RSS Proxy
 *
 * Kullanım: GET https://<worker>.workers.dev/rss?url=<encoded-rss-url>
 *
 * DEPLOY TALİMATLARI:
 * ─────────────────────────────────────────────────────────────
 * 1. https://dash.cloudflare.com adresine giriş yapın.
 * 2. Sol menüden "Workers & Pages" → "Create application" → "Create Worker" seçin.
 * 3. Worker adını belirleyin (örn: rss-proxy) ve "Deploy" edin.
 * 4. "Edit code" ekranında bu dosyanın tüm içeriğini yapıştırın.
 * 5. "Save and Deploy" butonuna tıklayın.
 * 6. Worker URL'nizi kopyalayın (örn: https://rss-proxy.youraccount.workers.dev)
 * 7. js/config.js içindeki CF_WORKER_URL sabitini bu URL ile doldurun:
 *      const CF_WORKER_URL = 'https://rss-proxy.youraccount.workers.dev';
 * 8. js/feed.js içindeki buildProxies() fonksiyonu bu URL'yi otomatik kullanacaktır.
 *
 * KVS veya D1 gerekmez; Cache API Cloudflare edge'de ücretsiz çalışır.
 * Rate limiting için basit IP tabanlı in-memory sayaç kullanılır
 * (Workers restart olduğunda sıfırlanır; production için Cloudflare Rate Limiting
 *  ürününü veya KV tabanlı çözümü tercih edin).
 * ─────────────────────────────────────────────────────────────
 */

// In-memory rate limiter — Worker instance başına (production için KV kullanın)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 dakika
const RATE_LIMIT_MAX       = 30;         // dakikada maks istek

function checkRateLimit(ip) {
  const now  = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Max-Age':       '86400',
};

export default {
  async fetch(request, env, ctx) {
    // OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Yalnızca GET kabul et
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
    }

    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (!checkRateLimit(clientIp)) {
      return new Response('Too Many Requests', {
        status: 429,
        headers: { ...CORS_HEADERS, 'Retry-After': '60' },
      });
    }

    const reqUrl  = new URL(request.url);
    const feedUrl = reqUrl.searchParams.get('url');

    if (!feedUrl) {
      return new Response('Missing ?url= parameter', { status: 400, headers: CORS_HEADERS });
    }

    // URL doğrula
    let parsedFeedUrl;
    try {
      parsedFeedUrl = new URL(feedUrl);
      if (parsedFeedUrl.protocol !== 'http:' && parsedFeedUrl.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
    } catch (_) {
      return new Response('Invalid URL', { status: 400, headers: CORS_HEADERS });
    }

    // Cache API — 15 dakika
    const cache    = caches.default;
    const cacheKey = new Request('https://rss-proxy-cache/' + encodeURIComponent(feedUrl));
    const cached   = await cache.match(cacheKey);
    if (cached) {
      const cachedBody = await cached.text();
      return new Response(cachedBody, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type':  cached.headers.get('Content-Type') || 'text/xml; charset=utf-8',
          'X-Cache':       'HIT',
          'Cache-Control': 'public, max-age=900',
        },
      });
    }

    // Origin'den fetch et
    let originResponse;
    try {
      originResponse = await fetch(parsedFeedUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RSSProxy/1.0; +https://github.com)',
          'Accept':     'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(10000),
      });
    } catch (err) {
      return new Response('Upstream fetch failed: ' + err.message, {
        status: 502,
        headers: CORS_HEADERS,
      });
    }

    if (!originResponse.ok) {
      return new Response('Upstream returned ' + originResponse.status, {
        status: 502,
        headers: CORS_HEADERS,
      });
    }

    const contentType = originResponse.headers.get('Content-Type') || 'text/xml; charset=utf-8';
    const body        = await originResponse.text();

    const responseToCache = new Response(body, {
      status: 200,
      headers: {
        'Content-Type':  contentType,
        'Cache-Control': 'public, max-age=900',
      },
    });

    ctx.waitUntil(cache.put(cacheKey, responseToCache.clone()));

    return new Response(body, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type':  contentType,
        'X-Cache':       'MISS',
        'Cache-Control': 'public, max-age=900',
      },
    });
  },
};
