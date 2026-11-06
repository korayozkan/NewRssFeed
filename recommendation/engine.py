"""
Ana Öneri Motoru (Unified Recommendation Engine)
================================================
Aşama 1 (Kural Tabanlı), Aşama 2 (Kişiselleştirme & Keşfet) ve Aşama 3 (İleri Düzey Öneri)
aşamalarını tek bir çatı altında koordine eden ana servis sınıfı.
"""

from __future__ import annotations

from typing import Dict, Iterable, List, Optional

from recommendation.context_engine import ContextEngine
from recommendation.models import Article, InteractionType, ScoredArticle, User, UserContext
from recommendation.stage1.pipeline import Stage1Pipeline
from recommendation.stage2.content_similarity import ContentSimilarityEngine
from recommendation.stage2.interaction_store import InteractionStore
from recommendation.stage2.pipeline import Stage2Pipeline
from recommendation.stage3.ab_testing import ABTestingManager
from recommendation.stage3.pipeline import Stage3Pipeline


class RecommendationEngine:
    """Tüm aşamaları yöneten merkezi öneri motoru."""

    def __init__(self):
        # Ortak veri depoları
        self.articles: Dict[str, Article] = {}
        self.users: Dict[str, User] = {}
        self.interaction_store = InteractionStore()
        self.content_engine = ContentSimilarityEngine()
        self.ab_manager = ABTestingManager()

        # Aşama boru hatları
        self.stage1 = Stage1Pipeline()
        self.stage2 = Stage2Pipeline(
            interaction_store=self.interaction_store,
            content_engine=self.content_engine,
        )
        self.stage3 = Stage3Pipeline(
            interaction_store=self.interaction_store,
            ab_manager=self.ab_manager,
        )

    def add_articles(self, articles: Iterable[Article]) -> None:
        """Yeni makaleleri kataloğa ekler ve TF-IDF modelini günceller."""
        for art in articles:
            self.articles[art.id] = art
        self.content_engine.fit(self.articles.values())

    def register_user(self, user: User) -> None:
        """Sisteme kullanıcı kaydeder."""
        self.users[user.id] = user

    def record_user_event(
        self,
        user_id: str,
        article_id: str,
        interaction_type: InteractionType,
        dwell_time_seconds: float = 0.0,
    ) -> None:
        """Kullanıcının makale üzerindeki davranışını kaydeder."""
        self.interaction_store.log(
            user_id=user_id,
            article_id=article_id,
            interaction_type=interaction_type,
            dwell_time_seconds=dwell_time_seconds,
        )

    def recommend(
        self,
        user_id: str,
        stage_level: int = 3,
        is_discover_mode: bool = False,
        limit: int = 20,
        experiment_id: Optional[str] = None,
        context: Optional[UserContext] = None,
    ) -> List[ScoredArticle]:
        """
        Kullanıcı için belirtilen aşamaya kadar ve anlık bağlama göre akış oluşturur.

        Args:
            user_id: Hedef kullanıcı ID'si.
            stage_level: 1 = Sadece Kural Tabanlı
                         2 = Kişiselleştirme & Keşfet (MMR Çeşitlilik)
                         3 = İleri Düzey Öneri (Embedding + CF + LTR + A/B Testi + Bağlam)
            is_discover_mode: Keşfet akışı mı yoksa ana akış mı?
            limit: Döndürülecek maksimum makale adedi.
            experiment_id: A/B testi ID'si (opsiyonel).
            context: Anlık kullanıcı bağlamı (Dil, bölge, saat dilimi, cihaz vb.).
        """
        user = self.users.get(user_id)
        if not user:
            raise ValueError(f"Kullanıcı bulunamadı: {user_id}")

        all_candidates = list(self.articles.values())

        # Aşama 1: Deduplication, Güncellik, Takip Edilen Kaynaklar, İlgi Eşleşmesi ve Dil/Bölge
        s1_results = self.stage1.process(user, all_candidates, context=context)
        if stage_level == 1:
            return s1_results[:limit]

        # Aşama 2: Kişiselleştirme, Dinamik İlgi, İçerik Benzerliği, MMR Çeşitlilik / Keşfet
        s2_results = self.stage2.process(
            user=user,
            stage1_candidates=s1_results,
            article_catalog=self.articles,
            is_discover_mode=is_discover_mode,
        )
        if stage_level == 2:
            return s2_results[:limit]

        # Aşama 3: Embedding, Benzer Kullanıcılar (CF), Learning to Rank (LTR), Bağlam ve A/B Testleri
        s3_results = self.stage3.process(
            user=user,
            stage2_candidates=s2_results,
            article_catalog=self.articles,
            experiment_id=experiment_id,
            context=context,
        )
        return s3_results[:limit]

