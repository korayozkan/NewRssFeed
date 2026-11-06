import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
} from 'react';
import { AppAction, AppState, Article } from '../types';
import { loadState, saveState } from '../storage';
import { buildRecommendedHomeFeed } from '../recommendation';

// ── Başlangıç state ───────────────────────────────────────────────────────
const initialState: AppState = {
  feeds:               [],
  articles:            [],
  readHistory:         {},
  notes:               {},
  highlights:          {},
  activeFeedId:        'home',
  activeFilter:        'all',
  searchQuery:         '',
  activeTag:           '',
  loading:             false,
  userInterests:       [],
  dailyGoal:           5,
  onboardingCompleted: false,
};

// ── Reducer ───────────────────────────────────────────────────────────────
function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD':
      return { ...state, ...action.payload };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_FEEDS_AND_ARTICLES':
      return { ...state, feeds: action.feeds, articles: action.articles };

    case 'ADD_FEED': {
      // Yeni makaleleri mevcut listeye ekle, duplikaları atla
      const existingIds = new Set(state.articles.map((a) => a.id));
      const fresh = action.articles.filter((a) => !existingIds.has(a.id));
      const merged = [...fresh, ...state.articles].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      return {
        ...state,
        feeds:    [...state.feeds, action.feed],
        articles: merged,
      };
    }

    case 'REMOVE_FEED':
      return {
        ...state,
        feeds:    state.feeds.filter((f) => f.id !== action.feedId),
        articles: state.articles.filter((a) => a.feedId !== action.feedId),
        activeFeedId:
          state.activeFeedId === action.feedId ? 'home' : state.activeFeedId,
      };

    case 'ADD_ARTICLES': {
      const existingIds = new Set(state.articles.map((a) => a.id));
      const fresh = action.articles.filter((a) => !existingIds.has(a.id));
      if (fresh.length === 0) return state;
      const merged = [...fresh, ...state.articles].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      return { ...state, articles: merged };
    }

    case 'MARK_READ': {
      const articles = state.articles.map((a) =>
        a.id === action.articleId ? { ...a, read: true } : a
      );
      const readHistory = {
        ...state.readHistory,
        [action.articleId]: Date.now(),
      };
      return { ...state, articles, readHistory };
    }

    case 'TOGGLE_STAR':
      return {
        ...state,
        articles: state.articles.map((a) =>
          a.id === action.articleId ? { ...a, starred: !a.starred } : a
        ),
      };

    case 'SET_ACTIVE_FEED':
      return { ...state, activeFeedId: action.feedId };

    case 'SET_FILTER':
      return { ...state, activeFilter: action.filter };

    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query };

    case 'SET_TAG':
      return { ...state, activeTag: action.tag };

    case 'COMPLETE_ONBOARDING': {
      const addedFeeds = action.feeds || [];
      const existingFeedUrls = new Set(state.feeds.map((f) => f.url));
      const freshFeeds = addedFeeds.filter((f) => !existingFeedUrls.has(f.url));

      const addedArticles = action.articles || [];
      const existingArticleIds = new Set(state.articles.map((a) => a.id));
      const freshArticles = addedArticles.filter((a) => !existingArticleIds.has(a.id));

      return {
        ...state,
        userInterests:       action.interests,
        dailyGoal:           action.dailyGoal,
        onboardingCompleted: true,
        feeds:               [...state.feeds, ...freshFeeds],
        articles:            [...freshArticles, ...state.articles],
      };
    }

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────
interface AppContextValue {
  state:    AppState;
  dispatch: React.Dispatch<AppAction>;
  /** Puanlı anasayfa makalelerini döndürür (3 aşamalı akıllı öneri motoru) */
  homeFeed: Article[];
}

const AppContext = createContext<AppContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // İlk açılışta AsyncStorage'dan yükle
  useEffect(() => {
    loadState().then((saved) => {
      if (Object.keys(saved).length > 0) {
        dispatch({ type: 'LOAD', payload: saved });
      }
    });
  }, []);

  // State değişince otomatik kaydet (loading hariç)
  useEffect(() => {
    saveState(state);
  }, [
    state.feeds,
    state.articles,
    state.readHistory,
    state.notes,
    state.highlights,
    state.userInterests,
    state.dailyGoal,
    state.onboardingCompleted,
  ]);

  // 3 Aşamalı Akıllı Öneri Motoru ile anasayfa feed'i
  const homeFeed = React.useMemo<Article[]>(() => {
    return buildRecommendedHomeFeed(state.articles, state.feeds, {
      userInterests: state.userInterests,
      readHistory:   state.readHistory,
      limit:         30,
      halfLifeHours: 24,
    });
  }, [state.articles, state.feeds, state.userInterests, state.readHistory]);

  return (
    <AppContext.Provider value={{ state, dispatch, homeFeed }}>
      {children}
    </AppContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
