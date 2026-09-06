'use strict';

const DEFAULT_FEEDS = [
  { id: 'bbc-world',  name: 'BBC World',    url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { id: 'techcrunch', name: 'TechCrunch',   url: 'https://techcrunch.com/feed/' },
  { id: 'ars',        name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
];

const SMART_CATEGORIES = [
  { label: 'Teknoloji', keywords: ['ai', 'tech', 'software', 'hardware', 'app', 'robot', 'code', 'cyber', 'internet', 'digital', 'startup', 'silicon', 'apple', 'google', 'microsoft', 'samsung', 'iphone', 'android', 'technology', 'computer', 'data', 'cloud'] },
  { label: 'Bilim',     keywords: ['science', 'research', 'study', 'nasa', 'space', 'climate', 'biology', 'physics', 'chemistry', 'health', 'medical', 'brain', 'gene', 'evolution', 'universe', 'planet', 'scientists'] },
  { label: 'Finans',    keywords: ['market', 'stock', 'crypto', 'bitcoin', 'economy', 'finance', 'bank', 'invest', 'dollar', 'euro', 'trade', 'recession', 'inflation', 'gdp', 'startup', 'ipo', 'fund'] },
  { label: 'Politika',  keywords: ['election', 'president', 'government', 'congress', 'senate', 'law', 'policy', 'democrat', 'republican', 'vote', 'parliament', 'minister', 'political', 'trump', 'biden', 'war', 'military'] },
  { label: 'Güvenlik',  keywords: ['hack', 'breach', 'vulnerability', 'malware', 'ransomware', 'security', 'exploit', 'phishing', 'privacy', 'surveillance', 'leak', 'zero-day'] },
];

// ── STATE ─────────────────────────────────────────────────────────────────
const state = {
  feeds:         [],
  articles:      [],
  notes:         {},
  highlights:    {},
  readHistory:   {},   // { articleId: timestamp } — akıllı öneri için
  activeFilter:  'all',
  activeFeedId:  'home',
  activeTag:     '',
  searchQuery:   '',
  daysFilter:    7,    // varsayılan 7 gün
  layout:        'list',
  loading:       false,
  activeColor:   '#e8b840',
  // Tipografi
  typo: {
    font:   'inter',
    size:   16,
    line:   19,   // /10 → 1.9
    letter: 0,
    width:  640,
  },
};

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const uid = () => Math.random().toString(36).slice(2, 9);
const qs  = (sel, ctx) => (ctx || document).querySelector(sel);
const qsa = (sel, ctx) => (ctx || document).querySelectorAll(sel);

// ── PERSIST ───────────────────────────────────────────────────────────────
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
  } catch (_) {}
}

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
    if (typo)        state.typo        = Object.assign({}, state.typo, JSON.parse(typo));
    if (days)        state.daysFilter  = Number(days);
  } catch (_) {}
}

// ── FETCH / PARSE ─────────────────────────────────────────────────────────
// ── FEED ÖNBELLEĞİ ────────────────────────────────────────────────────────
// Her feed'i 15 dk boyunca localStorage'da saklar → proxy rate limit'i düşürür
const FEED_CACHE_TTL = 15 * 60 * 1000; // 15 dakika

function getCachedFeed(feedUrl) {
  try {
    const raw = localStorage.getItem('rss_fc_' + btoa(feedUrl).slice(0, 40));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() - obj.ts > FEED_CACHE_TTL) return null; // süresi dolmuş
    return obj.data;
  } catch (_) { return null; }
}

function setCachedFeed(feedUrl, data) {
  try {
    const key = 'rss_fc_' + btoa(feedUrl).slice(0, 40);
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: data }));
  } catch (_) {}
}

function clearFeedCache() {
  try {
    Object.keys(localStorage).forEach(function(k) {
      if (k.startsWith('rss_fc_')) localStorage.removeItem(k);
    });
  } catch (_) {}
}

// ── RSS PROXY LİSTESİ ──────────────────────────────────────────────────────
// Sırayla denenir. Her biri localhost dahil tüm origin'lere CORS header döner.
// API key gerektirmez.

function buildProxies(feedUrl) {
  const enc = encodeURIComponent(feedUrl);
  return [
    // 1. rss2json — JSON döner, en kolay parse
    {
      url:  'https://api.rss2json.com/v1/api.json?rss_url=' + enc,
      type: 'json',
    },
    // 2. allorigins — wildcard CORS, { contents: xml }
    {
      url:  'https://api.allorigins.win/raw?url=' + enc,
      type: 'xml',
    },
    // 3. corsproxy.io — wildcard CORS, ham XML
    {
      url:  'https://corsproxy.io/?' + enc,
      type: 'xml',
    },
    // 4. thingproxy — cors-anywhere klonu, limitsiz
    {
      url:  'https://thingproxy.freeboard.io/fetch/' + feedUrl,
      type: 'xml',
    },
    // 5. codetabs — JSON wrapper { contents }
    {
      url:  'https://api.codetabs.com/v1/proxy?quest=' + enc,
      type: 'xml',
    },
    // 6. 8x8 cors proxy — son çare
    {
      url:  'https://cors.eu.org/' + feedUrl,
      type: 'xml',
    },
  ];
}

// AbortSignal.timeout taşınabilir sarmalayıcı
function makeAbortSignal(ms) {
  try {
    return AbortSignal.timeout(ms);
  } catch (_) {
    const ctrl = new AbortController();
    setTimeout(function() { ctrl.abort(); }, ms);
    return ctrl.signal;
  }
}

// Ham RSS/Atom XML → standart veri nesnesi
function parseRawXml(xmlText, feed) {
  if (!xmlText || xmlText.trim() === '') return null;
  try {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(xmlText, 'text/xml');
    if (doc.querySelector('parsererror')) return null;

    const isAtom = !!doc.querySelector('feed > entry, feed');
    const items  = [];

    if (isAtom) {
      const t = doc.querySelector('feed > title');
      if (t) { try { if (feed.name === new URL(feed.url).hostname) feed.name = t.textContent.trim(); } catch (_) {} }
      doc.querySelectorAll('entry').forEach(function(entry) {
        const linkEl    = entry.querySelector('link[rel="alternate"]') || entry.querySelector('link');
        const link      = linkEl ? (linkEl.getAttribute('href') || linkEl.textContent.trim()) : '';
        const contentEl = entry.querySelector('content') || entry.querySelector('summary');
        items.push({
          title:       (entry.querySelector('title')   || {}).textContent || '',
          link,
          pubDate:     (entry.querySelector('published') || entry.querySelector('updated') || {}).textContent || '',
          description: contentEl ? contentEl.textContent : '',
          content:     contentEl ? contentEl.innerHTML   : '',
          enclosure: null, thumbnail: null,
        });
      });
    } else {
      const t = doc.querySelector('channel > title');
      if (t) { try { if (feed.name === new URL(feed.url).hostname) feed.name = t.textContent.trim(); } catch (_) {} }
      doc.querySelectorAll('item').forEach(function(item) {
        const encEl   = item.querySelector('enclosure');
        const mediaEl = item.querySelector('thumbnail, [medium="image"]');
        const descEl  = item.querySelector('description');
        let contentEl = null;
        item.childNodes.forEach(function(n) { if (n.localName === 'encoded') contentEl = n; });
        items.push({
          title:       (item.querySelector('title') || {}).textContent || '',
          link:        (item.querySelector('link')  || {}).textContent || '',
          pubDate:     (item.querySelector('pubDate') || {}).textContent || '',
          description: descEl    ? descEl.textContent    : '',
          content:     contentEl ? contentEl.textContent : (descEl ? descEl.textContent : ''),
          enclosure:   encEl   ? { link: encEl.getAttribute('url') }                      : null,
          thumbnail:   mediaEl ? (mediaEl.getAttribute('url') || mediaEl.getAttribute('src')) : null,
        });
      });
    }

    if (items.length === 0) return null;
    return { status: 'ok', feed: { title: feed.name }, items };
  } catch (_) { return null; }
}

async function fetchFeed(feed) {
  // Önbellekte taze veri varsa direkt döndür
  const cached = getCachedFeed(feed.url);
  if (cached) return cached;

  const proxies = buildProxies(feed.url);
  let lastErr   = null;

  for (let i = 0; i < proxies.length; i++) {
    const proxy = proxies[i];
    try {
      const res = await fetch(proxy.url, {
        signal:  makeAbortSignal(12000),
        headers: { 'Accept': 'application/json, text/xml, application/xml, */*' },
      });

      // 4xx/5xx → sonraki proxy
      if (!res.ok) {
        lastErr = new Error('Proxy-' + i + ' HTTP ' + res.status);
        continue;
      }

      const text = await res.text();
      if (!text || !text.trim()) { lastErr = new Error('Boş yanıt'); continue; }

      let result = null;
      const firstChar = text.trim()[0];

      if (proxy.type === 'json' || firstChar === '{' || firstChar === '[') {
        // JSON yanıt — rss2json formatı veya { contents: xml }
        let data;
        try { data = JSON.parse(text); } catch (_) {
          // JSON parse başarısız — XML dene
          result = parseRawXml(text, feed);
        }
        if (!result && data) {
          if (data.status && data.status !== 'ok') {
            // rss2json hata durumu
            lastErr = new Error(data.message || 'Feed hatası (proxy ' + i + ')');
            continue;
          }
          if (data.items) {
            result = data; // doğrudan rss2json nesnesi
          } else if (typeof data.contents === 'string') {
            // allorigins /get formatı: { contents: "<xml>" }
            result = parseRawXml(data.contents, feed);
          }
        }
      } else {
        // Ham XML
        result = parseRawXml(text, feed);
      }

      if (result && result.items && result.items.length > 0) {
        setCachedFeed(feed.url, result);
        return result;
      }

      lastErr = new Error('Proxy-' + i + ' geçerli veri döndürmedi');

    } catch (err) {
      lastErr = err.name === 'AbortError'
        ? new Error('Proxy-' + i + ' zaman aşımı')
        : err;
    }
  }

  throw lastErr || new Error('Tüm proxy\'ler başarısız oldu');
}

function stripHtml(html) {
  return html ? html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() : '';
}

function cleanDesc(raw) {
  const txt = stripHtml(raw);
  return txt.length > 200 ? txt.slice(0, 200) + '…' : txt;
}

function extractImage(item) {
  if (item.enclosure && item.enclosure.link) return item.enclosure.link;
  if (item.thumbnail) return item.thumbnail;
  const m = (item.description || item.content || '').match(/<img[^>]+src=["']([^"'>]+)["']/i);
  return m ? m[1] : null;
}

function getFavicon(feedUrl) {
  try {
    const domain = new URL(feedUrl).hostname;
    return 'https://favicon.im/' + domain + '?larger=true';
  } catch (_) { return ''; }
}

function detectTags(text) {
  const lower = text.toLowerCase();
  const found = [];
  SMART_CATEGORIES.forEach(function(cat) {
    for (let i = 0; i < cat.keywords.length; i++) {
      if (lower.indexOf(cat.keywords[i]) !== -1) { found.push(cat.label); break; }
    }
  });
  return found;
}

function parseFeedData(data, feed) {
  const items   = data.items || [];
  const favicon = getFavicon(feed.url);
  if (data.feed && data.feed.title) {
    try {
      if (feed.name === new URL(feed.url).hostname) feed.name = data.feed.title;
    } catch (_) {}
  }
  feed.favicon = favicon;

  // Son 7 günden eski haberleri çekme aşamasında at
  const cutoff = Date.now() - SEVEN_DAYS;

  return items
    .filter(function(item) {
      if (!item.pubDate) return true; // tarihi belli değilse dahil et
      const d = new Date(item.pubDate);
      return !isNaN(d) ? d.getTime() >= cutoff : true;
    })
    .map(function(item) {
    const id       = feed.id + '::' + (item.link || item.title || '');
    const existing = state.articles.find(function(a) { return a.id === id; });
    const fullText = (item.title || '') + ' ' + stripHtml(item.description || item.content || '');
    return {
      id:       id,
      feedId:   feed.id,
      feedName: feed.name,
      favicon:  favicon,
      title:    (item.title && item.title.trim()) || '(Başlıksız)',
      desc:     cleanDesc(item.description || item.content),
      url:      item.link,
      date:     item.pubDate ? new Date(item.pubDate) : new Date(),
      image:    extractImage(item),
      content:  item.content || item.description || '',
      tags:     detectTags(fullText),
      read:     existing ? existing.read    : false,
      starred:  existing ? existing.starred : false,
    };
  });
}

// ── REFRESH ────────────────────────────────────────────────────────────────
async function refreshAll() {
  if (state.loading) return;
  if (state.feeds.length === 0) {
    if (state.activeFeedId === 'home') {
      qs('.homepage-empty').hidden    = false;
      qs('.homepage-cards').innerHTML = '';
    } else {
      qs('.empty-state').hidden = false;
    }
    return;
  }
  setLoading(true);
  const btn = qs('.refresh-btn');
  btn.classList.add('spinning');

  const results = await Promise.allSettled(
    state.feeds.map(function(f) { return fetchFeed(f); })
  );

  results.forEach(function(res, i) {
    if (res.status === 'fulfilled') {
      parseFeedData(res.value, state.feeds[i]).forEach(function(na) {
        const idx = state.articles.findIndex(function(a) { return a.id === na.id; });
        if (idx === -1) {
          state.articles.unshift(na);
        } else {
          state.articles[idx] = Object.assign({}, na, {
            read:    state.articles[idx].read,
            starred: state.articles[idx].starred,
          });
        }
      });
    } else {
      showToast('"' + state.feeds[i].name + '" yüklenemedi');
    }
  });

  state.articles.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  saveState();
  setLoading(false);
  btn.classList.remove('spinning');
  renderFeedList();
  if (state.activeFeedId === 'home') {
    showHomepage();
    renderHomepage();
  } else {
    renderArticles();
  }
  renderSmartTags();
}

// ── URL → RSS DÖNÜŞTÜRÜCÜ ─────────────────────────────────────────────────
// Kullanıcı herhangi bir platform URL'si yapıştırabilir; sistem RSS'e çevirir.
function convertToRssUrl(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch (_) { return rawUrl; }

  const host = url.hostname.replace(/^www\./, '');
  const path = url.pathname;

  // ── YouTube ──────────────────────────────────────────────────────────────
  // Kanal sayfası: youtube.com/channel/UC... veya youtube.com/@handle
  // Video sayfası: youtube.com/watch?v=... (kanalı tespit edilemez, channel feed kullan)
  if (host === 'youtube.com' || host === 'youtu.be') {
    const channelId = url.searchParams.get('channel_id');
    if (channelId) return 'https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId;

    const chanMatch  = path.match(/^\/channel\/(UC[\w-]+)/);
    if (chanMatch) return 'https://www.youtube.com/feeds/videos.xml?channel_id=' + chanMatch[1];

    const handleMatch = path.match(/^\/@([\w.-]+)/);
    if (handleMatch) return 'https://www.youtube.com/feeds/videos.xml?user=' + handleMatch[1];

    const userMatch = path.match(/^\/user\/([\w.-]+)/);
    if (userMatch) return 'https://www.youtube.com/feeds/videos.xml?user=' + userMatch[1];

    const playlistId = url.searchParams.get('list');
    if (playlistId) return 'https://www.youtube.com/feeds/videos.xml?playlist_id=' + playlistId;

    // Fallback — ham URL'i dene
    return rawUrl;
  }

  // ── Reddit ────────────────────────────────────────────────────────────────
  // r/subreddit, u/user, arama, çeşitli sıralamalar
  if (host === 'reddit.com' || host === 'old.reddit.com' || host === 'www.reddit.com') {
    const subMatch  = path.match(/^\/r\/([\w]+)/);
    const userMatch = path.match(/^\/u(?:ser)?\/([\w-]+)/);

    let base = 'https://www.reddit.com';
    if (subMatch)  return base + '/r/'  + subMatch[1]  + '/.rss';
    if (userMatch) return base + '/user/' + userMatch[1] + '/.rss';
    // Ana sayfa
    return base + '/.rss';
  }

  // ── GitHub ────────────────────────────────────────────────────────────────
  // github.com/user → releases veya commits
  if (host === 'github.com') {
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 2) {
      // Releases feed
      return 'https://github.com/' + parts[0] + '/' + parts[1] + '/releases.atom';
    }
    if (parts.length === 1) {
      // Kullanıcının herkese açık aktivitesi
      return 'https://github.com/' + parts[0] + '.atom';
    }
    return rawUrl;
  }

  // ── Medium ────────────────────────────────────────────────────────────────
  if (host === 'medium.com') {
    const tagMatch  = path.match(/^\/tag\/([\w-]+)/);
    const userMatch = path.match(/^\/@([\w.-]+)/);
    if (tagMatch)  return 'https://medium.com/feed/tag/'  + tagMatch[1];
    if (userMatch) return 'https://medium.com/feed/@' + userMatch[1];
    return 'https://medium.com/feed' + (path === '/' ? '' : path);
  }

  // ── Substack ─────────────────────────────────────────────────────────────
  // username.substack.com
  if (host.endsWith('.substack.com')) {
    return 'https://' + host + '/feed';
  }

  // ── Twitch ───────────────────────────────────────────────────────────────
  // RSS yok; en iyi alternatif: rssbridge veya sullygnome (bilgilendirici mesaj)
  if (host === 'twitch.tv' || host === 'www.twitch.tv') {
    const chanMatch = path.match(/^\/([\w]+)/);
    if (chanMatch) {
      // rssbridge public instance
      return 'https://rssbridge.github.io/?action=display&bridge=Twitch&channel=' + chanMatch[1] + '&format=Atom';
    }
    return rawUrl;
  }

  // ── Mastodon / Fediverse ──────────────────────────────────────────────────
  // instance.social/@user
  const mastoMatch = path.match(/^\/@([\w.-]+)$/);
  if (mastoMatch && !['youtube.com','reddit.com','github.com','medium.com'].includes(host)) {
    return url.origin + '/@' + mastoMatch[1] + '.rss';
  }

  // ── WordPress siteleri ────────────────────────────────────────────────────
  // Herhangi bir WP sitesi genellikle /feed/ sunar
  // Düz bir URL girilmişse /feed eki dene (daha sonra fetchFeed zaten dener)
  // Bu kural en sona gelir, spesifik eşleşme yoksa URL'i değiştirme

  return rawUrl; // Bilinmeyen platform, olduğu gibi kullan
}

// ── FEED CRUD ──────────────────────────────────────────────────────────────
async function addFeed(rawUrl) {
  let url = rawUrl.trim();
  if (!url) return;
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
  try { new URL(url); } catch (_) { showToast('Geçersiz URL'); return; }

  // Platform URL'sini RSS'e çevir
  url = convertToRssUrl(url);

  if (state.feeds.some(function(f) { return f.url === url; })) { showToast('Bu kaynak zaten mevcut'); return; }

  const feed = { id: uid(), name: new URL(url).hostname, url: url, favicon: null };
  setLoading(true);
  try {
    const data        = await fetchFeed(feed);
    const newArticles = parseFeedData(data, feed);
    state.feeds.push(feed);
    newArticles.forEach(function(na) {
      if (!state.articles.find(function(a) { return a.id === na.id; })) state.articles.unshift(na);
    });
    state.articles.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
    saveState();
    renderFeedList();
    if (state.activeFeedId === 'home') { showHomepage(); renderHomepage(); } else { renderArticles(); }
    renderSmartTags();
    showToast('"' + feed.name + '" eklendi');
  } catch (err) {
    showToast('Akış yüklenemedi: ' + err.message);
  } finally {
    setLoading(false);
  }
}

function removeFeed(feedId) {
  state.feeds    = state.feeds.filter(function(f) { return f.id !== feedId; });
  state.articles = state.articles.filter(function(a) { return a.feedId !== feedId; });
  if (state.activeFeedId === feedId) state.activeFeedId = 'home';
  saveState();
  renderFeedList();
  if (state.activeFeedId === 'home') { showHomepage(); renderHomepage(); } else { renderArticles(); }
  renderSmartTags();
  updatePageTitle();
  showToast('Kaynak silindi');
}

// ── READ / STAR ────────────────────────────────────────────────────────────
function markRead(articleId) {
  const a = state.articles.find(function(x) { return x.id === articleId; });
  if (a) {
    a.read = true;
    state.readHistory[articleId] = Date.now();
    saveState();
  }
}

function markAllRead() {
  filteredArticles().forEach(function(a) {
    a.read = true;
    state.readHistory[a.id] = Date.now();
  });
  saveState();
  renderArticles();
  renderFeedList();
  showToast('Tümü okundu işaretlendi');
}

function toggleStar(articleId) {
  const a = state.articles.find(function(x) { return x.id === articleId; });
  if (a) { a.starred = !a.starred; saveState(); }
  return a ? a.starred : false;
}

// ── 7 GÜN FİLTRESİ ────────────────────────────────────────────────────────
function filteredArticles() {
  let list = state.articles.slice();

  if (state.activeFeedId !== 'all' && state.activeFeedId !== 'home') {
    list = list.filter(function(a) { return a.feedId === state.activeFeedId; });
  }

  // Zaman filtresi
  if (state.daysFilter > 0) {
    const cutoff = Date.now() - state.daysFilter * 24 * 60 * 60 * 1000;
    list = list.filter(function(a) { return new Date(a.date).getTime() >= cutoff; });
  }

  if (state.activeFilter === 'unread') {
    list = list.filter(function(a) { return !a.read; });
  } else if (state.activeFilter === 'starred') {
    list = list.filter(function(a) { return a.starred; });
  }
  if (state.activeTag) {
    list = list.filter(function(a) { return a.tags && a.tags.indexOf(state.activeTag) !== -1; });
  }
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(function(a) {
      return a.title.toLowerCase().indexOf(q) !== -1 ||
             a.desc.toLowerCase().indexOf(q) !== -1 ||
             a.feedName.toLowerCase().indexOf(q) !== -1;
    });
  }
  return list;
}

// ── AKILLI ÖNERİ SİSTEMİ ──────────────────────────────────────────────────
/**
 * Okuma geçmişindeki makalelerin tag'larından bir profil çıkarır,
 * ardından okunmamış makaleleri bu profile göre puanlar.
 */
function getSmartSuggestions(currentArticleId, limit) {
  limit = limit || 4;

  // Okunan makalelerin tag frekansı
  const tagScore = {};
  const feedScore = {};
  Object.keys(state.readHistory).forEach(function(id) {
    const a = state.articles.find(function(x) { return x.id === id; });
    if (!a) return;
    const age = Date.now() - state.readHistory[id];
    // Yakın zamanda okunanlar daha değerli
    const weight = age < 86400000 ? 3 : age < 604800000 ? 2 : 1;
    (a.tags || []).forEach(function(t) { tagScore[t] = (tagScore[t] || 0) + weight; });
    feedScore[a.feedId] = (feedScore[a.feedId] || 0) + weight;
  });

  // Şu anki makaleyi referans al
  const current = state.articles.find(function(x) { return x.id === currentArticleId; });

  return state.articles
    .filter(function(a) {
      return a.id !== currentArticleId &&
             !a.read &&
             new Date(a.date).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000;
    })
    .map(function(a) {
      let score = 0;
      // Tag örtüşmesi
      (a.tags || []).forEach(function(t) {
        score += (tagScore[t] || 0) * 4;
        // Şu anki makaleyle paylaşılan tag'lar ekstra puan
        if (current && current.tags && current.tags.indexOf(t) !== -1) score += 10;
      });
      // Aynı kaynak
      if (feedScore[a.feedId]) score += feedScore[a.feedId] * 2;
      if (current && a.feedId === current.feedId) score += 5;
      // Yeni haber
      const age = Date.now() - new Date(a.date).getTime();
      if (age < 86400000)  score += 8;
      if (age < 3600000)   score += 12;
      // Görsel var
      if (a.image) score += 3;
      return { article: a, score: score };
    })
    .filter(function(x) { return x.score > 0; })
    .sort(function(a, b) { return b.score - a.score; })
    .slice(0, limit)
    .map(function(x) { return x.article; });
}

function renderSuggestions(aid) {
  const section = qs('.suggestions-section');
  const list    = qs('.suggestions-list');
  const sugg    = getSmartSuggestions(aid, 4);

  if (!sugg.length) { section.hidden = true; return; }
  section.hidden = false;

  list.innerHTML = sugg.map(function(a) {
    const thumb = a.image
      ? '<div class="sugg-thumb" style="background-image:url(' + escHtml(a.image) + ')"></div>'
      : '<div class="sugg-thumb sugg-thumb-empty">' + escHtml(a.feedName.charAt(0)) + '</div>';
    return '<li class="sugg-card" data-id="' + escHtml(a.id) + '" tabindex="0" role="button">' +
      thumb +
      '<div class="sugg-body">' +
        '<span class="sugg-source">' + escHtml(a.feedName) + ' · ' + formatDate(a.date) + '</span>' +
        '<p class="sugg-title">' + escHtml(a.title) + '</p>' +
      '</div>' +
    '</li>';
  }).join('');

  qsa('.sugg-card', list).forEach(function(card) {
    card.addEventListener('click', function() { openModal(card.dataset.id); });
    card.addEventListener('keydown', function(e) { if (e.key === 'Enter') openModal(card.dataset.id); });
  });
}

// ── FORMAT ─────────────────────────────────────────────────────────────────
function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 60000)     return 'Az önce';
  if (diff < 3600000)   return Math.floor(diff / 60000) + ' dk önce';
  if (diff < 86400000)  return Math.floor(diff / 3600000) + ' sa önce';
  if (diff < 604800000) return Math.floor(diff / 86400000) + ' gün önce';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function setLoading(val) {
  state.loading = val;
  const isHome = state.activeFeedId === 'home';
  if (!isHome) {
    qs('.loading-state').hidden = !val;
    qs('.articles').hidden      = val;
    if (val) qs('.empty-state').hidden = true;
  }
}

var toastTimer;
function showToast(msg) {
  const t = qs('.toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { t.classList.remove('show'); }, 3000);
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── SMART TAGS ─────────────────────────────────────────────────────────────
function renderSmartTags() {
  const tagCounts = {};
  state.articles.forEach(function(a) {
    (a.tags || []).forEach(function(t) { tagCounts[t] = (tagCounts[t] || 0) + 1; });
  });

  const container = qs('.smart-tags');
  let html = '';
  Object.keys(tagCounts).sort(function(a, b) { return tagCounts[b] - tagCounts[a]; }).forEach(function(tag) {
    html += '<button class="smart-tag' + (state.activeTag === tag ? ' active' : '') +
      '" data-tag="' + escHtml(tag) + '">' + escHtml(tag) +
      ' <span style="color:#333">(' + tagCounts[tag] + ')</span></button>';
  });
  container.innerHTML = html;

  qsa('.smart-tag', container).forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.activeTag = state.activeTag === btn.dataset.tag ? '' : btn.dataset.tag;
      renderSmartTags();
      renderArticles();
    });
  });
}

// ── FEED LIST ──────────────────────────────────────────────────────────────
function renderFeedList() {
  const container = qs('.feed-list');
  const allUnread = state.articles.filter(function(a) { return !a.read; }).length;

  let html = '<span class="feed-list-label">KAYNAKLAR</span>';
  html += '<div class="feed-item' + (state.activeFeedId === 'home' ? ' active' : '') +
    '" data-feedid="home" role="button" tabindex="0" aria-label="Anasayfa">' +
    '<span class="feed-favicon-placeholder">⌂</span>' +
    '<span class="feed-name">Anasayfa</span></div>';
  html += '<div class="feed-item' + (state.activeFeedId === 'all' ? ' active' : '') +
    '" data-feedid="all" role="button" tabindex="0" aria-label="Tüm haberler">' +
    '<span class="feed-favicon-placeholder">☰</span>' +
    '<span class="feed-name">Tüm Haberler</span>' +
    (allUnread > 0 ? '<span class="feed-count">' + allUnread + '</span>' : '') + '</div>';

  state.feeds.forEach(function(feed) {
    const unread = state.articles.filter(function(a) { return a.feedId === feed.id && !a.read; }).length;
    const fav    = feed.favicon
      ? '<img class="feed-favicon" src="' + escHtml(feed.favicon) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
      : '<span class="feed-favicon-placeholder">' + escHtml(feed.name.charAt(0).toUpperCase()) + '</span>';

    html += '<div class="feed-item' + (state.activeFeedId === feed.id ? ' active' : '') +
      '" data-feedid="' + escHtml(feed.id) + '" role="button" tabindex="0" aria-label="' + escHtml(feed.name) + '">' +
      fav + '<span class="feed-name">' + escHtml(feed.name) + '</span>' +
      (unread > 0 ? '<span class="feed-count">' + unread + '</span>' : '') +
      '<button class="feed-remove" data-removeid="' + escHtml(feed.id) + '" aria-label="Sil" title="Kaynağı sil">✕</button></div>';
  });

  container.innerHTML = html;

  qsa('.feed-item', container).forEach(function(el) {
    el.addEventListener('click', function(e) {
      if (e.target.closest('.feed-remove')) return;
      state.activeFeedId = el.dataset.feedid;
      if (state.activeFeedId === 'home') { showHomepage(); renderHomepage(); }
      else { hideHomepage(); updatePageTitle(); renderArticles(); }
      renderFeedList();
      closeSidebar();
    });
    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });
  });

  qsa('.feed-remove', container).forEach(function(btn) {
    btn.addEventListener('click', function(e) { e.stopPropagation(); removeFeed(btn.dataset.removeid); });
  });
}

// ── ARTICLE LIST ───────────────────────────────────────────────────────────
function renderArticles() {
  const container  = qs('.articles');
  const emptyState = qs('.empty-state');
  const list       = filteredArticles();

  qs('.articles-wrap').hidden = false;

  if (list.length === 0 && !state.loading) {
    container.innerHTML = '';
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  const isGrid = state.layout === 'grid';
  container.classList.toggle('grid-view', isGrid);
  container.innerHTML = list.map(function(a) { return articleCardHtml(a, isGrid); }).join('');

  qsa('.article-card', container).forEach(function(card) {
    card.addEventListener('click', function(e) {
      if (e.target.closest('.article-star-btn')) return;
      openModal(card.dataset.id);
    });
    card.addEventListener('keydown', function(e) { if (e.key === 'Enter') openModal(card.dataset.id); });
  });

  qsa('.article-star-btn', container).forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const starred = toggleStar(btn.dataset.id);
      btn.classList.toggle('starred', starred);
      btn.title = btn.textContent = starred ? '★' : '☆';
      renderFeedList();
    });
  });
}

function articleCardHtml(a, isGrid) {
  const thumb = a.image
    ? '<img class="article-thumb" src="' + escHtml(a.image) + '" alt="" loading="lazy" onerror="this.remove()">'
    : '';
  const tagsHtml = a.tags && a.tags.length
    ? '<div class="article-tags">' + a.tags.map(function(t) { return '<span class="article-tag">' + escHtml(t) + '</span>'; }).join('') + '</div>'
    : '';

  return '<li class="article-card' + (a.read ? ' read' : '') + '"' +
    ' data-id="' + escHtml(a.id) + '" tabindex="0" role="button" aria-label="' + escHtml(a.title) + '">' +
    '<span class="article-unread-dot" aria-hidden="true"></span>' +
    (isGrid && a.image ? thumb : '') +
    '<div class="article-body">' +
      '<div class="article-source-row">' +
        '<img class="article-source-favicon" src="' + escHtml(a.favicon || '') + '" alt="" onerror="this.style.display=\'none\'" loading="lazy">' +
        '<span class="article-source">' + escHtml(a.feedName) + '</span>' +
        '<time class="article-date">' + formatDate(a.date) + '</time>' +
      '</div>' +
      '<h3 class="article-title">' + escHtml(a.title) + '</h3>' +
      (a.desc ? '<p class="article-desc">' + escHtml(a.desc) + '</p>' : '') +
      tagsHtml +
    '</div>' +
    (!isGrid && a.image ? thumb : '') +
    '<div class="article-actions">' +
      '<button class="article-star-btn' + (a.starred ? ' starred' : '') + '"' +
        ' data-id="' + escHtml(a.id) + '" title="' + (a.starred ? 'Yıldızı kaldır' : 'Yıldız ekle') + '">' +
        (a.starred ? '★' : '☆') +
      '</button>' +
    '</div></li>';
}

// ── MODAL ──────────────────────────────────────────────────────────────────
function openModal(aid) {
  const a = state.articles.find(function(x) { return x.id === aid; });
  if (!a) return;

  markRead(aid);

  const backdrop = qs('.modal-backdrop');
  backdrop.dataset.aid = aid;

  qs('.modal-title',    backdrop).textContent = a.title;
  qs('.modal-meta',     backdrop).textContent = a.feedName + ' · ' + formatDate(a.date);
  qs('.modal-open-btn', backdrop).href        = a.url || '#';

  const sanitized = sanitize(a.content || '<p>' + escHtml(a.desc) + '</p>');
  const contentEl = qs('.modal-content', backdrop);
  contentEl.innerHTML = sanitized;

  // Görsellere lightbox ve büyütme
  enhanceImages(contentEl);

  applyHighlightsToContent(aid, contentEl);
  applyTypography();
  renderSuggestions(aid);

  const starBtn = qs('.modal-star-btn', backdrop);
  starBtn.classList.toggle('starred', a.starred);
  starBtn.textContent = a.starred ? '★' : '☆';
  starBtn.title       = a.starred ? 'Yıldızı kaldır' : 'Yıldız ekle';
  starBtn.onclick = function() {
    const starred = toggleStar(aid);
    starBtn.classList.toggle('starred', starred);
    starBtn.textContent = starred ? '★' : '☆';
    starBtn.title       = starred ? 'Yıldızı kaldır' : 'Yıldız ekle';
    const cardBtn = qs('.article-star-btn[data-id="' + CSS.escape(aid) + '"]');
    if (cardBtn) { cardBtn.classList.toggle('starred', starred); cardBtn.textContent = starred ? '★' : '☆'; }
    renderFeedList();
  };

  const notesInput = qs('.notes-input', backdrop);
  notesInput.value = state.notes[aid] || '';
  qs('.notes-save-btn', backdrop).onclick = function() {
    state.notes[aid] = notesInput.value;
    saveState();
    showToast('Not kaydedildi');
  };

  renderHighlightsList(aid, backdrop);

  backdrop.hidden = false;
  document.body.style.overflow = 'hidden';

  const card = qs('.article-card[data-id="' + CSS.escape(aid) + '"]');
  if (card) card.classList.add('read');

  renderFeedList();
}

function closeModal() {
  const backdrop = qs('.modal-backdrop');
  backdrop.hidden = false; // ensure DOM accessible
  exitZenMode();
  backdrop.hidden = true;
  document.body.style.overflow = '';
  qs('.notes-pane').hidden = true;
  qs('.modal-notes-btn').classList.remove('active');
  qs('.modal-notes-btn').setAttribute('aria-pressed', 'false');
  qs('.typo-panel').hidden = true;
  qs('.modal-typo-btn').classList.remove('active');
  qs('.modal-typo-btn').setAttribute('aria-pressed', 'false');
}

// ── GÖRSEL BÜYÜTME (LİGHTBOX) ─────────────────────────────────────────────
function enhanceImages(contentEl) {
  qsa('img', contentEl).forEach(function(img) {
    img.style.cursor = 'zoom-in';
    img.title = 'Büyütmek için tıkla';
    img.addEventListener('click', function() { openLightbox(img.src, img.alt); });
  });
}

function openLightbox(src, alt) {
  const lb = qs('.lightbox');
  qs('.lightbox-img').src      = src;
  qs('.lightbox-img').alt      = alt || '';
  qs('.lightbox-caption').textContent = alt || '';
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  qs('.lightbox').hidden = true;
  document.body.style.overflow = '';
}

// ── ZEN MODU ───────────────────────────────────────────────────────────────
function enterZenMode() {
  document.body.classList.add('zen-mode');
  qs('.modal-zen-btn').classList.add('active');
  qs('.modal-zen-btn').setAttribute('aria-pressed', 'true');
  qs('.modal-zen-btn').title = 'Zen modundan çık';
  // Notlar paneli açıksa kapat
  qs('.notes-pane').hidden = true;
  qs('.modal-notes-btn').classList.remove('active');
  // Tipografi paneli açıksa kapat
  qs('.typo-panel').hidden = true;
  qs('.modal-typo-btn').classList.remove('active');
}

function exitZenMode() {
  document.body.classList.remove('zen-mode');
  const btn = qs('.modal-zen-btn');
  if (btn) {
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
    btn.title = 'Derin okuma modu';
  }
}

function toggleZenMode() {
  if (document.body.classList.contains('zen-mode')) exitZenMode();
  else enterZenMode();
}

// ── TİPOGRAFİ ─────────────────────────────────────────────────────────────
const FONT_MAP = {
  inter:  "'Inter', sans-serif",
  lora:   "'Lora', Georgia, serif",
  mono:   "'JetBrains Mono', 'Courier New', monospace",
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

function applyTypography() {
  const t  = state.typo;
  const mc = qs('.modal-content');
  const mt = qs('.modal-title');
  if (!mc) return;

  mc.style.fontFamily    = FONT_MAP[t.font] || FONT_MAP.inter;
  mc.style.fontSize      = t.size + 'px';
  mc.style.lineHeight    = (t.line / 10).toFixed(1);
  mc.style.letterSpacing = t.letter + 'px';
  mc.style.maxWidth      = t.width + 'px';
  mt.style.maxWidth      = t.width + 'px';
  mt.style.fontFamily    = FONT_MAP[t.font] || FONT_MAP.inter;
}

function syncTypoPanel() {
  const t = state.typo;
  const fontBtns = qsa('.font-btn');
  fontBtns.forEach(function(b) {
    b.classList.toggle('active', b.dataset.font === t.font);
  });
  const setSlider = function(id, val, labelId, suffix) {
    const el = qs('#' + id);
    if (el) el.value = val;
    const lbl = qs('#' + labelId);
    if (lbl) lbl.textContent = suffix ? val + suffix : val;
  };
  setSlider('typo-size',   t.size,   'typo-size-val',   'px');
  setSlider('typo-line',   t.line,   'typo-line-val',   '');
  setSlider('typo-letter', t.letter, 'typo-letter-val', 'px');
  setSlider('typo-width',  t.width,  'typo-width-val',  'px');
  // line value göster
  const lineVal = qs('#typo-line-val');
  if (lineVal) lineVal.textContent = (t.line / 10).toFixed(1);
}

// ── HIGHLIGHTS / NOTES ─────────────────────────────────────────────────────
function applyHighlightsToContent(aid, contentEl) {
  const list = state.highlights[aid] || [];
  if (!list.length) return;
  list.forEach(function(h) {
    const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      const idx = node.nodeValue.indexOf(h.text);
      if (idx === -1) continue;
      const before = document.createTextNode(node.nodeValue.slice(0, idx));
      const mark   = document.createElement('mark');
      mark.style.background = h.color;
      mark.textContent = h.text;
      const after  = document.createTextNode(node.nodeValue.slice(idx + h.text.length));
      const parent = node.parentNode;
      parent.insertBefore(before, node);
      parent.insertBefore(mark, node);
      parent.insertBefore(after, node);
      parent.removeChild(node);
      break;
    }
  });
}

function renderHighlightsList(aid, backdrop) {
  const list      = state.highlights[aid] || [];
  const container = qs('.highlights-list', backdrop);
  if (!list.length) { container.innerHTML = '<p style="font-size:11px;color:#333">Henüz vurgu yok.</p>'; return; }

  container.innerHTML = list.map(function(h, i) {
    return '<div class="highlight-item" style="border-color:' + h.color + '">' +
      '"' + escHtml(h.text.slice(0, 60)) + (h.text.length > 60 ? '…' : '') + '"' +
      '<button class="hl-remove" data-idx="' + i + '" title="Sil">✕</button></div>';
  }).join('');

  qsa('.hl-remove', container).forEach(function(btn) {
    btn.addEventListener('click', function() {
      const idx = parseInt(btn.dataset.idx);
      state.highlights[aid].splice(idx, 1);
      if (!state.highlights[aid].length) delete state.highlights[aid];
      saveState();
      const contentEl = qs('.modal-content', backdrop);
      const a = state.articles.find(function(x) { return x.id === aid; });
      contentEl.innerHTML = sanitize(a ? (a.content || '<p>' + escHtml(a.desc) + '</p>') : '');
      enhanceImages(contentEl);
      applyHighlightsToContent(aid, contentEl);
      renderHighlightsList(aid, backdrop);
    });
  });
}

function handleHighlight(aid) {
  const sel  = window.getSelection();
  if (!sel || sel.isCollapsed) return;
  const text = sel.toString().trim();
  if (!text || text.length > 300) return;

  if (!state.highlights[aid]) state.highlights[aid] = [];
  state.highlights[aid].push({ text: text, color: state.activeColor });
  saveState();

  const backdrop  = qs('.modal-backdrop');
  const contentEl = qs('.modal-content', backdrop);
  const a = state.articles.find(function(x) { return x.id === aid; });
  contentEl.innerHTML = sanitize(a ? (a.content || '<p>' + escHtml(a.desc) + '</p>') : '');
  enhanceImages(contentEl);
  applyHighlightsToContent(aid, contentEl);
  renderHighlightsList(aid, backdrop);
  sel.removeAllRanges();
  showToast('Vurgu eklendi');
}

// ── SANİTİZE ───────────────────────────────────────────────────────────────
function sanitize(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('script, iframe, object, embed, form').forEach(function(el) { el.remove(); });
  div.querySelectorAll('*').forEach(function(el) {
    Array.from(el.attributes).forEach(function(attr) {
      if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
    });
    const href = el.getAttribute('href');
    if (href && href.trim().toLowerCase().startsWith('javascript:')) el.removeAttribute('href');
    const src = el.getAttribute('src');
    if (src && src.trim().toLowerCase().startsWith('data:text')) el.removeAttribute('src');
  });
  return div.innerHTML;
}

// ── SCORE ──────────────────────────────────────────────────────────────────
function scoreArticle(a) {
  let score = 0;
  const now = Date.now();
  const age = now - new Date(a.date).getTime();

  // 7 gün içindeki haberlere puan — daha yeni = daha yüksek
  if (age < 3600000)       score += 50;
  else if (age < 21600000) score += 35;
  else if (age < 86400000) score += 20;
  else if (age < SEVEN_DAYS) score += 8;

  if (a.starred)  score += 30;
  if (!a.read)    score += 10;
  if (a.image)    score += 8;
  if (a.tags && a.tags.length > 1) score += a.tags.length * 4;
  if (a.title && a.title.length > 30 && a.title.length < 100) score += 5;

  // Okuma geçmişindeki tag'larla örtüşme
  const recentReadTags = {};
  Object.keys(state.readHistory).forEach(function(id) {
    if (Date.now() - state.readHistory[id] < 86400000 * 3) {
      const ra = state.articles.find(function(x) { return x.id === id; });
      if (ra) (ra.tags || []).forEach(function(t) { recentReadTags[t] = true; });
    }
  });
  (a.tags || []).forEach(function(t) { if (recentReadTags[t]) score += 6; });

  const urgentWords = ['breaking', 'urgent', 'exclusive', 'alert', 'major', 'critical', 'attack', 'crisis', 'war', 'emergency'];
  const titleLower  = (a.title || '').toLowerCase();
  urgentWords.forEach(function(w) { if (titleLower.indexOf(w) !== -1) score += 12; });

  return score;
}

// ── HOMEPAGE ───────────────────────────────────────────────────────────────
function renderHomepage() {
  const cardsList = qs('.homepage-cards');
  const emptyMsg  = qs('.homepage-empty');

  // Son 7 günden makaleler
  const recent = state.articles.filter(function(a) {
    return new Date(a.date).getTime() >= Date.now() - SEVEN_DAYS;
  });

  if (recent.length === 0) {
    cardsList.innerHTML = '';
    emptyMsg.hidden = false;
    return;
  }
  emptyMsg.hidden = true;

  const scored = recent.map(function(a) { return { article: a, score: scoreArticle(a) }; });
  scored.sort(function(a, b) { return b.score - a.score; });
  const top5 = scored.slice(0, 5);

  cardsList.innerHTML = top5.map(function(item, i) {
    const a = item.article;
    const thumb = a.image
      ? '<div class="hp-card-thumb" style="background-image:url(' + escHtml(a.image) + ')"></div>'
      : '<div class="hp-card-thumb hp-card-thumb-empty"><span>' + escHtml(a.feedName.charAt(0)) + '</span></div>';
    const tagsHtml = (a.tags && a.tags.length)
      ? '<div class="hp-card-tags">' + a.tags.slice(0, 2).map(function(t) { return '<span class="hp-card-tag">' + escHtml(t) + '</span>'; }).join('') + '</div>'
      : '';

    return '<li class="hp-card' + (i === 0 ? ' hp-card-first' : '') + (a.read ? ' read' : '') +
      '" data-id="' + escHtml(a.id) + '" tabindex="0" role="button" aria-label="' + escHtml(a.title) + '">' +
      '<div class="hp-card-rank">' + (i + 1) + '</div>' +
      thumb +
      '<div class="hp-card-body">' +
        '<div class="hp-card-meta">' +
          '<img class="hp-card-favicon" src="' + escHtml(a.favicon || '') + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' +
          '<span class="hp-card-source">' + escHtml(a.feedName) + '</span>' +
          '<span class="hp-card-dot">·</span>' +
          '<time class="hp-card-date">' + formatDate(a.date) + '</time>' +
        '</div>' +
        '<h2 class="hp-card-title">' + escHtml(a.title) + '</h2>' +
        (a.desc ? '<p class="hp-card-desc">' + escHtml(a.desc) + '</p>' : '') +
        tagsHtml +
      '</div></li>';
  }).join('');

  qsa('.hp-card', cardsList).forEach(function(card) {
    card.addEventListener('click', function() { openModal(card.dataset.id); });
    card.addEventListener('keydown', function(e) { if (e.key === 'Enter') openModal(card.dataset.id); });
  });
}

function showHomepage() {
  qs('.homepage-view').hidden   = false;
  qs('.articles-wrap').hidden   = true;
  qs('.filter-bar').hidden      = true;
  qs('.page-title').textContent = 'Anasayfa';
}

function hideHomepage() {
  qs('.homepage-view').hidden = true;
  qs('.articles-wrap').hidden = false;
  qs('.filter-bar').hidden    = false;
}

// ── ANALİTİK ───────────────────────────────────────────────────────────────
function openAnalytics()  { qs('.analytics-panel').hidden = false; renderAnalytics(); }
function closeAnalytics() { qs('.analytics-panel').hidden = true; }

function renderAnalytics() {
  const panel      = qs('.analytics-panel');
  const feedCounts = {};
  let readCount    = 0;
  const total      = state.articles.length;

  state.articles.forEach(function(a) {
    feedCounts[a.feedName] = (feedCounts[a.feedName] || 0) + 1;
    if (a.read) readCount++;
  });

  const maxCount = Math.max.apply(null, Object.values(feedCounts).concat([1]));
  let barsHtml = '';
  Object.keys(feedCounts).sort(function(a, b) { return feedCounts[b] - feedCounts[a]; }).forEach(function(name) {
    const pct = Math.round((feedCounts[name] / maxCount) * 100);
    barsHtml += '<div class="source-bar-item"><div class="source-bar-label"><span>' + escHtml(name) + '</span><span>' + feedCounts[name] + '</span></div>' +
      '<div class="source-bar-track"><div class="source-bar-fill" style="width:' + pct + '%"></div></div></div>';
  });
  qs('.source-bars', panel).innerHTML = barsHtml || '<p style="font-size:11px;color:#333">Veri yok</p>';

  const topList = state.articles.filter(function(a) { return a.read; }).slice(0, 5);
  qs('.top-articles', panel).innerHTML = topList.map(function(a, i) {
    return '<li class="top-article-item"><span class="top-article-rank">' + (i + 1) + '.</span><span class="top-article-title">' + escHtml(a.title) + '</span></li>';
  }).join('') || '<p style="font-size:11px;color:#333">Henüz okunmuş makale yok</p>';

  const wordFreq = {};
  const stopwords = ['the','a','an','in','on','at','to','for','of','and','or','is','was','are','were','with','that','this','it','he','she','we','they','be','been','has','have','had','but','not','as','by','from','up','about','into','through','after','will','also','its','can','said','than'];
  state.articles.forEach(function(a) {
    (a.title + ' ' + a.desc).toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).forEach(function(w) {
      if (w.length > 3 && !stopwords.includes(w)) wordFreq[w] = (wordFreq[w] || 0) + 1;
    });
  });
  const topWords = Object.keys(wordFreq).sort(function(a, b) { return wordFreq[b] - wordFreq[a]; }).slice(0, 24);
  const maxW     = wordFreq[topWords[0]] || 1;
  qs('.word-cloud', panel).innerHTML = topWords.map(function(w) {
    return '<span class="word-item' + (wordFreq[w] >= maxW * 0.5 ? ' big' : '') + '" data-word="' + escHtml(w) + '">' + escHtml(w) + '</span>';
  }).join('') || '<p style="font-size:11px;color:#333">Veri yok</p>';

  qsa('.word-item', panel).forEach(function(el) {
    el.addEventListener('click', function() {
      qs('.search-input').value = el.dataset.word;
      state.searchQuery = el.dataset.word;
      renderArticles(); closeAnalytics();
      showToast('"' + el.dataset.word + '" için filtrelendi');
    });
  });

  const notesCount = Object.keys(state.notes).filter(function(k) { return state.notes[k]; }).length;
  const hlCount    = Object.keys(state.highlights).reduce(function(acc, k) { return acc + (state.highlights[k] || []).length; }, 0);
  const tagCounts  = {};
  state.articles.forEach(function(a) { (a.tags || []).forEach(function(t) { tagCounts[t] = (tagCounts[t] || 0) + 1; }); });
  const topTag = Object.keys(tagCounts).sort(function(a, b) { return tagCounts[b] - tagCounts[a]; })[0] || '—';

  qs('.read-stats', panel).innerHTML =
    '<div class="stat-row"><span class="stat-label">Toplam Makale</span><span class="stat-value">' + total + '</span></div>' +
    '<div class="stat-row"><span class="stat-label">Okunmuş</span><span class="stat-value">' + readCount + '</span></div>' +
    '<div class="stat-row"><span class="stat-label">Okunmamış</span><span class="stat-value">' + (total - readCount) + '</span></div>' +
    '<div class="stat-row"><span class="stat-label">Notlar</span><span class="stat-value">' + notesCount + '</span></div>' +
    '<div class="stat-row"><span class="stat-label">Vurgular</span><span class="stat-value">' + hlCount + '</span></div>' +
    '<div class="stat-row"><span class="stat-label">Öne Çıkan Konu</span><span class="stat-value">' + escHtml(topTag) + '</span></div>';
}

// ── EXPORT / IMPORT ────────────────────────────────────────────────────────
function exportFeeds() {
  if (state.feeds.length === 0) { showToast('Dışa aktarılacak kaynak yok'); return; }
  let opml = '<?xml version="1.0" encoding="UTF-8"?>\n<opml version="1.0">\n  <head><title>RSS Okuyucu</title></head>\n  <body>\n';
  state.feeds.forEach(function(feed) {
    opml += '    <outline type="rss" text="' + escHtml(feed.name) + '" xmlUrl="' + escHtml(feed.url) + '" />\n';
  });
  opml += '  </body>\n</opml>';
  const blob = new Blob([opml], { type: 'text/xml' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'rss-kaynaklar.opml';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  showToast(state.feeds.length + ' kaynak dışa aktarıldı');
}

function importFeeds(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    let added  = 0;
    if (file.name.endsWith('.json')) {
      try {
        const parsed = JSON.parse(text);
        const list   = Array.isArray(parsed) ? parsed : (parsed.feeds || []);
        list.forEach(function(item) {
          const url = item.url || item.xmlUrl;
          if (url && !state.feeds.some(function(f) { return f.url === url; })) {
            state.feeds.push({ id: uid(), name: item.name || item.text || new URL(url).hostname, url: url, favicon: null });
            added++;
          }
        });
      } catch (_) { showToast('JSON dosyası okunamadı'); return; }
    } else {
      const parser = new DOMParser();
      const doc    = parser.parseFromString(text, 'text/xml');
      doc.querySelectorAll('outline[xmlUrl]').forEach(function(node) {
        const url = node.getAttribute('xmlUrl');
        if (url && !state.feeds.some(function(f) { return f.url === url; })) {
          state.feeds.push({ id: uid(), name: node.getAttribute('text') || new URL(url).hostname, url: url, favicon: null });
          added++;
        }
      });
    }
    if (!added) { showToast('Yeni kaynak bulunamadı'); return; }
    saveState(); renderFeedList();
    showToast(added + ' kaynak eklendi, yükleniyor…');
    refreshAll();
  };
  reader.readAsText(file);
}

// ── HELPERS ────────────────────────────────────────────────────────────────
function updatePageTitle() {
  const el = qs('.page-title');
  if (state.activeFeedId === 'home')      el.textContent = 'Anasayfa';
  else if (state.activeFeedId === 'all')  el.textContent = 'Tüm Haberler';
  else {
    const feed = state.feeds.find(function(f) { return f.id === state.activeFeedId; });
    el.textContent = feed ? feed.name : 'Haberler';
  }
}

function openSidebar()  { qs('.sidebar').classList.add('open');    qs('.overlay').classList.add('visible'); }
function closeSidebar() { qs('.sidebar').classList.remove('open'); qs('.overlay').classList.remove('visible'); }

// ── PLATFORM YARDIM METİNLERİ ─────────────────────────────────────────────
const PLATFORM_HINTS = {
  youtube:  { label: 'YouTube Kanalı',  hint: 'Kanal, kullanıcı veya playlist URL\'si yapıştırın.\nÖrnek: youtube.com/@LinusTechTips\n        youtube.com/channel/UCXuqSBlHAE6Xw-yeJA0Tunw\n        youtube.com/playlist?list=PLxxxx' },
  reddit:   { label: 'Reddit',           hint: 'Subreddit veya kullanıcı URL\'si yapıştırın.\nÖrnek: reddit.com/r/technology\n        reddit.com/r/worldnews\n        reddit.com/user/kullanici' },
  github:   { label: 'GitHub',           hint: 'Repo URL\'si yapıştırın — releases RSS oluşturulur.\nÖrnek: github.com/microsoft/vscode\n        github.com/torvalds/linux' },
  medium:   { label: 'Medium',           hint: 'Yazar veya etiket URL\'si yapıştırın.\nÖrnek: medium.com/@kullanici\n        medium.com/tag/javascript' },
  substack: { label: 'Substack',         hint: 'Substack URL\'si yapıştırın.\nÖrnek: stratechery.substack.com\n        waitbutwhy.substack.com' },
  mastodon: { label: 'Mastodon',         hint: 'Mastodon profil URL\'si yapıştırın.\nÖrnek: mastodon.social/@Gargron\n        fosstodon.org/@kev' },
  hn:       { label: 'Hacker News',      hint: null },  // direkt ekle
  devto:    { label: 'Dev.to',           hint: null },  // direkt ekle
};

const PLATFORM_DIRECT = {
  hn:    'https://hnrss.org/frontpage',
  devto: 'https://dev.to/feed',
};

// ── EVENTS ─────────────────────────────────────────────────────────────────
function bindEvents() {
  const urlInput = qs('.feed-input');
  qs('.add-btn').addEventListener('click', function() { addFeed(urlInput.value); urlInput.value = ''; });
  urlInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') { addFeed(urlInput.value); urlInput.value = ''; } });

  // Hızlı ekleme butonları
  qsa('.quick-add-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const platform = btn.dataset.platform;
      const direct   = PLATFORM_DIRECT[platform];
      if (direct) {
        // Direkt RSS URL'si olan platformlar — hemen ekle
        addFeed(direct);
        return;
      }
      const info = PLATFORM_HINTS[platform];
      if (!info) return;
      // Input'a odaklan ve placeholder'ı güncelle
      urlInput.focus();
      urlInput.placeholder = info.hint ? info.hint.split('\n')[0] : 'URL yapıştırın…';
      urlInput.dataset.hintPlatform = platform;
      // Kısa bilgi tostu
      if (info.hint) {
        showToast(info.label + ': ' + info.hint.split('\n')[1].trim());
      }
    });
  });

  // Input blur → placeholder'ı sıfırla
  urlInput.addEventListener('blur', function() {
    urlInput.placeholder = 'URL yapıştır (YouTube, Reddit…)';
    delete urlInput.dataset.hintPlatform;
  });

  qs('.refresh-btn').addEventListener('click', refreshAll);
  qs('.mark-all-btn').addEventListener('click', markAllRead);

  // Filtre chip'leri (okundu/okunmamış/yıldızlı)
  qsa('.filter-chip:not(.filter-chip-days)').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.activeFilter = btn.dataset.filter;
      qsa('.filter-chip:not(.filter-chip-days)').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      renderArticles();
    });
  });

  // 7 gün filtre toggle
  const daysBtn = qs('.filter-chip-days');
  if (daysBtn) {
    daysBtn.classList.toggle('active-days', state.daysFilter === 7);
    daysBtn.addEventListener('click', function() {
      if (state.daysFilter === 7) {
        state.daysFilter = 0;   // 0 = sınırsız
        daysBtn.textContent = 'Tüm Zamanlar';
        daysBtn.classList.remove('active-days');
      } else {
        state.daysFilter = 7;
        daysBtn.textContent = 'Son 7 Gün';
        daysBtn.classList.add('active-days');
      }
      saveState();
      renderArticles();
    });
    daysBtn.textContent = state.daysFilter === 7 ? 'Son 7 Gün' : 'Tüm Zamanlar';
  }

  // Arama
  let searchTimer;
  qs('.search-input').addEventListener('input', function(e) {
    clearTimeout(searchTimer);
    const val = e.target.value;
    searchTimer = setTimeout(function() { state.searchQuery = val; renderArticles(); }, 250);
  });

  // Layout
  qs('.layout-list').addEventListener('click', function() {
    state.layout = 'list';
    qs('.layout-list').classList.add('active');    qs('.layout-list').setAttribute('aria-pressed', 'true');
    qs('.layout-grid').classList.remove('active'); qs('.layout-grid').setAttribute('aria-pressed', 'false');
    renderArticles(); saveState();
  });
  qs('.layout-grid').addEventListener('click', function() {
    state.layout = 'grid';
    qs('.layout-grid').classList.add('active');    qs('.layout-grid').setAttribute('aria-pressed', 'true');
    qs('.layout-list').classList.remove('active'); qs('.layout-list').setAttribute('aria-pressed', 'false');
    renderArticles(); saveState();
  });

  // Modal kapat
  qs('.modal-close-btn').addEventListener('click', closeModal);
  qs('.modal-backdrop').addEventListener('click', function(e) { if (e.target === e.currentTarget) closeModal(); });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (!qs('.lightbox').hidden) { closeLightbox(); return; }
      if (document.body.classList.contains('zen-mode')) { exitZenMode(); return; }
      closeModal();
      closeAnalytics();
    }
  });

  // Not paneli toggle
  qs('.modal-notes-btn').addEventListener('click', function() {
    const pane = qs('.notes-pane');
    const btn  = qs('.modal-notes-btn');
    pane.hidden = !pane.hidden;
    btn.classList.toggle('active', !pane.hidden);
    btn.setAttribute('aria-pressed', !pane.hidden ? 'true' : 'false');
  });

  // Tipografi paneli toggle
  qs('.modal-typo-btn').addEventListener('click', function() {
    const panel = qs('.typo-panel');
    const btn   = qs('.modal-typo-btn');
    panel.hidden = !panel.hidden;
    btn.classList.toggle('active', !panel.hidden);
    btn.setAttribute('aria-pressed', !panel.hidden ? 'true' : 'false');
    if (!panel.hidden) syncTypoPanel();
  });

  // Zen modu
  qs('.modal-zen-btn').addEventListener('click', toggleZenMode);

  // Font seçimi
  document.addEventListener('click', function(e) {
    const fb = e.target.closest('.font-btn');
    if (!fb) return;
    state.typo.font = fb.dataset.font;
    qsa('.font-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.font === state.typo.font); });
    applyTypography(); saveState();
  });

  // Slider'lar
  function bindSlider(id, prop, isLine) {
    const el = qs('#' + id);
    if (!el) return;
    el.addEventListener('input', function() {
      const v = Number(el.value);
      state.typo[prop] = v;
      const lbl = qs('#' + id + '-val');
      if (lbl) lbl.textContent = isLine ? (v / 10).toFixed(1) : v + 'px';
      applyTypography(); saveState();
    });
  }
  bindSlider('typo-size',   'size',   false);
  bindSlider('typo-line',   'line',   true);
  bindSlider('typo-letter', 'letter', false);
  bindSlider('typo-width',  'width',  false);

  // Tipografi ± butonları
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.typo-minus, .typo-plus');
    if (!btn) return;
    const target = btn.dataset.target;
    const isPlus = btn.classList.contains('typo-plus');
    const steps  = { size: 1, line: 1, letter: 1, width: 20 };
    const mins   = { size: 13, line: 14, letter: -2, width: 400 };
    const maxs   = { size: 22, line: 22, letter: 10, width: 900 };
    const step   = steps[target] || 1;
    let val = state.typo[target] + (isPlus ? step : -step);
    val = Math.max(mins[target], Math.min(maxs[target], val));
    state.typo[target] = val;
    syncTypoPanel();
    applyTypography(); saveState();
  });

  // Lightbox
  qs('.lightbox-close').addEventListener('click', closeLightbox);
  qs('.lightbox').addEventListener('click', function(e) { if (e.target === e.currentTarget) closeLightbox(); });

  // Sidebar
  qs('.menu-btn').addEventListener('click', openSidebar);
  qs('.sidebar-close').addEventListener('click', closeSidebar);
  qs('.overlay').addEventListener('click', closeSidebar);

  // Export / Import
  qs('.export-btn').addEventListener('click', exportFeeds);
  qs('.import-input').addEventListener('change', function(e) { importFeeds(e.target.files[0]); e.target.value = ''; });

  // Analitik
  qs('.analytics-btn').addEventListener('click', openAnalytics);
  qs('.analytics-close-btn').addEventListener('click', closeAnalytics);

  // Highlight renkleri
  qsa('.hl-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.activeColor = btn.dataset.color;
      qsa('.hl-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });
  qs('.hl-btn').classList.add('active');

  // Metin seçimi → vurgu
  qs('.modal-content').addEventListener('mouseup', function() {
    const aid = qs('.modal-backdrop').dataset.aid;
    if (aid) handleHighlight(aid);
  });
}

// ── INIT ───────────────────────────────────────────────────────────────────
function init() {
  loadState();

  state.feeds    = state.feeds.filter(function(f) { return f.id !== 'nasa'; });
  state.articles = state.articles.filter(function(a) { return a.feedId !== 'nasa'; });

  if (state.feeds.length === 0) {
    state.feeds = DEFAULT_FEEDS.map(function(f) { return Object.assign({}, f); });
  }

  if (state.layout === 'grid') {
    qs('.layout-grid').classList.add('active');    qs('.layout-grid').setAttribute('aria-pressed', 'true');
    qs('.layout-list').classList.remove('active'); qs('.layout-list').setAttribute('aria-pressed', 'false');
  }

  bindEvents();
  renderFeedList();
  renderSmartTags();

  if (state.activeFeedId === 'home') {
    showHomepage();
    if (state.articles.length > 0) renderHomepage();
    else qs('.homepage-empty').hidden = false;
  } else if (state.articles.length > 0) {
    renderArticles();
  } else {
    qs('.empty-state').hidden = false;
  }

  refreshAll();
}

document.addEventListener('DOMContentLoaded', init);
