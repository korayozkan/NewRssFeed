'use strict';

// ── MOBİL TAB NAVIGASYON ───────────────────────────────────────────────────
// 640px altında sidebar yerine alt tab bar kullanılır.
// Masaüstünde bu modül sessiz kalır; isMobile() false döner.

var MOBILE_BP = 640;

function isMobile() {
  return window.innerWidth <= MOBILE_BP;
}

// Aktif sekmeyi state'e yaz ve DOM'u güncelle
function switchTab(tab) {
  if (!isMobile()) return;

  // Tab butonlarını güncelle
  qsa('.tab-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Body class — CSS'in body.tab-* kuralları için
  document.body.classList.remove('tab-home', 'tab-discover', 'tab-profile');
  document.body.classList.add('tab-' + tab);

  var profileView = qs('.mobile-profile-view');

  if (tab === 'home') {
    profileView.hidden = true;
    qs('.main').style.display = '';
    showHomepage();
    if (state.articles.length > 0) renderHomepage();
    else qs('.homepage-empty').hidden = false;

  } else if (tab === 'discover') {
    profileView.hidden = true;
    qs('.main').style.display = '';
    hideHomepage();
    state.activeFeedId = 'all';
    updatePageTitle();
    renderArticles();
    renderFeedList();
    // filter-bar ve topbar görünür
    qs('.filter-bar').hidden = false;

  } else if (tab === 'profile') {
    qs('.main').style.display = 'none';
    profileView.hidden = false;
    renderMobileFeedList();
  }

  state.activeTab = tab;
}

// Profil view'daki feed listesini render et
function renderMobileFeedList() {
  var container = qs('.feed-list-mobile');
  if (!container) return;

  var allUnread = state.articles.filter(function(a) { return !a.read; }).length;
  var html = '';

  html += '<div class="feed-item' + (state.activeFeedId === 'all' ? ' active' : '') +
    '" data-feedid="all" role="button" tabindex="0">' +
    '<span class="feed-favicon-placeholder">☰</span>' +
    '<span class="feed-name">Tüm Haberler</span>' +
    (allUnread > 0 ? '<span class="feed-count">' + allUnread + '</span>' : '') + '</div>';

  state.feeds.forEach(function(feed) {
    var unread = state.articles.filter(function(a) { return a.feedId === feed.id && !a.read; }).length;
    var fav = feed.favicon
      ? '<img class="feed-favicon" src="' + escHtml(feed.favicon) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
      : '<span class="feed-favicon-placeholder">' + escHtml(feed.name.charAt(0).toUpperCase()) + '</span>';

    html += '<div class="feed-item' + (state.activeFeedId === feed.id ? ' active' : '') +
      '" data-feedid="' + escHtml(feed.id) + '" role="button" tabindex="0">' +
      fav +
      '<span class="feed-name">' + escHtml(feed.name) + '</span>' +
      (unread > 0 ? '<span class="feed-count">' + unread + '</span>' : '') +
      '<button class="feed-remove" data-removeid="' + escHtml(feed.id) + '" aria-label="Sil">✕</button></div>';
  });

  container.innerHTML = html;

  // Feed'e tıklayınca Keşfet sekmesine geç
  qsa('.feed-item', container).forEach(function(el) {
    el.addEventListener('click', function(e) {
      if (e.target.closest('.feed-remove')) return;
      state.activeFeedId = el.dataset.feedid;
      switchTab('discover');
    });
    el.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });
  });

  qsa('.feed-remove', container).forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      removeFeed(btn.dataset.removeid);
      renderMobileFeedList();
    });
  });
}

// Olayları bağla
function bindTabEvents() {
  // Tab butonları
  qsa('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      switchTab(btn.dataset.tab);
    });
  });

  // Profil — feed ekle (mobil input)
  var mobileInput = qs('.feed-input-mobile');
  var mobileAddBtn = qs('.add-btn-mobile');
  if (mobileInput && mobileAddBtn) {
    mobileAddBtn.addEventListener('click', function() {
      addFeed(mobileInput.value);
      mobileInput.value = '';
    });
    mobileInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { addFeed(mobileInput.value); mobileInput.value = ''; }
    });
  }

  // Profil — ayarlar butonu
  var profileSettingsBtn = qs('.settings-btn-profile');
  if (profileSettingsBtn) {
    profileSettingsBtn.addEventListener('click', openSettings);
  }

  // Profil — dışa aktar
  var mobileExportBtn = qs('.export-btn-mobile');
  if (mobileExportBtn) {
    mobileExportBtn.addEventListener('click', exportFeeds);
  }

  // Profil — içe aktar
  var mobileImportInput = qs('.import-input-mobile');
  if (mobileImportInput) {
    mobileImportInput.addEventListener('change', function(e) {
      importFeeds(e.target.files[0]);
      e.target.value = '';
    });
  }

  // Profil — hızlı ekle butonları (mobil)
  // Desktop'takilerle aynı data-platform — events.js zaten tüm .quick-add-btn'leri bağlar,
  // ama mobil kopyaları için de bağlamalıyız (events.js DOMContentLoaded'dan önce bind eder)
  qsa('.mobile-profile-view .quick-add-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var platform = btn.dataset.platform;
      var direct = PLATFORM_DIRECT[platform];
      if (direct) {
        addFeed(direct);
        if (isMobile()) switchTab('discover');
        return;
      }
      var info = PLATFORM_HINTS[platform];
      if (!info) return;
      if (mobileInput) {
        mobileInput.focus();
        mobileInput.placeholder = info.hint ? info.hint.split('\n')[0] : 'URL yapıştırın…';
      }
    });
  });

  // Pencere boyutu değişince tab durumunu temizle
  window.addEventListener('resize', function() {
    if (!isMobile()) {
      document.body.classList.remove('tab-home', 'tab-discover', 'tab-profile');
      var profileView = qs('.mobile-profile-view');
      if (profileView) profileView.hidden = true;
      qs('.main').style.display = '';
    }
  });
}

// İlk yüklemede başlat
function initTabs() {
  if (!isMobile()) return;
  var saved = state.activeTab || 'home';
  switchTab(saved);
}
