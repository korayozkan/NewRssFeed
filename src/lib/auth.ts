/**
 * Auth servisi
 *
 * Supabase docs pattern:
 * https://supabase.com/docs/guides/auth/native-mobile-deep-linking?platform=react-native
 *
 * OAuth flow (Google / GitHub):
 *  1. signInWithOAuth → Supabase auth URL al (skipBrowserRedirect: true)
 *  2. WebBrowser.openAuthSessionAsync → sistem browser'da aç
 *  3. Callback URL'den access_token + refresh_token parse et
 *  4. supabase.auth.setSession → oturumu kaydet
 */

import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from './supabase';

// Web'de auth session'ı tamamla (sadece web için gerekli)
WebBrowser.maybeCompleteAuthSession();

// Deep link redirect URI
// Expo Go → exp://192.168.x.x:8081/--/
// Dev build → newrssfeedexpo://
// scheme parametresi VERME — Expo auto-detect yapsın
export const redirectTo = makeRedirectUri();

if (__DEV__) {
  console.log('[Auth] redirectTo =', redirectTo);
  console.log('[Auth] Bu URL\'yi Supabase Dashboard → Auth → URL Configuration → Redirect URLs\'e ekle');
}

// ── URL'den token parametrelerini parse et ────────────────────────────────
// Güvenlik: sadece beklenen redirect scheme'inden gelen URL'leri kabul et
// React Native'de new URL() custom scheme'lerde (exp://, newrssfeedexpo://) 
// sorun çıkarabilir — string tabanlı parse kullanırız
function parseTokensFromUrl(url: string): { access_token?: string; refresh_token?: string; error?: string } {
  try {
    // Scheme doğrulama — beklenen şemadan gelmeli
    const expectedScheme = redirectTo.split('://')[0]; // "exp" veya "newrssfeedexpo"
    const urlScheme = url.split('://')[0];
    if (urlScheme !== expectedScheme) {
      console.warn('[Auth] Beklenmeyen scheme:', urlScheme, '— beklenen:', expectedScheme);
      return {};
    }

    // Tüm parametreleri topla — hem query (? hem fragment (#) içinden
    const params: Record<string, string> = {};
    
    // Query string: ?key=value&key2=value2
    const queryStart = url.indexOf('?');
    if (queryStart !== -1) {
      const queryStr = url.slice(queryStart + 1).split('#')[0]; // fragment'i kes
      for (const pair of queryStr.split('&')) {
        const [k, v] = pair.split('=');
        if (k && v) params[decodeURIComponent(k)] = decodeURIComponent(v);
      }
    }

    // Fragment: #key=value&key2=value2
    // Supabase token'ları genelde fragment olarak gönderir
    const fragStart = url.indexOf('#');
    if (fragStart !== -1) {
      const fragStr = url.slice(fragStart + 1);
      for (const pair of fragStr.split('&')) {
        const [k, v] = pair.split('=');
        if (k && v) params[decodeURIComponent(k)] = decodeURIComponent(v);
      }
    }

    if (params.error) {
      return { error: params.error };
    }

    return {
      access_token:  params.access_token  ?? undefined,
      refresh_token: params.refresh_token ?? undefined,
      error:         params.error         ?? undefined,
    };
  } catch {
    return {};
  }
}

// ── URL'den session oluştur ───────────────────────────────────────────────
export async function createSessionFromUrl(url: string) {
  const { access_token, refresh_token, error } = parseTokensFromUrl(url);
  if (error) throw new Error(error);
  if (!access_token) return null;

  const { data, error: sessionError } = await supabase.auth.setSession({
    access_token,
    refresh_token: refresh_token ?? '',
  });
  if (sessionError) throw sessionError;
  return data.session;
}

// ── OAuth (Google / GitHub) ───────────────────────────────────────────────
export async function signInWithOAuth(provider: 'google' | 'github') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,  // Manuel WebBrowser.openAuthSessionAsync kullanıyoruz
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('OAuth URL alınamadı');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'success') {
    return await createSessionFromUrl(result.url);
  }
  return null;
}

// ── Email / şifre ─────────────────────────────────────────────────────────
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.warn('[Auth] signInWithPassword error:', error.message, '| code:', error.code);
    throw error;
  }
  return data.session;
}

export interface SignUpResult {
  needsEmailConfirm: boolean;
  session: { access_token: string; refresh_token: string } | null;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName ?? email.split('@')[0] },
      emailRedirectTo: redirectTo,
    },
  });
  if (error) throw error;

  // Supabase docs: email doğrulama AÇIKSA → data.session = null
  // Email doğrulama KAPALIYSA → data.session dolu gelir (otomatik giriş)
  return {
    needsEmailConfirm: data.session === null && data.user !== null,
    session: data.session ? { access_token: data.session.access_token, refresh_token: data.session.refresh_token } : null,
  };
}

// ── Doğrulama e-postası yeniden gönder ────────────────────────────────────
export async function resendConfirmationEmail(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}

// ── Çıkış ─────────────────────────────────────────────────────────────────
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
