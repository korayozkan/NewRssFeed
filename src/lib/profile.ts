/**
 * Profile service — Supabase profil ve takip operasyonları
 *
 * Tablolar (schema.sql'den):
 * - profiles: display_name, bio, avatar_url, website, twitter_handle, github_handle
 * - friendships: requester_id → addressee_id, status
 * - get_friend_counts(uid) RPC: followers + following sayısı
 */

import { supabase } from './supabase';

export interface Profile {
  id:            string;
  username:       string | null;
  display_name:   string | null;
  bio:            string | null;
  avatar_url:     string | null;
  website:        string | null;
  twitter_handle: string | null;
  github_handle:  string | null;
  total_articles_read: number;
  current_streak: number;
  best_streak:    number;
  total_xp:       number;
  level:          number;
}

export interface FollowCounts {
  followers: number;
  following: number;
}

// ── Profil getir ──────────────────────────────────────────────────────────
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.warn('[Profile] getProfile error:', error.message);
    return null;
  }
  return data as Profile;
}

// ── Profil güncelle (upsert) ────────────────────────────────────────────────
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'display_name' | 'bio' | 'avatar_url' | 'website' | 'twitter_handle' | 'github_handle'>>
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      ...updates,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) throw new Error(error.message);
}

// ── Takipçi / takip edilen sayısı ──────────────────────────────────────────
export async function getFollowCounts(userId: string): Promise<FollowCounts> {
  const { data, error } = await supabase
    .rpc('get_friend_counts', { uid: userId });

  if (error || !data || data.length === 0) {
    return { followers: 0, following: 0 };
  }
  return {
    followers: Number(data[0].followers) || 0,
    following: Number(data[0].following) || 0,
  };
}

// ── Takip et ────────────────────────────────────────────────────────────────
export async function followUser(currentUserId: string, targetUserId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .upsert({
      requester_id: currentUserId,
      addressee_id: targetUserId,
      status: 'accepted',
    }, { onConflict: 'requester_id,addressee_id' });

  if (error) throw new Error(error.message);
}

// ── Takipten çık ────────────────────────────────────────────────────────────
export async function unfollowUser(currentUserId: string, targetUserId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('requester_id', currentUserId)
    .eq('addressee_id', targetUserId);

  if (error) throw new Error(error.message);
}

// ── Takipçi listesi (beni takip edenler) ─────────────────────────────────────
export async function getFollowers(userId: string): Promise<Profile[]> {
  // friendships tablosundan addressee_id = userId olan kayıtlar
  // → requester_id'leri al → profiles tablosundan bilgileri getir
  const { data, error } = await supabase
    .from('friendships')
    .select('requester_id')
    .eq('addressee_id', userId)
    .eq('status', 'accepted');

  if (error || !data || data.length === 0) return [];

  const ids = data.map((r: { requester_id: string }) => r.requester_id);
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, level, current_streak, total_xp')
    .in('id', ids);

  if (pErr || !profiles) return [];
  return profiles as Profile[];
}

// ── Takip edilen listesi (benim takip ettiklerim) ───────────────────────────
export async function getFollowing(userId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('addressee_id')
    .eq('requester_id', userId)
    .eq('status', 'accepted');

  if (error || !data || data.length === 0) return [];

  const ids = data.map((r: { addressee_id: string }) => r.addressee_id);
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, level, current_streak, total_xp')
    .in('id', ids);

  if (pErr || !profiles) return [];
  return profiles as Profile[];
}
export async function searchUsers(query: string, limit = 20): Promise<Profile[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, level, current_streak, total_xp')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(limit);

  if (error) return [];
  return (data ?? []) as Profile[];
}
