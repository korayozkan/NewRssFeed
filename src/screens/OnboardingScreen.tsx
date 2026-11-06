/**
 * OnboardingScreen — Giriş / Kayıt Sonrası Kişiselleştirme Ekranı
 *
 * Kullanıcıya sorulacak 3 temel aşama:
 * 1. İlgi Alanları (Yazılım, Yapay Zeka, Tasarım, Girişimcilik vb.)
 * 2. Önerilen Kaliteli Kaynaklar (Hacker News, Dev.to, TechCrunch vb.)
 * 3. Günlük Okuma Hedefi (Seri & XP alışkanlığı)
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Sparkles, ArrowRight, Rss, Flame, BookOpen } from 'lucide-react-native';

import { useApp } from '../lib/store/AppContext';
import { Feed } from '../lib/types';
import { uid } from '../lib/utils';
import { fetchFeedFromWorker } from '../lib/feed';

const C = {
  bg:        '#0a0a0a',
  surface:   '#111111',
  card:      '#141414',
  border:    '#1e1e1e',
  border2:   '#2a2a2a',
  text:      '#dddddd',
  textMuted: '#777777',
  textFaint: '#444444',
  accent:    '#5b9cf6',
  accentBg:  '#0d1520',
  accentBd:  '#1a2a40',
  success:   '#22c55e',
};

// ── 1. Sorulacak İlgi Alanları Listesi ─────────────────────────────────────
export const TOPICS = [
  { id: 'yazilim',      name: 'Yazılım & Kodlama',   icon: '💻', tags: ['yazılım', 'python', 'javascript', 'react'] },
  { id: 'ai',           name: 'Yapay Zeka & LLM',    icon: '🤖', tags: ['yapay zeka', 'ai', 'llm', 'machine learning'] },
  { id: 'mobil',        name: 'Mobil Geliştirme',    icon: '📱', tags: ['mobil', 'react-native', 'ios', 'android'] },
  { id: 'tasarim',      name: 'Tasarım & UI/UX',     icon: '🎨', tags: ['tasarım', 'ui', 'ux', 'figma'] },
  { id: 'girisimcilik', name: 'Girişimcilik & Start',icon: '🚀', tags: ['girişimcilik', 'startup', 'ürün'] },
  { id: 'guvenlik',     name: 'Siber Güvenlik',      icon: '🔒', tags: ['güvenlik', 'cybersecurity', 'appsec'] },
  { id: 'bilim',        name: 'Bilim & Gelecek',     icon: '🔬', tags: ['bilim', 'uzay', 'teknoloji'] },
  { id: 'kripto',       name: 'Web3 & Finans',       icon: '🌐', tags: ['kripto', 'web3', 'finans'] },
];

// ── 2. Seçilen Konulara Göre Önerilen Başlangıç Kaynakları ────────────────
export const CURATED_FEEDS: Array<{
  name: string;
  url: string;
  topic: string;
  desc: string;
}> = [
  { name: 'Hacker News',      url: 'https://news.ycombinator.com/rss',      topic: 'yazilim',      desc: 'Dünya teknoloji gündemi' },
  { name: 'Dev.to',           url: 'https://dev.to/feed',                   topic: 'yazilim',      desc: 'Geliştirici topluluk yazıları' },
  { name: 'ArXiv AI cs.AI',   url: 'https://rss.arxiv.org/rss/cs.AI',       topic: 'ai',           desc: 'Yeni akademik yapay zeka makaleleri' },
  { name: 'TechCrunch',       url: 'https://techcrunch.com/feed/',          topic: 'girisimcilik', desc: 'Girişim ve yatırım haberleri' },
  { name: 'UX Collective',    url: 'https://medium.com/feed/ux-collective', topic: 'tasarim',      desc: 'Kullanıcı deneyimi & tasarım' },
  { name: 'React Native Blog',url: 'https://reactnative.dev/blog/rss.xml',  topic: 'mobil',        desc: 'Resmi React Native güncellemeleri' },
];

// ── 3. Günlük Okuma Hedefleri ─────────────────────────────────────────────
export const GOALS = [
  { count: 2, label: 'Rahat',   desc: 'Günde 2 makale · ~5 dk',  icon: '🌱', xp: '+10 XP' },
  { count: 5, label: 'Düzenli', desc: 'Günde 5 makale · ~15 dk', icon: '🚀', xp: '+25 XP' },
  { count: 10,label: 'Yoğun',   desc: 'Günde 10 makale · ~30 dk',icon: '🔥', xp: '+50 XP' },
];

export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const { dispatch } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['yazilim', 'ai']);
  const [selectedFeeds, setSelectedFeeds] = useState<string[]>([
    'https://news.ycombinator.com/rss',
    'https://rss.arxiv.org/rss/cs.AI',
  ]);
  const [selectedGoal, setSelectedGoal] = useState<number>(5);
  const [saving, setSaving] = useState(false);

  function toggleTopic(id: string) {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function toggleFeed(url: string) {
    setSelectedFeeds((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  }

  async function handleFinish() {
    setSaving(true);
    try {
      // Seçilen ilgi alanlarının tag'lerini topla
      const interestTags: string[] = [];
      for (const tId of selectedTopics) {
        const found = TOPICS.find((x) => x.id === tId);
        if (found) interestTags.push(...found.tags);
      }

      // Seçilen kaynakları Feed nesnelerine dönüştür
      const initialFeeds: Feed[] = selectedFeeds.map((url) => {
        const found = CURATED_FEEDS.find((f) => f.url === url);
        return {
          id: uid(),
          name: found ? found.name : new URL(url).hostname,
          url,
          favicon: null,
        };
      });

      // İsteğe bağlı olarak ilk feed'leri arka planda çekmeyi dene
      const CF_WORKER = process.env.EXPO_PUBLIC_CF_WORKER_URL;
      let initialArticles: any[] = [];
      if (CF_WORKER && initialFeeds.length > 0) {
        try {
          const results = await Promise.allSettled(
            initialFeeds.slice(0, 3).map((f) => fetchFeedFromWorker(f, CF_WORKER))
          );
          results.forEach((res) => {
            if (res.status === 'fulfilled') {
              initialArticles.push(...res.value);
            }
          });
        } catch {
          // CF Worker hatası olsa da onboarding tamamlanır
        }
      }

      dispatch({
        type: 'COMPLETE_ONBOARDING',
        interests: interestTags,
        dailyGoal: selectedGoal,
        feeds: initialFeeds,
        articles: initialArticles,
      });

      onComplete();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* ── Üst İlerleme Barı ── */}
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Sparkles size={18} color={C.accent} />
            <Text style={{ color: C.accent, fontSize: 13, fontWeight: '700' }}>
              AKILLI AKIŞ KURULUMU
            </Text>
          </View>
          <Text style={{ color: C.textMuted, fontSize: 12 }}>Adım {step} / 3</Text>
        </View>

        <View style={{ height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${(step / 3) * 100}%`, backgroundColor: C.accent, borderRadius: 2 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* ── ADIM 1: İLGİ ALANLARI ── */}
        {step === 1 && (
          <View style={{ gap: 16 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: C.text, fontSize: 24, fontWeight: '800' }}>
                Nelerle ilgileniyorsun?
              </Text>
              <Text style={{ color: C.textMuted, fontSize: 14, lineHeight: 20 }}>
                Öneri motorumuz anasayfanı bu konulara ve okuma alışkanlıklarına göre optimize edecek.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
              {TOPICS.map((topic) => {
                const selected = selectedTopics.includes(topic.id);
                return (
                  <Pressable
                    key={topic.id}
                    onPress={() => toggleTopic(topic.id)}
                    style={{
                      width: '48%',
                      backgroundColor: selected ? C.accentBg : C.card,
                      borderWidth: 1.5,
                      borderColor: selected ? C.accent : C.border,
                      borderRadius: 14,
                      padding: 16,
                      gap: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 28 }}>{topic.icon}</Text>
                      {selected && (
                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={12} color="#fff" strokeWidth={3} />
                        </View>
                      )}
                    </View>
                    <Text style={{ color: selected ? C.accent : C.text, fontSize: 14, fontWeight: '600' }}>
                      {topic.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ── ADIM 2: ÖNERİLEN KAYNAKLAR ── */}
        {step === 2 && (
          <View style={{ gap: 16 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: C.text, fontSize: 24, fontWeight: '800' }}>
                Önerilen Kaynaklar
              </Text>
              <Text style={{ color: C.textMuted, fontSize: 14, lineHeight: 20 }}>
                Seçtiğin ilgi alanlarına uygun popüler RSS kaynakları hazırlandı. Takip etmek istediklerini seç:
              </Text>
            </View>

            <View style={{ gap: 10, marginTop: 10 }}>
              {CURATED_FEEDS.map((feed) => {
                const selected = selectedFeeds.includes(feed.url);
                return (
                  <Pressable
                    key={feed.url}
                    onPress={() => toggleFeed(feed.url)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: selected ? C.accentBg : C.card,
                      borderWidth: 1.5,
                      borderColor: selected ? C.accent : C.border,
                      borderRadius: 14,
                      padding: 16,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, marginRight: 10 }}>
                      <View style={{
                        width: 40, height: 40, borderRadius: 20,
                        backgroundColor: selected ? C.accent : C.border2,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Rss size={18} color={selected ? '#fff' : C.textMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>
                          {feed.name}
                        </Text>
                        <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>
                          {feed.desc}
                        </Text>
                      </View>
                    </View>

                    <View style={{
                      width: 22, height: 22, borderRadius: 11,
                      borderWidth: 2, borderColor: selected ? C.accent : C.border2,
                      backgroundColor: selected ? C.accent : 'transparent',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selected && <Check size={13} color="#fff" strokeWidth={3} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ── ADIM 3: OKUMA HEDEFİ ── */}
        {step === 3 && (
          <View style={{ gap: 16 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ color: C.text, fontSize: 24, fontWeight: '800' }}>
                Günlük Okuma Hedefin
              </Text>
              <Text style={{ color: C.textMuted, fontSize: 14, lineHeight: 20 }}>
                Alışkanlık serini korumak ve her gün seviye atlamak için bir hedef belirle:
              </Text>
            </View>

            <View style={{ gap: 12, marginTop: 10 }}>
              {GOALS.map((goal) => {
                const selected = selectedGoal === goal.count;
                return (
                  <Pressable
                    key={goal.count}
                    onPress={() => setSelectedGoal(goal.count)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: selected ? C.accentBg : C.card,
                      borderWidth: 1.5,
                      borderColor: selected ? C.accent : C.border,
                      borderRadius: 16,
                      padding: 18,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      <Text style={{ fontSize: 32 }}>{goal.icon}</Text>
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>
                            {goal.label}
                          </Text>
                          <View style={{
                            paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99,
                            backgroundColor: selected ? C.accent : C.border2,
                          }}>
                            <Text style={{ color: selected ? '#fff' : C.textMuted, fontSize: 11, fontWeight: '700' }}>
                              {goal.xp}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>
                          {goal.desc}
                        </Text>
                      </View>
                    </View>

                    <View style={{
                      width: 22, height: 22, borderRadius: 11,
                      borderWidth: 2, borderColor: selected ? C.accent : C.border2,
                      backgroundColor: selected ? C.accent : 'transparent',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selected && <Check size={13} color="#fff" strokeWidth={3} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Alt Buton ── */}
      <View style={{ padding: 24, borderTopWidth: 1, borderTopColor: C.border }}>
        {step < 3 ? (
          <Pressable
            onPress={() => setStep((s) => (s + 1) as any)}
            disabled={step === 1 && selectedTopics.length === 0}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              backgroundColor: C.accent, paddingVertical: 15, borderRadius: 14,
              opacity: pressed || (step === 1 && selectedTopics.length === 0) ? 0.6 : 1,
            })}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Devam Et</Text>
            <ArrowRight size={18} color="#fff" strokeWidth={2.5} />
          </Pressable>
        ) : (
          <Pressable
            onPress={handleFinish}
            disabled={saving}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              backgroundColor: C.accent, paddingVertical: 15, borderRadius: 14,
              opacity: pressed || saving ? 0.6 : 1,
            })}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Akışı Başlat</Text>
                <Sparkles size={18} color="#fff" strokeWidth={2.5} />
              </>
            )}
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

