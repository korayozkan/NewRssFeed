/**
 * NewRssFeed — Cloudflare Worker RSS Proxy
 *
 * Görevi: Expo/React Native uygulamasının CORS kısıtlaması olmadan
 * RSS/Atom feed'lerini çekebilmesi için proxy görevi yapar.
 *
 * Endpoint:
 *   GET /rss?url=<encoded-feed-url>
 *
 * Örnek:
 *   https://your-worker.workers.dev/rss?url=https%3A%2F%2Fblog.example.com%2Ffeed
 */

export default {
  /**
   * @param {Request} request
   * @param {object} env
   * @returns {Promise<Response>}
   */
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── CORS preflight ─────────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // ── Health check ───────────────────────────────────────────────────────
    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({ status: 'ok', worker: 'NewRssFeed RSS Proxy' });
    }

    // ── RSS proxy endpoint ─────────────────────────────────────────────────
    if (url.pathname === '/rss') {
      const feedUrl = url.searchParams.get('url');

      if (!feedUrl) {
        return jsonResponse({ error: 'url parameter is required' }, 400);
      }

      // Basit URL doğrulama
      let parsedUrl;
      try {
        parsedUrl = new URL(feedUrl);
      } catch {
        return jsonResponse({ error: 'Invalid URL' }, 400);
      }

      // Sadece http(s) izin ver
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return jsonResponse({ error: 'Only http and https URLs are allowed' }, 400);
      }

      try {
        const upstream = await fetch(feedUrl, {
          headers: {
            // Bazı feed sunucuları tarayıcı gibi User-Agent ister
            'User-Agent':
              'Mozilla/5.0 (compatible; NewRssFeed/1.0; +https://github.com/korayozkan/NewRssFeed)',
            Accept:
              'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
          },
          // Cloudflare'ın kendi redirect takibini kapat — bazı feed'lerde sorun çıkarır
          redirect: 'follow',
          // 15 saniye timeout
          signal: AbortSignal.timeout(15_000),
        });

        if (!upstream.ok) {
          return jsonResponse(
            { error: `Upstream returned HTTP ${upstream.status}` },
            upstream.status
          );
        }

        const body = await upstream.text();

        if (!body?.trim()) {
          return jsonResponse({ error: 'Empty response from upstream' }, 502);
        }

        // Orijinal Content-Type'ı koru (RSS/Atom/XML)
        const contentType =
          upstream.headers.get('content-type') ?? 'application/xml; charset=utf-8';

        return new Response(body, {
          status: 200,
          headers: {
            ...corsHeaders(),
            'Content-Type': contentType,
            // Cloudflare edge cache — 5 dakika
            'Cache-Control': 'public, max-age=300, s-maxage=300',
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isTimeout = message.includes('timed out') || message.includes('abort');
        return jsonResponse(
          { error: isTimeout ? 'Request timed out' : `Fetch error: ${message}` },
          isTimeout ? 504 : 502
        );
      }
    }

    // ── 404 ────────────────────────────────────────────────────────────────
    return jsonResponse({ error: 'Not found', hint: 'Use GET /rss?url=<feed-url>' }, 404);
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
