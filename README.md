# NewRssFeed

> **Everything you follow, in one place.**

A mobile-first RSS/Atom reader built with **Expo (SDK 58)** and a **Python recommendation engine** that surfaces the most relevant articles based on your interests, language, region, time-of-day, and device context.

[![CI](https://github.com/korayozkan/NewRssFeed/actions/workflows/ci.yml/badge.svg)](https://github.com/korayozkan/NewRssFeed/actions/workflows/ci.yml)
[![Release](https://github.com/korayozkan/NewRssFeed/actions/workflows/release.yml/badge.svg)](https://github.com/korayozkan/NewRssFeed/releases)

---

## Features

- 📰 RSS 2.0 & Atom feed support (regex-based parser — no DOMParser required in RN)
- 🔗 Auto-detect YouTube, Reddit, GitHub, Medium, Substack → RSS URL
- 🤖 3-stage recommendation engine (Python)
  - **Stage 1** — Freshness, relevance, language/region filtering
  - **Stage 2** — User behaviour, interest weighting, collaborative filtering
  - **Stage 3** — LTR (Learning to Rank), embedding-based similarity, A/B framework
- 🌍 Context-aware scoring: language, region, time-of-day, device type
- 🌙 Dark-mode UI (NativeWind + Tailwind)
- 🔐 Supabase auth (login / register)
- ☁️ Cloudflare Worker RSS proxy (no CORS issues)

---

## Getting Started

### Prerequisites

- Node 20+
- Expo CLI (`npm i -g expo-cli` or use `npx`)
- Python 3.11+ (for the recommendation engine)
- A Cloudflare account (free tier is enough)

### 1. Clone & install

```bash
git clone https://github.com/korayozkan/NewRssFeed.git
cd NewRssFeed
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# edit .env.local — fill in your Cloudflare Worker URL and Supabase keys
```

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_CF_WORKER_URL` | Your Cloudflare Worker URL (`https://<name>.<account>.workers.dev`) |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |

### 3. Cloudflare Worker (RSS Proxy) setup

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create a Worker**
2. Paste the proxy code:

```js
addEventListener('fetch', event => {
  const { searchParams } = new URL(event.request.url);
  const target = searchParams.get('url');
  if (!target) return event.respondWith(new Response('url param required', { status: 400 }));
  return event.respondWith(fetch(target, { headers: { 'User-Agent': 'rss-proxy' } }));
});
```

3. Click **Deploy** and copy the URL (`https://<name>.<account>.workers.dev`) into `.env.local`.

### 4. Run

```bash
npx expo start --clear
```

---

## Recommendation Engine (Python)

```bash
cd recommendation
pip install -r requirements.txt   # no heavy deps by default
python ../example_runner.py        # smoke test
```

See [`docs/RECOMMENDATION_SYSTEM.md`](docs/RECOMMENDATION_SYSTEM.md) for full architecture docs.

---

## CI / CD

| Workflow | Trigger | What it does |
|---|---|---|
| **CI** | push / PR to `main` | Lint, typecheck, Python smoke test |
| **Release** | push tag `v*.*.*` | Creates a GitHub Release with changelog notes |
| **EAS Build** | tag or manual dispatch | Builds iOS & Android via EAS |

### Creating a release

```bash
git tag v1.1.0
git push origin v1.1.0
# GitHub Actions automatically creates the release
```

---

## Project Structure

```
NewRssFeed/
├── App.tsx                   # Root — onboarding gate + tab navigator
├── src/
│   ├── screens/              # HomeScreen, ExploreScreen, ProfileScreen, …
│   ├── components/           # FeedCard, XPRing, …
│   └── lib/                  # store, storage, feed fetcher, utils
├── recommendation/           # Python recommendation engine
│   ├── stage1/               # Filtering pipeline
│   ├── stage2/               # Personalisation pipeline
│   ├── stage3/               # LTR + collaborative filtering
│   ├── context_engine.py     # Language / region / time / device scoring
│   ├── engine.py             # Main RecommendationEngine
│   └── models.py             # Dataclasses (Article, UserContext, …)
├── docs/
│   └── RECOMMENDATION_SYSTEM.md
├── .github/
│   ├── workflows/            # ci.yml, release.yml, eas-build.yml
│   └── dependabot.yml
└── .env.example
```

---

## License

MIT © [Koray Özkan](https://github.com/korayozkan)
