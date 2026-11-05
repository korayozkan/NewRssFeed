'use strict';

/**
 * @fileoverview state.js — Uygulama çalışma zamanı durumu ve temel yardımcı fonksiyonlar.
 *
 * Uygulamadaki tüm değişken veri tek bir `state` nesnesinde tutulur.
 * Modüller bu nesneyi doğrudan okur ve değiştirir; kalıcı hale getirmek için
 * storage.js → saveState() çağrılır.
 *
 * Yardımcı fonksiyonlar (uid, qs, qsa) bu dosyada tanımlanır çünkü storage.js dahil
 * tüm modüller bunlara ihtiyaç duyar ve config.js'den sonra ilk yüklenen dosya burasıdır.
 *
 * İçindekiler:
 *  1. state   — Tek kaynak-gerçek (single source of truth) nesnesi
 *  2. uid()   — Benzersiz kısa ID üreteci
 *  3. qs()    — querySelector kısaltması
 *  4. qsa()   — querySelectorAll kısaltması (Array döner)
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. UYGULAMA DURUMU
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Uygulamanın tüm çalışma zamanı verisi.
 *
 * Kalıcı alanlar (feeds, articles, notes, highlights, readHistory, layout, typo, daysFilter)
 * localStorage'a yazılır ve uygulama yeniden açıldığında storage.js → loadState() ile geri yüklenir.
 *
 * Geçici alanlar (activeFilter, activeFeedId, activeTag, searchQuery, loading, activeColor)
 * yalnızca mevcut oturumda yaşar; sayfa yenilendiğinde sıfırlanır.
 *
 * @namespace state
 *
 * @property {Array<FeedItem>}              feeds        — Kullanıcının eklediği RSS kaynakları
 * @property {Array<ArticleItem>}           articles     — Tüm kaynaklardan çekilen makaleler (tarih sıralı)
 * @property {Object.<string, string>}      notes        — Makale ID'sine göre kullanıcı notları
 * @property {Object.<string, Highlight[]>} highlights   — Makale ID'sine göre renkli vurgu listesi
 * @property {Object.<string, number>}      readHistory  — Makale ID → okunma timestamp; öneri skoru için kullanılır
 *
 * @property {'all'|'unread'|'starred'}     activeFilter — Aktif filtre çipi
 * @property {string}                       activeFeedId — Aktif feed ID'si ('home' | 'all' | feed.id)
 * @property {string}                       activeTag    — Aktif akıllı etiket; boş string = filtre yok
 * @property {string}                       searchQuery  — Arama kutusu değeri
 * @property {number}                       daysFilter   — Kaç günlük makale gösterileceği; 0 = sınırsız
 *
 * @property {'list'|'grid'}                layout       — Makale listesi görünüm modu
 * @property {boolean}                      loading      — Fetch işlemi devam ediyor mu
 * @property {string}                       activeColor  — Vurgu için seçili renk (hex)
 *
 * @property {TypoSettings}                 typo         — Okuma paneli tipografi ayarları
 */

/**
 * @typedef {Object} FeedItem
 * @property {string}      id      — uid() ile üretilen benzersiz tanımlayıcı
 * @property {string}      name    — Kaynak adı (feed başlığından veya hostname'den)
 * @property {string}      url     — RSS/Atom feed URL'si
 * @property {string|null} favicon — favicon.im üzerinden alınan ikon URL'si; yoksa null
 */

/**
 * @typedef {Object} ArticleItem
 * @property {string}   id       — `feedId + '::' + link` formatında benzersiz ID
 * @property {string}   feedId   — Kaynağın ID'si
 * @property {string}   feedName — Kaynağın görünen adı (card ve modal'da gösterilir)
 * @property {string}   favicon  — Kaynak favicon URL'si
 * @property {string}   title    — Makale başlığı
 * @property {string}   desc     — Sanitize edilmiş, 200 karakterle kırpılmış özet
 * @property {string}   url      — Orijinal makale linki
 * @property {Date}     date     — Yayın tarihi
 * @property {string|null} image — Kapak görseli URL'si; enclosure, media:thumbnail veya img src
 * @property {string}   content  — Ham HTML içerik (modal'da sanitize edilerek gösterilir)
 * @property {string[]} tags     — SMART_CATEGORIES'den türetilen etiketler
 * @property {boolean}  read     — Okundu mu
 * @property {boolean}  starred  — Yıldızlandı mı
 */

/**
 * @typedef {Object} Highlight
 * @property {string} text  — Vurgulanan metin (maks 300 karakter)
 * @property {string} color — Arka plan rengi (hex, örn: '#e8b840')
 */

/**
 * @typedef {Object} TypoSettings
 * @property {'inter'|'lora'|'mono'|'system'} font   — Seçili font ailesi anahtarı (FONT_MAP ile eşleşir)
 * @property {number} size   — Font boyutu (px); aralık 13–22
 * @property {number} line   — Satır yüksekliği ×10 (örn: 19 → 1.9); aralık 14–22
 * @property {number} letter — Harf aralığı (px); aralık -2 – 10
 * @property {number} width  — İçerik genişliği (px); aralık 400–900, adım 20
 */

const state = {
  // ── Kalıcı veriler (localStorage'a yazılır) ─────────────────────────────
  feeds:       [],
  articles:    [],
  notes:       {},
  highlights:  {},
  readHistory: {},

  // ── Oturum bazlı navigasyon durumu ──────────────────────────────────────
  activeFilter: 'all',
  activeFeedId: 'home',
  activeTag:    '',
  searchQuery:  '',
  daysFilter:   7,

  // ── Görünüm tercihleri ───────────────────────────────────────────────────
  layout:      'list',
  loading:     false,
  activeColor: '#e8b840',

  // ── Tipografi (kalıcı) ───────────────────────────────────────────────────
  typo: {
    font:   'inter',
    size:   16,
    line:   19,
    letter: 0,
    width:  640,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. YARDIMCI FONKSİYONLAR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rastgele 7 karakterlik alfanümerik ID üretir.
 * Feed ve makale tanımlayıcıları için kullanılır.
 *
 * @returns {string} Örn: 'k3f9x2a'
 */
const uid = () => Math.random().toString(36).slice(2, 9);

/**
 * `document.querySelector` için kısa yol.
 * İkinci parametre verilirse arama o kök elemandan başlar.
 *
 * @param {string}             sel — CSS seçici
 * @param {Element|Document}  [ctx=document] — Arama bağlamı
 * @returns {Element|null}
 *
 * @example
 * qs('.modal-title')                    // document içinde ara
 * qs('.modal-title', modalBackdrop)     // belirli eleman içinde ara
 */
const qs = (sel, ctx) => (ctx || document).querySelector(sel);

/**
 * `document.querySelectorAll` için kısa yol; gerçek Array döner (NodeList değil).
 * forEach, map, filter gibi dizi metodları doğrudan kullanılabilir.
 *
 * @param {string}            sel — CSS seçici
 * @param {Element|Document} [ctx=document] — Arama bağlamı
 * @returns {Element[]}
 *
 * @example
 * qsa('.feed-item').forEach(el => el.classList.remove('active'));
 * qsa('.hl-btn', notesPane).forEach(btn => btn.classList.remove('active'));
 */
const qsa = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
