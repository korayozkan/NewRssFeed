/**
 * Gamification sistemi — web profil.html'den birebir port.
 * Seviyeler, XP hesaplama, rozetler, seri (streak) hesaplama.
 */

import { AppState } from './types';

// ── Seviye tanımları (Duolingo tarzı) ────────────────────────────────────────
export const LEVELS = [
  { level: 1,  title: 'Yeni Okuyucu',    xpRequired: 0    },
  { level: 2,  title: 'Meraklı',         xpRequired: 100  },
  { level: 3,  title: 'Düzenli Okuyucu', xpRequired: 250  },
  { level: 4,  title: 'Bilgi Avcısı',    xpRequired: 500  },
  { level: 5,  title: 'Analitik',        xpRequired: 900  },
  { level: 6,  title: 'Uzman',           xpRequired: 1400 },
  { level: 7,  title: 'Editör',          xpRequired: 2000 },
  { level: 8,  title: 'Baş Editör',      xpRequired: 2800 },
  { level: 9,  title: 'Küratoryal',      xpRequired: 3800 },
  { level: 10, title: 'Efsane Okuyucu',  xpRequired: 5000 },
];

export interface LevelDef {
  level:      number;
  title:      string;
  xpRequired: number;
}

export interface LevelInfo {
  current: LevelDef;
  next:    LevelDef | null;
  xpInLevel:  number;
  xpForLevel:  number;
  pct:        number;
  remaining:  number;
}

export function computeLevel(xp: number): LevelInfo {
  let current = LEVELS[0];
  let next: typeof LEVELS[number] | null = LEVELS[1];

  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      current = LEVELS[i];
      next = LEVELS[i + 1] ?? null;
      break;
    }
  }

  const xpInLevel = next ? xp - current.xpRequired : 0;
  const xpForLevel = next ? next.xpRequired - current.xpRequired : 1;
  const pct = next ? Math.min(100, Math.round((xpInLevel / xpForLevel) * 100)) : 100;
  const remaining = next ? next.xpRequired - xp : 0;

  return { current, next, xpInLevel, xpForLevel, pct, remaining };
}

// ── Rozet tanımları ────────────────────────────────────────────────────────
export interface BadgeDef {
  id:    string;
  icon:  string;  // emoji
  name:  string;
  desc:  string;
  xp:    number;
  check: (s: ProfileStats) => boolean;
}

export interface ProfileStats {
  articles:  number;  // okunan makale sayısı
  feeds:     number;  // kaynak sayısı
  streak:    number;  // günlük okuma serisi
  starred:   number;  // yıldızlanan makale
  notes:     number;  // not eklenen makale
}

export const BADGE_DEFS: BadgeDef[] = [
  { id: 'first-read',     icon: '📖', name: 'İlk Makale',     desc: '1 makale oku',         xp: 10,  check: s => s.articles >= 1   },
  { id: 'ten-articles',   icon: '📚', name: '10 Makale',      desc: '10 makale oku',         xp: 25,  check: s => s.articles >= 10  },
  { id: 'fifty-articles', icon: '🧠', name: '50 Makale',       desc: '50 makale oku',         xp: 75,  check: s => s.articles >= 50  },
  { id: 'hundred',        icon: '💯', name: '100 Makale',      desc: '100 makale oku',        xp: 150, check: s => s.articles >= 100 },
  { id: 'first-feed',     icon: '📡', name: 'İlk Kaynak',      desc: 'Bir RSS kaynağı ekle',  xp: 10,  check: s => s.feeds >= 1      },
  { id: 'five-feeds',     icon: '🗂️', name: '5 Kaynak',        desc: '5 farklı kaynak ekle', xp: 30,  check: s => s.feeds >= 5      },
  { id: 'ten-feeds',      icon: '🌐', name: '10 Kaynak',       desc: '10 farklı kaynak ekle',  xp: 60,  check: s => s.feeds >= 10     },
  { id: 'streak-3',       icon: '🔥', name: '3 Günlük Seri',   desc: '3 gün üst üste oku',    xp: 20,  check: s => s.streak >= 3    },
  { id: 'streak-7',       icon: '⚡', name: '7 Günlük Seri',   desc: '7 gün üst üste oku',    xp: 50,  check: s => s.streak >= 7    },
  { id: 'streak-30',      icon: '🏆', name: '30 Günlük Seri',  desc: '30 gün üst üste oku',   xp: 200, check: s => s.streak >= 30   },
  { id: 'starred',        icon: '⭐', name: 'İlk Yıldız',      desc: 'Bir makaleyi yıldızla', xp: 10,  check: s => s.starred >= 1   },
  { id: 'noted',          icon: '📝', name: 'Not Tuttu',        desc: 'Bir makaleye not ekle', xp: 15,  check: s => s.notes >= 1    },
];

// ── XP hesaplama ──────────────────────────────────────────────────────────
// XP = badge XP'leri + makale × 2 + seri × 5
export function calcXP(stats: ProfileStats): number {
  let badgeXP = 0;
  for (const badge of BADGE_DEFS) {
    if (badge.check(stats)) badgeXP += badge.xp;
  }
  return badgeXP + stats.articles * 2 + stats.streak * 5;
}

// ── Seri (streak) hesaplama ────────────────────────────────────────────────
// readHistory: articleId → timestamp
// Bugünden geriye doğru her gün en az 1 makale okunmuş mu kontrol et
export function calcStreak(readHistory: Record<string, number>): number {
  // Tarih → okunan makale sayısı
  const dayMap: Record<string, number> = {};
  for (const ts of Object.values(readHistory)) {
    const day = new Date(ts).toISOString().slice(0, 10);
    dayMap[day] = (dayMap[day] ?? 0) + 1;
  }

  let streak = 0;
  const today = new Date();
  // Bugün hiç okunmadıysa dünden başla (bugün henüz okumamış olabilir)
  const todayKey = today.toISOString().slice(0, 10);
  let startDay = new Date(today);
  if (!dayMap[todayKey]) {
    startDay.setDate(today.getDate() - 1);
  }

  // Geriye doğru say
  const cursor = new Date(startDay);
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (dayMap[key] && dayMap[key] > 0) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ── En uzun seri ──────────────────────────────────────────────────────────
export function calcBestStreak(readHistory: Record<string, number>): number {
  const dayMap: Record<string, number> = {};
  for (const ts of Object.values(readHistory)) {
    const day = new Date(ts).toISOString().slice(0, 10);
    dayMap[day] = (dayMap[day] ?? 0) + 1;
  }

  const sortedDays = Object.keys(dayMap).filter(d => dayMap[d] > 0).sort();
  if (sortedDays.length === 0) return 0;

  let best = 1;
  let current = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86_400_000;
    if (Math.round(diff) === 1) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }
  return best;
}

// ── Günlük okuma sayısı (30 gün) ────────────────────────────────────────────
export function getDailyCounts(readHistory: Record<string, number>, days = 30): Array<{ date: string; count: number }> {
  const dayMap: Record<string, number> = {};
  for (const ts of Object.values(readHistory)) {
    const day = new Date(ts).toISOString().slice(0, 10);
    dayMap[day] = (dayMap[day] ?? 0) + 1;
  }

  const result: Array<{ date: string; count: number }> = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: dayMap[key] ?? 0 });
  }
  return result;
}

// ── AppContext state'ten profil istatistikleri çıkar ────────────────────────
export function getProfileStats(state: AppState): ProfileStats {
  const articlesRead = state.articles.filter(a => a.read).length;
  const starred = state.articles.filter(a => a.starred).length;
  const notesCount = Object.values(state.notes).filter(n => n).length;
  const streak = calcStreak(state.readHistory);

  return {
    articles: articlesRead,
    feeds: state.feeds.length,
    streak,
    starred,
    notes: notesCount,
  };
}
