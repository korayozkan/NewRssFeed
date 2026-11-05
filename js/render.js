'use strict';

// ── YARDIMCI FORMAT FONKSİYONLARI ─────────────────────────────────────────

/** Tarihi okunabilir metne çevirir (örn: "3 sa önce") */
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

/** HTML özel karakterlerini kaçar — XSS önlemi */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Yükleniyor durumunu ayarlar */
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
/** Geçici bildirim mesajı gösterir (3 saniye) */
function showToast(msg) {
  const t = qs('.toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { t.classList.remove('show'); }, 3000);
}

// ── FİLTRELEME ────────────────────────────────────────────────────────────
// state üzerindeki aktif filtre, feed, etiket ve arama sorgusuna göre
// makale listesini döndürür.
function filteredArticles() {
  let list = state.articles.slice();

  if (state.activeFeedId !== 'all' && state.activeFeedId !== 'home') {
    list = list.filter(function(a) { return a.feedId === state.activeFeedId; });
  }

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

// ── OKUNDU / YILDIZ ────────────────────────────────────────────────────────

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

// ── AKILLI ÖNERİ SİSTEMİ ──────────────────────────────────────────────────
// Okuma geçmişinden bir profil çıkarır ve okunmamış makaleleri puanlar.
function getSmartSuggestions(currentArticleId, limit) {
  limit = limit || 4;

  const tagScore  = {};
  const feedScore = {};

  Object.keys(state.readHistory).forEach(function(id) {
    const a = state.articles.find(function(x) { return x.id === id; });
    if (!a) return;
    const age    = Date.now() - state.readHistory[id];
    const weight = age < 86400000 ? 3 : age < 604800000 ? 2 : 1;
    (a.tags || []).forEach(function(t) { tagScore[t]  = (tagScore[t]  || 0) + weight; });
    feedScore[a.feedId] = (feedScore[a.feedId] || 0) + weight;
  });

  const current = state.articles.find(function(x) { return x.id === currentArticleId; });

  return state.articles
    .filter(function(a) {
      return a.id !== currentArticleId &&
             !a.read &&
             new Date(a.date).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000;
    })
    .map(function(a) {
      let score = 0;
      (a.tags || []).forEach(function(t) {
        score += (tagScore[t] || 0) * 4;
        if (current && current.tags && current.tags.indexOf(t) !== -1) score += 10;
      });
      if (feedScore[a.feedId])               score += feedScore[a.feedId] * 2;
      if (current && a.feedId === current.feedId) score += 5;
      const age = Date.now() - new Date(a.date).getTime();
      if (age < 86400000) score += 8;
      if (age < 3600000)  score += 12;
      if (a.image)        score += 3;
      return { article: a, score };
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
      '</div></li>';
  }).join('');

  qsa('.sugg-card', list).forEach(function(card) {
    card.addEventListener('click', function() { openModal(card.dataset.id); });
    card.addEventListener('keydown', function(e) { if (e.key === 'Enter') openModal(card.dataset.id); });
  });
}

// ── AKILLI ETİKETLER ───────────────────────────────────────────────────────
function renderSmartTags() {
  const tagCounts = {};
  state.articles.forEach(function(a) {
    (a.tags || []).forEach(function(t) { tagCounts[t] = (tagCounts[t] || 0) + 1; });
  });

  const container = qs('.smart-tags');
  let html = '';
  Object.keys(tagCounts)
    .sort(function(a, b) { return tagCounts[b] - tagCounts[a]; })
    .forEach(function(tag) {
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

// ── FEED LİSTESİ ───────────────────────────────────────────────────────────
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
      fav +
      '<span class="feed-name">' + escHtml(feed.name) + '</span>' +
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

// ── MAKALE LİSTESİ ─────────────────────────────────────────────────────────
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
    ? '<div class="article-tags">' +
        a.tags.map(function(t) { return '<span class="article-tag">' + escHtml(t) + '</span>'; }).join('') +
      '</div>'
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

// ── ANASAYFA ───────────────────────────────────────────────────────────────

/** Son 7 günün makalelerini puanlayarak en önemli 5'ini seçer */
function scoreArticle(a) {
  let score = 0;
  const now = Date.now();
  const age = now - new Date(a.date).getTime();

  if (age < 3600000)         score += 50;
  else if (age < 21600000)   score += 35;
  else if (age < 86400000)   score += 20;
  else if (age < SEVEN_DAYS) score += 8;

  if (a.starred) score += 30;
  if (!a.read)   score += 10;
  if (a.image)   score += 8;
  if (a.tags && a.tags.length > 1) score += a.tags.length * 4;
  if (a.title && a.title.length > 30 && a.title.length < 100) score += 5;

  const recentReadTags = {};
  Object.keys(state.readHistory).forEach(function(id) {
    if (Date.now() - state.readHistory[id] < 86400000 * 3) {
      const ra = state.articles.find(function(x) { return x.id === id; });
      if (ra) (ra.tags || []).forEach(function(t) { recentReadTags[t] = true; });
    }
  });
  (a.tags || []).forEach(function(t) { if (recentReadTags[t]) score += 6; });

  const urgentWords = ['breaking','urgent','exclusive','alert','major','critical','attack','crisis','war','emergency'];
  const titleLower  = (a.title || '').toLowerCase();
  urgentWords.forEach(function(w) { if (titleLower.indexOf(w) !== -1) score += 12; });

  return score;
}

function renderHomepage() {
  const cardsList = qs('.homepage-cards');
  const emptyMsg  = qs('.homepage-empty');

  const recent = state.articles.filter(function(a) {
    return new Date(a.date).getTime() >= Date.now() - SEVEN_DAYS;
  });

  if (recent.length === 0) {
    cardsList.innerHTML = '';
    emptyMsg.hidden = false;
    return;
  }
  emptyMsg.hidden = true;

  const top5 = recent
    .map(function(a) { return { article: a, score: scoreArticle(a) }; })
    .sort(function(a, b) { return b.score - a.score; })
    .slice(0, 5);

  cardsList.innerHTML = top5.map(function(item, i) {
    const a = item.article;
    const thumb = a.image
      ? '<div class="hp-card-thumb" style="background-image:url(' + escHtml(a.image) + ')"></div>'
      : '<div class="hp-card-thumb hp-card-thumb-empty"><span>' + escHtml(a.feedName.charAt(0)) + '</span></div>';
    const tagsHtml = (a.tags && a.tags.length)
      ? '<div class="hp-card-tags">' +
          a.tags.slice(0, 2).map(function(t) { return '<span class="hp-card-tag">' + escHtml(t) + '</span>'; }).join('') +
        '</div>'
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
function closeAnalytics() { qs('.analytics-panel').hidden = true;  }

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
  let barsHtml   = '';
  Object.keys(feedCounts)
    .sort(function(a, b) { return feedCounts[b] - feedCounts[a]; })
    .forEach(function(name) {
      const pct = Math.round((feedCounts[name] / maxCount) * 100);
      barsHtml += '<div class="source-bar-item">' +
        '<div class="source-bar-label"><span>' + escHtml(name) + '</span><span>' + feedCounts[name] + '</span></div>' +
        '<div class="source-bar-track"><div class="source-bar-fill" style="width:' + pct + '%"></div></div></div>';
    });
  qs('.source-bars', panel).innerHTML = barsHtml || '<p style="font-size:11px;color:#333">Veri yok</p>';

  const topList = state.articles.filter(function(a) { return a.read; }).slice(0, 5);
  qs('.top-articles', panel).innerHTML = topList.map(function(a, i) {
    return '<li class="top-article-item">' +
      '<span class="top-article-rank">' + (i + 1) + '.</span>' +
      '<span class="top-article-title">' + escHtml(a.title) + '</span></li>';
  }).join('') || '<p style="font-size:11px;color:#333">Henüz okunmuş makale yok</p>';

  // Kelime bulutu
  const wordFreq = {};
  const stopwords = ['the','a','an','in','on','at','to','for','of','and','or','is','was','are','were','with','that','this','it','he','she','we','they','be','been','has','have','had','but','not','as','by','from','up','about','into','through','after','will','also','its','can','said','than'];
  state.articles.forEach(function(a) {
    (a.title + ' ' + a.desc).toLowerCase()
      .replace(/[^a-z\s]/g, '').split(/\s+/)
      .forEach(function(w) {
        if (w.length > 3 && !stopwords.includes(w)) wordFreq[w] = (wordFreq[w] || 0) + 1;
      });
  });
  const topWords = Object.keys(wordFreq).sort(function(a, b) { return wordFreq[b] - wordFreq[a]; }).slice(0, 24);
  const maxW     = wordFreq[topWords[0]] || 1;
  qs('.word-cloud', panel).innerHTML = topWords.map(function(w) {
    return '<span class="word-item' + (wordFreq[w] >= maxW * 0.5 ? ' big' : '') +
      '" data-word="' + escHtml(w) + '">' + escHtml(w) + '</span>';
  }).join('') || '<p style="font-size:11px;color:#333">Veri yok</p>';

  qsa('.word-item', panel).forEach(function(el) {
    el.addEventListener('click', function() {
      qs('.search-input').value = el.dataset.word;
      state.searchQuery = el.dataset.word;
      renderArticles();
      closeAnalytics();
      showToast('"' + el.dataset.word + '" için filtrelendi');
    });
  });

  const notesCount = Object.keys(state.notes).filter(function(k) { return state.notes[k]; }).length;
  const hlCount    = Object.keys(state.highlights).reduce(function(acc, k) { return acc + (state.highlights[k] || []).length; }, 0);
  const tagCounts  = {};
  state.articles.forEach(function(a) {
    (a.tags || []).forEach(function(t) { tagCounts[t] = (tagCounts[t] || 0) + 1; });
  });
  const topTag = Object.keys(tagCounts).sort(function(a, b) { return tagCounts[b] - tagCounts[a]; })[0] || '—';

  qs('.read-stats', panel).innerHTML =
    '<div class="stat-row"><span class="stat-label">Toplam Makale</span><span class="stat-value">' + total + '</span></div>' +
    '<div class="stat-row"><span class="stat-label">Okunmuş</span><span class="stat-value">' + readCount + '</span></div>' +
    '<div class="stat-row"><span class="stat-label">Okunmamış</span><span class="stat-value">' + (total - readCount) + '</span></div>' +
    '<div class="stat-row"><span class="stat-label">Notlar</span><span class="stat-value">' + notesCount + '</span></div>' +
    '<div class="stat-row"><span class="stat-label">Vurgular</span><span class="stat-value">' + hlCount + '</span></div>' +
    '<div class="stat-row"><span class="stat-label">Öne Çıkan Konu</span><span class="stat-value">' + escHtml(topTag) + '</span></div>';
}

// ── YARDIMCI UI ────────────────────────────────────────────────────────────
function updatePageTitle() {
  const el = qs('.page-title');
  if (state.activeFeedId === 'home')     el.textContent = 'Anasayfa';
  else if (state.activeFeedId === 'all') el.textContent = 'Tüm Haberler';
  else {
    const feed = state.feeds.find(function(f) { return f.id === state.activeFeedId; });
    el.textContent = feed ? feed.name : 'Haberler';
  }
}

function openSidebar()  { qs('.sidebar').classList.add('open');    qs('.overlay').classList.add('visible'); }
function closeSidebar() { qs('.sidebar').classList.remove('open'); qs('.overlay').classList.remove('visible'); }
