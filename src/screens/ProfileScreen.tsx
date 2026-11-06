/**
 * ProfileScreen — Duolingo + Instagram tarzı profil
 *
 * - ScrollView ana scroll (RN docs)
 * - FlatList badge grid (numColumns=3)
 * - Takipçi / Takip sayıları (Instagram style)
 * - Profil düzenleme modal
 * - Veriler: Supabase auth + AppContext + profiles tablosu
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  Flame, LogOut, Award, TrendingUp, Users,
  Pencil, X, Check,
} from 'lucide-react-native';

import { useApp } from '../lib/store/AppContext';
import { useAuth } from '../lib/store/AuthContext';
import { signOut } from '../lib/auth';
import { getProfile, updateProfile, getFollowCounts, getFollowers, getFollowing, Profile } from '../lib/profile';
import {
  BADGE_DEFS, computeLevel, calcXP, calcBestStreak,
  getDailyCounts, getProfileStats, BadgeDef,
} from '../lib/gamification';
import XPRing from '../components/XPRing';

const C = {
  bg: '#0a0a0a', surface: '#0a0a0a', card: '#111111',
  border: '#1a1a1a', border2: '#2a2a2a',
  text: '#dddddd', textMuted: '#666666', textFaint: '#444444',
  accent: '#5b9cf6', accentBg: '#0d1520', accentBd: '#1a2a40',
  streakBg: '#0d1008', streakBd: '#1a2a10',
  input: '#111111',
};
const DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

// ── Badge kart ──
function BadgeCard({ badge, unlocked }: { badge: BadgeDef; unlocked: boolean }) {
  return (
    <View style={{
      alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, gap: 6,
      backgroundColor: unlocked ? C.accentBg : C.bg,
      borderColor: unlocked ? C.accentBd : '#111111',
      opacity: unlocked ? 1 : 0.3,
    }}>
      <Text style={{ fontSize: 28, lineHeight: 30 }}>{badge.icon}</Text>
      <Text style={{ color: C.text, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>{badge.name}</Text>
      <Text style={{ color: C.textFaint, fontSize: 9, textAlign: 'center' }}>{badge.desc}</Text>
      <Text style={{ color: unlocked ? C.accent : C.textFaint, fontSize: 9, fontWeight: '600' }}>+{badge.xp} XP</Text>
    </View>
  );
}

// ── Aktivite hücresi ──
function ActivityCell({ count, date }: { count: number; date: string }) {
  const bg = count === 0 ? '#1a1a1a' : count < 3 ? C.accent + '33' : count < 7 ? C.accent + '80' : C.accent;
  return <View style={{ width: '9.5%', aspectRatio: 1, borderRadius: 3, backgroundColor: bg }} accessibilityLabel={`${date}: ${count} makale`} />;
}


// ── Takip sayı kartı (Instagram style — tıklanabilir) ──
function FollowStat({ count, label, onPress }: { count: number; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center', flex: 1,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>{count}</Text>
      <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>{label}</Text>
    </Pressable>
  );
}

// ── Profil Düzenleme Modal ──
function EditProfileModal({
  visible, onClose, initialName, initialBio, onSave,
}: {
  visible: boolean;
  onClose: () => void;
  initialName: string;
  initialBio: string;
  onSave: (name: string, bio: string) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) { setName(initialName); setBio(initialBio); }
  }, [visible, initialName, initialBio]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(name.trim(), bio.trim());
      onClose();
    } catch (err: unknown) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{
          backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
          borderTopWidth: 1, borderColor: C.border, padding: 20,
          paddingBottom: Platform.OS === 'ios' ? 36 : 20, gap: 16,
        }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '700', flex: 1 }}>Profili Düzenle</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={C.textMuted} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Avatar placeholder */}
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBd,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Pencil size={24} color={C.accent} strokeWidth={2} />
            </View>
            <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 8 }}>Avatar değiştirme yakında</Text>
          </View>

          {/* İsim */}
          <View>
            <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>GÖRÜNEN AD</Text>
            <TextInput
              value={name} onChangeText={setName}
              placeholder="Adın"
              placeholderTextColor={C.textFaint}
              style={{
                backgroundColor: C.input, borderWidth: 1, borderColor: C.border2,
                borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
                color: C.text, fontSize: 14,
              }}
            />
          </View>

          {/* Bio */}
          <View>
            <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>BİYOGRAFİ</Text>
            <TextInput
              value={bio} onChangeText={setBio}
              placeholder="Kendinden bahset..."
              placeholderTextColor={C.textFaint}
              multiline
              maxLength={160}
              style={{
                backgroundColor: C.input, borderWidth: 1, borderColor: C.border2,
                borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
                color: C.text, fontSize: 14, minHeight: 80, textAlignVertical: 'top',
              }}
            />
            <Text style={{ color: C.textFaint, fontSize: 11, textAlign: 'right', marginTop: 4 }}>
              {bio.length}/160
            </Text>
          </View>

          {/* Kaydet */}
          <Pressable
            onPress={handleSave} disabled={saving}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              paddingVertical: 14, borderRadius: 12, backgroundColor: C.accent,
              opacity: pressed || saving ? 0.7 : 1,
            })}
          >
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Check size={18} color="#fff" strokeWidth={2.5} />}
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Kaydet</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Ana ekran ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { state } = useApp();
  const { user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [profileBio, setProfileBio] = useState('');

  // ── Takip listesi modal state ──
  const [followListVisible, setFollowListVisible] = useState(false);
  const [followListType, setFollowListType] = useState<'followers' | 'following'>('followers');
  const [followList, setFollowList] = useState<Profile[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);

  async function openFollowList(type: 'followers' | 'following') {
    if (!user?.id) return;
    setFollowListType(type);
    setFollowListVisible(true);
    setFollowListLoading(true);
    try {
      const list = type === 'followers'
        ? await getFollowers(user.id)
        : await getFollowing(user.id);
      setFollowList(list);
    } catch {
      setFollowList([]);
    } finally {
      setFollowListLoading(false);
    }
  }

  // ── Hesaplamalar ──
  const stats = useMemo(() => getProfileStats(state), [state]);
  const xp = useMemo(() => calcXP(stats), [stats]);
  const levelInfo = useMemo(() => computeLevel(xp), [xp]);
  const bestStreak = useMemo(() => calcBestStreak(state.readHistory), [state.readHistory]);
  const dailyCounts = useMemo(() => getDailyCounts(state.readHistory, 30), [state.readHistory]);

  const displayName = user?.user_metadata?.display_name
    ?? user?.user_metadata?.full_name
    ?? user?.user_metadata?.name
    ?? user?.email?.split('@')[0] ?? 'Kullanıcı';
  const email = user?.email ?? '';
  const avatarUrl = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null;
  const initial = displayName.charAt(0).toUpperCase();

  const unlockedBadges = useMemo(() => BADGE_DEFS.filter(b => b.check(stats)).length, [stats]);

  // ── Supabase'den profil + takip sayıları çek ──
  useEffect(() => {
    if (!user?.id) return;
    getProfile(user.id).then(p => {
      if (p) {
        if (p.display_name) setProfileBio(p.bio ?? '');
      }
    });
    getFollowCounts(user.id).then(setFollowCounts);
  }, [user?.id]);

  // ── Profil kaydet ──
  async function handleProfileSave(name: string, bio: string) {
    if (!user?.id) return;
    await updateProfile(user.id, { display_name: name, bio });
    // Auth metadata'yı da güncelle (anlık UI için)
    // AuthContext'ten gelen user bir sonraki render'da güncellenir
  }

  const renderBadge = useCallback(
    ({ item }: { item: BadgeDef }) => <BadgeCard badge={item} unlocked={item.check(stats)} />,
    [stats]
  );

  async function handleSignOut() {
    setSigningOut(true);
    try { await signOut(); } catch { /* */ } finally { setSigningOut(false); }
  }

  const streakMsg = stats.streak === 0 ? 'Her gün en az 1 makale oku'
    : stats.streak < 3 ? 'Harika başlangıç! Devam et 💪'
    : stats.streak < 7 ? `${stats.streak} gün! Alışkanlık oluşuyor 🎉`
    : stats.streak < 30 ? 'Muhteşem gidiyorsun! 🔥'
    : 'Efsane seviye! 👑';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* ── HEADER ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 20 }}>
          <XPRing pct={levelInfo.pct} size={80}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
            ) : (
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>{initial}</Text>
            )}
          </XPRing>

          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>{displayName}</Text>
            <Text style={{ color: C.textFaint, fontSize: 12 }} numberOfLines={1}>{email}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99,
                backgroundColor: C.accentBg, borderWidth: 1, borderColor: C.accentBd,
              }}>
                <Text style={{ color: C.accent, fontSize: 11, fontWeight: '700' }}>⬡ Seviye {levelInfo.current.level}</Text>
              </View>
              <Text style={{ color: C.textFaint, fontSize: 11 }}>{levelInfo.current.title}</Text>
            </View>
          </View>

          {/* Çıkış */}
          <Pressable onPress={handleSignOut} disabled={signingOut}
            style={({ pressed }) => ({
              padding: 8, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
              opacity: pressed || signingOut ? 0.6 : 1,
            })} accessibilityLabel="Çıkış yap">
            {signingOut ? <ActivityIndicator color={C.textMuted} size="small" /> : <LogOut size={18} color={C.textMuted} strokeWidth={2} />}
          </Pressable>
        </View>

        {/* ── BIO ── */}
        {profileBio ? (
          <Text style={{ color: C.textMuted, fontSize: 13, paddingHorizontal: 20, marginBottom: 16, lineHeight: 18 }}>
            {profileBio}
          </Text>
        ) : null}

        {/* ── TAKİPÇİ / TAKIP (Instagram style — tıklanabilir) ── */}
        <View style={{
          flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, marginBottom: 12,
          backgroundColor: C.card, marginHorizontal: 20, borderRadius: 14, borderWidth: 1, borderColor: C.border,
        }}>
          <FollowStat
            count={followCounts.followers}
            label="Takipçi"
            onPress={() => openFollowList('followers')}
          />
          <View style={{ width: 1, backgroundColor: C.border, marginVertical: 4 }} />
          <FollowStat
            count={followCounts.following}
            label="Takip"
            onPress={() => openFollowList('following')}
          />
        </View>

        {/* ── PROFİLİ DÜZENLE BUTONU ── */}
        <Pressable
          onPress={() => setEditVisible(true)}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginHorizontal: 20, paddingVertical: 11, borderRadius: 12,
            backgroundColor: C.card, borderWidth: 1, borderColor: C.border2,
            opacity: pressed ? 0.7 : 1, marginBottom: 16,
          })}
        >
          <Pencil size={15} color={C.text} strokeWidth={2} />
          <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>Profili Düzenle</Text>
        </Pressable>

        {/* ── XP BAR ── */}
        <View style={{ paddingHorizontal: 20, gap: 6, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: C.textFaint, fontSize: 11 }}>Deneyim Puanı</Text>
            <Text style={{ color: C.textMuted, fontSize: 11, fontWeight: '500' }}>
              {xp} / {levelInfo.next ? levelInfo.next.xpRequired : xp} XP
            </Text>
          </View>
          <View style={{ height: 10, borderRadius: 5, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${levelInfo.pct}%`, backgroundColor: C.accent, borderRadius: 5 }} />
          </View>
          <Text style={{ color: C.textFaint, fontSize: 11 }}>
            Sonraki seviye için <Text style={{ color: C.textMuted }}>{levelInfo.remaining}</Text> XP daha kazan
          </Text>
        </View>

        {/* ── SERİLER ── */}
        <View style={{ paddingHorizontal: 20, gap: 14, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={16} color={C.accent} strokeWidth={2} />
            <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>Seriler ve Aktivite</Text>
          </View>

          {/* Seri kartı */}
          <View style={{ backgroundColor: C.streakBg, borderWidth: 1, borderColor: C.streakBd, borderRadius: 14, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Flame size={32} color={C.accent} strokeWidth={2} />
                <View>
                  <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>Günlük Okuma Serisi</Text>
                  <Text style={{ color: C.textFaint, fontSize: 12 }}>{streakMsg}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: C.accent, fontSize: 40, fontWeight: '900' }}>{stats.streak}</Text>
                <Text style={{ color: C.textFaint, fontSize: 11 }}>gün</Text>
              </View>
            </View>
            {/* 7 günlük dots */}
            <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
              <Text style={{ color: C.textFaint, fontSize: 10, fontWeight: '600', marginBottom: 12 }}>SON 7 GÜN</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {dailyCounts.slice(-7).map((day, i) => {
                  const done = day.count > 0; const isToday = i === 6;
                  return (
                    <View key={i} style={{ alignItems: 'center', gap: 4 }}>
                      <View style={{
                        width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: done ? C.accent : isToday ? C.accentBg : C.card,
                        borderWidth: isToday && !done ? 1 : 0, borderColor: isToday ? C.accentBd : 'transparent',
                        borderStyle: isToday && !done ? 'dashed' : 'solid',
                      }}>
                        {done ? <Text style={{ fontSize: 14 }}>🔥</Text> : <Text style={{ fontSize: 10, fontWeight: '600', color: isToday ? C.accent : C.textFaint }}>{DAYS[new Date(day.date).getDay()]}</Text>}
                      </View>
                      <Text style={{ fontSize: 9, color: C.textFaint }}>{new Date(day.date).getDate()}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.card }}>
              <Text style={{ color: C.textFaint, fontSize: 12 }}>🏆 En uzun seri</Text>
              <Text style={{ color: C.text, fontSize: 12, fontWeight: '600' }}>{bestStreak} gün</Text>
            </View>
          </View>

          {/* 30 günlük aktivite */}
          <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 20, gap: 12 }}>
            <Text style={{ color: C.textFaint, fontSize: 10, fontWeight: '600' }}>SON 30 GÜNLÜK AKTİVİTE</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>
              {dailyCounts.map((day, i) => <ActivityCell key={i} count={day.count} date={day.date} />)}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              {[{ c: '#1a1a1a', l: 'Yok' }, { c: C.accent + '33', l: 'Az' }, { c: C.accent + '80', l: 'Orta' }, { c: C.accent, l: 'Çok' }].map(item => (
                <View key={item.l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: item.c }} />
                  <Text style={{ color: C.textFaint, fontSize: 11 }}>{item.l}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── ROZETLER ── */}
        <View style={{ paddingHorizontal: 20, gap: 12, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Award size={16} color={C.accent} strokeWidth={2} />
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>Rozetler</Text>
            </View>
            <Text style={{ color: C.accent, fontSize: 12, fontWeight: '600' }}>{unlockedBadges} / {BADGE_DEFS.length}</Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: C.card, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${(unlockedBadges / BADGE_DEFS.length) * 100}%`, backgroundColor: C.accent, borderRadius: 3 }} />
          </View>
          <FlatList
            data={BADGE_DEFS} renderItem={renderBadge} keyExtractor={item => item.id}
            numColumns={3} scrollEnabled={false}
            columnWrapperStyle={{ gap: 8 }} contentContainerStyle={{ gap: 8 }}
          />
        </View>
      </ScrollView>

      {/* ── PROFİL DÜZENLEME MODAL ── */}
      <EditProfileModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        initialName={displayName}
        initialBio={profileBio}
        onSave={handleProfileSave}
      />

      {/* ── TAKİP LİSTESİ MODAL ── */}
      <Modal visible={followListVisible} animationType="slide" transparent onRequestClose={() => setFollowListVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <Pressable style={{ flex: 1 }} onPress={() => setFollowListVisible(false)} />
          <View style={{
            backgroundColor: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
            borderTopWidth: 1, borderColor: C.border, maxHeight: '70%',
          }}>
            {/* Modal header */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16,
              borderBottomWidth: 1, borderBottomColor: C.border,
            }}>
              <Text style={{ color: C.text, fontSize: 17, fontWeight: '700', flex: 1 }}>
                {followListType === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}
              </Text>
              <Pressable onPress={() => setFollowListVisible(false)} hitSlop={8}>
                <X size={20} color={C.textMuted} strokeWidth={2} />
              </Pressable>
            </View>

            {/* Liste */}
            {followListLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator color={C.accent} size="large" />
              </View>
            ) : followList.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center', gap: 8 }}>
                <Users size={36} color={C.textFaint} strokeWidth={1.5} />
                <Text style={{ color: C.textMuted, fontSize: 14 }}>
                  {followListType === 'followers' ? 'Henüz takipçin yok' : 'Henüz kimseyi takip etmiyorsun'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={followList}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    paddingHorizontal: 20, paddingVertical: 12,
                  }}>
                    {/* Avatar */}
                    <View style={{
                      width: 44, height: 44, borderRadius: 22,
                      backgroundColor: C.card, overflow: 'hidden',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {item.avatar_url ? (
                        <Image source={{ uri: item.avatar_url }} style={{ width: 44, height: 44 }} contentFit="cover" transition={200} />
                      ) : (
                        <Text style={{ color: C.textMuted, fontSize: 18, fontWeight: '600' }}>
                          {(item.display_name ?? item.username ?? '?').charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    {/* İsim + seviye */}
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
                        {item.display_name ?? item.username ?? 'Kullanıcı'}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {item.current_streak > 0 && (
                          <Text style={{ color: C.textFaint, fontSize: 11 }}>🔥 {item.current_streak}</Text>
                        )}
                        <Text style={{ color: C.textFaint, fontSize: 11 }}>⬡ Sv {item.level ?? 1}</Text>
                      </View>
                    </View>
                    {/* XP */}
                    {item.total_xp ? (
                      <Text style={{ color: C.accent, fontSize: 12, fontWeight: '600' }}>{item.total_xp} XP</Text>
                    ) : null}
                  </View>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: C.border, marginHorizontal: 20 }} />}
                style={{ maxHeight: 400 }}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
