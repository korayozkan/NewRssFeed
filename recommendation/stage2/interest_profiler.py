"""
Aşama 2: Dinamik İlgi Ağırlıkları (Interest Profiler & Temporal Decay)
=====================================================================
Kullanıcının geçmiş etkileşimlerine dayanarak kategorilere ve etiketlere
duyduğu ilgiyi dinamik bir ağırlık vektörüne dönüştürür.

Zaman Aşımı (Temporal Decay):
    Eski etkileşimlerin etkisi zamanla azalır. Kullanıcının bugün okuduğu
    içerik, 10 gün önce okuduğundan çok daha belirleyicidir.
    Formül: w = base_weight * exp(-lambda * delta_days)
"""

from __future__ import annotations

import math
import time
from collections import defaultdict
from typing import Dict, List, Optional

from recommendation.models import Article, User
from recommendation.stage2.interaction_store import InteractionStore


class InterestProfiler:
    """Kullanıcının davranışlarına dayalı dinamik ilgi vektörünü oluşturan sınıf."""

    def __init__(
        self,
        interaction_store: InteractionStore,
        half_life_days: float = 7.0,
    ):
        self.store = interaction_store
        self.half_life_seconds = half_life_days * 86400.0
        self.decay_lambda = math.log(2) / self.half_life_seconds

    def compute_user_profile(
        self,
        user: User,
        article_catalog: Dict[str, Article],
        current_time: Optional[float] = None,
    ) -> Dict[str, float]:
        """
        Kullanıcının dinamik kategori ilgi profili (ör. {'Yapay Zeka': 0.65, 'Tasarım': 0.20}).

        Returns:
            Normalleştirilmiş (toplamı 1.0) kategori ağırlıkları sözlüğü.
        """
        now = current_time if current_time is not None else time.time()
        category_scores: Dict[str, float] = defaultdict(float)

        # 1. Açıkça beyan edilen ilgi alanlarından gelen taban ağırlık (+1.0)
        for interest in user.declared_interests:
            category_scores[interest.strip().lower()] += 1.0

        # 2. Etkileşimlerden gelen dinamik ağırlıklar (zaman aşımı ile)
        interactions = self.store.get_user_interactions(user.id)
        for event in interactions:
            article = article_catalog.get(event.article_id)
            if not article:
                continue

            delta_t = max(0.0, now - event.timestamp)
            decay = math.exp(-self.decay_lambda * delta_t)
            weight = self.store.compute_interaction_weight(event) * decay

            cat = article.category.strip().lower()
            category_scores[cat] += weight

            # Etiketlere de kısmi ağırlık aktar
            for tag in article.tags:
                category_scores[tag.strip().lower()] += weight * 0.3

        # Negatif skorları sıfırla ve Softmax/Min-Max ile normalleştir
        positive_scores = {k: max(0.0, v) for k, v in category_scores.items()}
        total = sum(positive_scores.values())

        if total <= 0:
            return {}

        return {k: v / total for k, v in positive_scores.items()}

    def get_affinity_score(self, user_profile: Dict[str, float], article: Article) -> float:
        """
        Bir makalenin kullanıcının dinamik ilgi profiliyle örtüşme derecesini döner (0.0 - 1.0).
        """
        if not user_profile:
            return 0.5

        cat = article.category.strip().lower()
        score = user_profile.get(cat, 0.0)

        # Etiket katkısı
        tag_contrib = 0.0
        for tag in article.tags:
            tag_contrib += user_profile.get(tag.strip().lower(), 0.0)

        combined = score + (tag_contrib * 0.5)
        return min(1.0, combined)

