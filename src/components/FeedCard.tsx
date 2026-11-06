/**
 * FeedCard — Anasayfa gönderi kartı
 *
 * Performans notları (docs'tan):
 * - React.memo: props değişmediğinde re-render yok
 * - expo-image: disk + memory cache, contentFit="cover", geçiş animasyonu
 * - Sabit yükseklik (CARD_HEIGHT) → getItemLayout kullanılabilir
 * - Lucide ikonları: tree-shakable, sadece kullanılan import edilir
 */

import React, { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Star, BookOpen, ExternalLink } from 'lucide-react-native';
import * as Linking from 'expo-linking';

import { Article } from '../lib/types';
import { formatDate } from '../lib/utils';

// ── Renk sabitleri ────────────────────────────────────────────────────────
const C = {
  bg:          '#111111',
  border:      '#1a1a1a',
  text:        '#dddddd',
  textMuted:   '#666666',
  textFaint:   '#444444',
  accent:      '#5b9cf6',
  star:        '#f5a623',
  starInactive:'#444444',
  btnBg:       '#111111',
  tag:         '#1a1a1a',
  tagText:     '#555555',
  avatarBg:    '#1a1a1a',
  heroBg:      '#111111',
};

// ── Sabit yükseklik ───────────────────────────────────────────────────────
// Hero görsel (16:9 ratio) için kart genişliği 375 varsayıldığında ~211px
// Başlık + açıklama + aksiyonlar ~110px → toplam ~390px
// getItemLayout bu sabiti kullanır.
export const CARD_HEIGHT = 390;
export const HERO_ASPECT = 16 / 9;

// ── Bileşen ───────────────────────────────────────────────────────────────
interface FeedCardProps {
  article:     Article;
  onPress:     (id: string) => void;
  onStar:      (id: string) => void;
  cardWidth:   number;  // FlatList'in genişliği — doğru görsel yüksekliği için
}

function FeedCardInner({ article: a, onPress, onStar, cardWidth }: FeedCardProps) {
  const heroHeight = Math.round(cardWidth / HERO_ASPECT);

  const handlePress   = useCallback(() => onPress(a.id), [a.id, onPress]);
  const handleStar    = useCallback(() => onStar(a.id),  [a.id, onStar]);
  const handleOpenUrl = useCallback(() => {
    if (a.url) Linking.openURL(a.url);
  }, [a.url]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.92 : 1,
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        marginHorizontal: 12,
        marginBottom: 10,
        overflow: 'hidden',
      })}
      accessibilityRole="button"
      accessibilityLabel={a.title}
    >
      {/* ── Üst: kaynak + tarih + yıldız ── */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
      }}>
        {/* Favicon */}
        <View style={{
          width: 32, height: 32, borderRadius: 16,
          backgroundColor: C.avatarBg, overflow: 'hidden',
        }}>
          {a.favicon ? (
            <Image
              source={{ uri: a.favicon }}
              style={{ width: 32, height: 32 }}
              contentFit="cover"
              transition={200}
              recyclingKey={a.favicon}
            />
          ) : (
            <View style={{
              width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ color: C.textMuted, fontSize: 13, fontWeight: '600' }}>
                {a.feedName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Kaynak adı + tarih */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{ color: C.text, fontSize: 13, fontWeight: '600' }}
            numberOfLines={1}
          >
            {a.feedName}
          </Text>
          <Text style={{ color: C.textFaint, fontSize: 11, marginTop: 1 }}>
            {formatDate(a.date)}
          </Text>
        </View>

        {/* Yıldız butonu */}
        <Pressable
          onPress={handleStar}
          hitSlop={8}
          accessibilityLabel={a.starred ? 'Yıldızı kaldır' : 'Yıldız ekle'}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
        >
          <Star
            size={18}
            color={a.starred ? C.star : C.starInactive}
            fill={a.starred ? C.star : 'none'}
            strokeWidth={2}
          />
        </Pressable>
      </View>

      {/* ── Hero görsel ── */}
      {a.image ? (
        <Image
          source={{ uri: a.image }}
          style={{ width: '100%', height: heroHeight, backgroundColor: C.heroBg }}
          contentFit="cover"
          transition={300}
          recyclingKey={a.id}
          // Performans: FlatList dışına çıkınca serbest bırak
          allowDownscaling
        />
      ) : (
        <View style={{
          width: '100%',
          height: heroHeight,
          backgroundColor: C.heroBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{ color: C.textFaint, fontSize: 36, fontWeight: '700' }}>
            {a.feedName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      {/* ── Alt: başlık + açıklama + etiketler + aksiyonlar ── */}
      <View style={{ padding: 12, gap: 6 }}>
        {/* Başlık */}
        <Text
          style={{ color: C.text, fontSize: 15, fontWeight: '600', lineHeight: 20 }}
          numberOfLines={2}
        >
          {a.title}
        </Text>

        {/* Açıklama */}
        {!!a.desc && (
          <Text
            style={{ color: C.textMuted, fontSize: 13, lineHeight: 18 }}
            numberOfLines={2}
          >
            {a.desc}
          </Text>
        )}

        {/* Etiketler */}
        {a.tags.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
            {a.tags.slice(0, 3).map((tag) => (
              <View
                key={tag}
                style={{
                  backgroundColor: C.tag,
                  borderRadius: 99,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ color: C.tagText, fontSize: 10 }}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Okunmamış nokta + aksiyonlar */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginTop: 2,
        }}>
          {/* Okunmamış göstergesi */}
          {!a.read && (
            <View style={{
              width: 6, height: 6, borderRadius: 3,
              backgroundColor: C.accent, marginRight: 4,
            }} />
          )}

          {/* Oku butonu */}
          <Pressable
            onPress={handlePress}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: C.btnBg,
              borderWidth: 1,
              borderColor: C.border,
              opacity: pressed ? 0.7 : 1,
            })}
            accessibilityLabel="Makaleyi oku"
          >
            <BookOpen size={13} color={C.textMuted} strokeWidth={2} />
            <Text style={{ color: C.textMuted, fontSize: 12 }}>Oku</Text>
          </Pressable>

          {/* Orijinalde aç */}
          <Pressable
            onPress={handleOpenUrl}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: C.btnBg,
              borderWidth: 1,
              borderColor: C.border,
              opacity: pressed ? 0.7 : 1,
            })}
            accessibilityLabel="Orijinal sayfayı aç"
          >
            <ExternalLink size={13} color={C.textMuted} strokeWidth={2} />
            <Text style={{ color: C.textMuted, fontSize: 12 }}>Aç</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// React.memo — sadece id/read/starred değişince re-render
export const FeedCard = memo(FeedCardInner, (prev, next) => {
  return (
    prev.article.id      === next.article.id      &&
    prev.article.read    === next.article.read     &&
    prev.article.starred === next.article.starred  &&
    prev.cardWidth       === next.cardWidth
  );
});
