'use strict';

// ── SIDEBAR COMPONENT ──────────────────────────────────────────────────────
function renderSidebarHTML() {
  return `
  <aside class="sidebar hidden md:flex fixed inset-y-0 left-0 z-40 w-60 flex-col bg-[#0a0a0a] border-r border-[#1a1a1a]">
    <header class="flex items-center justify-between px-4 py-4 border-b border-[#1a1a1a]">
      <strong class="logo-text text-sm font-semibold">NewRssFeed</strong>
    </header>

    <nav class="flex-1 overflow-y-auto p-2" aria-label="Ana navigasyon">
      <span class="block text-[10px] text-[#444] uppercase tracking-widest px-2 py-2">Gezinti</span>

      <div class="feed-item" data-feedid="home" role="button" tabindex="0" aria-label="Anasayfa">
        <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span class="flex-1 text-[13px] truncate">Anasayfa</span>
      </div>

      <div class="feed-item" data-feedid="all" role="button" tabindex="0" aria-label="Keşfet">
        <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span class="flex-1 text-[13px] truncate">Keşfet</span>
        <span class="sidebar-unread-badge ml-auto text-[11px] text-accent bg-[#0d1520] border border-[#1a2a40] px-1.5 py-0.5 rounded-full" hidden></span>
      </div>

      <a href="profil.html" class="feed-item no-underline" aria-label="Profil">
        <div class="w-4 h-4 rounded-full overflow-hidden bg-[#222] flex items-center justify-center shrink-0">
          <img id="sidebar-avatar-img" src="" alt="" class="w-full h-full object-cover hidden" />
          <span id="sidebar-avatar-letter" class="text-[9px] font-bold text-[#666]">?</span>
        </div>
        <span class="flex-1 text-[13px] truncate">Profil</span>
      </a>

      <div class="feed-item" data-feedid="reels" role="button" tabindex="0" aria-label="Reels">
        <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M6 3l12 9-12 9V3z"/>
        </svg>
        <span class="flex-1 text-[13px] truncate">Reels</span>
      </div>

      <div class="w-full h-px bg-[#1a1a1a] my-2"></div>
      <span class="block text-[10px] text-[#444] uppercase tracking-widest px-2 py-1">Kaynaklar</span>
      <div class="feed-list" aria-label="Feed listesi"></div>
    </nav>

    <footer class="p-2 border-t border-[#1a1a1a]">
      <button class="settings-btn w-full flex items-center gap-2 text-left text-[12px] text-[#666] hover:text-[#ddd] py-1.5 px-2 rounded bg-transparent border-0 cursor-pointer hover:bg-[#111]">
        <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        Ayarlar
      </button>
    </footer>
  </aside>

  <!-- Overlay (mobil bağımlılık için bırakıldı) -->
  <div class="overlay fixed inset-0 z-30 bg-black/70 hidden" aria-hidden="true"></div>
  `;
}
