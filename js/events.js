'use strict';

// ── OLAY DİNLEYİCİLERİ ────────────────────────────────────────────────────
// Tüm kullanıcı etkileşimleri buradan bağlanır.
// DOM yüklendikten sonra main.js init() tarafından çağrılır.

function bindEvents() {
  const urlInput = qs('.feed-input');

  // ── Feed ekleme ───────────────────────────────────────────────────────
  qs('.add-btn').addEventListener('click', function() {
    addFeed(urlInput.value);
    urlInput.value = '';
  });
  urlInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { addFeed(urlInput.value); urlInput.value = ''; }
  });

  // ── Hızlı ekleme butonları ────────────────────────────────────────────
  qsa('.quick-add-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const platform = btn.dataset.platform;
      const direct   = PLATFORM_DIRECT[platform];
      if (direct) { addFeed(direct); return; }
      const info = PLATFORM_HINTS[platform];
      if (!info) return;
      urlInput.focus();
      urlInput.placeholder = info.hint ? info.hint.split('\n')[0] : 'URL yapıştırın…';
      urlInput.dataset.hintPlatform = platform;
      if (info.hint) showToast(info.label + ': ' + info.hint.split('\n')[1].trim());
    });
  });

  urlInput.addEventListener('blur', function() {
    urlInput.placeholder = 'URL yapıştır (YouTube, Reddit…)';
    delete urlInput.dataset.hintPlatform;
  });

  // ── Genel toolbar ─────────────────────────────────────────────────────
  qs('.refresh-btn').addEventListener('click', refreshAll);
  qs('.mark-all-btn').addEventListener('click', markAllRead);

  // ── Filtre chip'leri (tümü / okunmamış / yıldızlı) ────────────────────
  qsa('.filter-chip:not(.filter-chip-days)').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.activeFilter = btn.dataset.filter;
      qsa('.filter-chip:not(.filter-chip-days)').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      renderArticles();
    });
  });

  // ── 7 gün filtresi ─────────────────────────────────────────────────────
  const daysBtn = qs('.filter-chip-days');
  if (daysBtn) {
    daysBtn.classList.toggle('active-days', state.daysFilter === 7);
    daysBtn.addEventListener('click', function() {
      if (state.daysFilter === 7) {
        state.daysFilter = 0;
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

  // ── Arama (debounce 250ms) ─────────────────────────────────────────────
  let searchTimer;
  qs('.search-input').addEventListener('input', function(e) {
    clearTimeout(searchTimer);
    const val = e.target.value;
    searchTimer = setTimeout(function() { state.searchQuery = val; renderArticles(); }, 250);
  });

  // ── Liste / Kart görünümü ─────────────────────────────────────────────
  qs('.layout-list').addEventListener('click', function() {
    state.layout = 'list';
    qs('.layout-list').classList.add('active');     qs('.layout-list').setAttribute('aria-pressed', 'true');
    qs('.layout-grid').classList.remove('active');  qs('.layout-grid').setAttribute('aria-pressed', 'false');
    renderArticles(); saveState();
  });
  qs('.layout-grid').addEventListener('click', function() {
    state.layout = 'grid';
    qs('.layout-grid').classList.add('active');     qs('.layout-grid').setAttribute('aria-pressed', 'true');
    qs('.layout-list').classList.remove('active');  qs('.layout-list').setAttribute('aria-pressed', 'false');
    renderArticles(); saveState();
  });

  // ── Modal kapatma ──────────────────────────────────────────────────────
  qs('.modal-close-btn').addEventListener('click', closeModal);
  qs('.modal-backdrop').addEventListener('click', function(e) {
    if (e.target === e.currentTarget) closeModal();
  });

  // ── Klavye kısayolları ─────────────────────────────────────────────────
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (!qs('.lightbox').hidden) { closeLightbox(); return; }
      if (document.body.classList.contains('zen-mode')) { exitZenMode(); return; }
      closeModal();
      closeAnalytics();
    }
  });

  // ── Not paneli toggle ─────────────────────────────────────────────────
  qs('.modal-notes-btn').addEventListener('click', function() {
    const pane = qs('.notes-pane');
    const btn  = qs('.modal-notes-btn');
    pane.hidden = !pane.hidden;
    btn.classList.toggle('active', !pane.hidden);
    btn.setAttribute('aria-pressed', !pane.hidden ? 'true' : 'false');
  });

  // ── Tipografi paneli toggle ────────────────────────────────────────────
  qs('.modal-typo-btn').addEventListener('click', function() {
    const panel = qs('.typo-panel');
    const btn   = qs('.modal-typo-btn');
    panel.hidden = !panel.hidden;
    btn.classList.toggle('active', !panel.hidden);
    btn.setAttribute('aria-pressed', !panel.hidden ? 'true' : 'false');
    if (!panel.hidden) syncTypoPanel();
  });

  // ── Zen modu ──────────────────────────────────────────────────────────
  qs('.modal-zen-btn').addEventListener('click', toggleZenMode);

  // ── Font seçimi (delegasyon) ───────────────────────────────────────────
  document.addEventListener('click', function(e) {
    const fb = e.target.closest('.font-btn');
    if (!fb) return;
    state.typo.font = fb.dataset.font;
    qsa('.font-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.font === state.typo.font); });
    applyTypography();
    saveState();
  });

  // ── Tipografi slider'ları ─────────────────────────────────────────────
  function bindSlider(id, prop, isLine) {
    const el = qs('#' + id);
    if (!el) return;
    el.addEventListener('input', function() {
      const v = Number(el.value);
      state.typo[prop] = v;
      const lbl = qs('#' + id + '-val');
      if (lbl) lbl.textContent = isLine ? (v / 10).toFixed(1) : v + 'px';
      applyTypography();
      saveState();
    });
  }
  bindSlider('typo-size',   'size',   false);
  bindSlider('typo-line',   'line',   true);
  bindSlider('typo-letter', 'letter', false);
  bindSlider('typo-width',  'width',  false);

  // ── Tipografi ± butonları ─────────────────────────────────────────────
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.typo-minus, .typo-plus');
    if (!btn) return;
    const target = btn.dataset.target;
    const isPlus = btn.classList.contains('typo-plus');
    const steps  = { size: 1, line: 1, letter: 1, width: 20 };
    const mins   = { size: 13, line: 14, letter: -2, width: 400 };
    const maxs   = { size: 22, line: 22, letter: 10, width: 900 };
    let val = state.typo[target] + (isPlus ? steps[target] : -steps[target]);
    val = Math.max(mins[target], Math.min(maxs[target], val));
    state.typo[target] = val;
    syncTypoPanel();
    applyTypography();
    saveState();
  });

  // ── Lightbox ──────────────────────────────────────────────────────────
  qs('.lightbox-close').addEventListener('click', closeLightbox);
  qs('.lightbox').addEventListener('click', function(e) {
    if (e.target === e.currentTarget) closeLightbox();
  });

  // ── Kenar çubuğu ──────────────────────────────────────────────────────
  qs('.menu-btn').addEventListener('click', openSidebar);
  qs('.sidebar-close').addEventListener('click', closeSidebar);
  qs('.overlay').addEventListener('click', closeSidebar);

  // ── Export / Import ────────────────────────────────────────────────────
  qs('.export-btn').addEventListener('click', exportFeeds);
  qs('.import-input').addEventListener('change', function(e) {
    importFeeds(e.target.files[0]);
    e.target.value = '';
  });

  // ── Analitik paneli ────────────────────────────────────────────────────
  qs('.analytics-btn').addEventListener('click', openAnalytics);
  qs('.analytics-close-btn').addEventListener('click', closeAnalytics);

  // ── Vurgu renk seçici ─────────────────────────────────────────────────
  qsa('.hl-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.activeColor = btn.dataset.color;
      qsa('.hl-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });
  // İlk rengi varsayılan olarak aktif et
  const firstHl = qs('.hl-btn');
  if (firstHl) firstHl.classList.add('active');

  // ── Metin seçimi → vurgu ──────────────────────────────────────────────
  qs('.modal-content').addEventListener('mouseup', function() {
    const aid = qs('.modal-backdrop').dataset.aid;
    if (aid) handleHighlight(aid);
  });
}
