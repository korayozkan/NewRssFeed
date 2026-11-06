"""
Aşama 3: İşbirlikçi Filtreleme ve Benzer Kullanıcılar (Collaborative Filtering)
=============================================================================
Kullanıcılar arası davranış benzerliğini (User-User) ve içeriklerin birlikte
okunma frekansını (Item-Item Co-occurrence) analiz ederek öneri üretir.

1. Benzer Kullanıcılar (User-User Similarity):
   Seninle benzer makaleleri okuyan/beğenen kullanıcıların (K-Nearest Neighbors)
   tükettiği diğer makaleleri keşfet.

2. Birlikte Tüketim (Item-Item CF):
   "Bu makaleyi okuyanlar bunları da okudu/beğendi" (Co-occurrence Matrix).
"""

from __future__ import annotations

import math
from collections import defaultdict
from typing import Dict, List, Optional, Set, Tuple

from recommendation.models import InteractionType, UserInteraction
from recommendation.stage2.interaction_store import InteractionStore


class CollaborativeFilteringEngine:
    """Kullanıcı ve İçerik tabanlı İşbirlikçi Filtreleme motoru."""

    def __init__(self, interaction_store: InteractionStore):
        self.store = interaction_store
        # user_id -> set of interacted article_ids
        self.user_history: Dict[str, Set[str]] = defaultdict(set)
        # article_id -> set of user_ids who interacted positively
        self.article_consumers: Dict[str, Set[str]] = defaultdict(set)

    def fit(self) -> None:
        """Tüm kullanıcı etkileşim matrisini günceller."""
        self.user_history.clear()
        self.article_consumers.clear()

        positive_types = {
            InteractionType.CLICK, InteractionType.READ_SHORT,
            InteractionType.READ_LONG, InteractionType.LIKE, InteractionType.BOOKMARK,
        }

        for user_id, events in self.store.user_events.items():
            for ev in events:
                if ev.interaction_type in positive_types:
                    self.user_history[user_id].add(ev.article_id)
                    self.article_consumers[ev.article_id].add(user_id)

    @staticmethod
    def _jaccard_similarity(set_a: Set[str], set_b: Set[str]) -> float:
        if not set_a or not set_b:
            return 0.0
        intersection = len(set_a & set_b)
        union = len(set_a | set_b)
        return intersection / union if union > 0 else 0.0

    def find_similar_users(self, target_user_id: str, top_k: int = 5) -> List[Tuple[str, float]]:
        """
        Hedef kullanıcıya tüketim alışkanlıkları en çok benzeyen K kullanıcıyı döner.
        """
        target_items = self.user_history.get(target_user_id, set())
        if not target_items:
            return []

        similarities: List[Tuple[str, float]] = []
        for other_user_id, other_items in self.user_history.items():
            if other_user_id == target_user_id:
                continue
            sim = self._jaccard_similarity(target_items, other_items)
            if sim > 0:
                similarities.append((other_user_id, sim))

        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_k]

    def compute_cf_score(self, target_user_id: str, article_id: str) -> float:
        """
        Hedef kullanıcının benzer kullanıcılar ağına göre bu makaleyi beğenme ihtimali (0.0 - 1.0).
        """
        consumers = self.article_consumers.get(article_id, set())
        if not consumers:
            return 0.0

        similar_users = self.find_similar_users(target_user_id, top_k=10)
        if not similar_users:
            return 0.0

        weighted_vote = 0.0
        total_sim = 0.0

        for sim_user_id, sim in similar_users:
            total_sim += sim
            if sim_user_id in consumers:
                weighted_vote += sim

        return (weighted_vote / total_sim) if total_sim > 0 else 0.0

