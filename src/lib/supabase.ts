/**
 * Supabase client
 *
 * Expo docs pattern:
 * https://docs.expo.dev/guides/using-supabase/
 *
 * Key'ler .env.local dosyasından okunur:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *
 * expo-sqlite/localStorage → session'ı cihazda kalıcı tutar.
 * AppState bağlantısı → uygulama arka plana geçince token yenilemeyi durdurur.
 */

import 'expo-sqlite/localStorage/install';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl       = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabasePublicKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

if (!supabaseUrl || !supabasePublicKey) {
  if (__DEV__) {
    console.warn(
      '[Supabase] .env.local eksik veya boş.\n' +
      'EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ekle.'
    );
  }
  if (!__DEV__) {
    throw new Error('Supabase credentials missing in .env.local');
  }
}

// ── Singleton pattern — HMR sırasında client'ı yeniden oluşturma ──────────
// HMR modülü re-evaluate edince createClient tekrar çağrılır,
// bu da "Multiple GoTrueClient instances" uyarısına ve session conflict'ine yol açar.
// Global'de saklayıp tekrar kullanırız.
const globalAny = globalThis as unknown as { __supabaseClient?: SupabaseClient };

export const supabase: SupabaseClient =
  globalAny.__supabaseClient ??
  createClient(supabaseUrl, supabasePublicKey, {
    auth: {
      storage:            localStorage,
      autoRefreshToken:   true,
      persistSession:     true,
      // Web: URL hash'ten session'ı otomatik yakalar (email doğrulama)
      // Mobile: URL-based detection çalışmaz, deep link handler manuel yakalar
      detectSessionInUrl: Platform.OS === 'web',
    },
  });

// HMR sırasında global'de sakla
if (!globalAny.__supabaseClient) {
  globalAny.__supabaseClient = supabase;
}

// Docs önerisi: uygulama arka plandayken token yenilemeyi durdur
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
