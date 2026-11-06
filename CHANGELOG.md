# Changelog

All notable changes to NewRssFeed will be documented in this file.
Format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- Context-aware recommendation engine (Python) — language, region, time-of-day, device scoring
- 3-stage recommendation pipeline: Stage 1 (filtering), Stage 2 (personalisation), Stage 3 (LTR + collaborative filtering)
- Onboarding screen: interests, daily goal, language/region preferences
- `fetchFeedFromWorker` — Cloudflare Worker RSS proxy integration
- Feed parser (RSS 2.0 + Atom) without DOMParser (regex-based, React Native compatible)
- YouTube / Reddit / GitHub / Medium / Substack URL → RSS URL converter
- `FeedCard` component with read/star actions
- Dark-mode UI (NativeWind + Tailwind)
- AsyncStorage persistence for feeds, articles, user preferences
- GitHub Actions: CI (lint + typecheck), Release (tag-triggered), EAS Build
- Dependabot for npm, GitHub Actions, and pip

## [1.0.0] - 2026-11-06

### Added
- Initial project setup with Expo SDK 58
- Bottom-tab navigation (Home, Explore, Profile)
- Supabase auth (login / register screens)
