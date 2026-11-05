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
      ? '<div class="w-14 h-10 bg-cover bg-center rounded shrink-0 bg-[#111]" style="background-image:url(' + escHtml(a.image) + ')"></div>'
      : '<div class="w-14 h-10 bg-[#1a1a1a] rounded flex items-center justify-center text-sm text-[#555] shrink-0">' + escHtml(a.feedName.charAt(0)) + '</div>';
    return '<li class="sugg-card" data-id="' + escHtml(a.id) + '" tabindex="0" role="button">' +
      thumb +
      '<div class="flex flex-col min-w-0">' +
        '<span class="text-[11px] text-[#555]">' + escHtml(a.feedName) + ' · ' + formatDate(a.date) + '</span>' +
        '<p class="text-[13px] text-[#ddd] leading-snug line-clamp-2">' + escHtml(a.title) + '</p>' +
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
      html += '<button class="smart-tag px-2 py-0.5 rounded-full text-[11px] bg-[#111] border border-[#1a1a1a] text-[#666] hover:border-[#2a2a2a] hover:text-[#ddd] cursor-pointer' + (state.activeTag === tag ? ' active' : '') +
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
  // Masaustu sidebar — sadece kaynak listesi (navigasyon linkleri HTML'de sabit)
  const container = qs('.feed-list');
  const allUnread = state.articles.filter(function(a) { return !a.read; }).length;

  // Sidebar unread badge guncelle
  var badge = qs('.sidebar-unread-badge');
  if (badge) {
    badge.hidden = allUnread === 0;
    badge.textContent = allUnread > 0 ? allUnread : '';
  }

  // Sabit nav item'larinin aktif stilini guncelle
  qsa('[data-feedid]').forEach(function(el) {
    if (!el.closest('.feed-list') && !el.closest('.feed-list-mobile')) {
      el.classList.toggle('active', el.dataset.feedid === state.activeFeedId);
    }
  });

  // Profil kart istatistiklerini de guncelle
  if (typeof updateProfileCard === 'function') updateProfileCard();

  let html = '';

  state.feeds.forEach(function(feed) {
    const unread = state.articles.filter(function(a) { return a.feedId === feed.id && !a.read; }).length;
    const fav    = feed.favicon
      ? '<img class="feed-favicon w-4 h-4 rounded object-cover" src="' + escHtml(feed.favicon) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
      : '<span class="inline-flex items-center justify-center w-5 h-5 text-xs rounded bg-[#1a1a1a] text-[#888]">' + escHtml(feed.name.charAt(0).toUpperCase()) + '</span>';

    html += '<div class="feed-item group' + (state.activeFeedId === feed.id ? ' active' : '') +
      '" data-feedid="' + escHtml(feed.id) + '" role="button" tabindex="0" aria-label="' + escHtml(feed.name) + '">' +
      fav +
      '<span class="flex-1 text-[13px] truncate">' + escHtml(feed.name) + '</span>' +
      (unread > 0 ? '<span class="ml-auto text-[11px] text-accent bg-[#0d1520] border border-[#1a2a40] px-1.5 py-0.5 rounded-full">' + unread + '</span>' : '') +
      '<button class="feed-remove opacity-0 group-hover:opacity-100 ml-auto p-0.5 text-[#555] hover:text-[#e84444] bg-transparent border-0 cursor-pointer text-xs" data-removeid="' + escHtml(feed.id) + '" aria-label="Sil" title="Kaynağı sil">✕</button></div>';
  });

  container.innerHTML = html;

  qsa('.feed-item', container).forEach(function(el) {
    el.addEventListener('click', function(e) {
      if (e.target.closest('.feed-remove')) return;
      state.activeFeedId = el.dataset.feedid;
      if (state.activeFeedId === 'home') {
        showHomepage();
        setTimeout(function() { renderHomepage(); }, 0);
      }
      else if (state.activeFeedId === 'reels') {
        hideHomepage();
        hideReels();
        showReels();
        setTimeout(function() { renderReels(); }, 0);
        qs('.page-title').textContent = 'Reels';
      }
      else {
        hideHomepage();
        updatePageTitle();
        setTimeout(function() { renderArticles(); }, 0);
      }
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

  // Mobil profil view feed listesini de güncelle
  if (typeof renderMobileFeedList === 'function') renderMobileFeedList();
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
    ? '<img class="article-thumb w-20 h-16 object-cover rounded shrink-0" src="' + escHtml(a.image) + '" alt="" loading="lazy" onerror="this.remove()">'
    : '';
  const tagsHtml = a.tags && a.tags.length
    ? '<div class="flex flex-wrap gap-1 mt-1">' +
        a.tags.map(function(t) { return '<span class="text-[10px] px-1.5 py-0.5 rounded bg-[#111] border border-[#1a1a1a] text-[#555]">' + escHtml(t) + '</span>'; }).join('') +
      '</div>'
    : '';

  return '<li class="article-card' + (a.read ? ' read' : '') + '"' +
    ' data-id="' + escHtml(a.id) + '" tabindex="0" role="button" aria-label="' + escHtml(a.title) + '">' +
    '<span class="absolute left-1 top-4 w-1.5 h-1.5 rounded-full bg-accent' + (a.read ? ' hidden' : '') + '" aria-hidden="true"></span>' +
    (isGrid && a.image ? thumb : '') +
    '<div class="flex-1 min-w-0">' +
      '<div class="flex items-center gap-1.5 mb-1">' +
        '<img class="w-3.5 h-3.5 rounded" src="' + escHtml(a.favicon || '') + '" alt="" onerror="this.style.display=\'none\'" loading="lazy">' +
        '<span class="text-[11px] text-[#666]">' + escHtml(a.feedName) + '</span>' +
        '<time class="ml-auto text-[11px] text-[#444]">' + formatDate(a.date) + '</time>' +
      '</div>' +
      '<h3 class="text-[14px] font-medium text-[#ddd] leading-snug mb-1">' + escHtml(a.title) + '</h3>' +
      (a.desc ? '<p class="text-[13px] text-[#666] line-clamp-2">' + escHtml(a.desc) + '</p>' : '') +
      tagsHtml +
    '</div>' +
    (!isGrid && a.image ? thumb : '') +
    '<div class="shrink-0 flex flex-col items-center gap-1">' +
      '<button class="article-star-btn p-1 text-[#444] hover:text-star bg-transparent border-0 cursor-pointer text-base' + (a.starred ? ' starred' : '') + '"' +
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

  // Puanlayıp sırala — skoru yüksek 20 gönderi
  const posts = recent
    .map(function(a) { return { article: a, score: scoreArticle(a) }; })
    .sort(function(a, b) { return b.score - a.score; })
    .slice(0, 20);

  cardsList.innerHTML = posts.map(function(item) {
    const a = item.article;

    // Görsel bölümü
    const imageHtml = a.image
      ? '<div class="w-full aspect-video bg-cover bg-center bg-[#111]" style="background-image:url(' + escHtml(a.image) + ')" role="img" aria-label="' + escHtml(a.title) + '"></div>'
      : '<div class="w-full aspect-video bg-[#111] flex items-center justify-center"><span class="text-4xl text-[#333]">' + escHtml(a.feedName.charAt(0)) + '</span></div>';

    // Etiketler
    const tagsHtml = (a.tags && a.tags.length)
      ? '<div class="flex flex-wrap gap-1">' +
          a.tags.slice(0, 3).map(function(t) { return '<span class="text-[10px] px-2 py-0.5 rounded-full bg-[#111] border border-[#1a1a1a] text-[#555]">' + escHtml(t) + '</span>'; }).join('') +
        '</div>'
      : '';

    return '<li class="post-card' + (a.read ? ' post-read' : '') + '"' +
      ' data-id="' + escHtml(a.id) + '" tabindex="0" role="article" aria-label="' + escHtml(a.title) + '">' +

      // ── Üst: kaynak bilgisi ──
      '<header class="flex items-center gap-2 p-3">' +
        '<div class="relative w-8 h-8 shrink-0">' +
          (a.favicon
            ? '<img class="post-avatar-img w-8 h-8 rounded-full object-cover" src="' + escHtml(a.favicon) + '" alt="" loading="lazy" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'">'
            : '') +
          '<span class="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-xs text-[#888]" style="' + (a.favicon ? 'display:none' : '') + '">' + escHtml(a.feedName.charAt(0)) + '</span>' +
        '</div>' +
        '<div class="flex flex-col min-w-0">' +
          '<span class="text-[13px] font-medium text-[#ddd] truncate">' + escHtml(a.feedName) + '</span>' +
          '<time class="text-[11px] text-[#555]">' + formatDate(a.date) + '</time>' +
        '</div>' +
        '<button class="post-star-btn ml-auto p-1 text-[#444] hover:text-star bg-transparent border-0 cursor-pointer text-base' + (a.starred ? ' starred' : '') + '" data-id="' + escHtml(a.id) + '" aria-label="' + (a.starred ? 'Yıldızı kaldır' : 'Yıldız ekle') + '" title="Yıldız">' +
          (a.starred ? '★' : '☆') +
        '</button>' +
      '</header>' +

      // ── Görsel ──
      imageHtml +

      // ── Alt: başlık + aksiyon ──
      '<div class="p-3 flex flex-col gap-2">' +
        '<h2 class="text-[15px] font-semibold text-[#ddd] leading-snug">' + escHtml(a.title) + '</h2>' +
        (a.desc ? '<p class="text-[13px] text-[#666] line-clamp-3">' + escHtml(a.desc) + '</p>' : '') +
        tagsHtml +
        '<div class="flex gap-2 mt-1">' +
          '<button class="post-action-btn post-read-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-[#888] bg-[#111] border border-[#1a1a1a] hover:text-[#ddd] hover:border-[#2a2a2a] cursor-pointer" data-id="' + escHtml(a.id) + '" aria-label="Oku">' +
            '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>' +
            '<span>Oku</span>' +
          '</button>' +
          '<a class="post-action-btn post-open-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-[#888] bg-[#111] border border-[#1a1a1a] hover:text-[#ddd] hover:border-[#2a2a2a] cursor-pointer no-underline" href="' + escHtml(a.url || '#') + '" target="_blank" rel="noopener noreferrer" aria-label="Orijinalde aç">' +
            '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' +
            '<span>Aç</span>' +
          '</a>' +
        '</div>' +
      '</div>' +
    '</li>';
  }).join('');

  // Event listener'lar
  qsa('.post-card', cardsList).forEach(function(card) {
    // Karta tıklayınca modal aç (butonlar hariç)
    card.addEventListener('click', function(e) {
      if (e.target.closest('.post-star-btn') ||
          e.target.closest('.post-read-btn') ||
          e.target.closest('.post-open-btn')) return;
      openModal(card.dataset.id);
    });
    card.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') openModal(card.dataset.id);
    });
  });

  qsa('.post-star-btn', cardsList).forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const starred = toggleStar(btn.dataset.id);
      btn.classList.toggle('starred', starred);
      btn.textContent = starred ? '★' : '☆';
      btn.setAttribute('aria-label', starred ? 'Yıldızı kaldır' : 'Yıldız ekle');
      renderFeedList();
    });
  });

  qsa('.post-read-btn', cardsList).forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      openModal(btn.dataset.id);
    });
  });
}

function showHomepage() {
  qs('.homepage-view').hidden   = false;
  qs('.articles-wrap').hidden   = true;
  qs('.filter-bar').hidden      = true;
  qs('.page-title').textContent = 'Anasayfa';
  hideReels();
}

function hideHomepage() {
  qs('.homepage-view').hidden = true;
  qs('.articles-wrap').hidden = false;
  qs('.filter-bar').hidden    = false;
  if (qs('.reels-view')) qs('.reels-view').hidden = true;
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
      barsHtml += '<div class="flex flex-col gap-1">' +
        '<div class="flex items-center justify-between text-[11px]"><span class="text-[#888] truncate">' + escHtml(name) + '</span><span class="text-[#555] ml-2">' + feedCounts[name] + '</span></div>' +
        '<div class="w-full h-1.5 bg-[#111] rounded-full overflow-hidden"><div class="h-full bg-accent rounded-full" style="width:' + pct + '%"></div></div></div>';
    });
  qs('.source-bars', panel).innerHTML = barsHtml || '<p style="font-size:11px;color:#333">Veri yok</p>';

  const topList = state.articles.filter(function(a) { return a.read; }).slice(0, 5);
  qs('.top-articles', panel).innerHTML = topList.map(function(a, i) {
    return '<li class="flex items-start gap-2 py-1">' +
      '<span class="text-[11px] text-[#555] w-4 shrink-0">' + (i + 1) + '.</span>' +
      '<span class="text-[12px] text-[#888] leading-snug">' + escHtml(a.title) + '</span></li>';
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
    const isBig = wordFreq[w] >= maxW * 0.5;
    const sizeClass = isBig ? 'text-[13px] font-medium text-[#888]' : 'text-[11px] text-[#666]';
    return '<span class="word-item px-2 py-0.5 rounded-full bg-[#111] border border-[#1a1a1a] hover:border-[#2a2a2a] hover:text-[#ddd] cursor-pointer ' + sizeClass + '"' +
      ' data-word="' + escHtml(w) + '">' + escHtml(w) + '</span>';
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
    '<div class="flex items-center justify-between py-1.5 border-b border-[#111]"><span class="text-[12px] text-[#666]">Toplam Makale</span><span class="text-[12px] font-medium text-[#ddd]">' + total + '</span></div>' +
    '<div class="flex items-center justify-between py-1.5 border-b border-[#111]"><span class="text-[12px] text-[#666]">Okunmuş</span><span class="text-[12px] font-medium text-[#ddd]">' + readCount + '</span></div>' +
    '<div class="flex items-center justify-between py-1.5 border-b border-[#111]"><span class="text-[12px] text-[#666]">Okunmamış</span><span class="text-[12px] font-medium text-[#ddd]">' + (total - readCount) + '</span></div>' +
    '<div class="flex items-center justify-between py-1.5 border-b border-[#111]"><span class="text-[12px] text-[#666]">Notlar</span><span class="text-[12px] font-medium text-[#ddd]">' + notesCount + '</span></div>' +
    '<div class="flex items-center justify-between py-1.5 border-b border-[#111]"><span class="text-[12px] text-[#666]">Vurgular</span><span class="text-[12px] font-medium text-[#ddd]">' + hlCount + '</span></div>' +
    '<div class="flex items-center justify-between py-1.5"><span class="text-[12px] text-[#666]">Öne Çıkan Konu</span><span class="text-[12px] font-medium text-[#ddd]">' + escHtml(topTag) + '</span></div>';
}

// ── YARDIMCI UI ────────────────────────────────────────────────────────────
function updatePageTitle() {
  const el = qs('.page-title');
  if (state.activeFeedId === 'home')     el.textContent = 'Anasayfa';
  else if (state.activeFeedId === 'reels') el.textContent = 'Reels';
  else if (state.activeFeedId === 'all') el.textContent = 'Tüm Haberler';
  else {
    const feed = state.feeds.find(function(f) { return f.id === state.activeFeedId; });
    el.textContent = feed ? feed.name : 'Haberler';
  }
}

function openSidebar()  { qs('.sidebar').classList.add('open');    qs('.overlay').classList.add('visible'); }
function closeSidebar() { qs('.sidebar').classList.remove('open'); qs('.overlay').classList.remove('visible'); }

// ── REELS ─────────────────────────────────────────────────────────────────
// Feed makalelerinden video içeriklerini çıkarır ve dikey scroll reels gösterir.

/**
 * Bir makalenin HTML içeriğinden ya da URL'sinden video kaynağını tespit eder.
 * Desteklenenler: YouTube, doğrudan video dosyaları, HTML5 <video> etiketi.
 * @returns {{ type: 'youtube'|'video'|null, src: string|null, thumb: string|null }}
 */
function extractVideo(article) {
  const content = article.content || article.desc || '';

  // 1) YouTube iframe embed (<iframe src="https://www.youtube.com/embed/...">)
  var iframeMatch = content.match(/<iframe[^>]+src=["']([^"']*(?:youtube\.com\/embed|youtu\.be)[^"']*)["']/i);
  if (iframeMatch) {
    var videoId = extractYouTubeId(iframeMatch[1]);
    if (videoId) return { type: 'youtube', src: videoId, thumb: 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg' };
  }

  // 2) YouTube link (article.url veya içerik içinde)
  var ytSources = [article.url || ''];
  var linkMatches = content.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?[^"'\s<>]*|youtu\.be\/[\w-]+)/gi);
  if (linkMatches) ytSources = ytSources.concat(linkMatches);
  for (var i = 0; i < ytSources.length; i++) {
    var vid = extractYouTubeId(ytSources[i]);
    if (vid) return { type: 'youtube', src: vid, thumb: 'https://img.youtube.com/vi/' + vid + '/hqdefault.jpg' };
  }

  // 3) Video enclosure (RSS <enclosure type="video/...">)
  if (article.enclosure && article.enclosure.link) {
    var enc = article.enclosure.link;
    if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(enc)) {
      return { type: 'video', src: enc, thumb: article.image || null };
    }
  }

  // 4) <video src="..."> veya <source src="..."> içerik içinde
  var videoSrcMatch = content.match(/<(?:video|source)[^>]+src=["']([^"']+\.(?:mp4|webm|ogg))["']/i);
  if (videoSrcMatch) return { type: 'video', src: videoSrcMatch[1], thumb: article.image || null };

  // 5) Başlık + kaynak URL'si YouTube kanalına aitse (feed.js convertToRssUrl ile eklendi)
  // youtube.com/feeds/videos.xml kaynağından gelen her makale aslında bir YT videosu
  var feedObj = state.feeds.find(function(f) { return f.id === article.feedId; });
  if (feedObj && feedObj.url && feedObj.url.indexOf('youtube.com/feeds/videos.xml') !== -1) {
    var ytLinkMatch = (article.url || '').match(/[?&]v=([\w-]{11})/);
    if (ytLinkMatch) return { type: 'youtube', src: ytLinkMatch[1], thumb: 'https://img.youtube.com/vi/' + ytLinkMatch[1] + '/hqdefault.jpg' };
    // YT Atom feed link formatı: watch?v=XXXXX
    var directMatch = (article.url || '').match(/youtu\.be\/([\w-]{11})/);
    if (directMatch) return { type: 'youtube', src: directMatch[1], thumb: 'https://img.youtube.com/vi/' + directMatch[1] + '/hqdefault.jpg' };
  }

  return { type: null, src: null, thumb: null };
}

/** YouTube URL'sinden 11 karakterlik video ID'sini çıkarır */
function extractYouTubeId(url) {
  if (!url) return null;
  var m;
  m = url.match(/[?&]v=([\w-]{11})/);  if (m) return m[1];
  m = url.match(/youtu\.be\/([\w-]{11})/);  if (m) return m[1];
  m = url.match(/youtube\.com\/embed\/([\w-]{11})/); if (m) return m[1];
  m = url.match(/youtube\.com\/shorts\/([\w-]{11})/); if (m) return m[1];
  return null;
}

/** Video içeren makaleleri filtreler ve sıralar */
function getVideoArticles() {
  var result = [];
  state.articles.forEach(function(a) {
    var v = extractVideo(a);
    if (v.type) result.push({ article: a, video: v });
  });
  // En yeni önce
  result.sort(function(a, b) { return new Date(b.article.date) - new Date(a.article.date); });
  return result;
}

/** Aktif oynatıcıyı durdur (reels sayfasından çıkılırken kullan) */
function pauseActiveReel() {
  var active = document.querySelector('.reel-item.reel-active');
  if (!active) return;
  var iframe = active.querySelector('iframe');
  if (iframe) {
    try { iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*'); } catch (_) {}
  }
  var video = active.querySelector('video');
  if (video) { try { video.pause(); } catch (_) {} }
}

/**
 * Video bulunamadığında öneri ekranı gösterir.
 * Kullanıcı önerilen kanala tıklar → addFeed() çalışır → feed yüklenir → reels render edilir.
 */
function renderReelsEmpty(emptyEl) {
  var suggested = typeof SUGGESTED_VIDEO_FEEDS !== 'undefined' ? SUGGESTED_VIDEO_FEEDS : [];

  var catColors = {
    'Dünya':     '#5b9cf6',
    'Haber':     '#e84444',
    'Teknoloji': '#3ecf8e',
    'Bilim':     '#a78bfa',
    'Finans':    '#e8b840',
    'Eğitim':    '#f97316',
  };

  var suggestHtml = suggested.length
    ? '<div class="grid grid-cols-2 gap-2 mt-4 w-full max-w-sm">' +
        suggested.map(function(ch) {
          var color = catColors[ch.category] || '#5b9cf6';
          return '<button class="reels-suggest-card flex items-center gap-2 p-2 rounded-lg bg-[#111] border border-[#1a1a1a] cursor-pointer hover:border-[#2a2a2a] w-full" data-url="' + escHtml(ch.url) + '" aria-label="' + escHtml(ch.name) + ' ekle">' +
            '<div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border" style="background:' + color + '22;border-color:' + color + '44">' +
              '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="' + color + '" aria-hidden="true"><path d="M6 3l12 9-12 9V3z"/></svg>' +
            '</div>' +
            '<div class="flex flex-col min-w-0 text-left">' +
              '<span class="text-[12px] font-medium text-[#ddd] truncate">' + escHtml(ch.name) + '</span>' +
              '<span class="text-[10px]" style="color:' + color + '">' + escHtml(ch.category) + '</span>' +
            '</div>' +
            '<span class="ml-auto text-[16px] text-[#555] shrink-0" aria-hidden="true">+</span>' +
          '</button>';
        }).join('') +
      '</div>'
    : '';

  emptyEl.innerHTML =
    '<div class="text-5xl text-[#333] mb-4">▶</div>' +
    '<p class="text-[15px] font-medium text-[#666] mb-1">Video bulunamadı</p>' +
    '<p class="text-[13px] text-[#444] mb-4">Ekli kaynaklarda video içerik yok.<br>Aşağıdan bir kanal ekleyerek başlayabilirsin.</p>' +
    suggestHtml;

  emptyEl.hidden = false;

  // Tıklama olayları
  qsa('.reels-suggest-card', emptyEl).forEach(function(card) {
    card.addEventListener('click', function() {
      var url = card.dataset.url;
      if (!url) return;
      // Zaten ekliyse bildirim göster
      if (state.feeds.some(function(f) { return f.url === url; })) {
        showToast('Bu kaynak zaten ekli');
        return;
      }
      card.classList.add('reels-suggest-adding');
      card.querySelector('.reels-suggest-add').textContent = '…';
      // Reels sekmesinde kalmasını sağla — addFeed sonrası renderReels tetiklensin
      state.activeFeedId = 'reels';
      addFeed(url);
    });
  });
}

/** Reels görünümünü render eder — TikTok/Instagram tarzı tam ekran snap scroll */
function renderReels() {
  var view      = qs('.reels-view');
  var container = qs('.reels-container');
  var emptyEl   = qs('.reels-empty');
  var loadingEl = qs('.reels-loading');

  if (!view || !container) return;

  // Önceki navigasyon event'lerini temizle
  if (view._reelsCleanup) { view._reelsCleanup(); view._reelsCleanup = null; }

  loadingEl.hidden = false;
  emptyEl.hidden   = true;
  container.innerHTML = '';

  var items = getVideoArticles();

  loadingEl.hidden = true;

  if (items.length === 0) {
    renderReelsEmpty(emptyEl);
    return;
  }

  // ── Kartları oluştur ──────────────────────────────────────────────────────
  container.innerHTML = items.map(function(item, idx) {
    var a = item.article;
    var v = item.video;

    var faviconHtml = a.favicon
      ? '<img class="w-5 h-5 rounded object-cover" src="' + escHtml(a.favicon) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
      : '<span class="inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-[#1a1a1a] text-[#888]">' + escHtml(a.feedName.charAt(0)) + '</span>';

    var thumbUrl = v.thumb || '';
    var mediaHtml;
    if (v.type === 'youtube') {
      mediaHtml =
        '<div class="reel-media relative w-full flex-1" data-ytid="' + escHtml(v.src) + '" data-type="youtube">' +
          '<div class="reel-thumb-wrap absolute inset-0 flex items-center justify-center">' +
            (thumbUrl
              ? '<img class="w-full h-full object-cover" src="' + escHtml(thumbUrl) + '" alt="' + escHtml(a.title) + '" loading="lazy">'
              : '<div class="w-full h-full bg-[#0a0a0a]"></div>') +
            '<button class="reel-play-btn absolute inset-0 flex items-center justify-center" aria-label="Oynat">' +
              '<span class="w-16 h-16 bg-black/60 rounded-full flex items-center justify-center border border-white/20 backdrop-blur-sm">' +
                '<svg class="w-8 h-8 ml-1" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' +
              '</span>' +
            '</button>' +
          '</div>' +
          '<div class="reel-player absolute inset-0" hidden>' +
            '<iframe class="reel-iframe w-full h-full border-0"></iframe>' +
          '</div>' +
        '</div>';
    } else if (v.type === 'video') {
      mediaHtml =
        '<div class="reel-media relative w-full flex-1" data-type="video">' +
          '<div class="reel-thumb-wrap absolute inset-0 flex items-center justify-center">' +
            (thumbUrl
              ? '<img class="w-full h-full object-cover" src="' + escHtml(thumbUrl) + '" alt="' + escHtml(a.title) + '" loading="lazy">'
              : '<div class="w-full h-full bg-[#0a0a0a]"></div>') +
            '<button class="reel-play-btn absolute inset-0 flex items-center justify-center" aria-label="Oynat">' +
              '<span class="w-16 h-16 bg-black/60 rounded-full flex items-center justify-center border border-white/20 backdrop-blur-sm">' +
                '<svg class="w-8 h-8 ml-1" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' +
              '</span>' +
            '</button>' +
          '</div>' +
          '<div class="reel-player absolute inset-0" hidden>' +
            '<video class="reel-video-el w-full h-full object-cover" src="' + escHtml(v.src) + '" controls playsinline preload="none"></video>' +
          '</div>' +
        '</div>';
    } else {
      mediaHtml =
        '<div class="reel-media relative w-full flex-1" data-type="none">' +
          '<div class="reel-thumb-wrap absolute inset-0 flex items-center justify-center">' +
            (a.image
              ? '<img class="w-full h-full object-cover" src="' + escHtml(a.image) + '" alt="' + escHtml(a.title) + '" loading="lazy">'
              : '<div class="w-full h-full bg-[#0a0a0a]"></div>') +
            '<div style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.6);color:#aaa;font-size:11px;padding:3px 10px;border-radius:20px;backdrop-filter:blur(4px)">Video yok</div>' +
          '</div>' +
        '</div>';
    }

    var tagsHtml = (a.tags && a.tags.length)
      ? a.tags.slice(0, 3).map(function(t) { return '<span class="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">' + escHtml(t) + '</span>'; }).join('')
      : '';

    return '<div class="reel-item' + (idx === 0 ? ' reel-active' : '') + '" data-id="' + escHtml(a.id) + '" data-idx="' + idx + '" role="listitem">' +
      mediaHtml +
      '<div class="reel-info absolute bottom-0 left-0 right-0 p-4 pb-6 bg-linear-to-t from-black/90 to-transparent">' +
        '<div class="flex items-center gap-2 mb-2">' +
          faviconHtml +
          '<span class="text-[13px] font-medium text-white/90">' + escHtml(a.feedName) + '</span>' +
          '<time class="ml-auto text-[11px] text-white/50">' + formatDate(a.date) + '</time>' +
        '</div>' +
        '<h3 class="text-[16px] font-semibold text-white leading-snug mb-1">' + escHtml(a.title) + '</h3>' +
        (a.desc ? '<p class="text-[13px] text-white/70 line-clamp-2 mb-2">' + escHtml(a.desc) + '</p>' : '') +
        (tagsHtml ? '<div class="flex flex-wrap gap-1 mb-3">' + tagsHtml + '</div>' : '') +
        '<div class="flex gap-2">' +
          '<button class="reel-action-btn reel-read-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-white bg-white/10 border border-white/20 hover:bg-white/20 cursor-pointer backdrop-blur-sm" data-id="' + escHtml(a.id) + '" aria-label="Haberi oku">' +
            '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>' +
            'Haberi Oku' +
          '</button>' +
          '<a class="reel-action-btn reel-open-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-white bg-white/10 border border-white/20 hover:bg-white/20 cursor-pointer backdrop-blur-sm no-underline" href="' + escHtml(a.url || '#') + '" target="_blank" rel="noopener noreferrer" aria-label="Kaynakta aç">' +
            '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' +
            'Aç' +
          '</a>' +
          '<button class="reel-star-btn flex items-center justify-center w-9 h-9 rounded-lg text-[16px] bg-white/10 border border-white/20 hover:bg-white/20 cursor-pointer backdrop-blur-sm' + (a.starred ? ' starred text-[#e8b840]' : ' text-white/70') + '" data-id="' + escHtml(a.id) + '" aria-label="' + (a.starred ? 'Yıldızı kaldır' : 'Yıldız ekle') + '">' +
            (a.starred ? '★' : '☆') +
          '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  // ── Navigasyon butonları (masaüstü) ──────────────────────────────────────
  // Eski nav butonlarını kaldır
  qsa('.reels-nav-btn, .reels-progress', view).forEach(function(el) { el.remove(); });

  var navPrev = document.createElement('button');
  navPrev.className = 'reels-nav-btn reels-nav-prev';
  navPrev.setAttribute('aria-label', 'Önceki video');
  navPrev.innerHTML = '&#8679;';
  view.appendChild(navPrev);

  var navNext = document.createElement('button');
  navNext.className = 'reels-nav-btn reels-nav-next';
  navNext.setAttribute('aria-label', 'Sonraki video');
  navNext.innerHTML = '&#8681;';
  view.appendChild(navNext);

  // ── İlerleme göstergesi ──────────────────────────────────────────────────
  var MAX_DOTS = 8;
  var progressEl = document.createElement('div');
  progressEl.className = 'reels-progress';
  var dotCount = Math.min(items.length, MAX_DOTS);
  for (var d = 0; d < dotCount; d++) {
    var dot = document.createElement('div');
    dot.className = 'reels-progress-dot' + (d === 0 ? ' active' : '');
    progressEl.appendChild(dot);
  }
  view.appendChild(progressEl);

  // ── Aktif index takibi ───────────────────────────────────────────────────
  var currentIdx = 0;

  function updateActiveReel(newIdx) {
    if (newIdx < 0 || newIdx >= items.length) return;
    var allItems = qsa('.reel-item', container);

    // Önceki aktifi temizle
    if (allItems[currentIdx]) allItems[currentIdx].classList.remove('reel-active');

    currentIdx = newIdx;
    if (allItems[currentIdx]) allItems[currentIdx].classList.add('reel-active');

    // Progress dots güncelle
    var dots = qsa('.reels-progress-dot', progressEl);
    if (dots.length > 0) {
      var dotIdx = Math.min(newIdx, MAX_DOTS - 1);
      dots.forEach(function(dot, i) { dot.classList.toggle('active', i === dotIdx); });
    }

    // Scroll
    if (allItems[currentIdx]) {
      allItems[currentIdx].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function stopCurrentVideo() {
    var allItems = qsa('.reel-item', container);
    var active = allItems[currentIdx];
    if (!active) return;
    var iframe = active.querySelector('iframe');
    if (iframe) {
      try { iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*'); } catch (_) {}
      var playerDiv = iframe.closest('.reel-player');
      if (playerDiv) {
        playerDiv.hidden = true;
        playerDiv.innerHTML = '';
        var thumbWrap = playerDiv.previousElementSibling;
        if (thumbWrap) thumbWrap.hidden = false;
      }
    }
    var video = active.querySelector('video');
    if (video) { try { video.pause(); } catch (_) {} }
  }

  // Nav butonları
  navPrev.addEventListener('click', function() {
    stopCurrentVideo();
    updateActiveReel(currentIdx - 1);
  });
  navNext.addEventListener('click', function() {
    stopCurrentVideo();
    updateActiveReel(currentIdx + 1);
  });

  // ── Klavye navigasyonu ───────────────────────────────────────────────────
  function onKeyDown(e) {
    if (qs('.reels-view').hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      stopCurrentVideo();
      updateActiveReel(currentIdx + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      stopCurrentVideo();
      updateActiveReel(currentIdx - 1);
    }
  }
  document.addEventListener('keydown', onKeyDown);

  // ── Scroll'dan aktif index güncelle ─────────────────────────────────────
  var scrollTimer = null;
  function onContainerScroll() {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function() {
      var allItems = qsa('.reel-item', container);
      var containerRect = container.getBoundingClientRect();
      var closestIdx = 0;
      var closestDist = Infinity;
      allItems.forEach(function(item, i) {
        var rect = item.getBoundingClientRect();
        var dist = Math.abs(rect.top - containerRect.top);
        if (dist < closestDist) { closestDist = dist; closestIdx = i; }
      });
      if (closestIdx !== currentIdx) {
        allItems[currentIdx] && allItems[currentIdx].classList.remove('reel-active');
        currentIdx = closestIdx;
        allItems[currentIdx] && allItems[currentIdx].classList.add('reel-active');
        var dots = qsa('.reels-progress-dot', progressEl);
        if (dots.length > 0) {
          var dotIdx = Math.min(currentIdx, MAX_DOTS - 1);
          dots.forEach(function(dot, i) { dot.classList.toggle('active', i === dotIdx); });
        }
      }
    }, 80);
  }
  container.addEventListener('scroll', onContainerScroll);

  // ── Touch / swipe (mobil) ────────────────────────────────────────────────
  var touchStartY = 0;
  var touchStartX = 0;
  function onTouchStart(e) { touchStartY = e.touches[0].clientY; touchStartX = e.touches[0].clientX; }
  function onTouchEnd(e) {
    var dy = touchStartY - e.changedTouches[0].clientY;
    var dx = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(dy) < Math.abs(dx) * 0.8) return; // yatay swipe — ignore
    if (Math.abs(dy) < 40) return;                  // çok kısa — ignore
    stopCurrentVideo();
    if (dy > 0) updateActiveReel(currentIdx + 1);
    else         updateActiveReel(currentIdx - 1);
  }
  container.addEventListener('touchstart', onTouchStart, { passive: true });
  container.addEventListener('touchend',   onTouchEnd,   { passive: true });

  // ── Cleanup kaydı ────────────────────────────────────────────────────────
  view._reelsCleanup = function() {
    document.removeEventListener('keydown', onKeyDown);
    container.removeEventListener('scroll', onContainerScroll);
    container.removeEventListener('touchstart', onTouchStart);
    container.removeEventListener('touchend',   onTouchEnd);
    clearTimeout(scrollTimer);
  };

  // ── Event listener'lar ───────────────────────────────────────────────────

  // Oynat butonu
  qsa('.reel-play-btn', container).forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var mediaDiv  = btn.closest('.reel-media');
      var thumbWrap = mediaDiv.querySelector('.reel-thumb-wrap');
      var playerDiv = mediaDiv.querySelector('.reel-player');
      var type      = mediaDiv.dataset.type;

      thumbWrap.hidden = true;
      playerDiv.hidden = false;

      if (type === 'youtube') {
        var ytId = mediaDiv.dataset.ytid;
        playerDiv.innerHTML =
          '<iframe class="reel-iframe w-full h-full border-0" ' +
          'src="https://www.youtube.com/embed/' + escHtml(ytId) + '?autoplay=1&rel=0&modestbranding=1&enablejsapi=1" ' +
          'frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
          'allowfullscreen title="Video player"></iframe>';
      } else {
        var videoEl = playerDiv.querySelector('video');
        if (videoEl) { videoEl.play().catch(function() {}); }
      }
    });
  });

  // Haberi oku
  qsa('.reel-read-btn', container).forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      openModal(btn.dataset.id);
    });
  });

  // Yıldız
  qsa('.reel-star-btn', container).forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var starred = toggleStar(btn.dataset.id);
      btn.classList.toggle('starred', starred);
      btn.textContent = starred ? '★' : '☆';
      btn.setAttribute('aria-label', starred ? 'Yıldızı kaldır' : 'Yıldız ekle');
    });
  });
}

/** Reels view'u göster */
function showReels() {
  var reelsView = qs('.reels-view');
  if (!reelsView) return;
  reelsView.hidden = false;
  document.body.classList.add('reels-active');

  // Kapatma butonu
  var closeBtn = qs('.reels-close-btn', reelsView);
  if (closeBtn && !closeBtn._bound) {
    closeBtn._bound = true;
    closeBtn.addEventListener('click', function () {
      state.activeFeedId = 'home';
      hideReels();
      showHomepage();
      renderHomepage();
      renderFeedList();
      updatePageTitle();
    });
  }
}

/** Reels view'u gizle — aktif oynatıcıları durdur, iframe'leri temizle */
function hideReels() {
  pauseActiveReel();
  var reelsView = qs('.reels-view');
  if (!reelsView) return;

  // Navigasyon event listener'larını temizle
  if (reelsView._reelsCleanup) { reelsView._reelsCleanup(); reelsView._reelsCleanup = null; }
  if (reelsView._resizeObs)    { reelsView._resizeObs.disconnect(); reelsView._resizeObs = null; }

  // Tüm iframe'leri kaldır (arka planda ses/video çalmasın)
  qsa('.reel-player', reelsView).forEach(function(p) {
    p.innerHTML = '';
    p.hidden = true;
    var thumbWrap = p.previousElementSibling;
    if (thumbWrap) thumbWrap.hidden = false;
  });
  qsa('.reel-video-el', reelsView).forEach(function(v) {
    try { v.pause(); v.src = ''; } catch(_) {}
  });

  // Nav butonları ve progress'i kaldır
  qsa('.reels-nav-btn, .reels-progress', reelsView).forEach(function(el) { el.remove(); });

  document.body.classList.remove('reels-active');
  reelsView.hidden = true;
}

