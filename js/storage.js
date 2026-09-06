'use strict';

/**
 * @fileoverview storage.js — localStorage kalıcılığı ve feed önbelleği.
 *
 * Bu modül iki sorumluluğu yönetir:
 *
 * 1. **Uygulama durumu kalıcılığı** (`saveState` / `loadState`)
 *    state.js'deki `state` nesnesinin ilgili alanlarını JSON olarak localStorage'a yazar
 *    ve uygulama başladığında geri okur. Böylece kaynaklar, notlar, vurgular ve
 *    tipografi ayarları sayfa yenilemelerinde korunur.
 *
 * 2. **Feed yanıt önbelleği** (`getCachedFeed` / `setCachedFeed` / `clearFeedCache`)
 *    Her başarılı proxy yanıtı `FEED_CACHE_TTL` (15 dk) boyunca localStorage'da saklanır.
 *    Aynı oturumda aynı URL için proxy'e tekrar istek atılmaz; bu sayede rate limit
 *    baskısı azalır ve yükleme süresi kısalır.
 *
 * localStorage Anahtar Şeması:
 * ┌─────────────────────┬──────────────────────────────────────────────────┐
 * │ Anahtar             │ Değer                                            │
 * ├─────────────────────┼──────────────────────────────────────────────────┤
 * │ rss_feeds           │ JSON — FeedItem[]                                │
 * │ rss_articles        │ JSON — ArticleItem[]                             │
 * │ rss_layout          │ string — 'list' | 'grid'                         │
 * │ rss_notes           │ JSON — { [articleId]: string }                   │
 * │ rss_highlights      │ JSON — { [articleId]: Highlight[] }              │
 * │ rss_readHistory     │ JSON — { [articleId]: timestamp }                │
 * │ rss_typo            │ JSON — TypoSettings                              │
 * │ rss_daysFilter      │ string — number ('7' veya '0')                   │
 * │ rss_fc_<hash>       │ JSON — { ts: number, data: object } (önbellek)   │
 * └─────────────────────┴──────────────────────────────────────────────────┘
 *
 * Bağımlılıklar: state.js (state nesnesi), config.js (FEED_CACHE_TTL)
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. UYGULAMA DURUMU KAYDETME / YÜKLEME
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mevcut uygulama durumunu localStorage'a yazar.
 *
 * Yalnızca kalıcı olması gereken alanlar yazılır; `activeFilter`, `searchQuery`
 * gibi geçici oturum değerleri atlanır.
 *
 * Tüm yazma işlemleri try/catch içinde sarılıdır çünkü:
 * - localStorage bazı tarayıcılarda gizli modda devre dışıdır
 * - Depolama kotası dolduğunda QuotaExceededError fırlatılabilir
 *
 * Çağrıldığı yerler: feed ekleme/silme, makale okuma/yıldızlama,
 * not/vurgu kaydetme, layout ve tipografi değişikliği.
 *
 * @returns {void}
 */
function saveState() {
  try {
    localStorage.setItem('rss_feeds',       JSON.stringify(state.feeds));
    localStorage.setItem('rss_articles',    JSON.stringify(state.articles));
    localStorage.setItem('rss_layout',      state.layout);
    localStorage.setItem('rss_notes',       JSON.stringify(state.notes));
    localStorage.setItem('rss_highlights',  JSON.stringify(state.highlights));
    localStorage.setItem('rss_readHistory', JSON.stringify(state.readHistory));
    localStorage.setItem('rss_typo',        JSON.stringify(state.typo));
    localStorage.setItem('rss_daysFilter',  String(state.daysFilter));
  } catch (_) {
    // Sessizce geç — kullanıcı deneyimi bozulmasın
  }
}

/**
 * localStorage'daki kayıtlı durumu `state` nesnesine yükler.
 *
 * Her alan ayrı ayrı kontrol edilir; herhangi biri eksikse veya bozuksa
 * diğerleri yüklenmeye devam eder. `state.typo` için `Object.assign` kullanılır:
 * bu sayede gelecekte eklenen yeni tipografi alanları mevcut kayıtları bozmaz.
 *
 * main.js → init() tarafından DOMContentLoaded'dan hemen sonra çağrılır.
 *
 * @returns {void}
 */
function loadState() {
  try {
    const feeds       = localStorage.getItem('rss_feeds');
    const articles    = localStorage.getItem('rss_articles');
    const layout      = localStorage.getItem('rss_layout');
    const notes       = localStorage.getItem('rss_notes');
    const highlights  = localStorage.getItem('rss_highlights');
    const readHistory = localStorage.getItem('rss_readHistory');
    const typo        = localStorage.getItem('rss_typo');
    const days        = localStorage.getItem('rss_daysFilter');

    if (feeds)       state.feeds       = JSON.parse(feeds);
    if (articles)    state.articles    = JSON.parse(articles);
    if (layout)      state.layout      = layout;
    if (notes)       state.notes       = JSON.parse(notes);
    if (highlights)  state.highlights  = JSON.parse(highlights);
    if (readHistory) state.readHistory = JSON.parse(readHistory);
    // Object.assign ile mevcut varsayılanları koru, üzerine yaz
    if (typo)        state.typo        = Object.assign({}, state.typo, JSON.parse(typo));
    if (days)        state.daysFilter  = Number(days);
  } catch (_) {
    // Bozuk JSON veya erişim hatası — state varsayılan değerlerde kalır
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. FEED YANIT ÖNBELLEĞİ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Belirtilen feed URL'si için önbellekte taze veri varsa döndürür.
 *
 * Önbellek anahtarı, URL'nin base64 kodlanmış ilk 40 karakteridir.
 * Bu yaklaşım uzun URL'leri güvenli anahtar formatına dönüştürür ve
 * farklı URL'lerin çakışma ihtimalini minimize eder.
 *
 * Veri `FEED_CACHE_TTL` ms'den daha önce yazılmışsa geçerli kabul edilir;
 * aksi halde null döner ve feed.js → fetchFeed() proxy'e istek atar.
 *
 * @param {string} feedUrl — Feed'in orijinal URL'si
 * @returns {object|null}  — Önbellekteki feed verisi veya null (miss/expired)
 */
function getCachedFeed(feedUrl) {
  try {
    const key = 'rss_fc_' + btoa(feedUrl).slice(0, 40);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    // TTL kontrolü: kayıt zamanından bu yana geçen süre limiti aştıysa geçersiz
    if (Date.now() - obj.ts > FEED_CACHE_TTL) return null;
    return obj.data;
  } catch (_) {
    return null;
  }
}

/**
 * Başarılı bir proxy yanıtını feed URL'sine bağlı olarak önbelleğe yazar.
 *
 * Yapı: `{ ts: Date.now(), data: <feed verisi> }`
 * `ts` alanı getCachedFeed'de TTL kontrolü için kullanılır.
 *
 * QuotaExceededError durumunda sessizce geçilir; önbellek kritik değil,
 * performans optimizasyonu amaçlıdır.
 *
 * @param {string} feedUrl — Feed'in orijinal URL'si (anahtar hesabında kullanılır)
 * @param {object} data    — Önbelleğe yazılacak parse edilmiş feed verisi
 * @returns {void}
 */
function setCachedFeed(feedUrl, data) {
  try {
    const key = 'rss_fc_' + btoa(feedUrl).slice(0, 40);
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch (_) {
    // Kota doluysa sessizce geç
  }
}

/**
 * `rss_fc_` önekiyle başlayan tüm önbellek girdilerini localStorage'dan siler.
 *
 * Kullanım senaryoları:
 * - Geliştirme/test sırasında önbelleği zorla temizlemek
 * - Gelecekte eklenebilecek "Önbelleği Temizle" UI butonu
 *
 * Not: Bu fonksiyon şu an herhangi bir UI elemanına bağlı değil;
 * gerektiğinde DevTools konsolundan da çağrılabilir.
 *
 * @returns {void}
 */
function clearFeedCache() {
  try {
    Object.keys(localStorage).forEach(function(k) {
      if (k.startsWith('rss_fc_')) localStorage.removeItem(k);
    });
  } catch (_) {}
}
