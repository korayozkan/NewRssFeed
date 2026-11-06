"""
Aşama 1: İlgi Alanları ve İçerik Kategorileri (Interest & Category Filter)
========================================================================
Kullanıcının kayıt olurken veya ayarlarında seçtiği açık ilgi alanları
(declared interests) ve makalenin kategorisi/etiketleri arasındaki uyumun puanlanması.
"""

from __future__ import annotations

from typing import Iterable, Set

from recommendation.models import Article, User


class InterestFilter:
    """Kullanıcının beyan ettiği ilgi alanlarına göre eşleşme skoru üretir."""

    def __init__(self, category_weight: float = 0.6, tag_weight: float = 0.4):
        """
        Args:
            category_weight: Kategori eşleşmesinin skordaki ağırlığı.
            tag_weight: Etiket örtüşmelerinin skordaki ağırlığı.
        """
        self.category_weight = category_weight
        self.tag_weight = tag_weight

    @staticmethod
    def _normalize_token(token: str) -> str:
        return token.strip().lower()

    def calculate_score(self, user: User, article: Article) -> float:
        """
        Kullanıcının beyan ettiği ilgi alanları ile makalenin kategori ve etiketlerini
        kıyaslayarak 0.0 - 1.0 arasında bir alaka skoru döner.
        """
        if not user.declared_interests:
            # Kullanıcı hiçbir ilgi alanı belirtmemişse nötr taban puan verilir.
            return 0.5

        user_interests = {self._normalize_token(i) for i in user.declared_interests}
        article_cat = self._normalize_token(article.category)
        article_tags = {self._normalize_token(t) for t in article.tags}

        # 1. Kategori eşleşmesi
        category_match = 1.0 if article_cat in user_interests else 0.0

        # 2. Etiket örtüşmesi (Jaccard-like overlap)
        tag_overlap_count = len(user_interests & article_tags)
        tag_match = min(1.0, tag_overlap_count / max(1, min(len(user_interests), 3)))

        score = (category_match * self.category_weight) + (tag_match * self.tag_weight)
        return max(0.0, min(1.0, score))

