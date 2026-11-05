'use strict';

// ── MAKALE OKUMA MODALİ ────────────────────────────────────────────────────
function renderArticleModalHTML() {
  return `
  <div class="modal-backdrop fixed inset-0 z-50 flex items-start justify-center bg-black/70 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Makale okuma" hidden>
    <article class="modal relative bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl w-full max-w-2xl my-8 mx-4">
      <header class="modal-header flex items-center justify-between px-5 py-3 border-b border-[#1a1a1a]">
        <p class="modal-meta text-[11px] text-[#555]"></p>
        <div class="flex items-center gap-1">
          <button class="icon-btn modal-star-btn p-2 rounded-md bg-transparent border-0 text-[#888] hover:text-[#ddd] hover:bg-[#111] cursor-pointer text-sm" aria-label="Yıldız ekle" title="Yıldız ekle">&#9734;</button>
          <a class="icon-btn modal-open-btn p-2 rounded-md bg-transparent border-0 text-[#888] hover:text-[#ddd] hover:bg-[#111] cursor-pointer text-sm no-underline" href="#" target="_blank" rel="noopener noreferrer" aria-label="Orijinalde aç" title="Orijinalde aç">&#8599;</a>
          <button class="icon-btn modal-typo-btn p-2 rounded-md bg-transparent border-0 text-[#888] hover:text-[#ddd] hover:bg-[#111] cursor-pointer text-sm" aria-label="Tipografi" title="Okuma ayarları" aria-pressed="false">Aa</button>
          <button class="icon-btn modal-zen-btn p-2 rounded-md bg-transparent border-0 text-[#888] hover:text-[#ddd] hover:bg-[#111] cursor-pointer text-sm" aria-label="Zen modu" title="Derin okuma modu" aria-pressed="false">&#9678;</button>
          <button class="icon-btn modal-notes-btn p-2 rounded-md bg-transparent border-0 text-[#888] hover:text-[#ddd] hover:bg-[#111] cursor-pointer text-sm" aria-label="Notlar" title="Notlar ve vurgular" aria-pressed="false">&#9998;</button>
          <button class="icon-btn modal-close-btn p-2 rounded-md bg-transparent border-0 text-[#888] hover:text-[#ddd] hover:bg-[#111] cursor-pointer text-sm" aria-label="Kapat">&#10005;</button>
        </div>
      </header>

      <div class="typo-panel border-b border-[#1a1a1a] px-5 py-3 bg-[#0d0d0d]" hidden>
        <div class="typo-row flex items-center gap-3 mb-2">
          <span class="typo-label w-16 text-[11px] text-[#555]">Font</span>
          <div class="typo-font-btns flex gap-1">
            <button class="typo-btn font-btn active px-2 py-1 text-[11px] rounded border border-accent text-accent bg-[#0d1520] cursor-pointer" data-font="inter">Inter</button>
            <button class="typo-btn font-btn px-2 py-1 text-[11px] rounded border border-[#222] text-[#666] bg-transparent hover:border-[#333] hover:text-[#ddd] cursor-pointer" data-font="lora">Lora</button>
            <button class="typo-btn font-btn px-2 py-1 text-[11px] rounded border border-[#222] text-[#666] bg-transparent hover:border-[#333] hover:text-[#ddd] cursor-pointer" data-font="mono">Mono</button>
            <button class="typo-btn font-btn px-2 py-1 text-[11px] rounded border border-[#222] text-[#666] bg-transparent hover:border-[#333] hover:text-[#ddd] cursor-pointer" data-font="system">Sistem</button>
          </div>
        </div>
        <div class="typo-row flex items-center gap-3 mb-2">
          <span class="typo-label w-16 text-[11px] text-[#555]">Boyut</span>
          <div class="flex items-center gap-2">
            <button class="typo-btn typo-minus px-1.5 py-0.5 text-[11px] rounded border border-[#222] text-[#666] bg-transparent cursor-pointer" data-target="size">A-</button>
            <input type="range" class="typo-range w-24" id="typo-size" min="13" max="22" value="16" aria-label="Font boyutu" />
            <button class="typo-btn typo-plus px-1.5 py-0.5 text-[11px] rounded border border-[#222] text-[#666] bg-transparent cursor-pointer" data-target="size">A+</button>
            <span class="typo-val text-[11px] text-[#444] w-10" id="typo-size-val">16px</span>
          </div>
        </div>
        <div class="typo-row flex items-center gap-3 mb-2">
          <span class="typo-label w-16 text-[11px] text-[#555]">Satır</span>
          <div class="flex items-center gap-2">
            <button class="typo-btn typo-minus px-1.5 py-0.5 text-[11px] rounded border border-[#222] text-[#666] bg-transparent cursor-pointer" data-target="line">-</button>
            <input type="range" class="typo-range w-24" id="typo-line" min="14" max="22" value="19" aria-label="Satır yüksekliği" />
            <button class="typo-btn typo-plus px-1.5 py-0.5 text-[11px] rounded border border-[#222] text-[#666] bg-transparent cursor-pointer" data-target="line">+</button>
            <span class="typo-val text-[11px] text-[#444] w-10" id="typo-line-val">1.9</span>
          </div>
        </div>
        <div class="typo-row flex items-center gap-3 mb-2">
          <span class="typo-label w-16 text-[11px] text-[#555]">Harf</span>
          <div class="flex items-center gap-2">
            <button class="typo-btn typo-minus px-1.5 py-0.5 text-[11px] rounded border border-[#222] text-[#666] bg-transparent cursor-pointer" data-target="letter">-</button>
            <input type="range" class="typo-range w-24" id="typo-letter" min="-2" max="10" value="0" aria-label="Harf aralığı" />
            <button class="typo-btn typo-plus px-1.5 py-0.5 text-[11px] rounded border border-[#222] text-[#666] bg-transparent cursor-pointer" data-target="letter">+</button>
            <span class="typo-val text-[11px] text-[#444] w-10" id="typo-letter-val">0px</span>
          </div>
        </div>
        <div class="typo-row flex items-center gap-3">
          <span class="typo-label w-16 text-[11px] text-[#555]">Genişlik</span>
          <div class="flex items-center gap-2">
            <button class="typo-btn typo-minus px-1.5 py-0.5 text-[11px] rounded border border-[#222] text-[#666] bg-transparent cursor-pointer" data-target="width">-</button>
            <input type="range" class="typo-range w-24" id="typo-width" min="400" max="900" step="20" value="640" aria-label="İçerik genişliği" />
            <button class="typo-btn typo-plus px-1.5 py-0.5 text-[11px] rounded border border-[#222] text-[#666] bg-transparent cursor-pointer" data-target="width">+</button>
            <span class="typo-val text-[11px] text-[#444] w-10" id="typo-width-val">640px</span>
          </div>
        </div>
      </div>

      <div class="modal-body flex">
        <div class="reader-pane flex-1 px-6 py-5 overflow-y-auto max-h-[80vh]">
          <h2 class="modal-title text-[20px] font-semibold text-[#ddd] leading-snug mb-4"></h2>
          <section class="modal-content prose-custom text-[#bbb] text-[15px] leading-relaxed"></section>
          <section class="suggestions-section mt-6 border-t border-[#1a1a1a] pt-4" hidden>
            <div class="suggestions-heading flex items-center gap-1.5 text-[11px] text-[#555] uppercase tracking-widest mb-3">
              <span class="suggestions-icon text-accent">&#10022;</span>
              <span>Bunları da okuyabilirsin</span>
            </div>
            <ol class="suggestions-list flex flex-col gap-1 list-none"></ol>
          </section>
        </div>
        <aside class="notes-pane w-64 border-l border-[#1a1a1a] p-4 overflow-y-auto" hidden>
          <div class="notes-section mb-4">
            <p class="notes-label text-[11px] text-[#555] uppercase tracking-widest mb-2">Notlar</p>
            <textarea class="notes-input w-full bg-[#111] border border-[#1a1a1a] rounded text-[#ddd] text-[13px] p-2 outline-none resize-none h-28 placeholder:text-[#444] focus:border-[#333]" placeholder="Bu makale hakkında not al..."></textarea>
            <button class="notes-save-btn mt-1.5 w-full py-1.5 text-[12px] text-accent border border-[#1a2a40] bg-[#0d1520] rounded cursor-pointer hover:bg-[#111f33]">Kaydet</button>
          </div>
          <div class="highlights-section">
            <p class="notes-label text-[11px] text-[#555] uppercase tracking-widest mb-2">Vurgular</p>
            <div class="highlight-colors flex gap-2 mb-2">
              <button class="hl-btn hl-yellow w-5 h-5 rounded-full cursor-pointer border-2 border-transparent hover:scale-110 transition-transform" data-color="#e8b840" title="Sarı"></button>
              <button class="hl-btn hl-green  w-5 h-5 rounded-full cursor-pointer border-2 border-transparent hover:scale-110 transition-transform" data-color="#3ecf8e" title="Yeşil"></button>
              <button class="hl-btn hl-blue   w-5 h-5 rounded-full cursor-pointer border-2 border-transparent hover:scale-110 transition-transform" data-color="#5b9cf6" title="Mavi"></button>
              <button class="hl-btn hl-red    w-5 h-5 rounded-full cursor-pointer border-2 border-transparent hover:scale-110 transition-transform" data-color="#e84444" title="Kırmızı"></button>
            </div>
            <p class="hl-hint text-[11px] text-[#444] mb-2">Metni seçip renk tıkla</p>
            <div class="highlights-list flex flex-col gap-1"></div>
          </div>
        </aside>
      </div>
    </article>
  </div>
  `;
}

// ── AYARLAR PANELİ ─────────────────────────────────────────────────────────
function renderSettingsPanelHTML() {
  return `
  <div class="settings-panel fixed inset-0 z-50 flex items-center justify-center bg-black/60" hidden role="dialog" aria-modal="true" aria-label="Ayarlar">
    <div class="settings-inner bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
      <header class="settings-header flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a] sticky top-0 bg-[#0a0a0a]">
        <strong class="text-[14px] font-semibold text-[#ddd]">Ayarlar</strong>
        <button class="icon-btn settings-close-btn p-2 rounded-md bg-transparent border-0 text-[#888] hover:text-[#ddd] hover:bg-[#111] cursor-pointer text-sm" aria-label="Kapat">&#10005;</button>
      </header>
      <div class="settings-body p-4 flex flex-col gap-5">

        <!-- Profil Kartı -->
        <div class="flex items-center gap-4 p-4 bg-[#111] rounded-xl border border-[#1a1a1a]">
          <div class="w-14 h-14 rounded-full overflow-hidden bg-[#222] flex items-center justify-center text-xl font-bold text-white select-none shrink-0" id="settings-avatar-wrap">
            <img id="settings-avatar-img" src="" alt="" class="w-full h-full object-cover hidden" />
            <span id="settings-avatar-letter" class="text-[#666]">?</span>
          </div>
          <div class="flex flex-col min-w-0">
            <span id="settings-display-name" class="text-[14px] font-semibold text-[#ddd]">—</span>
            <span id="settings-user-email" class="text-[12px] text-[#555] mt-0.5 truncate"></span>
            <div class="flex items-center gap-3 mt-2">
              <span class="profile-feed-count text-[11px] text-[#666]">0 kaynak</span>
              <span class="text-[#333] text-[10px]">&#183;</span>
              <span class="profile-article-count text-[11px] text-[#666]">0 haber</span>
              <span class="text-[#333] text-[10px]">&#183;</span>
              <span class="profile-unread-count text-[11px] text-accent">0 okunmamış</span>
            </div>
          </div>
        </div>

        <!-- Görünüm -->
        <section class="settings-section">
          <p class="settings-label text-[10px] text-[#444] uppercase tracking-widest mb-3">Görünüm</p>
          <div class="settings-row flex items-center justify-between py-2 border-b border-[#111]">
            <span class="settings-row-label text-[13px] text-[#888]">Tema</span>
            <div class="settings-seg flex rounded border border-[#1a1a1a] overflow-hidden" role="group" aria-label="Tema seçimi">
              <button class="seg-btn px-3 py-1 text-[12px] text-[#666] bg-transparent border-0 cursor-pointer hover:text-[#ddd]" data-setting="theme" data-value="dark">Koyu</button>
              <button class="seg-btn px-3 py-1 text-[12px] text-[#666] bg-transparent border-0 cursor-pointer hover:text-[#ddd]" data-setting="theme" data-value="light">Açık</button>
              <button class="seg-btn px-3 py-1 text-[12px] text-[#666] bg-transparent border-0 cursor-pointer hover:text-[#ddd]" data-setting="theme" data-value="system">Sistem</button>
            </div>
          </div>
          <div class="settings-row flex items-center justify-between py-2 border-b border-[#111]">
            <span class="settings-row-label text-[13px] text-[#888]">Vurgu Rengi</span>
            <div class="settings-accent-row flex gap-2">
              <button class="accent-swatch swatch-blue w-5 h-5 rounded-full cursor-pointer border-2 border-transparent hover:scale-110 transition-transform" data-color="#5b9cf6" title="Mavi"></button>
              <button class="accent-swatch swatch-green w-5 h-5 rounded-full cursor-pointer border-2 border-transparent hover:scale-110 transition-transform" data-color="#3ecf8e" title="Yeşil"></button>
              <button class="accent-swatch swatch-yellow w-5 h-5 rounded-full cursor-pointer border-2 border-transparent hover:scale-110 transition-transform" data-color="#e8b840" title="Sarı"></button>
              <button class="accent-swatch swatch-red w-5 h-5 rounded-full cursor-pointer border-2 border-transparent hover:scale-110 transition-transform" data-color="#e84444" title="Kırmızı"></button>
              <button class="accent-swatch swatch-purple w-5 h-5 rounded-full cursor-pointer border-2 border-transparent hover:scale-110 transition-transform" data-color="#a78bfa" title="Mor"></button>
              <button class="accent-swatch swatch-orange w-5 h-5 rounded-full cursor-pointer border-2 border-transparent hover:scale-110 transition-transform" data-color="#f97316" title="Turuncu"></button>
            </div>
          </div>
          <div class="settings-row flex items-center justify-between py-2 border-b border-[#111]">
            <span class="settings-row-label text-[13px] text-[#888]">Kompakt Mod</span>
            <label class="settings-toggle relative inline-flex items-center cursor-pointer" aria-label="Kompakt mod">
              <input type="checkbox" class="toggle-input sr-only" data-setting="compactMode" />
              <span class="toggle-track w-9 h-5 bg-[#1a1a1a] rounded-full relative transition-colors"><span class="toggle-thumb absolute left-0.5 top-0.5 w-4 h-4 bg-[#444] rounded-full transition-transform"></span></span>
            </label>
          </div>
          <div class="settings-row flex items-center justify-between py-2 border-b border-[#111]">
            <span class="settings-row-label text-[13px] text-[#888]">Görselleri Göster</span>
            <label class="settings-toggle relative inline-flex items-center cursor-pointer" aria-label="Görselleri göster">
              <input type="checkbox" class="toggle-input sr-only" data-setting="showImages" />
              <span class="toggle-track w-9 h-5 bg-[#1a1a1a] rounded-full relative transition-colors"><span class="toggle-thumb absolute left-0.5 top-0.5 w-4 h-4 bg-[#444] rounded-full transition-transform"></span></span>
            </label>
          </div>
        </section>

        <!-- Davranış -->
        <section class="settings-section">
          <p class="settings-label text-[10px] text-[#444] uppercase tracking-widest mb-3">Davranış</p>
          <div class="settings-row flex items-center justify-between py-2 border-b border-[#111]">
            <span class="settings-row-label text-[13px] text-[#888]">Açılınca Okundu İşaretle</span>
            <label class="settings-toggle relative inline-flex items-center cursor-pointer" aria-label="Okundu işaretleme">
              <input type="checkbox" class="toggle-input sr-only" data-setting="markReadOnOpen" />
              <span class="toggle-track w-9 h-5 bg-[#1a1a1a] rounded-full relative transition-colors"><span class="toggle-thumb absolute left-0.5 top-0.5 w-4 h-4 bg-[#444] rounded-full transition-transform"></span></span>
            </label>
          </div>
          <div class="settings-row flex items-center justify-between py-2 border-b border-[#111]">
            <span class="settings-row-label text-[13px] text-[#888]">Orijinali Yeni Sekmede Aç</span>
            <label class="settings-toggle relative inline-flex items-center cursor-pointer" aria-label="Yeni sekmede aç">
              <input type="checkbox" class="toggle-input sr-only" data-setting="openInNewTab" />
              <span class="toggle-track w-9 h-5 bg-[#1a1a1a] rounded-full relative transition-colors"><span class="toggle-thumb absolute left-0.5 top-0.5 w-4 h-4 bg-[#444] rounded-full transition-transform"></span></span>
            </label>
          </div>
          <div class="settings-row flex items-center justify-between py-2 border-b border-[#111]">
            <span class="settings-row-label text-[13px] text-[#888]">Otomatik Yenile</span>
            <label class="settings-toggle relative inline-flex items-center cursor-pointer" aria-label="Otomatik yenile">
              <input type="checkbox" class="toggle-input sr-only" data-setting="autoRefresh" />
              <span class="toggle-track w-9 h-5 bg-[#1a1a1a] rounded-full relative transition-colors"><span class="toggle-thumb absolute left-0.5 top-0.5 w-4 h-4 bg-[#444] rounded-full transition-transform"></span></span>
            </label>
          </div>
          <div class="settings-row settings-row-indent flex items-center justify-between py-2 border-b border-[#111] pl-4" id="refresh-interval-row">
            <span class="settings-row-label text-[13px] text-[#888]">Yenileme Aralığı</span>
            <select class="settings-select bg-[#111] border border-[#222] rounded text-[#ddd] text-[12px] px-2 py-1 outline-none" data-setting="refreshInterval">
              <option value="5">5 dakika</option>
              <option value="10">10 dakika</option>
              <option value="15">15 dakika</option>
              <option value="30">30 dakika</option>
              <option value="60">1 saat</option>
            </select>
          </div>
        </section>

        <!-- Veri -->
        <section class="settings-section">
          <p class="settings-label text-[10px] text-[#444] uppercase tracking-widest mb-3">Veri</p>
          <div class="settings-row flex items-center justify-between py-2 border-b border-[#111]">
            <span class="settings-row-label text-[13px] text-[#888]">Feed Önbelleği</span>
            <button class="settings-action-btn clear-cache-btn px-3 py-1 text-[12px] text-[#888] border border-[#222] rounded bg-transparent hover:text-[#ddd] hover:border-[#333] cursor-pointer">Temizle</button>
          </div>
          <div class="settings-row flex items-center justify-between py-2 border-b border-[#111]">
            <span class="settings-row-label text-[13px] text-[#888]">Okuma Geçmişi</span>
            <button class="settings-action-btn clear-history-btn px-3 py-1 text-[12px] text-[#888] border border-[#222] rounded bg-transparent hover:text-[#ddd] hover:border-[#333] cursor-pointer">Temizle</button>
          </div>
          <div class="settings-row flex items-center justify-between py-2">
            <span class="settings-row-label text-[13px] text-[#888]">Tüm Verileri Sıfırla</span>
            <button class="settings-action-btn settings-danger-btn reset-all-btn px-3 py-1 text-[12px] text-[#e84444] border border-[#3a1a1a] rounded bg-transparent hover:bg-[#1a0808] cursor-pointer">Sıfırla</button>
          </div>
        </section>

        <!-- Hakkında -->
        <section class="settings-section">
          <p class="settings-label text-[10px] text-[#444] uppercase tracking-widest mb-3">Hakkında</p>
          <div class="flex flex-col gap-1 text-center py-2">
            <p class="text-[14px] font-semibold text-[#ddd]">NewRssFeed</p>
            <p class="text-[12px] text-[#555]">Takip ettiğin her şey, tek bir yerde.</p>
            <a class="text-[12px] text-accent hover:text-accent-hover no-underline" href="https://github.com/korayozkan/NewRssFeed" target="_blank" rel="noopener noreferrer">GitHub &#8594;</a>
          </div>
        </section>

      </div>
    </div>
  </div>
  `;
}

// ── LIGHTBOX ───────────────────────────────────────────────────────────────
function renderLightboxHTML() {
  return `
  <div class="lightbox fixed inset-0 z-200 bg-black/94 flex flex-col items-center justify-center" hidden aria-label="Görsel büyütme" role="dialog">
    <button class="lightbox-close absolute top-4 right-4 p-2 text-[#888] hover:text-[#ddd] bg-transparent border-0 cursor-pointer text-lg" aria-label="Kapat">&#10005;</button>
    <img class="lightbox-img max-w-[90vw] max-h-[80vh] object-contain" src="" alt="" />
    <p class="lightbox-caption mt-3 text-[12px] text-[#555]"></p>
  </div>
  `;
}

// ── ANALİTİK PANELİ ────────────────────────────────────────────────────────
function renderAnalyticsPanelHTML() {
  return `
  <div class="analytics-panel fixed inset-0 z-50 flex items-end justify-center bg-black/60" hidden>
    <div class="analytics-inner bg-[#0a0a0a] border border-[#1a1a1a] rounded-t-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
      <header class="analytics-header flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a] sticky top-0 bg-[#0a0a0a]">
        <strong class="text-[14px] font-semibold text-[#ddd]">Trend ve Analitik</strong>
        <button class="icon-btn analytics-close-btn p-2 rounded-md bg-transparent border-0 text-[#888] hover:text-[#ddd] hover:bg-[#111] cursor-pointer text-sm">&#10005;</button>
      </header>
      <div class="analytics-body p-4 flex flex-col gap-5">
        <section class="analytics-section">
          <p class="analytics-label text-[11px] text-[#555] uppercase tracking-widest mb-3">Kaynak Aktivitesi</p>
          <div class="source-bars flex flex-col gap-2"></div>
        </section>
        <section class="analytics-section">
          <p class="analytics-label text-[11px] text-[#555] uppercase tracking-widest mb-3">En Çok Okunan</p>
          <ol class="top-articles list-none flex flex-col gap-1"></ol>
        </section>
        <section class="analytics-section">
          <p class="analytics-label text-[11px] text-[#555] uppercase tracking-widest mb-3">Gündem Kelimeleri</p>
          <div class="word-cloud flex flex-wrap gap-1.5"></div>
        </section>
        <section class="analytics-section">
          <p class="analytics-label text-[11px] text-[#555] uppercase tracking-widest mb-3">Okuma İstatistikleri</p>
          <div class="read-stats flex flex-col gap-2"></div>
        </section>
      </div>
    </div>
  </div>
  `;
}
