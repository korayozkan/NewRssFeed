"""
Aşama 2: Kullanıcı Davranışları (User Interactions & Implicit Feedback)
======================================================================
Kullanıcının içeriklerle girdiği açık (explicit) ve örtük (implicit)
etkileşimlerin toplanması, ağırlıklandırılması ve saklanması.

Ağırlık Tablosu:
    - SKIP:       -2.0  (Hızlı geçme - negatif sinyal)
    - IMPRESSION: +0.1  (Görüntüleme taban sinyali)
    - CLICK:      +1.0  (Başlığa tıklama)
    - READ_SHORT: +2.5  (10-30 sn okuma)
    - READ_LONG:  +5.0  (60+ sn tam okuma)
    - BOOKMARK:   +6.0  (Kaydetme)
    - LIKE:       +7.0  (Beğeni)
    - SHARE:      +8.5  (Dışarı paylaşma - en güçlü pozitif sinyal)
"""

from __future__ import annotations

import time
from collections import defaultdict
from typing import Dict, List, Optional

from recommendation.models import InteractionType, UserInteraction


class InteractionStore:
    """Kullanıcı etkileşimlerini tutan ve ağırlıklı sinyallere dönüştüren depo."""

    DEFAULT_WEIGHTS: Dict[InteractionType, float] = {
        InteractionType.SKIP: -2.0,
        InteractionType.IMPRESSION: 0.1,
        InteractionType.CLICK: 1.0,
        InteractionType.READ_SHORT: 2.5,
        InteractionType.READ_LONG: 5.0,
        InteractionType.BOOKMARK: 6.0,
        InteractionType.LIKE: 7.0,
        InteractionType.SHARE: 8.5,
    }

    def __init__(self, weights: Optional[Dict[InteractionType, float]] = None):
        self.weights = weights or dict(self.DEFAULT_WEIGHTS)
        # user_id -> List[UserInteraction]
        self.user_events: Dict[str, List[UserInteraction]] = defaultdict(list)
        # article_id -> List[UserInteraction]
        self.article_events: Dict[str, List[UserInteraction]] = defaultdict(list)

    def log(
        self,
        user_id: str,
        article_id: str,
        interaction_type: InteractionType,
        dwell_time_seconds: float = 0.0,
        timestamp: Optional[float] = None,
    ) -> UserInteraction:
        """Kullanıcı etkileşim olayını kaydeder."""
        interaction = UserInteraction(
            user_id=user_id,
            article_id=article_id,
            interaction_type=interaction_type,
            timestamp=timestamp if timestamp is not None else time.time(),
            dwell_time_seconds=dwell_time_seconds,
        )
        self.user_events[user_id].append(interaction)
        self.article_events[article_id].append(interaction)
        return interaction

    def get_user_interactions(self, user_id: str) -> List[UserInteraction]:
        """Kullanıcının geçmiş tüm etkileşimlerini döner."""
        return self.user_events.get(user_id, [])

    def get_article_interactions(self, article_id: str) -> List[UserInteraction]:
        """Belirli bir makaleye yapılan tüm etkileşimleri döner."""
        return self.article_events.get(article_id, [])

    def compute_interaction_weight(self, interaction: UserInteraction) -> float:
        """Tekil bir etkileşimin efektif puan ağırlığını döner."""
        base_weight = self.weights.get(interaction.interaction_type, 0.0)
        # Uzun okuma süresi için ek dwell-time bonusu
        if interaction.dwell_time_seconds > 60:
            dwell_bonus = min(2.0, (interaction.dwell_time_seconds - 60) / 60.0)
            base_weight += dwell_bonus
        return base_weight

