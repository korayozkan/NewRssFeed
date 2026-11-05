'use strict';

/**
 * @fileoverview storage.js — localStorage kalıcılığı, feed önbelleği ve Supabase sync.
 *
 * saveState() her zaman localStorage'a yazar; kullanıcı oturum açıksa
 * Supabase'e arka planda (fire-and-forget) sync eder.
 *
 * loadState() önce localStorage'dan yükler, ardından Supabase'den veriyi
 * çekip birleştirir (Supabase öncelikli).
 *
 * Bağımlılıklar: state.js, config.js, supabase.js, db.js
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. UYGULAMA DURUMU KAYDETME / YÜKLEME
// ─────────────────────────────────────────────────────────────────────────────

function saveState() {
  try {
    localStorage.setItem('rss_feeds',       JSON.stringify(state.feeds));
    localStorage.setItem('rss_articles',    JSON.stringify(state.articles));
    localStorage.setItem('rss_layout',      state.layout);
    localStorage.setItem('rss_notes',       JSON.stringify(state.notes));
    localStorage.setItem('rss_highlights',  JSON.stringify(state.highlights));
    localStorage.setItem('rss_readHistory', JSON.stringify(state.readHistory));
    localStorage.setItem('rss_typo',        JSON.stringify(state.typo));
    localStorage.setItem('rss_daysFilter',  String(state.daysFilter));
    localStorage.setItem('rss_settings',    JSON.stringify(state.settings));
  } catch (_) {}

  // Supabase sync — fire-and-forget; hata uygulamayı durdurmaz
  if (state.user && state.user.id) {
    var uid = state.user.id;
    syncFeedsToSupabase(uid, state.feeds);
    syncNotesToSupabase(uid, state.notes);
    syncHighlightsToSupabase(uid, state.highlights);
    syncReadHistoryToSupabase(uid, state.readHistory);
  }
}

function loadState() {
  try {
    var feeds       = localStorage.getItem('rss_feeds');
    var articles    = localStorage.getItem('rss_articles');
    var layout      = localStorage.getItem('rss_layout');
    var notes       = localStorage.getItem('rss_notes');
    var highlights  = localStorage.getItem('rss_highlights');
    var readHistory = localStorage.getItem('rss_readHistory');
    var typo        = localStorage.getItem('rss_typo');
    var days        = localStorage.getItem('rss_daysFilter');

    if (feeds)       state.feeds       = JSON.parse(feeds);
    if (articles)    state.articles    = JSON.parse(articles);
    if (layout)      state.layout      = layout;
    if (notes)       state.notes       = JSON.parse(notes);
    if (highlights)  state.highlights  = JSON.parse(highlights);
    if (readHistory) state.readHistory = JSON.parse(readHistory);
    if (typo)        state.typo        = Object.assign({}, state.typo, JSON.parse(typo));
    if (days)        state.daysFilter  = Number(days);

    var settings = localStorage.getItem('rss_settings');
    if (settings) state.settings = Object.assign({}, state.settings, JSON.parse(settings));
  } catch (_) {}
}

/**
 * Supabase'den kullanıcı verilerini çekip state ile birleştirir.
 * Supabase'deki veri önceliklidir; localStorage'daki veriler fallback olarak kalır.
 * main.js → init() içinde oturum doğrulandıktan sonra çağrılır.
 *
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function loadStateFromSupabase(userId) {
  try {
    var remoteFeeds = await loadFeedsFromSupabase(userId);
    if (remoteFeeds && remoteFeeds.length > 0) {
      // Supabase'deki feedleri localStorage verileriyle birleştir (Supabase öncelikli)
      var mergedFeeds = remoteFeeds.slice();
      state.feeds.forEach(function(lf) {
        if (!mergedFeeds.find(function(rf) { return rf.id === lf.id; })) {
          mergedFeeds.push(lf);
        }
      });
      state.feeds = mergedFeeds;
    }
  } catch (err) {
    console.error('[storage] loadStateFromSupabase hatası:', err);
  }

  try {
    var remoteNotes = await loadNotesFromSupabase(userId);
    if (remoteNotes) {
      state.notes = Object.assign({}, state.notes, remoteNotes);
    }
  } catch (err) {
    console.error('[storage] loadNotesFromSupabase hatası:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. FEED YANIT ÖNBELLEĞİ
// ─────────────────────────────────────────────────────────────────────────────

function getCachedFeed(feedUrl) {
  try {
    var key = 'rss_fc_' + btoa(feedUrl).slice(0, 40);
    var raw = localStorage.getItem(key);
    if (!raw) return null;
    var obj = JSON.parse(raw);
    if (Date.now() - obj.ts > FEED_CACHE_TTL) return null;
    return obj.data;
  } catch (_) {
    return null;
  }
}

function setCachedFeed(feedUrl, data) {
  try {
    var key = 'rss_fc_' + btoa(feedUrl).slice(0, 40);
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: data }));
  } catch (_) {}
}

function clearFeedCache() {
  try {
    Object.keys(localStorage).forEach(function(k) {
      if (k.startsWith('rss_fc_')) localStorage.removeItem(k);
    });
  } catch (_) {}
}
