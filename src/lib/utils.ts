// ── Yardımcı Fonksiyonlar ─────────────────────────────────────────────────

import { Article } from './types';

// ── Benzersiz ID üretici ──
export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ── Tarih formatlayıcı (Türkçe) ──
export function formatDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 60_000)     return 'Az önce';
  if (diff < 3_600_000)  return Math.floor(diff / 60_000) + ' dk önce';
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + ' sa önce';
  if (diff < 604_800_000) return Math.floor(diff / 86_400_000) + ' gün önce';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

// ── HTML tag temizleyici ──
export function stripHtml(html: string): string {
  return html
    ? html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()
    : '';
}

// ── Açıklama temizleyici ──
export function cleanDesc(raw: string): string {
  const txt = stripHtml(raw);
  return txt.length > 200 ? txt.slice(0, 200) + '…' : txt;
}

// ── Görsel çıkarıcı ──
export function extractImage(item: {
  enclosure?: { link?: string } | null;
  thumbnail?: string | null;
  description?: string;
  content?: string;
}): string | null {
  if (item.enclosure?.link) return item.enclosure.link;
  if (item.thumbnail) return item.thumbnail;
  const m = (item.description || item.content || '').match(
    /<img[^>]+src=["']([^"'>]+)["']/i
  );
  return m ? m[1] : null;
}

// ── Favicon URL üretici ──
export function getFavicon(feedUrl: string): string {
  try {
    const domain = new URL(feedUrl).hostname;
    return `https://favicon.im/${domain}?larger=true`;
  } catch {
    return '';
  }
}

// ── Akıllı kategori etiketleri ──
const SMART_CATEGORIES = [
  { label: 'Teknoloji', keywords: ['tech', 'ai', 'software', 'hardware', 'coding', 'developer', 'program', 'yapay zeka', 'teknoloji', 'yazılım'] },
  { label: 'Bilim',     keywords: ['science', 'research', 'study', 'discovery', 'space', 'bilim', 'araştırma', 'uzay'] },
  { label: 'Finans',    keywords: ['finance', 'economy', 'market', 'stock', 'crypto', 'finans', 'ekonomi', 'borsa', 'kripto'] },
  { label: 'Spor',      keywords: ['sport', 'football', 'basketball', 'soccer', 'spor', 'futbol', 'basketbol'] },
  { label: 'Sağlık',    keywords: ['health', 'medical', 'disease', 'virus', 'sağlık', 'tıp', 'hastalık'] },
  { label: 'Politika',  keywords: ['politics', 'election', 'government', 'president', 'politika', 'seçim', 'hükümet'] },
  { label: 'Eğlence',   keywords: ['movie', 'music', 'game', 'entertainment', 'film', 'müzik', 'oyun', 'eğlence'] },
  { label: 'Tasarım',   keywords: ['design', 'ux', 'ui', 'creative', 'tasarım', 'yaratıcı'] },
];

export function detectTags(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const cat of SMART_CATEGORIES) {
    for (const kw of cat.keywords) {
      if (lower.includes(kw)) { found.push(cat.label); break; }
    }
  }
  return found;
}

// ── Makale puanlama ──
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export function scoreArticle(a: Article): number {
  let score = 0;
  const age = Date.now() - new Date(a.date).getTime();

  if (age < 3_600_000)       score += 50;
  else if (age < 21_600_000) score += 35;
  else if (age < 86_400_000) score += 20;
  else if (age < SEVEN_DAYS) score += 8;

  if (a.starred) score += 30;
  if (!a.read)   score += 10;
  if (a.image)   score += 8;
  if (a.tags.length > 1) score += a.tags.length * 4;
  if (a.title.length > 30 && a.title.length < 100) score += 5;

  const urgentWords = ['breaking', 'urgent', 'exclusive', 'alert', 'major', 'critical'];
  const titleLower = a.title.toLowerCase();
  for (const w of urgentWords) { if (titleLower.includes(w)) score += 12; }

  return score;
}
