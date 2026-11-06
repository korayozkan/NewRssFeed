/**
 * HomeScreen — Anasayfa
 *
 * Performans optimizasyonları (RN docs'a göre):
 * - FlatList: windowSize=5, maxToRenderPerBatch=5, initialNumToRender=4
 * - getItemLayout: sabit kart yüksekliği → async layout hesabı yok
 * - removeClippedSubviews: viewport dışı view'lar native hierarchy'den çıkar
 * - keyExtractor: article.id (sabit, string)
 * - renderItem: useCallback ile sarılı — her render'da yeni fonksiyon oluşmaz
 * - FeedCard: React.memo — sadece read/starred değişince re-render
 * - expo-image: disk+memory cache, recyclingKey ile tekrar kullan
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RefreshCcw, Plus, X, Rss } from 'lucide-react-native';

import { useApp } from '../lib/store/AppContext';
import { Article, Feed } from '../lib/types';
import { FeedCard, CARD_HEIGHT } from '../components/FeedCard';
import { uid } from '../lib/utils';
import { fetchFeedFromWorker, convertToRssUrl } from '../lib/feed';

// ── CF Worker URL — env'den oku (EXPO_PUBLIC_CF_WORKER_URL) ────────────────
const CF_WORKER_URL = process.env.EXPO_PUBLIC_CF_WORKER_URL ?? '';

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
  input:     '#111111',
};

// ── getItemLayout sabiti ────────────────────────────────────────────────────
// CARD_HEIGHT + marginBottom(10) + borderWidth(1) top + bottom
const ITEM_HEIGHT = CARD_HEIGHT + 10;

function getItemLayout(_: ArrayLike<Article> | null | undefined, index: number) {
  return { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index };
}

// ── Boş liste bileşeni ─────────────────────────────────────────────────────
function EmptyFeed({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <Rss size={48} color={C.textMuted} strokeWidth={1.5} />
      <Text style={{ color: C.text, fontSize: 18, fontWeight: '700', marginTop: 16 }}>
        Henüz kaynak yok
      </Text>
      <Text style={{
        color: C.textMuted, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20,
      }}>
        RSS veya Atom feed URL'si yapıştır.{'\n'}YouTube, Reddit, GitHub da desteklenir.
      </Text>
      <Pressable
        onPress={onAdd}
        style={({ pressed }) => ({
          marginTop: 24,
          backgroundColor: C.accent,
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 99,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
          + Kaynak Ekle
        </Text>
      </Pressable>
    </View>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────
function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View style={{
      position: 'absolute',
      bottom: 80, left: 20, right: 20,
      backgroundColor: '#222',
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border2,
    }}>
      <Text style={{ color: C.text, fontSize: 13 }}>{message}</Text>
    </View>
  );
}

// ── Ana ekran ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { state, dispatch, homeFeed } = useApp();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = screenWidth - 24; // 12px margin her iki yan

  const [refreshing, setRefreshing]   = useState(false);
  const [addVisible, setAddVisible]   = useState(false);
  const [urlInput, setUrlInput]       = useState('');
  const [adding, setAdding]           = useState(false);
  const [toast, setToast]             = useState('');
  const toastTimer                    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Toast yardımcısı ────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  }, []);

  // ── Pull-to-refresh ─────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    if (state.feeds.length === 0) return;
    setRefreshing(true);
    dispatch({ type: 'SET_LOADING', payload: true });

    const CF = CF_WORKER_URL;
    if (!CF) {
      showToast('CF Worker URL eksik — .env.local kontrol et');
      dispatch({ type: 'SET_LOADING', payload: false });
      setRefreshing(false);
      return;
    }

    try {
      const results = await Promise.allSettled(
        state.feeds.map((f) => fetchFeedFromWorker(f, CF))
      );
      results.forEach((res, i) => {
        if (res.status === 'fulfilled') {
          dispatch({ type: 'ADD_ARTICLES', articles: res.value });
        } else {
          showToast(`"${state.feeds[i].name}" yüklenemedi`);
        }
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      setRefreshing(false);
    }
  }, [state.feeds, dispatch, showToast]);

  // ── Karta tıklama ───────────────────────────────────────────────────────
  const handleCardPress = useCallback((id: string) => {
    dispatch({ type: 'MARK_READ', articleId: id });
    // TODO: makale modal navigation
    showToast('Makale açılıyor…');
  }, [dispatch, showToast]);

  // ── Yıldız ─────────────────────────────────────────────────────────────
  const handleStar = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_STAR', articleId: id });
  }, [dispatch]);

  // ── renderItem — useCallback ile sabit referans ─────────────────────────
  const renderItem = useCallback(({ item }: { item: Article }) => (
    <FeedCard
      article={item}
      onPress={handleCardPress}
      onStar={handleStar}
      cardWidth={cardWidth}
    />
  ), [handleCardPress, handleStar, cardWidth]);

  // ── Feed ekleme ─────────────────────────────────────────────────────────
  const handleAddFeed = useCallback(async () => {
    let url = urlInput.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    try { new URL(url); } catch {
      showToast('Geçersiz URL');
      return;
    }

    if (state.feeds.some((f) => f.url === url)) {
      showToast('Bu kaynak zaten mevcut');
      return;
    }

    // YouTube/Reddit/GitHub/Medium URL'lerini RSS URL'e çevir
    url = convertToRssUrl(url);

    const CF = CF_WORKER_URL;
    if (!CF) {
      showToast('CF Worker URL eksik — .env.local kontrol et');
      setAddVisible(false);
      return;
    }

    const feed: Feed = { id: uid(), name: new URL(url).hostname, url, favicon: null };
    setAdding(true);

    try {
      const articles = await fetchFeedFromWorker(feed, CF);
      dispatch({ type: 'ADD_FEED', feed, articles });
      showToast(`"${feed.name}" eklendi`);
      setUrlInput('');
      setAddVisible(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      showToast(`Yüklenemedi: ${msg}`);
    } finally {
      setAdding(false);
    }
  }, [urlInput, state.feeds, dispatch, showToast]);

  // ── Header bileşeni ─────────────────────────────────────────────────────
  const ListHeader = useCallback(() => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 20, fontWeight: '700' }}>
          Anasayfa
        </Text>
        <Text style={{ color: C.accent, fontSize: 11, fontWeight: '600', marginTop: 1 }}>
          ✨ Senin İçin Önerilenler
        </Text>
      </View>

      {/* Yenile */}
      <Pressable
        onPress={onRefresh}
        hitSlop={8}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 6 })}
        accessibilityLabel="Yenile"
      >
        <RefreshCcw size={20} color={C.textMuted} strokeWidth={2} />
      </Pressable>

      {/* Kaynak ekle */}
      <Pressable
        onPress={() => setAddVisible(true)}
        hitSlop={8}
        style={({ pressed }) => ({
          opacity: pressed ? 0.6 : 1,
          padding: 6,
          marginLeft: 4,
          backgroundColor: C.accent,
          borderRadius: 8,
        })}
        accessibilityLabel="Kaynak ekle"
      >
        <Plus size={20} color="#fff" strokeWidth={2.5} />
      </Pressable>
    </View>
  ), [onRefresh]);

  // ── Loading overlay ─────────────────────────────────────────────────────
  if (state.loading && homeFeed.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <ListHeader />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <FlatList
        data={homeFeed}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        getItemLayout={getItemLayout}

        // ── Performans ayarları (RN docs'a göre) ──
        windowSize={5}              // 2 viewport yukarı + aşağı
        maxToRenderPerBatch={5}     // her batch'te 5 kart
        updateCellsBatchingPeriod={60}
        initialNumToRender={4}      // ilk ekranı dolduracak kadar
        removeClippedSubviews={Platform.OS === 'android'}

        // ── İçerik ──
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={<EmptyFeed onAdd={() => setAddVisible(true)} />}
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: 20,
          flexGrow: 1,   // EmptyFeed merkeze yerleşsin
        }}

        // ── Pull-to-refresh ──
        refreshing={refreshing}
        onRefresh={onRefresh}

        // ── Klavye ──
        keyboardShouldPersistTaps="handled"
      />

      {/* ── Feed ekleme modal ── */}
      <Modal
        visible={addVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={() => { Keyboard.dismiss(); setAddVisible(false); }}
          />
          <View style={{
            backgroundColor: C.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderTopWidth: 1,
            borderColor: C.border,
            padding: 20,
            paddingBottom: Platform.OS === 'ios' ? 36 : 20,
            gap: 12,
          }}>
            {/* Modal başlık */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: C.text, fontSize: 17, fontWeight: '700', flex: 1 }}>
                Kaynak Ekle
              </Text>
              <Pressable
                onPress={() => setAddVisible(false)}
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <X size={20} color={C.textMuted} strokeWidth={2} />
              </Pressable>
            </View>

            {/* URL input */}
            <TextInput
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder="https://example.com/feed  veya  youtube.com/@kanal"
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={handleAddFeed}
              style={{
                backgroundColor: C.input,
                borderWidth: 1,
                borderColor: C.border2,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: C.text,
                fontSize: 14,
              }}
            />

            {/* Ekle butonu */}
            <Pressable
              onPress={handleAddFeed}
              disabled={adding || !urlInput.trim()}
              style={({ pressed }) => ({
                backgroundColor: C.accent,
                borderRadius: 10,
                paddingVertical: 13,
                alignItems: 'center',
                opacity: pressed || adding || !urlInput.trim() ? 0.6 : 1,
              })}
            >
              {adding ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                  Ekle
                </Text>
              )}
            </Pressable>

            {/* İpucu */}
            <Text style={{ color: C.textMuted, fontSize: 12, textAlign: 'center' }}>
              RSS, Atom, YouTube kanalı, Reddit, GitHub releases desteklenir
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Toast */}
      <Toast message={toast} />
    </SafeAreaView>
  );
}
