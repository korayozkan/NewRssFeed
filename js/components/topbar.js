'use strict';

// ── TOPBAR COMPONENT ───────────────────────────────────────────────────────
function renderTopbarHTML() {
  return `
  <header class="topbar flex items-center justify-between h-13 px-4 border-b border-[#1a1a1a] bg-[#0a0a0a]">
    <div class="flex items-center gap-2">
      <h1 class="page-title text-[14px] font-semibold text-[#ddd]">Anasayfa</h1>
    </div>
    <div class="flex items-center gap-1">
      <button class="icon-btn refresh-btn p-2 rounded-md bg-transparent border-0 text-[#888] hover:text-[#ddd] hover:bg-[#111] cursor-pointer" aria-label="Yenile" title="Yenile">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="23 4 23 10 17 10"/>
          <polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
      </button>
      <button class="icon-btn notif-btn relative p-2 rounded-md bg-transparent border-0 text-[#888] hover:text-[#ddd] hover:bg-[#111] cursor-pointer" aria-label="Bildirimler" title="Bildirimler">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span class="notif-dot absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent hidden"></span>
      </button>
    </div>
  </header>

  <!-- Filtre çubuğu -->
  <nav class="filter-bar flex items-center gap-2 px-4 py-2 border-b border-[#1a1a1a] overflow-x-auto scrollbar-none" aria-label="Filtreler" hidden>
    <button class="filter-chip active px-3 py-1 rounded-full text-xs border border-accent text-accent bg-[#0d1520] whitespace-nowrap" data-filter="all">Tümü</button>
    <button class="filter-chip px-3 py-1 rounded-full text-xs border border-[#222] text-[#888] hover:border-[#444] hover:text-[#ddd] whitespace-nowrap" data-filter="unread">Okunmamış</button>
    <button class="filter-chip px-3 py-1 rounded-full text-xs border border-[#222] text-[#888] hover:border-[#444] hover:text-[#ddd] whitespace-nowrap" data-filter="starred">Yıldızlı</button>
    <button class="filter-chip filter-chip-days px-3 py-1 rounded-full text-xs border border-[#222] text-[#888] hover:border-[#444] hover:text-[#ddd] whitespace-nowrap" data-filter="7days" title="Son 7 gün">Son 7 Gün</button>
    <div class="w-px h-4 bg-[#1a1a1a] shrink-0"></div>
    <div class="smart-tags flex flex-wrap gap-1"></div>
  </nav>
  `;
}
