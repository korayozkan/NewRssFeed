/**
 * RegisterScreen
 * - İsim + email + şifre ile kayıt
 * - Kayıt sonrası e-posta doğrulama mesajı
 * - Google / GitHub ile hızlı kayıt
 * - Login'e geri dön
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
import { Rss, Mail, Lock, User, CheckCircle } from 'lucide-react-native';
import GitHubIcon from '../components/GitHubIcon';

import { signUpWithEmail, signInWithOAuth } from '../lib/auth';

const C = {
  bg:        '#0a0a0a',
  surface:   '#111111',
  border:    '#1a1a1a',
  border2:   '#2a2a2a',
  text:      '#dddddd',
  textMuted: '#666666',
  accent:    '#5b9cf6',
  success:   '#22c55e',
  google:    '#4285F4',
  github:    '#333333',
};

interface Props {
  onGoLogin: () => void;
}

export default function RegisterScreen({ onGoLogin }: Props) {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState<null | 'email' | 'google' | 'github'>(null);
  const [done,     setDone]     = useState(false);   // email doğrulama bekleniyor

  async function handleRegister() {
    if (!email.trim() || !password) {
      Alert.alert('Hata', 'E-posta ve şifre gerekli.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalı.');
      return;
    }
    setLoading('email');
    try {
      const result = await signUpWithEmail(email.trim(), password, name.trim() || undefined);

      if (result.needsEmailConfirm) {
        // Email doğrulama açık — doğrulama ekranı göster
        setDone(true);
      }
      // Email doğrulama kapalı → session döndü → AuthContext otomatik yakalar
      // RootNavigator re-render olur, anasayfa açılır — burada bir şey yapmaya gerek yok
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'Kayıt başarısız';
      if (__DEV__) console.warn('[Register] error:', raw);
      const msg = raw.includes('already registered')
        ? 'Bu e-posta zaten kayıtlı'
        : raw.includes('rate limit')
        ? 'Çok fazla deneme — sonra tekrar dene'
        : 'Kayıt oluşturulamadı';
      Alert.alert('Kayıt hatası', msg);
    } finally {
      setLoading(null);
    }
  }

  async function handleOAuth(provider: 'google' | 'github') {
    setLoading(provider);
    try {
      await signInWithOAuth(provider);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : 'OAuth başarısız';
      const msg = raw.includes('rate limit')
        ? 'Çok fazla deneme — sonra tekrar dene'
        : 'Kayıt yapılamadı';
      Alert.alert('Hata', msg);
    } finally {
      setLoading(null);
    }
  }

  const busy = loading !== null;

  // ── E-posta doğrulama bekleniyor ──────────────────────────────────────────
  if (done) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <CheckCircle size={56} color={C.success} strokeWidth={1.5} />
          <Text style={{ color: C.text, fontSize: 22, fontWeight: '800', marginTop: 20 }}>
            Neredeyse tamam!
          </Text>
          <Text style={{
            color: C.textMuted, fontSize: 14, textAlign: 'center',
            marginTop: 10, lineHeight: 22,
          }}>
            <Text style={{ color: C.accent }}>{email}</Text> adresine doğrulama e-postası gönderdik.{'\n'}
            Gelen kutunu kontrol et ve linke tıkla.
          </Text>
          <Pressable
            onPress={onGoLogin}
            style={({ pressed }) => ({
              marginTop: 32, paddingHorizontal: 28, paddingVertical: 12,
              borderRadius: 12, backgroundColor: C.accent,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
              Giriş ekranına dön
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

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
          <View style={{ alignItems: 'center', marginBottom: 36 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 18,
              backgroundColor: C.accent + '22',
              alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <Rss size={32} color={C.accent} strokeWidth={2} />
            </View>
            <Text style={{ color: C.text, fontSize: 26, fontWeight: '800' }}>Hesap Oluştur</Text>
            <Text style={{ color: C.textMuted, fontSize: 14, marginTop: 6 }}>
              Ücretsiz katıl, RSS dünyasına gir
            </Text>
          </View>

          {/* Google */}
          <Pressable
            onPress={() => handleOAuth('google')}
            disabled={busy}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 10, paddingVertical: 13, borderRadius: 12,
              backgroundColor: C.google,
              opacity: pressed || busy ? 0.7 : 1, marginBottom: 10,
            })}
          >
            {loading === 'google' ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>G</Text>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Google ile kayıt ol</Text>
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
              opacity: pressed || busy ? 0.7 : 1, marginBottom: 24,
            })}
          >
            {loading === 'github' ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <GitHubIcon size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>GitHub ile kayıt ol</Text>
              </>
            )}
          </Pressable>

          {/* Ayırıcı */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 10 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
            <Text style={{ color: C.textMuted, fontSize: 12 }}>veya e-posta ile</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
          </View>

          {/* İsim */}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>İSİM (opsiyonel)</Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
              borderRadius: 10, paddingHorizontal: 12,
            }}>
              <User size={16} color={C.textMuted} strokeWidth={2} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Adın Soyadın"
                placeholderTextColor={C.textMuted}
                editable={!busy}
                style={{ flex: 1, color: C.text, fontSize: 14, paddingVertical: 13, marginLeft: 8 }}
              />
            </View>
          </View>

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
          <View style={{ marginBottom: 28 }}>
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
                placeholder="En az 6 karakter"
                placeholderTextColor={C.textMuted}
                secureTextEntry
                editable={!busy}
                returnKeyType="go"
                onSubmitEditing={handleRegister}
                style={{ flex: 1, color: C.text, fontSize: 14, paddingVertical: 13, marginLeft: 8 }}
              />
            </View>
          </View>

          {/* Kayıt butonu */}
          <Pressable
            onPress={handleRegister}
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
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Kayıt Ol</Text>
            )}
          </Pressable>

          {/* Login linki */}
          <Pressable onPress={onGoLogin} disabled={busy} style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={{ color: C.textMuted, fontSize: 14 }}>
              Hesabın var mı?{' '}
              <Text style={{ color: C.accent, fontWeight: '600' }}>Giriş yap</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
