"""
Aşama 1: Takip Edilen Kaynaklar (Source Tracker & Booster)
==========================================================
Kullanıcının doğrudan abone olduğu (follow ettiği) RSS/haber kaynaklarının
önceliklendirilmesi ve ağ içi / ağ dışı ayrımı.
"""

from __future__ import annotations

from typing import Dict, Set

from recommendation.models import Article, User


class SourceTracker:
    """Kullanıcının takip ettiği kaynaklara dayalı skorlayıcı."""

    def __init__(
        self,
        followed_boost: float = 1.0,
        unfollowed_penalty: float = 0.2,
        source_reputations: Dict[str, float] = None,
    ):
        """
        Args:
            followed_boost: Kullanıcının takip ettiği kaynaktan gelen içerik için taban puan.
            unfollowed_penalty: Takip edilmeyen (keşif) kaynaklar için verilen taban puan.
            source_reputations: Kaynak bazlı global güvenilirlik/kalite katsayısı (1.0 varsayılan).
        """
        self.followed_boost = followed_boost
        self.unfollowed_penalty = unfollowed_penalty
        self.source_reputations = source_reputations or {}

    def is_followed(self, user: User, article: Article) -> bool:
        """Kullanıcının bu kaynağı takip edip etmediğini döndürür."""
        return article.source_id in user.followed_sources

    def calculate_score(self, user: User, article: Article) -> float:
        """
        Kaynak aboneliği ve kaynak itibarına dayalı skoru hesaplar (0.0 - 1.0).
        """
        reputation = self.source_reputations.get(article.source_id, 1.0)

        if self.is_followed(user, article):
            base = self.followed_boost
        else:
            base = self.unfollowed_penalty

        return max(0.0, min(1.0, base * reputation))

