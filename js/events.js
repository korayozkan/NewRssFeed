'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// OLAY DİNLEYİCİLERİ
// main.js → init() tarafından DOMContentLoaded sonrası çağrılır.
// ─────────────────────────────────────────────────────────────────────────────
function bindEvents() {

  // ── Topbar: Yenile ────────────────────────────────────────────────────────
  qs('.refresh-btn')?.addEventListener('click', refreshAll);

  // ── Topbar: Bildirim ──────────────────────────────────────────────────────
  qs('.notif-btn')?.addEventListener('click', () => {
    const unread = state.articles.filter(a => !a.read).length;
    showToast(unread > 0 ? `${unread} okunmamış haber var` : 'Tüm haberler okundu');
  });

  // ── Filtre chip'leri (Tümü / Okunmamış / Yıldızlı) ───────────────────────
  qsa('.filter-chip:not(.filter-chip-days)').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeFilter = btn.dataset.filter;
      qsa('.filter-chip:not(.filter-chip-days)').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderArticles();
    });
  });

  // ── Filtre: Son 7 Gün ─────────────────────────────────────────────────────
  const daysBtn = qs('.filter-chip-days');
  if (daysBtn) {
    daysBtn.textContent = state.daysFilter === 7 ? 'Son 7 Gün' : 'Tüm Zamanlar';
    daysBtn.addEventListener('click', () => {
      state.daysFilter = state.daysFilter === 7 ? 0 : 7;
      daysBtn.textContent = state.daysFilter === 7 ? 'Son 7 Gün' : 'Tüm Zamanlar';
      saveState();
      renderArticles();
    });
  }

  // ── Analitik paneli ───────────────────────────────────────────────────────
  qs('.analytics-close-btn')?.addEventListener('click', closeAnalytics);

  // ── Modal: Kapat ──────────────────────────────────────────────────────────
  qs('.modal-close-btn')?.addEventListener('click', closeModal);
  qs('.modal-backdrop')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // ── Modal: Not paneli ─────────────────────────────────────────────────────
  qs('.modal-notes-btn')?.addEventListener('click', () => {
    const pane = qs('.notes-pane');
    const btn  = qs('.modal-notes-btn');
    pane.hidden = !pane.hidden;
    btn.classList.toggle('active', !pane.hidden);
    btn.setAttribute('aria-pressed', String(!pane.hidden));
  });

  // ── Modal: Tipografi paneli ───────────────────────────────────────────────
  qs('.modal-typo-btn')?.addEventListener('click', () => {
    const panel = qs('.typo-panel');
    const btn   = qs('.modal-typo-btn');
    panel.hidden = !panel.hidden;
    btn.classList.toggle('active', !panel.hidden);
    btn.setAttribute('aria-pressed', String(!panel.hidden));
    if (!panel.hidden) syncTypoPanel();
  });

  // ── Modal: Zen modu ───────────────────────────────────────────────────────
  qs('.modal-zen-btn')?.addEventListener('click', toggleZenMode);

  // ── Font seçimi (event delegation) ───────────────────────────────────────
  document.addEventListener('click', e => {
    const fb = e.target.closest('.font-btn');
    if (!fb) return;
    state.typo.font = fb.dataset.font;
    qsa('.font-btn').forEach(b => b.classList.toggle('active', b.dataset.font === state.typo.font));
    applyTypography();
    saveState();
  });

  // ── Tipografi slider'ları ─────────────────────────────────────────────────
  [
    { id: 'typo-size',   prop: 'size',   format: v => `${v}px` },
    { id: 'typo-line',   prop: 'line',   format: v => (v / 10).toFixed(1) },
    { id: 'typo-letter', prop: 'letter', format: v => `${v}px` },
    { id: 'typo-width',  prop: 'width',  format: v => `${v}px` },
  ].forEach(({ id, prop, format }) => {
    const el  = qs(`#${id}`);
    const lbl = qs(`#${id}-val`);
    if (!el) return;
    el.addEventListener('input', () => {
      const v = Number(el.value);
      state.typo[prop] = v;
      if (lbl) lbl.textContent = format(v);
      applyTypography();
      saveState();
    });
  });

  // ── Tipografi ± butonları ─────────────────────────────────────────────────
  const TYPO_CONFIG = {
    size:   { min: 13, max: 22, step: 1 },
    line:   { min: 14, max: 22, step: 1 },
    letter: { min: -2, max: 10, step: 1 },
    width:  { min: 400, max: 900, step: 20 },
  };

  document.addEventListener('click', e => {
    const btn = e.target.closest('.typo-minus, .typo-plus');
    if (!btn) return;
    const prop   = btn.dataset.target;
    const cfg    = TYPO_CONFIG[prop];
    const delta  = btn.classList.contains('typo-plus') ? cfg.step : -cfg.step;
    state.typo[prop] = Math.max(cfg.min, Math.min(cfg.max, state.typo[prop] + delta));
    syncTypoPanel();
    applyTypography();
    saveState();
  });

  // ── Lightbox ──────────────────────────────────────────────────────────────
  qs('.lightbox-close')?.addEventListener('click', closeLightbox);
  qs('.lightbox')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeLightbox();
  });

  // ── Klavye kısayolları ────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!qs('.lightbox').hidden)                    { closeLightbox(); return; }
    if (document.body.classList.contains('zen-mode')) { exitZenMode();   return; }
    closeModal();
    closeAnalytics();
  });

  // ── Vurgu renk seçici ─────────────────────────────────────────────────────
  qsa('.hl-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeColor = btn.dataset.color;
      qsa('.hl-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  qs('.hl-btn')?.classList.add('active'); // ilk rengi varsayılan yap

  // ── Metin seçimi → vurgu ──────────────────────────────────────────────────
  qs('.modal-content')?.addEventListener('mouseup', () => {
    const aid = qs('.modal-backdrop')?.dataset.aid;
    if (aid) handleHighlight(aid);
  });
}
