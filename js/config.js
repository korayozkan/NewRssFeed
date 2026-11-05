'use strict';

/**
 * @fileoverview config.js — Uygulama genelinde kullanılan sabitler ve yapılandırma değerleri.
 *
 * Bu dosya hiçbir fonksiyon veya durum içermez; yalnızca okunabilir sabitler tanımlar.
 * Diğer tüm modüller bu sabitlere global olarak erişir.
 *
 * İçindekiler:
 *  1. DEFAULT_FEEDS      — Uygulamanın ilk açılışında yüklenen varsayılan RSS kaynakları
 *  2. SMART_CATEGORIES   — Otomatik etiketleme için anahtar kelime kümeleri
 *  3. SEVEN_DAYS         — Zaman filtresi için milisaniye sabiti
 *  4. FEED_CACHE_TTL     — Feed önbellek geçerlilik süresi
 *  5. FONT_MAP           — Tipografi paneli için font ailesi eşlemesi
 *  6. PLATFORM_HINTS     — Hızlı ekleme butonlarına ait ipucu metinleri
 *  7. PLATFORM_DIRECT    — API key gerektirmeyen direkt RSS adresleri
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. VARSAYILAN KAYNAKLAR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Uygulamanın ilk çalıştırmasında localStorage boşsa yüklenen feed listesi.
 * Her kayıt şu alanları içerir:
 *
 * @type {Array<{id: string, name: string, url: string}>}
 * @property {string} id   — Benzersiz sabit tanımlayıcı (slug formatı)
 * @property {string} name — Kullanıcıya gösterilen kaynak adı
 * @property {string} url  — Ham RSS/Atom feed URL'si
 */
const DEFAULT_FEEDS = [
  { id: 'bbc-world',  name: 'BBC World',    url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { id: 'techcrunch', name: 'TechCrunch',   url: 'https://techcrunch.com/feed/' },
  { id: 'ars',        name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. AKILLI KATEGORİLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Makale başlığı ve açıklamasındaki anahtar kelimelere göre otomatik etiket atar.
 *
 * feed.js → detectTags() fonksiyonu bu listeyi tarar. Bir makalenin tam metni
 * herhangi bir kategorinin keyword dizisinde bir eşleşme içeriyorsa o kategorinin
 * label değeri makaleye etiket olarak eklenir.
 *
 * @type {Array<{label: string, keywords: string[]}>}
 * @property {string}   label    — Kullanıcıya gösterilen etiket adı (Türkçe)
 * @property {string[]} keywords — Küçük harfle karşılaştırılan İngilizce anahtar kelimeler
 */
const SMART_CATEGORIES = [
  {
    label: 'Teknoloji',
    keywords: [
      'ai', 'tech', 'software', 'hardware', 'app', 'robot', 'code', 'cyber',
      'internet', 'digital', 'startup', 'silicon', 'apple', 'google', 'microsoft',
      'samsung', 'iphone', 'android', 'technology', 'computer', 'data', 'cloud',
    ],
  },
  {
    label: 'Bilim',
    keywords: [
      'science', 'research', 'study', 'nasa', 'space', 'climate', 'biology',
      'physics', 'chemistry', 'health', 'medical', 'brain', 'gene', 'evolution',
      'universe', 'planet', 'scientists',
    ],
  },
  {
    label: 'Finans',
    keywords: [
      'market', 'stock', 'crypto', 'bitcoin', 'economy', 'finance', 'bank',
      'invest', 'dollar', 'euro', 'trade', 'recession', 'inflation', 'gdp',
      'startup', 'ipo', 'fund',
    ],
  },
  {
    label: 'Politika',
    keywords: [
      'election', 'president', 'government', 'congress', 'senate', 'law', 'policy',
      'democrat', 'republican', 'vote', 'parliament', 'minister', 'political',
      'trump', 'biden', 'war', 'military',
    ],
  },
  {
    label: 'Güvenlik',
    keywords: [
      'hack', 'breach', 'vulnerability', 'malware', 'ransomware', 'security',
      'exploit', 'phishing', 'privacy', 'surveillance', 'leak', 'zero-day',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. ZAMAN SABİTLERİ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 7 günün milisaniye cinsinden değeri.
 * filteredArticles(), scoreArticle() ve parseFeedData() tarafından zaman eşiği olarak kullanılır.
 *
 * @type {number}
 */
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

/**
 * Feed önbelleğinin geçerlilik süresi (milisaniye).
 * Bu süre dolmadan aynı feed URL'si için proxy'e tekrar istek atılmaz.
 * Değeri değiştirmek önbellek agresifliğini ayarlar.
 *
 * @type {number}
 * @default 900000  (15 dakika)
 */
const FEED_CACHE_TTL = 15 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// 4. FONT HARİTASI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tipografi panelindeki font seçeneklerini CSS font-family değerleriyle eşler.
 * modal.js → applyTypography() bu haritayı kullanarak .modal-content stilini günceller.
 *
 * Anahtarlar HTML'deki data-font="..." değerleriyle eşleşmeli.
 *
 * @type {Object.<string, string>}
 */
const FONT_MAP = {
  /** Sans-serif, modern ve okunabilir — varsayılan */
  inter:  "'Inter', sans-serif",
  /** Serif, uzun okumalar için göz yormayan */
  lora:   "'Lora', Georgia, serif",
  /** Monospace, teknik içerikler için */
  mono:   "'JetBrains Mono', 'Courier New', monospace",
  /** İşletim sisteminin varsayılan sans-serif fontu */
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. PLATFORM YARDIM METİNLERİ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sol paneldeki hızlı ekleme butonlarına karşılık gelen platform bilgileri.
 *
 * `hint` değeri null olan platformlarda (hn, devto) URL zaten PLATFORM_DIRECT'te
 * tanımlıdır ve kullanıcıdan giriş istenmez — direkt eklenir.
 *
 * @type {Object.<string, {label: string, hint: string|null}>}
 * @property {string}      label — Toast bildirimi ve placeholder için okunabilir isim
 * @property {string|null} hint  — Input placeholder'ına yazılan yönlendirme metni;
 *                                  null ise kullanıcıdan URL istenmez
 */
const PLATFORM_HINTS = {
  youtube:  {
    label: 'YouTube Kanalı',
    hint:  "Kanal, kullanıcı veya playlist URL'si yapıştırın.\nÖrnek: youtube.com/@LinusTechTips\n        youtube.com/channel/UCXuqSBlHAE6Xw-yeJA0Tunw\n        youtube.com/playlist?list=PLxxxx",
  },
  reddit:   {
    label: 'Reddit',
    hint:  "Subreddit veya kullanıcı URL'si yapıştırın.\nÖrnek: reddit.com/r/technology\n        reddit.com/r/worldnews\n        reddit.com/user/kullanici",
  },
  github:   {
    label: 'GitHub',
    hint:  "Repo URL'si yapıştırın — releases RSS oluşturulur.\nÖrnek: github.com/microsoft/vscode\n        github.com/torvalds/linux",
  },
  medium:   {
    label: 'Medium',
    hint:  "Yazar veya etiket URL'si yapıştırın.\nÖrnek: medium.com/@kullanici\n        medium.com/tag/javascript",
  },
  substack: {
    label: 'Substack',
    hint:  "Substack URL'si yapıştırın.\nÖrnek: stratechery.substack.com\n        waitbutwhy.substack.com",
  },
  mastodon: {
    label: 'Mastodon',
    hint:  "Mastodon profil URL'si yapıştırın.\nÖrnek: mastodon.social/@Gargron\n        fosstodon.org/@kev",
  },
  hn:    { label: 'Hacker News', hint: null }, // Direkt eklenir, kullanıcıdan URL istenmez
  devto: { label: 'Dev.to',      hint: null }, // Direkt eklenir, kullanıcıdan URL istenmez
};

/**
 * API key veya kullanıcı girişi gerektirmeyen, sabit RSS adreslerine sahip platformlar.
 * events.js → bindEvents() içinde hızlı ekleme butonuna tıklandığında bu adresler
 * doğrudan addFeed() fonksiyonuna iletilir.
 *
 * @type {Object.<string, string>}
 */
const PLATFORM_DIRECT = {
  hn:    'https://hnrss.org/frontpage', // Hacker News ön sayfa RSS'i
  devto: 'https://dev.to/feed',         // Dev.to genel akış
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. ÖNERİLEN VIDEO KANALLARI (Reels boş durum)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reels sekmesinde video bulunamadığında gösterilen önerilen YouTube kanalları.
 * Her kayıt: name, url (YouTube RSS feed URL'si), category (ikon/etiket için)
 *
 * @type {Array<{name: string, url: string, category: string, channelId: string}>}
 */
const SUGGESTED_VIDEO_FEEDS = [
  {
    name: 'BBC News',
    url:  'https://www.youtube.com/feeds/videos.xml?channel_id=UC16niRr50-MSBwiO3YDb3RA',
    category: 'Dünya',
    channelId: 'UC16niRr50-MSBwiO3YDb3RA',
  },
  {
    name: 'CNN',
    url:  'https://www.youtube.com/feeds/videos.xml?channel_id=UCupvZG-5ko_eiXAupbDfxWw',
    category: 'Haber',
    channelId: 'UCupvZG-5ko_eiXAupbDfxWw',
  },
  {
    name: 'Al Jazeera English',
    url:  'https://www.youtube.com/feeds/videos.xml?channel_id=UCNye-wNBqNL5ZzHSJj3l8Bg',
    category: 'Dünya',
    channelId: 'UCNye-wNBqNL5ZzHSJj3l8Bg',
  },
  {
    name: 'TED Talks',
    url:  'https://www.youtube.com/feeds/videos.xml?channel_id=UCAuUUnT6oDeKwE6v1NGQxug',
    category: 'Eğitim',
    channelId: 'UCAuUUnT6oDeKwE6v1NGQxug',
  },
  {
    name: 'Marques Brownlee',
    url:  'https://www.youtube.com/feeds/videos.xml?channel_id=UCBJycsmduvYEL83R_U4JriQ',
    category: 'Teknoloji',
    channelId: 'UCBJycsmduvYEL83R_U4JriQ',
  },
  {
    name: 'Linus Tech Tips',
    url:  'https://www.youtube.com/feeds/videos.xml?channel_id=UCXuqSBlHAE6Xw-yeJA0Tunw',
    category: 'Teknoloji',
    channelId: 'UCXuqSBlHAE6Xw-yeJA0Tunw',
  },
  {
    name: 'Veritasium',
    url:  'https://www.youtube.com/feeds/videos.xml?channel_id=UCHnyfMqiRRG1u-2MsSQLbXA',
    category: 'Bilim',
    channelId: 'UCHnyfMqiRRG1u-2MsSQLbXA',
  },
  {
    name: 'Kurzgesagt',
    url:  'https://www.youtube.com/feeds/videos.xml?channel_id=UCsXVk37bltHxD1rDPwtNM8Q',
    category: 'Bilim',
    channelId: 'UCsXVk37bltHxD1rDPwtNM8Q',
  },
  {
    name: 'Bloomberg Technology',
    url:  'https://www.youtube.com/feeds/videos.xml?channel_id=UCrM7B7SL_g1edFOnmj-SDKg',
    category: 'Finans',
    channelId: 'UCrM7B7SL_g1edFOnmj-SDKg',
  },
  {
    name: 'Reuters',
    url:  'https://www.youtube.com/feeds/videos.xml?channel_id=UChqUTb7kYRX8-EiaN3XFrSQ',
    category: 'Haber',
    channelId: 'UChqUTb7kYRX8-EiaN3XFrSQ',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 7. SUPABASE & CLOUDFLARE YAPILANDIRMASİ
// ─────────────────────────────────────────────────────────────────────────────
// ORTAM DEĞİŞKENLERİ
// ─────────────────────────────────────────────────────────────────────────────
// Keyler bu dosyada hard-code EDİLMEZ.
// env.js dosyasından okunur — env.js git'e gitmez (.gitignore'da tanımlı).
//
// Kurulum:
//   1. env.example.js'i kopyalayın: env.js adıyla kaydedin
//   2. env.js içindeki boş stringleri doldurun
//   3. Supabase: https://supabase.com/dashboard → Project Settings → API
//   4. Cloudflare: rss-proxy worker deploy sonrası alınan URL

/**
 * env.js yüklendiyse global ENV_* değişkenleri tanımlıdır.
 * window üzerinden okumak 'use strict' / const-scope sorunlarını önler.
 *
 * @type {string}
 */
const SUPABASE_URL      = (typeof window !== 'undefined' && window.ENV_SUPABASE_URL)      || '';
const SUPABASE_ANON_KEY = (typeof window !== 'undefined' && window.ENV_SUPABASE_ANON_KEY) || '';
const CF_WORKER_URL     = (typeof window !== 'undefined' && window.ENV_CF_WORKER_URL)     || '';


