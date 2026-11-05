'use strict';

/**
 * @fileoverview db.js — Supabase veritabanı CRUD işlemleri.
 *
 * Her fonksiyon try/catch ile sarılıdır; Supabase erişilemezse
 * sessizce hata loglar ve uygulamanın localStorage fallback ile
 * çalışmaya devam etmesini sağlar.
 *
 * Tablo şeması: supabase/schema.sql
 * Bağımlılıklar: supabase.js (getSupabaseClient)
 */

// ─────────────────────────────────────────────────────────────────────────────
// FEEDS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kullanıcının feed listesini Supabase feeds tablosuna upsert eder.
 * Mevcut kayıtlar güncellenir; yeni kayıtlar eklenir.
 *
 * @param {string} userId
 * @param {Array<{id: string, name: string, url: string, favicon: string|null}>} feeds
 * @returns {Promise<void>}
 */
async function syncFeedsToSupabase(userId, feeds) {
  try {
    var client = getSupabaseClient();
    if (!client || !userId || !feeds) return;
    var rows = feeds.map(function(f) {
      return {
        id:      f.id,
        user_id: userId,
        name:    f.name,
        url:     f.url,
        favicon: f.favicon || null,
      };
    });
    var result = await client.from('feeds').upsert(rows, { onConflict: 'id,user_id' });
    if (result.error) console.error('[db] syncFeedsToSupabase hatası:', result.error);
  } catch (err) {
    console.error('[db] syncFeedsToSupabase exception:', err);
  }
}

/**
 * Supabase'deki feeds tablosundan kullanıcının feed listesini çeker.
 *
 * @param {string} userId
 * @returns {Promise<Array|null>} Feed dizisi veya hata durumunda null
 */
async function loadFeedsFromSupabase(userId) {
  try {
    var client = getSupabaseClient();
    if (!client || !userId) return null;
    var result = await client.from('feeds').select('*').eq('user_id', userId);
    if (result.error) { console.error('[db] loadFeedsFromSupabase hatası:', result.error); return null; }
    return result.data || [];
  } catch (err) {
    console.error('[db] loadFeedsFromSupabase exception:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kullanıcının notlarını Supabase notes tablosuna upsert eder.
 *
 * @param {string} userId
 * @param {Object.<string, string>} notes — { articleId: noteContent }
 * @returns {Promise<void>}
 */
async function syncNotesToSupabase(userId, notes) {
  try {
    var client = getSupabaseClient();
    if (!client || !userId || !notes) return;
    var rows = Object.keys(notes).map(function(articleId) {
      return {
        article_id: articleId,
        user_id:    userId,
        content:    notes[articleId],
        updated_at: new Date().toISOString(),
      };
    });
    if (rows.length === 0) return;
    var result = await client.from('notes').upsert(rows, { onConflict: 'article_id,user_id' });
    if (result.error) console.error('[db] syncNotesToSupabase hatası:', result.error);
  } catch (err) {
    console.error('[db] syncNotesToSupabase exception:', err);
  }
}

/**
 * Supabase'deki notes tablosundan kullanıcının notlarını çeker.
 *
 * @param {string} userId
 * @returns {Promise<Object.<string, string>|null>}
 */
async function loadNotesFromSupabase(userId) {
  try {
    var client = getSupabaseClient();
    if (!client || !userId) return null;
    var result = await client.from('notes').select('*').eq('user_id', userId);
    if (result.error) { console.error('[db] loadNotesFromSupabase hatası:', result.error); return null; }
    var notesMap = {};
    (result.data || []).forEach(function(row) { notesMap[row.article_id] = row.content; });
    return notesMap;
  } catch (err) {
    console.error('[db] loadNotesFromSupabase exception:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HIGHLIGHTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kullanıcının vurgularını Supabase highlights tablosuna upsert eder.
 *
 * @param {string} userId
 * @param {Object.<string, Array>} highlights — { articleId: highlightArray }
 * @returns {Promise<void>}
 */
async function syncHighlightsToSupabase(userId, highlights) {
  try {
    var client = getSupabaseClient();
    if (!client || !userId || !highlights) return;
    var rows = Object.keys(highlights).map(function(articleId) {
      return {
        article_id: articleId,
        user_id:    userId,
        data:       highlights[articleId],
        updated_at: new Date().toISOString(),
      };
    });
    if (rows.length === 0) return;
    var result = await client.from('highlights').upsert(rows, { onConflict: 'article_id,user_id' });
    if (result.error) console.error('[db] syncHighlightsToSupabase hatası:', result.error);
  } catch (err) {
    console.error('[db] syncHighlightsToSupabase exception:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// READ HISTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kullanıcının okuma geçmişini Supabase read_history tablosuna upsert eder.
 *
 * @param {string} userId
 * @param {Object.<string, number>} readHistory — { articleId: timestamp }
 * @returns {Promise<void>}
 */
async function syncReadHistoryToSupabase(userId, readHistory) {
  try {
    var client = getSupabaseClient();
    if (!client || !userId || !readHistory) return;
    var rows = Object.keys(readHistory).map(function(articleId) {
      return {
        article_id: articleId,
        user_id:    userId,
        read_at:    readHistory[articleId],
      };
    });
    if (rows.length === 0) return;
    var result = await client.from('read_history').upsert(rows, { onConflict: 'article_id,user_id' });
    if (result.error) console.error('[db] syncReadHistoryToSupabase hatası:', result.error);
  } catch (err) {
    console.error('[db] syncReadHistoryToSupabase exception:', err);
  }
}
