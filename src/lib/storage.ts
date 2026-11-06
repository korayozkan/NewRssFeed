// ── AsyncStorage ile veri kaydet / yükle ─────────────────────────────────
// Web projesindeki localStorage'ın doğrudan karşılığı.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from './types';

const STORAGE_KEY = 'rss_state_v1';

/** Uygulama state'ini AsyncStorage'dan yükler. */
export async function loadState(): Promise<Partial<AppState>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<AppState>;

    // Date nesnelerini restore et (JSON serialization'da string'e dönüşür)
    if (parsed.articles) {
      parsed.articles = parsed.articles.map((a) => ({
        ...a,
        date: new Date(a.date),
      }));
    }

    return parsed;
  } catch {
    return {};
  }
}

/** Uygulama state'ini AsyncStorage'a kaydeder. */
export async function saveState(state: Partial<AppState>): Promise<void> {
  try {
    const serializable = {
      feeds:               state.feeds               ?? [],
      articles:            state.articles            ?? [],
      readHistory:         state.readHistory         ?? {},
      notes:               state.notes               ?? {},
      highlights:          state.highlights          ?? {},
      userInterests:       state.userInterests       ?? [],
      dailyGoal:           state.dailyGoal           ?? 5,
      onboardingCompleted: state.onboardingCompleted ?? false,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // Sessizce geç — kritik değil
  }
}
