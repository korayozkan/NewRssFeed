"""
Aşama 1: Kural Tabanlı Feed Boru Hattı (Stage 1 Pipeline)
=========================================================
1. Aşama isterlerini bir araya getirir:
   - Tekrar içerik kontrolü (Deduplication)
   - Takip edilen kaynaklar (Followed sources)
   - İlgi alanları & İçerik kategorileri
   - Güncellik puanlaması (Recency time decay)
"""

from __future__ import annotations

from typing import Iterable, List, Optional

from recommendation.context_engine import ContextEngine
from recommendation.models import Article, ScoredArticle, User, UserContext
from recommendation.stage1.deduplication import ContentDeduplicator
from recommendation.stage1.interest_filter import InterestFilter
from recommendation.stage1.recency import RecencyScorer
from recommendation.stage1.source_tracker import SourceTracker


class Stage1Pipeline:
    """Aşama 1 kural tabanlı puanlama ve filtreleme boru hattı."""

    def __init__(
        self,
        recency_weight: float = 0.40,
        source_weight: float = 0.35,
        interest_weight: float = 0.25,
        half_life_hours: float = 24.0,
    ):
        """
        Aşama 1 bileşen ağırlıklarının toplamı 1.0 olacak şekilde yapılandırılır.
        """
        self.recency_weight = recency_weight
        self.source_weight = source_weight
        self.interest_weight = interest_weight

        self.deduplicator = ContentDeduplicator()
        self.recency_scorer = RecencyScorer(half_life_hours=half_life_hours)
        self.source_tracker = SourceTracker()
        self.interest_filter = InterestFilter()

    def process(
        self,
        user: User,
        articles: Iterable[Article],
        context: Optional[UserContext] = None,
    ) -> List[ScoredArticle]:
        """
        Aday makaleleri deduplicate eder, Aşama 1 kurallarıyla puanlar ve sıralar.
        Kullanıcı bağlamı (context) varsa dil bariyeri kontrolü uygular.
        """
        # 1. Tekrar içerik kontrolü
        unique_articles = self.deduplicator.filter_duplicates(articles)

        scored: List[ScoredArticle] = []
        for article in unique_articles:
            # Dil filtresi (Kullanıcının hiç bilmediği dilleri ele)
            if context:
                lang_score = ContextEngine.calculate_language_score(article, context)
                if lang_score < 0.2:
                    continue

            sa = ScoredArticle(article=article, stage="stage1")

            # Güncellik
            recency_score = self.recency_scorer.calculate_score(article.published_at)
            sa.add_score("recency", recency_score, weight=self.recency_weight)

            # Kaynak takibi
            source_score = self.source_tracker.calculate_score(user, article)
            sa.add_score("source", source_score, weight=self.source_weight)

            # İlgi alanları ve kategori
            interest_score = self.interest_filter.calculate_score(user, article)
            sa.add_score("interest", interest_score, weight=self.interest_weight)

            # Bağlamsal uyum (dil + bölge)
            if context:
                region_score = ContextEngine.calculate_region_score(article, context)
                sa.add_score("context_region", region_score, weight=0.15)

            scored.append(sa)

        # Puana göre sırala
        scored.sort(key=lambda x: x.final_score, reverse=True)
        for idx, item in enumerate(scored):
            item.rank = idx + 1

        return scored

