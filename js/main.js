'use strict';

// ── BAŞLATMA ───────────────────────────────────────────────────────────────
// Uygulama yüklendiğinde çağrılan giriş noktası.
// Bağımlılık sırası: config → state → storage → feed → render → modal → events → main

function init() {
  // Kaydedilmiş durumu yükle
  loadState();

  // Eski/kaldırılmış NASA feed'ini temizle
  state.feeds    = state.feeds.filter(function(f) { return f.id !== 'nasa'; });
  state.articles = state.articles.filter(function(a) { return a.feedId !== 'nasa'; });

  // İlk çalıştırmada varsayılan kaynakları yükle
  if (state.feeds.length === 0) {
    state.feeds = DEFAULT_FEEDS.map(function(f) { return Object.assign({}, f); });
  }

  // Layout butonlarını kayıtlı duruma göre ayarla
  if (state.layout === 'grid') {
    qs('.layout-grid').classList.add('active');    qs('.layout-grid').setAttribute('aria-pressed', 'true');
    qs('.layout-list').classList.remove('active'); qs('.layout-list').setAttribute('aria-pressed', 'false');
  }

  bindEvents();
  renderFeedList();
  renderSmartTags();

  // Başlangıç görünümünü belirle
  if (state.activeFeedId === 'home') {
    showHomepage();
    if (state.articles.length > 0) renderHomepage();
    else qs('.homepage-empty').hidden = false;
  } else if (state.articles.length > 0) {
    renderArticles();
  } else {
    qs('.empty-state').hidden = false;
  }

  // Tüm kaynakları arka planda güncelle
  refreshAll();
}

document.addEventListener('DOMContentLoaded', init);
