/**
 * Akıllı RSS Öneri Motoru (3 Aşamalı Recommender Engine - TypeScript)
 *
 * Aşama 1: Deduplication + Güncellik (Time Decay) + Takip Edilen Kaynaklar + İlgi Alanı
 * Aşama 2: Kişiselleştirme + Kullanıcı Davranışları + MMR Çeşitlilik
 * Aşama 3: Learning to Rank (LTR) Ağırlıklı Sıralama
 */

import { Article, Feed } from './types';

export interface RecommendationOptions {
  userInterests?: string[];
  readHistory?: Record<string, number>;
  limit?: number;
  halfLifeHours?: number;
  diversityLambda?: number;
}

export interface ScoredArticleItem {
  article: Article;
  score: number;
  reason?: string;
}

// ── 1. Aşama: Deduplication (URL Normalizasyonu & Shingle) ─────────────────
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'ref', 'source', 'rss',
]);

export function normalizeArticleUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.trim());
    let host = url.hostname.toLowerCase();
    if (host.startsWith('www.')) host = host.slice(4);

    const cleanParams: string[] = [];
    url.searchParams.forEach((val, key) => {
      if (!TRACKING_PARAMS.has(key.toLowerCase())) {
        cleanParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
      }
    });

    cleanParams.sort();
    const query = cleanParams.length > 0 ? `?${cleanParams.join('&')}` : '';
    const path = url.pathname.replace(/\/+$/, '');
    return `${url.protocol}//${host}${path}${query}`.toLowerCase();
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

function getShingles(text: string, k = 3): Set<string> {
  const tokens = text.toLowerCase().match(/\w+/g) || [];
  if (tokens.length < k) return new Set(tokens);
  const set = new Set<string>();
  for (let i = 0; i <= tokens.length - k; i++) {
    set.add(tokens.slice(i, i + k).join(' '));
  }
  return set;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  a.forEach((item) => {
    if (b.has(item)) intersection++;
  });
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export function deduplicateArticles(articles: Article[]): Article[] {
  const seenUrls = new Set<string>();
  const seenFingerprints: Array<{ id: string; shingles: Set<string> }> = [];
  const uniqueList: Article[] = [];

  for (const article of articles) {
    const cleanUrl = normalizeArticleUrl(article.url);
    if (seenUrls.has(cleanUrl)) continue;

    const shingles = getShingles(`${article.title} ${article.desc.slice(0, 200)}`);
    let isDuplicate = false;
    for (const fp of seenFingerprints) {
      if (jaccardSimilarity(shingles, fp.shingles) >= 0.75) {
        isDuplicate = true;
        break;
      }
    }
    if (isDuplicate) continue;

    seenUrls.add(cleanUrl);
    seenFingerprints.push({ id: article.id, shingles });
    uniqueList.push(article);
  }

  return uniqueList;
}

// ── 1. Aşama: Güncellik Puanı (Exponential Time Decay) ─────────────────────
export function calculateRecencyScore(publishedDate: Date, halfLifeHours = 24): number {
  const now = Date.now();
  const deltaMs = Math.max(0, now - new Date(publishedDate).getTime());
  const halfLifeMs = halfLifeHours * 3600 * 1000;
  const decayConstant = Math.LN2 / halfLifeMs;
  return Math.exp(-decayConstant * deltaMs);
}

// ── 2. Aşama: İlgi Alanı ve Etiket Eşleşmesi ──────────────────────────────
export function calculateInterestMatch(
  article: Article,
  userInterests: string[] = []
): { score: number; matchedTopic?: string } {
  if (!userInterests || userInterests.length === 0) {
    return { score: 0.5 };
  }

  const normalizedInterests = userInterests.map((i) => i.toLowerCase().trim());
  const articleTags = (article.tags || []).map((t) => t.toLowerCase().trim());
  const articleText = `${article.title} ${article.desc}`.toLowerCase();

  let matchScore = 0;
  let matchedTopic: string | undefined;

  for (const interest of normalizedInterests) {
    // 1. Etiket eşleşmesi
    if (articleTags.includes(interest)) {
      matchScore = Math.max(matchScore, 1.0);
      matchedTopic = interest;
      break;
    }
    // 2. Başlık veya metin içinde geçiş
    if (articleText.includes(interest)) {
      matchScore = Math.max(matchScore, 0.75);
      matchedTopic = interest;
    }
  }

  return { score: matchScore, matchedTopic };
}

// ── 2. Aşama: Dinamik İlgi Profili (Okuma Geçmişi Analizi) ────────────────
export function computeUserCategoryAffinity(
  articles: Article[],
  readHistory: Record<string, number> = {}
): Map<string, number> {
  const affinity = new Map<string, number>();
  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 3600 * 1000;

  for (const article of articles) {
    const readTime = readHistory[article.id];
    let weight = 0;
    if (article.starred) weight += 5.0;
    if (readTime) {
      const ageMs = now - readTime;
      const decay = Math.exp((-Math.LN2 / SEVEN_DAYS_MS) * Math.max(0, ageMs));
      weight += 3.0 * decay;
    }

    if (weight > 0) {
      for (const tag of article.tags || []) {
        const t = tag.toLowerCase().trim();
        affinity.set(t, (affinity.get(t) || 0) + weight);
      }
    }
  }

  // Normalizasyon
  let total = 0;
  affinity.forEach((v) => { total += v; });
  if (total > 0) {
    affinity.forEach((v, k) => { affinity.set(k, v / total); });
  }

  return affinity;
}

// ── 3. Aşama: LTR Puanlama & MMR Çeşitlilik Filtresi ──────────────────────
export function buildRecommendedHomeFeed(
  articles: Article[],
  feeds: Feed[],
  options: RecommendationOptions = {}
): Article[] {
  const {
    userInterests = [],
    readHistory = {},
    limit = 25,
    halfLifeHours = 24,
    diversityLambda = 0.70,
  } = options;

  if (articles.length === 0) return [];

  // 1. Adım: Deduplication (mükerrer içerikleri ayıkla)
  const uniqueArticles = deduplicateArticles(articles);

  // 2. Adım: Kullanıcı ilgi profili çıkar
  const followedFeedIds = new Set(feeds.map((f) => f.id));
  const categoryAffinity = computeUserCategoryAffinity(articles, readHistory);

  // 3. Adım: Her makaleyi puanla (L2R Özellik Füzyonu)
  const scoredItems: ScoredArticleItem[] = uniqueArticles.map((article) => {
    // f1: Güncellik skoru (0.0 - 1.0)
    const recency = calculateRecencyScore(article.date, halfLifeHours);

    // f2: Takip edilen kaynak mı?
    const isFollowed = followedFeedIds.has(article.feedId) ? 1.0 : 0.3;

    // f3: Beyan edilen ilgi alanı eşleşmesi
    const { score: interestScore, matchedTopic } = calculateInterestMatch(article, userInterests);

    // f4: Dinamik geçmiş ilgi yakınlığı
    let affinityScore = 0;
    for (const tag of article.tags || []) {
      affinityScore += categoryAffinity.get(tag.toLowerCase().trim()) || 0;
    }
    affinityScore = Math.min(1.0, affinityScore * 2);

    // f5: Etkileşim durumu (Okunmamış taze içerikler önde, yıldızlılar kalıcı)
    const unreadBoost = article.read ? 0.3 : 1.0;
    const starredBoost = article.starred ? 1.5 : 1.0;

    // Ağırlıklı Füzyon Puanı:
    // LTR Modeli Ağırlıkları
    const finalScore = (
      recency * 0.35 +
      isFollowed * 0.20 +
      interestScore * 0.25 +
      affinityScore * 0.20
    ) * unreadBoost * starredBoost;

    let reason: string | undefined;
    if (article.starred) {
      reason = '⭐ Favorilerinize göre';
    } else if (matchedTopic) {
      reason = `🎯 ${matchedTopic.toUpperCase()} ilginiz`;
    } else if (recency > 0.8) {
      reason = '⚡ Yeni ve popüler';
    } else if (isFollowed === 1.0) {
      reason = `📰 ${article.feedName}`;
    }

    return { article, score: finalScore, reason };
  });

  // Skora göre sırala
  scoredItems.sort((a, b) => b.score - a.score);

  // 4. Adım: MMR Çeşitlilik & Kaynak Doygunluk Filtresi (Diversity & Throttling)
  // Art arda aynı kaynaktan 2'den fazla içerik gelmesini engeller
  const result: Article[] = [];
  const deferred: ScoredArticleItem[] = [];
  let lastFeedId = '';
  let consecutiveFeedCount = 0;

  for (const item of scoredItems) {
    if (item.article.feedId === lastFeedId) {
      consecutiveFeedCount++;
    } else {
      lastFeedId = item.article.feedId;
      consecutiveFeedCount = 1;
    }

    if (consecutiveFeedCount > 2) {
      deferred.push(item);
    } else {
      result.push(item.article);
    }
    if (result.length >= limit) break;
  }

  // Kalan yer varsa çeşitlilik amacıyla ertelenenleri ekle
  while (result.length < limit && deferred.length > 0) {
    const next = deferred.shift();
    if (next) result.push(next.article);
  }

  return result;
}
