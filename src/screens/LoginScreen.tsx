/**
 * LoginScreen
 * - Email + şifre girişi
 * - Google OAuth
 * - GitHub OAuth
 * - Register'a geçiş linki
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Rss, Mail, Lock } from 'lucide-react-native';
import GitHubIcon from '../components/GitHubIcon';

import { signInWithEmail, signInWithOAuth, resendConfirmationEmail } from '../lib/auth';

// ── Renkler ────────────────────────────────────────────────────────────────
const C = {
  bg:        '#0a0a0a',
  surface:   '#111111',
  border:    '#1a1a1a',
  border2:   '#2a2a2a',
  text:      '#dddddd',
  textMuted: '#666666',
  accent:    '#5b9cf6',
  danger:    '#e84444',
  google:    '#4285F4',
  github:    '#333333',
};

interface Props {
  onGoRegister: () => void;
}

export default function LoginScreen({ onGoRegister }: Props) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState<null | 'email' | 'google' | 'github'>(null);

  // ── Email login ──────────────────────────────────────────────────────────
  async function handleEmailLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Hata', 'E-posta ve şifre gerekli.');
      return;
    }
    setLoading('email');
    try {
      await signInWithEmail(email.trim(), password);
      // AuthContext session'ı yakalayacak, App.tsx render değişecek
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'Giriş başarısız';
      if (__DEV__) console.warn('[Login] email error:', raw);
      const msg = raw.includes('Invalid login')
        ? 'E-posta veya şifre hatalı'
        : raw.includes('Email not confirmed')
        ? 'E-posta doğrulanmamış — gelen kutunu kontrol et'
        : raw.includes('rate limit')
        ? 'Çok fazla deneme — sonra tekrar dene'
        : 'Giriş yapılamadı';
      Alert.alert('Giriş hatası', msg, [
        { text: 'Tamam' },
        // Email doğrulanmamışsa "Tekrar gönder" seçeneği göster
        ...(raw.includes('Email not confirmed') ? [{
          text: 'Doğrulama e-postası tekrar gönder',
          onPress: () => {
            resendConfirmationEmail(email.trim())
              .then(() => Alert.alert('Gönderildi', 'Doğrulama e-postası tekrar gönderildi.'))
              .catch(() => Alert.alert('Hata', 'E-posta gönderilemedi.'));
          },
        }] : []),
      ]);
    } finally {
      setLoading(null);
    }
  }

  // ── OAuth ────────────────────────────────────────────────────────────────
  async function handleOAuth(provider: 'google' | 'github') {
    setLoading(provider);
    try {
      await signInWithOAuth(provider);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'OAuth başarısız';
      const msg = raw.includes('rate limit')
        ? 'Çok fazla deneme — sonra tekrar dene'
        : 'Giriş yapılamadı';
      Alert.alert('Giriş hatası', msg);
    } finally {
      setLoading(null);
    }
  }

  const busy = loading !== null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo + başlık */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 18,
              backgroundColor: C.accent + '22',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <Rss size={32} color={C.accent} strokeWidth={2} />
            </View>
            <Text style={{ color: C.text, fontSize: 26, fontWeight: '800' }}>
              NewRssFeed
            </Text>
            <Text style={{ color: C.textMuted, fontSize: 14, marginTop: 6 }}>
              Hesabına giriş yap
            </Text>
          </View>

          {/* ── OAuth butonları ── */}
          {/* Google */}
          <Pressable
            onPress={() => handleOAuth('google')}
            disabled={busy}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 10, paddingVertical: 13, borderRadius: 12,
              backgroundColor: C.google,
              opacity: pressed || busy ? 0.7 : 1,
              marginBottom: 10,
            })}
          >
            {loading === 'google' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                {/* Google G harfi SVG yerine Text */}
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>G</Text>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                  Google ile devam et
                </Text>
              </>
            )}
          </Pressable>

          {/* GitHub */}
          <Pressable
            onPress={() => handleOAuth('github')}
            disabled={busy}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 10, paddingVertical: 13, borderRadius: 12,
              backgroundColor: C.github,
              borderWidth: 1, borderColor: C.border2,
              opacity: pressed || busy ? 0.7 : 1,
              marginBottom: 24,
            })}
          >
            {loading === 'github' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <GitHubIcon size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                  GitHub ile devam et
                </Text>
              </>
            )}
          </Pressable>

          {/* Ayırıcı */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 10 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
            <Text style={{ color: C.textMuted, fontSize: 12 }}>veya e-posta ile</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
          </View>

          {/* ── Email / şifre formu ── */}
          {/* Email */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>E-POSTA</Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
              borderRadius: 10, paddingHorizontal: 12,
            }}>
              <Mail size={16} color={C.textMuted} strokeWidth={2} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@mail.com"
                placeholderTextColor={C.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                editable={!busy}
                style={{ flex: 1, color: C.text, fontSize: 14, paddingVertical: 13, marginLeft: 8 }}
              />
            </View>
          </View>

          {/* Şifre */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>ŞİFRE</Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
              borderRadius: 10, paddingHorizontal: 12,
            }}>
              <Lock size={16} color={C.textMuted} strokeWidth={2} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={C.textMuted}
                secureTextEntry
                editable={!busy}
                returnKeyType="go"
                onSubmitEditing={handleEmailLogin}
                style={{ flex: 1, color: C.text, fontSize: 14, paddingVertical: 13, marginLeft: 8 }}
              />
            </View>
          </View>

          {/* Giriş butonu */}
          <Pressable
            onPress={handleEmailLogin}
            disabled={busy}
            style={({ pressed }) => ({
              alignItems: 'center', paddingVertical: 14, borderRadius: 12,
              backgroundColor: C.accent,
              opacity: pressed || busy ? 0.7 : 1,
            })}
          >
            {loading === 'email' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Giriş Yap</Text>
            )}
          </Pressable>

          {/* Register linki */}
          <Pressable onPress={onGoRegister} disabled={busy} style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={{ color: C.textMuted, fontSize: 14 }}>
              Hesabın yok mu?{' '}
              <Text style={{ color: C.accent, fontWeight: '600' }}>Kayıt ol</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
