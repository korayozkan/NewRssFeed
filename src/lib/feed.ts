// ── CF Worker üzerinden RSS Fetch + XML Parser ──────────────────────────
// React Native'de DOMParser yok — regex tabanlı XML parse kullanılır.

import { Feed, Article } from './types';
import { uid, getFavicon, cleanDesc, extractImage, detectTags, stripHtml } from './utils';

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

// ── Feed URL dönüştürücü ──────────────────────────────────────────────────
export function convertToRssUrl(rawUrl: string): string {
  let url: URL;
  try { url = new URL(rawUrl); } catch { return rawUrl; }

  const host = url.hostname.replace(/^www\./, '');
  const path = url.pathname;

  // YouTube
  if (host === 'youtube.com' || host === 'youtu.be') {
    const channelId = url.searchParams.get('channel_id');
    if (channelId) return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const chanMatch = path.match(/^\/channel\/(UC[\w-]+)/);
    if (chanMatch) return `https://www.youtube.com/feeds/videos.xml?channel_id=${chanMatch[1]}`;
    const handleMatch = path.match(/^\/@([\w.-]+)/);
    if (handleMatch) return `https://www.youtube.com/feeds/videos.xml?user=${handleMatch[1]}`;
    const userMatch = path.match(/^\/user\/([\w.-]+)/);
    if (userMatch) return `https://www.youtube.com/feeds/videos.xml?user=${userMatch[1]}`;
    const playlistId = url.searchParams.get('list');
    if (playlistId) return `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
    return rawUrl;
  }

  // Reddit
  if (host === 'reddit.com' || host === 'old.reddit.com') {
    const subMatch = path.match(/^\/r\/([\w]+)/);
    const userMatch = path.match(/^\/u(?:ser)?\/([\w-]+)/);
    if (subMatch) return `https://www.reddit.com/r/${subMatch[1]}/.rss`;
    if (userMatch) return `https://www.reddit.com/user/${userMatch[1]}/.rss`;
    return 'https://www.reddit.com/.rss';
  }

  // GitHub
  if (host === 'github.com') {
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 2) return `https://github.com/${parts[0]}/${parts[1]}/releases.atom`;
    if (parts.length === 1) return `https://github.com/${parts[0]}.atom`;
    return rawUrl;
  }

  // Medium
  if (host === 'medium.com') {
    const tagMatch = path.match(/^\/tag\/([\w-]+)/);
    const userMatch = path.match(/^\/@([\w.-]+)/);
    if (tagMatch) return `https://medium.com/feed/tag/${tagMatch[1]}`;
    if (userMatch) return `https://medium.com/feed/@${userMatch[1]}`;
    return `https://medium.com/feed${path === '/' ? '' : path}`;
  }

  // Substack
  if (host.endsWith('.substack.com')) return `https://${host}/feed`;

  return rawUrl;
}

// ── Regex tabanlı XML parser (React Native'de DOMParser yok) ────────────

function getTagContent(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1].trim() : '';
}

function getAttr(xml: string, tag: string, attr: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]+${attr}=["']([^"']+)["']`, 'i'));
  return match ? match[1] : '';
}

function extractItems(feedXml: string): Array<Record<string, string>> {
  const items: Array<Record<string, string>> = [];

  // Atom entries
  const entryRegex = /<entry[\s>][\s\S]*?<\/entry>/gi;
  let match;
  while ((match = entryRegex.exec(feedXml)) !== null) {
    const entry = match[0];
    const linkMatch = entry.match(/<link[^>]+href=["']([^"']+)["']/i)
      || entry.match(/<link[^>]*>(.*?)<\/link>/i);
    const link = linkMatch ? linkMatch[1] : '';
    const pubDate = getTagContent(entry, 'published') || getTagContent(entry, 'updated');
    const contentEl = getTagContent(entry, 'content') || getTagContent(entry, 'summary');
    const thumbnail = getAttr(entry, 'media:thumbnail', 'url') || getAttr(entry, 'thumbnail', 'url');
    items.push({
      title: getTagContent(entry, 'title'),
      link,
      pubDate,
      description: contentEl,
      content: contentEl,
      thumbnail,
      _type: 'atom',
    });
  }

  if (items.length > 0) return items;

  // RSS items
  const itemRegex = /<item[\s>][\s\S]*?<\/item>/gi;
  while ((match = itemRegex.exec(feedXml)) !== null) {
    const item = match[0];
    const enclosureUrl = getAttr(item, 'enclosure', 'url');
    const thumbnail = getAttr(item, 'media:thumbnail', 'url') || getAttr(item, 'thumbnail', 'url');
    const descMatch = item.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    const contentMatch = item.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i);
    items.push({
      title: getTagContent(item, 'title'),
      link: getTagContent(item, 'link'),
      pubDate: getTagContent(item, 'pubDate'),
      description: descMatch ? descMatch[1] : '',
      content: contentMatch ? contentMatch[1] : (descMatch ? descMatch[1] : ''),
      enclosureUrl,
      thumbnail,
      _type: 'rss',
    });
  }

  return items;
}

function parseFeedXml(xmlText: string, feed: Feed): Article[] {
  const favicon = getFavicon(feed.url);
  feed.favicon = favicon;

  // Feed başlığını ayarla
  const titleMatch = xmlText.match(/<(?:channel|feed)[^>]*>[\s\S]*?<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    try {
      if (feed.name === new URL(feed.url).hostname) {
        feed.name = stripHtml(titleMatch[1]).trim() || feed.name;
      }
    } catch { /* ignore */ }
  }

  const rawItems = extractItems(xmlText);
  const cutoff = Date.now() - SEVEN_DAYS;

  return rawItems
    .filter(item => {
      if (!item.pubDate) return true;
      const d = new Date(item.pubDate);
      return isNaN(d.getTime()) ? true : d.getTime() >= cutoff;
    })
    .map(item => {
      const articleId = `${feed.id}::${item.link || item.title || uid()}`;
      const image = extractImage({
        enclosure: item.enclosureUrl ? { link: item.enclosureUrl } : null,
        thumbnail: item.thumbnail || null,
        description: item.description,
        content: item.content,
      });
      const fullText = `${item.title} ${stripHtml(item.description || item.content || '')}`;
      return {
        id: articleId,
        feedId: feed.id,
        feedName: feed.name,
        favicon,
        title: (item.title || '(Başlıksız)').trim(),
        desc: cleanDesc(item.description || item.content || ''),
        url: item.link || '',
        date: item.pubDate ? new Date(item.pubDate) : new Date(),
        image,
        content: item.content || item.description || '',
        tags: detectTags(fullText),
        read: false,
        starred: false,
      } satisfies Article;
    });
}

// ── CF Worker fetch ───────────────────────────────────────────────────────

export async function fetchFeedFromWorker(
  feed: Feed,
  cfWorkerUrl: string
): Promise<Article[]> {
  if (!cfWorkerUrl) throw new Error('CF Worker URL tanımlı değil');

  const workerUrl = `${cfWorkerUrl}/rss?url=${encodeURIComponent(feed.url)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(workerUrl, {
      signal: controller.signal,
      headers: { Accept: 'application/rss+xml, application/atom+xml, text/xml, */*' },
    });
    clearTimeout(timer);

    if (!res.ok) {
      const msg = res.status === 429
        ? 'Çok fazla istek — lütfen biraz bekleyin'
        : `Worker HTTP ${res.status}`;
      throw new Error(msg);
    }

    const text = await res.text();
    if (!text?.trim()) throw new Error('Boş yanıt');

    const articles = parseFeedXml(text, feed);
    if (articles.length === 0) throw new Error('Feed içeriği okunamadı veya boş');

    return articles;
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === 'AbortError') throw new Error('Zaman aşımı');
    throw err;
  }
}
