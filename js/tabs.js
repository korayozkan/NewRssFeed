'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// MOBİL TAB NAVİGASYON
// Yalnızca 640px altında etkin olur; masaüstünde hiçbir şey yapmaz.
// Sekmeler: home | discover | profile (→ profil.html)
// ─────────────────────────────────────────────────────────────────────────────

const MOBILE_BP = 640;
const isMobile  = () => window.innerWidth <= MOBILE_BP;

// ── Keşfet sekmesi filtre durumu ──────────────────────────────────────────────
let discoverFilter = 'all';

// ─────────────────────────────────────────────────────────────────────────────
// Keşfet makalelerini render et
// ─────────────────────────────────────────────────────────────────────────────
function renderDiscoverArticles() {
  const container = qs('.discover-articles');
  const emptyEl   = qs('.discover-empty');
  const loadingEl = qs('.discover-loading');
  if (!container) return;

  // Aktif feed → filtre → arama sırasıyla daralt
  let list = state.articles.slice();

  const feedId = state.activeFeedId;
  if (feedId !== 'all' && feedId !== 'home' && feedId !== 'reels') {
    list = list.filter(a => a.feedId === feedId);
  }
  if (discoverFilter === 'unread')  list = list.filter(a => !a.read);
  if (discoverFilter === 'starred') list = list.filter(a => a.starred);

  const q = qs('.search-input-discover')?.value?.toLowerCase() || '';
  if (q) {
    list = list.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.desc.toLowerCase().includes(q)  ||
      a.feedName.toLowerCase().includes(q)
    );
  }

  if (loadingEl) loadingEl.hidden = true;

  if (list.length === 0) {
    container.innerHTML = '';
    if (emptyEl) emptyEl.hidden = false;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;

  container.innerHTML = list.map(a => {
    const thumb    = a.image ? `<img class="article-thumb w-20 h-16 object-cover rounded shrink-0" src="${escHtml(a.image)}" alt="" loading="lazy" onerror="this.remove()">` : '';
    const tagsHtml = a.tags?.length
      ? `<div class="flex flex-wrap gap-1 mt-1">${a.tags.map(t => `<span class="text-[10px] px-1.5 py-0.5 rounded bg-[#111] border border-[#1a1a1a] text-[#555]">${escHtml(t)}</span>`).join('')}</div>`
      : '';

    return `
      <li class="article-card discover-card${a.read ? ' read' : ''}"
          data-id="${escHtml(a.id)}" tabindex="0" role="button" aria-label="${escHtml(a.title)}">
        <span class="absolute left-1 top-4 w-1.5 h-1.5 rounded-full bg-accent${a.read ? ' hidden' : ''}" aria-hidden="true"></span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 mb-1">
            <img class="w-3.5 h-3.5 rounded" src="${escHtml(a.favicon || '')}" alt="" onerror="this.style.display='none'" loading="lazy">
            <span class="text-[11px] text-[#666]">${escHtml(a.feedName)}</span>
            <time class="ml-auto text-[11px] text-[#444]">${formatDate(a.date)}</time>
          </div>
          <h3 class="text-[14px] font-medium text-[#ddd] leading-snug mb-1">${escHtml(a.title)}</h3>
          ${a.desc ? `<p class="text-[13px] text-[#666] line-clamp-2">${escHtml(a.desc)}</p>` : ''}
          ${tagsHtml}
        </div>
        ${thumb}
        <div class="shrink-0 flex flex-col items-center gap-1">
          <button class="discover-star-btn p-1 text-[#444] hover:text-star bg-transparent border-0 cursor-pointer text-base${a.starred ? ' starred' : ''}"
                  data-id="${escHtml(a.id)}" title="${a.starred ? 'Yıldızı kaldır' : 'Yıldız ekle'}">
            ${a.starred ? '★' : '☆'}
          </button>
        </div>
      </li>`;
  }).join('');

  // Olay dinleyicileri
  qsa('.discover-card', container).forEach(card => {
    card.addEventListener('click', e => {
      if (!e.target.closest('.discover-star-btn')) openModal(card.dataset.id);
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter') openModal(card.dataset.id);
    });
  });

  qsa('.discover-star-btn', container).forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const starred = toggleStar(btn.dataset.id);
      btn.classList.toggle('starred', starred);
      btn.textContent = starred ? '★' : '☆';
      btn.title = starred ? 'Yıldızı kaldır' : 'Yıldız ekle';
      renderFeedList();
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sekme geçişi
// ─────────────────────────────────────────────────────────────────────────────
function switchTab(tab) {
  if (!isMobile()) return;

  // Profil sekmesi doğrudan sayfaya yönlendirir
  if (tab === 'profile') {
    window.location.href = 'profil.html';
    return;
  }

  // Tab butonlarını güncelle
  qsa('.tab-btn').forEach(btn => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle('active', active);
    btn.style.color = active ? 'var(--color-accent, #5b9cf6)' : '';
  });

  document.body.className = document.body.className
    .replace(/\btab-\S+/g, '').trim() + ` tab-${tab}`;

  // Tüm mobil view'ları gizle, main'i göster
  qs('.reels-view').hidden             = true;
  qs('.mobile-discover-view').hidden   = true;
  qs('.main').style.display            = '';

  if (tab === 'home') {
    showHomepage();
    if (state.articles.length > 0) renderHomepage();
    else qs('.homepage-empty').hidden = false;

  } else if (tab === 'discover') {
    qs('.main').style.display          = 'none';
    qs('.mobile-discover-view').hidden = false;
    renderDiscoverArticles();
  }

  state.activeTab = tab;
}

// ─────────────────────────────────────────────────────────────────────────────
// Olay bağlama
// ─────────────────────────────────────────────────────────────────────────────
function bindTabEvents() {

  // Tab butonları
  qsa('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Keşfet: filtre chip'leri
  qsa('.discover-filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      discoverFilter = btn.dataset.filter;
      qsa('.discover-filter-chip').forEach(b => {
        const active = b.dataset.filter === discoverFilter;
        b.classList.toggle('active', active);
      });
      renderDiscoverArticles();
    });
  });

  // Keşfet: arama
  let searchTimer;
  qs('.search-input-discover')?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderDiscoverArticles, 250);
  });

  // Keşfet: yenile
  qs('.refresh-btn-discover')?.addEventListener('click', refreshAll);

  // Mobil: feed ekle
  const mobileInput  = qs('.feed-input-mobile');
  const mobileAddBtn = qs('.add-btn-mobile');
  if (mobileInput && mobileAddBtn) {
    mobileAddBtn.addEventListener('click', () => { addFeed(mobileInput.value); mobileInput.value = ''; });
    mobileInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { addFeed(mobileInput.value); mobileInput.value = ''; }
    });
  }

  // Mobil: ayarlar
  qs('.settings-btn-profile')?.addEventListener('click', openSettings);

  // Mobil: dışa aktar
  qs('.export-btn-mobile')?.addEventListener('click', exportFeeds);

  // Mobil: içe aktar
  qs('.import-input-mobile')?.addEventListener('change', e => {
    importFeeds(e.target.files[0]);
    e.target.value = '';
  });

  // Pencere yeniden boyutlandırılınca mobil durumu temizle
  window.addEventListener('resize', () => {
    if (isMobile()) return;
    document.body.classList.remove('tab-home', 'tab-discover', 'tab-profile');
    qs('.mobile-discover-view').hidden = true;
    qs('.main').style.display          = '';
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// İlk yükleme
// ─────────────────────────────────────────────────────────────────────────────
function initTabs() {
  if (!isMobile()) return;
  switchTab(state.activeTab || 'home');
}
