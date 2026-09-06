'use strict';

// ── MODAL — MAKALE OKUMA EKRANI ────────────────────────────────────────────

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
  backdrop.hidden = false;
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

// ── GÖRSEL LİGHTBOX ───────────────────────────────────────────────────────
// Modal içindeki görsellere tıklandığında tam ekran önizleme açar.

function enhanceImages(contentEl) {
  qsa('img', contentEl).forEach(function(img) {
    img.style.cursor = 'zoom-in';
    img.title = 'Büyütmek için tıkla';
    img.addEventListener('click', function() { openLightbox(img.src, img.alt); });
  });
}

function openLightbox(src, alt) {
  const lb = qs('.lightbox');
  qs('.lightbox-img').src             = src;
  qs('.lightbox-img').alt             = alt || '';
  qs('.lightbox-caption').textContent = alt || '';
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  qs('.lightbox').hidden = true;
  document.body.style.overflow = '';
}

// ── ZEN MODU ───────────────────────────────────────────────────────────────
// Kenar çubuğu ve UI elemanlarını gizleyerek saf okuma deneyimi sunar.

function enterZenMode() {
  document.body.classList.add('zen-mode');
  qs('.modal-zen-btn').classList.add('active');
  qs('.modal-zen-btn').setAttribute('aria-pressed', 'true');
  qs('.modal-zen-btn').title = 'Zen modundan çık';
  qs('.notes-pane').hidden = true;
  qs('.modal-notes-btn').classList.remove('active');
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

// ── TİPOGRAFİ PANELİ ──────────────────────────────────────────────────────
// Font, boyut, satır yüksekliği, harf aralığı ve içerik genişliği ayarları.

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
  qsa('.font-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.font === t.font);
  });

  function setSlider(id, val, labelId, suffix) {
    const el = qs('#' + id);
    if (el) el.value = val;
    const lbl = qs('#' + labelId);
    if (lbl) lbl.textContent = suffix ? val + suffix : val;
  }
  setSlider('typo-size',   t.size,   'typo-size-val',   'px');
  setSlider('typo-line',   t.line,   'typo-line-val',   '');
  setSlider('typo-letter', t.letter, 'typo-letter-val', 'px');
  setSlider('typo-width',  t.width,  'typo-width-val',  'px');

  const lineVal = qs('#typo-line-val');
  if (lineVal) lineVal.textContent = (t.line / 10).toFixed(1);
}

// ── VURGULAR & NOTLAR ──────────────────────────────────────────────────────
// Kullanıcı metin seçerek renkli vurgu ekleyebilir; notlar da buradan yönetilir.

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
      mark.textContent      = h.text;
      const after  = document.createTextNode(node.nodeValue.slice(idx + h.text.length));
      const parent = node.parentNode;
      parent.insertBefore(before, node);
      parent.insertBefore(mark,   node);
      parent.insertBefore(after,  node);
      parent.removeChild(node);
      break;
    }
  });
}

function renderHighlightsList(aid, backdrop) {
  const list      = state.highlights[aid] || [];
  const container = qs('.highlights-list', backdrop);
  if (!list.length) {
    container.innerHTML = '<p style="font-size:11px;color:#333">Henüz vurgu yok.</p>';
    return;
  }

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
  state.highlights[aid].push({ text, color: state.activeColor });
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

// ── HTML SANİTİZASYON ──────────────────────────────────────────────────────
// Script, iframe, form ve on* event handler'larını temizler.
// XSS saldırılarına karşı içerik güvenliğini sağlar.
function sanitize(html) {
  const div = document.createElement('div');
  div.innerHTML = html;

  // Tehlikeli elementleri kaldır
  div.querySelectorAll('script, iframe, object, embed, form').forEach(function(el) { el.remove(); });

  // Event handler ve javascript: linklerini temizle
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
