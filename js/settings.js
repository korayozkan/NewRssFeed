'use strict';

// ── AYARLAR PANELİ ─────────────────────────────────────────────────────────

var autoRefreshTimer = null;

// ── Panel aç/kapat ──────────────────────────────────────────────────────────
function openSettings() {
  syncSettingsPanel();
  qs('.settings-panel').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeSettings() {
  qs('.settings-panel').hidden = true;
  document.body.style.overflow = '';
}

// ── Paneli mevcut state ile senkronize et ───────────────────────────────────
function syncSettingsPanel() {
  const s = state.settings;

  // Tema segment butonları
  qsa('.seg-btn[data-setting="theme"]').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.value === s.theme);
  });

  // Vurgu rengi swatchları
  qsa('.accent-swatch').forEach(function(sw) {
    sw.classList.toggle('active', sw.dataset.color === s.accentColor);
  });

  // Toggle (checkbox) ayarları
  qsa('.toggle-input[data-setting]').forEach(function(inp) {
    inp.checked = !!s[inp.dataset.setting];
  });

  // Select ayarları
  qsa('.settings-select[data-setting]').forEach(function(sel) {
    sel.value = String(s[sel.dataset.setting]);
  });

  // Yenileme aralığı satırı: autoRefresh kapalıysa gizle
  var row = qs('#refresh-interval-row');
  if (row) row.hidden = !s.autoRefresh;
}

// ── Ayarı kaydet ve uygula ──────────────────────────────────────────────────
function applySetting(key, value) {
  state.settings[key] = value;
  saveState();
  applyAllSettings();
}

// ── Tüm ayarları DOM'a uygula ───────────────────────────────────────────────
function applyAllSettings() {
  var s = state.settings;

  // Tema
  applyTheme(s.theme);

  // Vurgu rengi
  applyAccentColor(s.accentColor);

  // Kompakt mod
  document.body.classList.toggle('compact-mode', !!s.compactMode);

  // Görselleri gizle/göster
  document.body.classList.toggle('hide-images', !s.showImages);

  // Yeni sekme
  var openBtn = qs('.modal-open-btn');
  if (openBtn) openBtn.target = s.openInNewTab ? '_blank' : '_self';

  // Otomatik yenileme
  scheduleAutoRefresh();
}

// ── Tema ────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  var effective = theme;
  if (theme === 'system') {
    effective = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  document.documentElement.setAttribute('data-theme', effective);
}

// ── Vurgu rengi (CSS custom property) ──────────────────────────────────────
function applyAccentColor(color) {
  document.documentElement.style.setProperty('--accent', color);
  // %40 saydamlık versiyonu — hover ve active state'leri için
  var r = parseInt(color.slice(1, 3), 16);
  var g = parseInt(color.slice(3, 5), 16);
  var b = parseInt(color.slice(5, 7), 16);
  document.documentElement.style.setProperty('--accent-muted', 'rgba(' + r + ',' + g + ',' + b + ',0.15)');
}

// ── Otomatik yenileme zamanlayıcı ───────────────────────────────────────────
function scheduleAutoRefresh() {
  if (autoRefreshTimer) { clearInterval(autoRefreshTimer); autoRefreshTimer = null; }
  if (!state.settings.autoRefresh) return;
  var ms = (state.settings.refreshInterval || 15) * 60 * 1000;
  autoRefreshTimer = setInterval(function() {
    refreshAll();
    showToast('Otomatik yenileme yapıldı');
  }, ms);
}

// ── Olayları bağla ──────────────────────────────────────────────────────────
function bindSettingsEvents() {
  // Aç/kapat
  qs('.settings-btn').addEventListener('click', openSettings);
  qs('.settings-close-btn').addEventListener('click', closeSettings);

  // Panel dışına tıklayınca kapat
  qs('.settings-panel').addEventListener('click', function(e) {
    if (e.target === e.currentTarget) closeSettings();
  });

  // Escape tuşu
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && !qs('.settings-panel').hidden) closeSettings();
  });

  // Tema segment butonları
  qsa('.seg-btn[data-setting="theme"]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      qsa('.seg-btn[data-setting="theme"]').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      applySetting('theme', btn.dataset.value);
    });
  });

  // Vurgu rengi swatchları
  qsa('.accent-swatch').forEach(function(sw) {
    sw.addEventListener('click', function() {
      qsa('.accent-swatch').forEach(function(s) { s.classList.remove('active'); });
      sw.classList.add('active');
      applySetting('accentColor', sw.dataset.color);
    });
  });

  // Toggle (checkbox) ayarları
  qsa('.toggle-input[data-setting]').forEach(function(inp) {
    inp.addEventListener('change', function() {
      applySetting(inp.dataset.setting, inp.checked);
      // Yenileme aralığı satırını güncelle
      if (inp.dataset.setting === 'autoRefresh') {
        var row = qs('#refresh-interval-row');
        if (row) row.hidden = !inp.checked;
      }
    });
  });

  // Select ayarları
  qsa('.settings-select[data-setting]').forEach(function(sel) {
    sel.addEventListener('change', function() {
      var val = isNaN(Number(sel.value)) ? sel.value : Number(sel.value);
      applySetting(sel.dataset.setting, val);
    });
  });

  // Önbellek temizle
  qs('.clear-cache-btn').addEventListener('click', function() {
    clearFeedCache();
    showToast('Feed önbelleği temizlendi');
  });

  // Okuma geçmişini temizle
  qs('.clear-history-btn').addEventListener('click', function() {
    state.readHistory = {};
    saveState();
    renderFeedList();
    showToast('Okuma geçmişi temizlendi');
  });

  // Tüm verileri sıfırla
  qs('.reset-all-btn').addEventListener('click', function() {
    if (!confirm('Tüm veriler (kaynaklar, makaleler, notlar, vurgular) silinecek. Emin misiniz?')) return;
    localStorage.clear();
    location.reload();
  });

  // Sistem teması değişince güncelle
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function() {
    if (state.settings.theme === 'system') applyTheme('system');
  });
}
