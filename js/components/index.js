'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT LOADER
// DOMContentLoaded beklemeden çalışır — script defer/async olmadığından
// body henüz tam parse edilmemiş olabilir; bu yüzden insertAdjacentHTML kullanır.
// Her render* fonksiyonu kendi component dosyasında tanımlıdır.
// ─────────────────────────────────────────────────────────────────────────────

(function mountComponents() {
  const body = document.body;

  // 1. Sidebar + overlay → body'nin en başına ekle
  body.insertAdjacentHTML('afterbegin', renderSidebarHTML());

  // 2. Topbar + filtre çubuğu → .main'in başına ekle
  const main = body.querySelector('.main');
  if (main) main.insertAdjacentHTML('afterbegin', renderTopbarHTML());

  // 3. Reels view
  body.insertAdjacentHTML('beforeend', renderReelsHTML());

  // 4. Mobil tab bar + discover + profil view
  body.insertAdjacentHTML('beforeend', renderMobileHTML());

  // 5. Modallar (makale okuma, ayarlar, lightbox, analitik)
  body.insertAdjacentHTML('beforeend', renderArticleModalHTML());
  body.insertAdjacentHTML('beforeend', renderSettingsPanelHTML());
  body.insertAdjacentHTML('beforeend', renderLightboxHTML());
  body.insertAdjacentHTML('beforeend', renderAnalyticsPanelHTML());
})();
