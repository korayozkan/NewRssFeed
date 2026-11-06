"""
Aşama 2: Keşfet Algoritması (Discover Engine & Exploration vs. Exploitation)
===========================================================================
Kullanıcının bilinen ilgi alanlarını sömürmek (Exploitation) ile yeni
alanlar ve beklenmedik ilginç içerikler keşfetmesini sağlamak (Exploration)
arasındaki dengeyi yöneten Multi-Armed Bandit / Epsilon-Greedy keşif motoru.

Prensipler:
    1. Sömürü (Exploitation - 1 - epsilon): Kullanıcının geçmişte yüksek etkileşim
       verdiği kategorilerden en yüksek skorlu makaleler (%80 - %85).
    2. Keşif & Şans Eseri (Exploration / Serendipity - epsilon): Kullanıcının henüz
       hiç okumadığı veya az okuduğu ama toplulukta viral/popüler olan kategorilerden
       özenle seçilmiş makaleler (%15 - %20).
"""

from __future__ import annotations

import random
from typing import Dict, List, Set

from recommendation.models import ScoredArticle, User


class DiscoverEngine:
    """Keşfet sekmesi için sömürü ve keşif dengesini kuran motor."""

    def __init__(self, exploration_rate: float = 0.20):
        """
        Args:
            exploration_rate (epsilon): Keşif ve sürpriz içerik oranı (varsayılan: %20).
        """
        self.exploration_rate = exploration_rate

    def partition_candidates(
        self,
        user: User,
        user_profile: Dict[str, float],
        candidates: List[ScoredArticle],
    ) -> Dict[str, List[ScoredArticle]]:
        """
        Aday makaleleri 'bilinen ilgi alanları' (exploitation) ve
        'keşif alanları' (exploration) olmak üzere iki kümeye ayırır.
        """
        known_interests: Set[str] = {i.lower() for i in user.declared_interests}
        known_interests.update(k.lower() for k, v in user_profile.items() if v > 0.05)

        exploit_pool: List[ScoredArticle] = []
        explore_pool: List[ScoredArticle] = []

        for item in candidates:
            cat = item.article.category.lower()
            if cat in known_interests or any(t.lower() in known_interests for t in item.article.tags):
                exploit_pool.append(item)
            else:
                explore_pool.append(item)

        return {"exploit": exploit_pool, "explore": explore_pool}

    def compose_discover_feed(
        self,
        user: User,
        user_profile: Dict[str, float],
        candidates: List[ScoredArticle],
        total_items: int = 30,
        random_seed: int = 42,
    ) -> List[ScoredArticle]:
        """
        Keşfet akışını epsilon-greedy mantığıyla harmanlar.
        """
        rng = random.Random(random_seed)
        pools = self.partition_candidates(user, user_profile, candidates)
        exploit_pool = sorted(pools["exploit"], key=lambda x: x.final_score, reverse=True)
        explore_pool = sorted(pools["explore"], key=lambda x: x.article.likes + x.article.views, reverse=True)

        num_explore = int(total_items * self.exploration_rate)
        num_exploit = total_items - num_explore

        selected_exploit = exploit_pool[:num_exploit]
        selected_explore = explore_pool[:num_explore]

        # Keşif içeriklerine 'serendipity' puanı ve etiketi ekle
        for item in selected_explore:
            item.add_score("serendipity_boost", 0.15)
            item.stage = "stage2_discover"

        # İçerikleri harmanla: her 4-5 sömürü içeriğinden sonra 1 keşif içeriği yerleştir
        feed: List[ScoredArticle] = []
        exp_idx = 0
        for i, item in enumerate(selected_exploit):
            feed.append(item)
            if (i + 1) % 4 == 0 and exp_idx < len(selected_explore):
                feed.append(selected_explore[exp_idx])
                exp_idx += 1

        # Kalan keşif içeriklerini sona ekle
        while exp_idx < len(selected_explore):
            feed.append(selected_explore[exp_idx])
            exp_idx += 1

        return feed

