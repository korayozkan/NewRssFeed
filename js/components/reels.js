'use strict';

// ── REELS COMPONENT ────────────────────────────────────────────────────────
function renderReelsHTML() {
  return `
  <div class="reels-view fixed inset-0 z-40 bg-black flex flex-col" hidden aria-label="Reels">
    <div class="reels-topbar flex items-center gap-2 px-4 h-13 border-b border-[#1a1a1a] bg-[#0a0a0a] shrink-0">
      <span class="reels-title text-[14px] font-semibold text-[#ddd]">Reels</span>
      <span class="reels-subtitle text-[12px] text-[#555]">Haber Videoları</span>
      <button class="reels-close-btn ml-auto p-2 rounded-md bg-transparent border-0 text-[#888] hover:text-[#ddd] hover:bg-[#111] cursor-pointer" aria-label="Kapat" title="Kapat">&#10005;</button>
    </div>
    <div class="reels-empty flex flex-col items-center justify-center flex-1 text-center px-8" hidden>
      <div class="reels-empty-icon text-5xl text-[#333] mb-4">&#9654;</div>
      <p class="reels-empty-title text-[15px] font-medium text-[#666] mb-1">Video bulunamadı</p>
      <p class="reels-empty-desc text-[13px] text-[#444]">YouTube veya video içeren haber kaynakları ekleyerek başlayın.</p>
    </div>
    <div class="reels-loading flex items-center justify-center flex-1" hidden>
      <span class="spinner inline-block w-5 h-5 border-2 border-[#1e1e1e] border-t-[#555] rounded-full animate-spin" role="status" aria-label="Yükleniyor"></span>
    </div>
    <div class="reels-container flex-1 overflow-y-scroll scrollbar-none snap-y-mandatory" role="list" aria-label="Video reels"></div>
  </div>
  `;
}
