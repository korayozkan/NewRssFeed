// ── Tip Tanımları ─────────────────────────────────────────────────────────

export interface Feed {
  id: string;
  name: string;
  url: string;
  favicon: string | null;
}

export interface Article {
  id: string;
  feedId: string;
  feedName: string;
  favicon: string;
  title: string;
  desc: string;
  url: string;
  date: Date;
  image: string | null;
  content: string;
  tags: string[];
  read: boolean;
  starred: boolean;
}

export interface AppState {
  feeds: Feed[];
  articles: Article[];
  readHistory: Record<string, number>;  // articleId → timestamp
  notes: Record<string, string>;
  highlights: Record<string, string[]>;
  activeFeedId: string;
  activeFilter: 'all' | 'unread' | 'starred';
  searchQuery: string;
  activeTag: string;
  loading: boolean;
  userInterests: string[];
  dailyGoal: number;
  onboardingCompleted: boolean;
}

export type AppAction =
  | { type: 'LOAD'; payload: Partial<AppState> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_FEEDS_AND_ARTICLES'; feeds: Feed[]; articles: Article[] }
  | { type: 'ADD_FEED'; feed: Feed; articles: Article[] }
  | { type: 'REMOVE_FEED'; feedId: string }
  | { type: 'ADD_ARTICLES'; articles: Article[] }
  | { type: 'MARK_READ'; articleId: string }
  | { type: 'TOGGLE_STAR'; articleId: string }
  | { type: 'SET_ACTIVE_FEED'; feedId: string }
  | { type: 'SET_FILTER'; filter: AppState['activeFilter'] }
  | { type: 'SET_SEARCH'; query: string }
  | { type: 'SET_TAG'; tag: string }
  | {
      type: 'COMPLETE_ONBOARDING';
      interests: string[];
      dailyGoal: number;
      feeds?: Feed[];
      articles?: Article[];
    };
