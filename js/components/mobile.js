'use strict';

// ── MOBİL COMPONENT ───────────────────────────────────────────────────────
function renderMobileHTML() {
  return `
  <!-- Mobil Tab Bar -->
  <nav class="mobile-tabs fixed bottom-0 left-0 right-0 z-50 flex border-t border-[#1a1a1a] bg-[#0a0a0a] md:hidden" aria-label="Ana navigasyon">
    <button class="tab-btn active flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-accent bg-transparent border-0 cursor-pointer" data-tab="home" aria-label="Anasayfa">
      <svg class="tab-icon w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
      <span class="tab-label text-[10px]">Anasayfa</span>
    </button>
    <button class="tab-btn flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[#555] bg-transparent border-0 cursor-pointer hover:text-[#ddd]" data-tab="discover" aria-label="Keşfet">
      <svg class="tab-icon w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <span class="tab-label text-[10px]">Keşfet</span>
    </button>
    <button class="tab-btn flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[#555] bg-transparent border-0 cursor-pointer hover:text-[#ddd]" data-tab="profile" aria-label="Profil">
      <div id="mobile-tab-avatar" class="w-6 h-6 rounded-full overflow-hidden bg-[#222] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
        <img id="mobile-avatar-img" src="" alt="Profil" class="w-full h-full object-cover hidden" />
        <span id="mobile-avatar-letter" class="text-[11px] font-bold text-[#888]">?</span>
      </div>
      <span class="tab-label text-[10px]">Profil</span>
    </button>
  </nav>

  <!-- Mobil Keşfet View -->
  <div class="mobile-discover-view fixed inset-0 z-40 bg-black flex flex-col md:hidden" hidden>
    <header class="mobile-discover-header flex items-center justify-between px-4 h-13 border-b border-[#1a1a1a] bg-[#0a0a0a]">
      <strong class="text-[14px] font-semibold text-[#ddd]">Keşfet</strong>
      <div class="flex items-center gap-1">
        <div class="flex items-center gap-1 bg-[#111] border border-[#1a1a1a] rounded-md px-2 py-1">
          <span class="text-[#555] text-sm select-none" aria-hidden="true">⚲</span>
          <input type="search" name="search-discover" class="search-input-discover bg-transparent border-0 text-[#ddd] text-[13px] outline-none w-28 placeholder:text-[#444]" placeholder="Ara..." aria-label="Haberlerde ara" />
        </div>
        <button class="icon-btn refresh-btn-discover p-2 rounded-md bg-transparent border-0 text-[#888] hover:text-[#ddd] hover:bg-[#111] cursor-pointer text-sm" aria-label="Yenile" title="Yenile">↻</button>
      </div>
    </header>
    <nav class="discover-filter-bar flex items-center gap-2 px-4 py-2 border-b border-[#1a1a1a] overflow-x-auto scrollbar-none" aria-label="Filtreler">
      <button class="discover-filter-chip active px-3 py-1 rounded-full text-xs border border-accent text-accent bg-[#0d1520] whitespace-nowrap" data-filter="all">Tümü</button>
      <button class="discover-filter-chip px-3 py-1 rounded-full text-xs border border-[#222] text-[#888] hover:border-[#444] hover:text-[#ddd] whitespace-nowrap" data-filter="unread">Okunmamış</button>
      <button class="discover-filter-chip px-3 py-1 rounded-full text-xs border border-[#222] text-[#888] hover:border-[#444] hover:text-[#ddd] whitespace-nowrap" data-filter="starred">Yıldızlı</button>
    </nav>
    <div class="discover-body flex-1 overflow-y-auto pb-20">
      <ol class="discover-articles list-none" aria-live="polite" aria-label="Haber listesi"></ol>
      <div class="discover-empty flex flex-col items-center py-16 text-center" hidden>
        <p class="text-[14px] text-[#666]">Haber bulunamadı</p>
      </div>
      <div class="discover-loading flex items-center justify-center py-16" hidden>
        <span class="spinner inline-block w-5 h-5 border-2 border-[#1e1e1e] border-t-[#555] rounded-full animate-spin" role="status" aria-label="Yükleniyor"></span>
      </div>
    </div>
  </div>

  <!-- Mobil Profil View -->
  <div class="mobile-profile-view fixed inset-0 z-40 bg-black flex flex-col md:hidden" hidden>
    <header class="flex items-center justify-between px-4 h-13 border-b border-[#1a1a1a] bg-[#0a0a0a]">
      <strong class="text-[14px] font-semibold text-[#ddd]">Kaynaklar</strong>
      <button class="settings-btn-profile icon-btn p-2 rounded-md bg-transparent border-0 text-[#888] hover:text-[#ddd] hover:bg-[#111] cursor-pointer" aria-label="Ayarlar">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>
    </header>
    <div class="flex-1 overflow-y-auto pb-20 p-3">
      <!-- Feed ekle -->
      <div class="flex gap-2 mb-3">
        <input type="url" class="feed-input-mobile flex-1 bg-[#111] border border-[#1a1a1a] rounded-lg text-[#ddd] text-[13px] px-3 py-2 outline-none placeholder:text-[#444] focus:border-accent transition-colors" placeholder="RSS URL yapıştırın…" />
        <button class="add-btn-mobile px-3 py-2 rounded-lg bg-accent text-white text-[13px] font-medium border-0 cursor-pointer hover:bg-accent-hover transition-colors">Ekle</button>
      </div>
      <!-- Hızlı ekle -->
      <div class="flex flex-wrap gap-1.5 mb-3">
        <button class="quick-add-btn px-2.5 py-1 rounded-full text-[11px] border border-[#222] text-[#666] bg-transparent cursor-pointer hover:border-[#333] hover:text-[#ddd]" data-platform="youtube">▶ YouTube</button>
        <button class="quick-add-btn px-2.5 py-1 rounded-full text-[11px] border border-[#222] text-[#666] bg-transparent cursor-pointer hover:border-[#333] hover:text-[#ddd]" data-platform="reddit">⬆ Reddit</button>
        <button class="quick-add-btn px-2.5 py-1 rounded-full text-[11px] border border-[#222] text-[#666] bg-transparent cursor-pointer hover:border-[#333] hover:text-[#ddd]" data-platform="hackernews">Y HN</button>
        <button class="quick-add-btn px-2.5 py-1 rounded-full text-[11px] border border-[#222] text-[#666] bg-transparent cursor-pointer hover:border-[#333] hover:text-[#ddd]" data-platform="github">⌥ GitHub</button>
      </div>
      <!-- Dışa/içe aktar -->
      <div class="flex gap-2 mb-3">
        <button class="export-btn-mobile flex-1 py-1.5 text-[12px] text-[#666] border border-[#222] rounded-lg bg-transparent cursor-pointer hover:text-[#ddd] hover:border-[#333]">↑ Dışa Aktar</button>
        <label class="flex-1 py-1.5 text-[12px] text-[#666] border border-[#222] rounded-lg bg-transparent cursor-pointer hover:text-[#ddd] hover:border-[#333] text-center">
          ↓ İçe Aktar
          <input type="file" class="import-input-mobile sr-only" accept=".opml,.xml" />
        </label>
      </div>
      <!-- Feed listesi -->
      <div class="feed-list-mobile flex flex-col gap-0.5"></div>
    </div>
  </div>
  `;
}
