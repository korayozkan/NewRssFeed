'use strict';

// ── RSS PROXY LİSTESİ ──────────────────────────────────────────────────────
// Sırayla denenir; tümü ücretsiz ve API key gerektirmez.
// İlk başarılı yanıt döndürülür; hata durumunda bir sonraki proxy'e geçilir.

function buildProxies(feedUrl) {
  const enc = encodeURIComponent(feedUrl);
  return [
    // rss2json — JSON döner, en kolay parse
    { url: 'https://api.rss2json.com/v1/api.json?rss_url=' + enc, type: 'json' },
    // allorigins — wildcard CORS, { contents: xml }
    { url: 'https://api.allorigins.win/raw?url=' + enc,           type: 'xml'  },
    // corsproxy.io — wildcard CORS, ham XML
    { url: 'https://corsproxy.io/?' + enc,                        type: 'xml'  },
    // thingproxy — cors-anywhere klonu
    { url: 'https://thingproxy.freeboard.io/fetch/' + feedUrl,   type: 'xml'  },
    // codetabs — JSON wrapper { contents }
    { url: 'https://api.codetabs.com/v1/proxy?quest=' + enc,     type: 'xml'  },
    // cors.eu.org — son çare
    { url: 'https://cors.eu.org/' + feedUrl,                     type: 'xml'  },
  ];
}

// ── ABORT SIGNAL YARDIMCISI ────────────────────────────────────────────────
// AbortSignal.timeout modern tarayıcılarda desteklenir; olmayan için fallback.
function makeAbortSignal(ms) {
  try {
    return AbortSignal.timeout(ms);
  } catch (_) {
    const ctrl = new AbortController();
    setTimeout(function() { ctrl.abort(); }, ms);
    return ctrl.signal;
  }
}

// ── XML PARSE ─────────────────────────────────────────────────────────────
// Ham RSS veya Atom XML metnini standart bir veri nesnesine dönüştürür.
function parseRawXml(xmlText, feed) {
  if (!xmlText || xmlText.trim() === '') return null;
  try {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(xmlText, 'text/xml');
    if (doc.querySelector('parseerror, parsererror')) return null;

    const isAtom = !!doc.querySelector('feed > entry, feed');
    const items  = [];

    if (isAtom) {
      // ── Atom formatı ──────────────────────────────────────────────────
      const t = doc.querySelector('feed > title');
      if (t) {
        try { if (feed.name === new URL(feed.url).hostname) feed.name = t.textContent.trim(); } catch (_) {}
      }
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
      // ── RSS formatı ───────────────────────────────────────────────────
      const t = doc.querySelector('channel > title');
      if (t) {
        try { if (feed.name === new URL(feed.url).hostname) feed.name = t.textContent.trim(); } catch (_) {}
      }
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
          enclosure:   encEl   ? { link: encEl.getAttribute('url') }                          : null,
          thumbnail:   mediaEl ? (mediaEl.getAttribute('url') || mediaEl.getAttribute('src')) : null,
        });
      });
    }

    if (items.length === 0) return null;
    return { status: 'ok', feed: { title: feed.name }, items };
  } catch (_) { return null; }
}

// ── FEED FETCH ─────────────────────────────────────────────────────────────
// Önce önbelleği kontrol eder; cache'de yoksa proxy'leri sırayla dener.
async function fetchFeed(feed) {
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

      if (!res.ok) { lastErr = new Error('Proxy-' + i + ' HTTP ' + res.status); continue; }

      const text = await res.text();
      if (!text || !text.trim()) { lastErr = new Error('Boş yanıt'); continue; }

      let result    = null;
      const firstCh = text.trim()[0];

      if (proxy.type === 'json' || firstCh === '{' || firstCh === '[') {
        let data;
        try { data = JSON.parse(text); } catch (_) { result = parseRawXml(text, feed); }
        if (!result && data) {
          if (data.status && data.status !== 'ok') {
            lastErr = new Error(data.message || 'Feed hatası (proxy ' + i + ')');
            continue;
          }
          if (data.items) {
            result = data;
          } else if (typeof data.contents === 'string') {
            result = parseRawXml(data.contents, feed);
          }
        }
      } else {
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

// ── YARDIMCI FONKSİYONLAR ─────────────────────────────────────────────────

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

// ── FEED VERİSİNİ PARSE ET ────────────────────────────────────────────────
// Ham feed JSON'unu article nesnesine dönüştürür.
// 7 günden eski makaleler bu aşamada filtrelenir.
function parseFeedData(data, feed) {
  const items   = data.items || [];
  const favicon = getFavicon(feed.url);

  if (data.feed && data.feed.title) {
    try {
      if (feed.name === new URL(feed.url).hostname) feed.name = data.feed.title;
    } catch (_) {}
  }
  feed.favicon = favicon;

  const cutoff = Date.now() - SEVEN_DAYS;

  return items
    .filter(function(item) {
      if (!item.pubDate) return true;
      const d = new Date(item.pubDate);
      return !isNaN(d) ? d.getTime() >= cutoff : true;
    })
    .map(function(item) {
      const id       = feed.id + '::' + (item.link || item.title || '');
      const existing = state.articles.find(function(a) { return a.id === id; });
      const fullText = (item.title || '') + ' ' + stripHtml(item.description || item.content || '');
      return {
        id,
        feedId:   feed.id,
        feedName: feed.name,
        favicon,
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

// ── URL → RSS DÖNÜŞTÜRÜCÜ ─────────────────────────────────────────────────
// Kullanıcı herhangi bir platform URL'si yapıştırabilir; sistem RSS URL'sine çevirir.
// Desteklenen: YouTube, Reddit, GitHub, Medium, Substack, Twitch, Mastodon
function convertToRssUrl(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch (_) { return rawUrl; }

  const host = url.hostname.replace(/^www\./, '');
  const path = url.pathname;

  // YouTube
  if (host === 'youtube.com' || host === 'youtu.be') {
    const channelId   = url.searchParams.get('channel_id');
    if (channelId)    return 'https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId;
    const chanMatch   = path.match(/^\/channel\/(UC[\w-]+)/);
    if (chanMatch)    return 'https://www.youtube.com/feeds/videos.xml?channel_id=' + chanMatch[1];
    const handleMatch = path.match(/^\/@([\w.-]+)/);
    if (handleMatch)  return 'https://www.youtube.com/feeds/videos.xml?user=' + handleMatch[1];
    const userMatch   = path.match(/^\/user\/([\w.-]+)/);
    if (userMatch)    return 'https://www.youtube.com/feeds/videos.xml?user=' + userMatch[1];
    const playlistId  = url.searchParams.get('list');
    if (playlistId)   return 'https://www.youtube.com/feeds/videos.xml?playlist_id=' + playlistId;
    return rawUrl;
  }

  // Reddit
  if (host === 'reddit.com' || host === 'old.reddit.com') {
    const subMatch  = path.match(/^\/r\/([\w]+)/);
    const userMatch = path.match(/^\/u(?:ser)?\/([\w-]+)/);
    if (subMatch)  return 'https://www.reddit.com/r/'   + subMatch[1]  + '/.rss';
    if (userMatch) return 'https://www.reddit.com/user/' + userMatch[1] + '/.rss';
    return 'https://www.reddit.com/.rss';
  }

  // GitHub — releases atom feed
  if (host === 'github.com') {
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 2) return 'https://github.com/' + parts[0] + '/' + parts[1] + '/releases.atom';
    if (parts.length === 1) return 'https://github.com/' + parts[0] + '.atom';
    return rawUrl;
  }

  // Medium
  if (host === 'medium.com') {
    const tagMatch  = path.match(/^\/tag\/([\w-]+)/);
    const userMatch = path.match(/^\/@([\w.-]+)/);
    if (tagMatch)  return 'https://medium.com/feed/tag/'  + tagMatch[1];
    if (userMatch) return 'https://medium.com/feed/@' + userMatch[1];
    return 'https://medium.com/feed' + (path === '/' ? '' : path);
  }

  // Substack
  if (host.endsWith('.substack.com')) return 'https://' + host + '/feed';

  // Twitch — rssbridge üzerinden
  if (host === 'twitch.tv') {
    const chanMatch = path.match(/^\/([\w]+)/);
    if (chanMatch) return 'https://rssbridge.github.io/?action=display&bridge=Twitch&channel=' + chanMatch[1] + '&format=Atom';
    return rawUrl;
  }

  // Mastodon / Fediverse — instance.social/@user
  const mastoMatch = path.match(/^\/@([\w.-]+)$/);
  if (mastoMatch && !['youtube.com','reddit.com','github.com','medium.com'].includes(host)) {
    return url.origin + '/@' + mastoMatch[1] + '.rss';
  }

  return rawUrl;
}

// ── FEED CRUD ──────────────────────────────────────────────────────────────

async function addFeed(rawUrl) {
  let url = rawUrl.trim();
  if (!url) return;
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
  try { new URL(url); } catch (_) { showToast('Geçersiz URL'); return; }

  url = convertToRssUrl(url);

  if (state.feeds.some(function(f) { return f.url === url; })) {
    showToast('Bu kaynak zaten mevcut');
    return;
  }

  const feed = { id: uid(), name: new URL(url).hostname, url, favicon: null };
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

// ── TÜMÜNÜ YENİLE ─────────────────────────────────────────────────────────
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
  if (state.activeFeedId === 'home') { showHomepage(); renderHomepage(); } else { renderArticles(); }
  renderSmartTags();
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
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
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
            state.feeds.push({ id: uid(), name: item.name || item.text || new URL(url).hostname, url, favicon: null });
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
          state.feeds.push({ id: uid(), name: node.getAttribute('text') || new URL(url).hostname, url, favicon: null });
          added++;
        }
      });
    }
    if (!added) { showToast('Yeni kaynak bulunamadı'); return; }
    saveState();
    renderFeedList();
    showToast(added + ' kaynak eklendi, yükleniyor…');
    refreshAll();
  };
  reader.readAsText(file);
}
