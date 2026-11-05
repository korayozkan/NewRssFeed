'use strict';

/**
 * @fileoverview supabase.js — Supabase JS client başlatma ve auth işlemleri.
 *
 * Supabase JS SDK CDN UMD script tag ile yüklenir:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 * Bu script, window.supabase nesnesini (createClient fonksiyonunu) global olarak tanımlar.
 *
 * Bağımlılıklar: config.js (SUPABASE_URL, SUPABASE_ANON_KEY)
 */

/** @type {import('@supabase/supabase-js').SupabaseClient|null} */
var _supabaseClient = null;

/**
 * Supabase client'ı başlatır ve global _supabaseClient değişkenine atar.
 * Daha önce başlatılmışsa mevcut client'ı döndürür.
 *
 * SUPABASE_URL veya SUPABASE_ANON_KEY boşsa client oluşturulmaz
 * ve uygulama localStorage fallback ile çalışmaya devam eder.
 *
 * @returns {object|null} Supabase client veya null
 */
function initSupabase() {
  if (_supabaseClient) return _supabaseClient;
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.info('[supabase] URL veya anon key tanımlı değil — auth devre dışı');
      return null;
    }
    if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
      console.warn('[supabase] SDK yüklenmedi');
      return null;
    }
    _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Auth durum değişikliğini dinle
    _supabaseClient.auth.onAuthStateChange(function(event, session) {
      if (event === 'SIGNED_OUT' || !session) {
        // Kullanıcı çıkış yaptıysa ve şu an index sayfasındaysa login'e yönlendir
        var path = window.location.pathname;
        if (!path.endsWith('login.html') && !path.endsWith('register.html')) {
          window.location.href = 'login.html';
        }
      }
    });

    return _supabaseClient;
  } catch (err) {
    console.error('[supabase] initSupabase hatası:', err);
    return null;
  }
}

/**
 * Mevcut Supabase client'ını döndürür.
 * initSupabase() çağrılmadan önce kullanılırsa null döner.
 *
 * @returns {object|null}
 */
function getSupabaseClient() {
  return _supabaseClient;
}

/**
 * Mevcut oturumu döndürür.
 *
 * @returns {Promise<{data: {session: object|null}, error: object|null}>}
 */
async function getSession() {
  try {
    if (!_supabaseClient) return { data: { session: null }, error: null };
    return await _supabaseClient.auth.getSession();
  } catch (err) {
    console.error('[supabase] getSession hatası:', err);
    return { data: { session: null }, error: err };
  }
}

/**
 * Kullanıcıyı oturumdan çıkarır.
 *
 * @returns {Promise<void>}
 */
async function signOut() {
  try {
    if (!_supabaseClient) return;
    await _supabaseClient.auth.signOut();
  } catch (err) {
    console.error('[supabase] signOut hatası:', err);
  }
}
