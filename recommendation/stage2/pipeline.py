"""
Aşama 2: Kişiselleştirme ve Keşfet Boru Hattı (Stage 2 Personalization Pipeline)
=============================================================================
Aşama 1 adaylarını alır ve kullanıcı davranışları, dinamik ilgi profili,
içerik benzerliği, keşfet algoritması ve MMR çeşitlilik filtreleriyle zenginleştirir.
"""

from __future__ import annotations

from typing import Dict, Iterable, List

from recommendation.models import Article, InteractionType, ScoredArticle, User
from recommendation.stage1.pipeline import Stage1Pipeline
from recommendation.stage2.content_similarity import ContentSimilarityEngine
from recommendation.stage2.discover_engine import DiscoverEngine
from recommendation.stage2.diversity import DiversityEngine
from recommendation.stage2.interaction_store import InteractionStore
from recommendation.stage2.interest_profiler import InterestProfiler


class Stage2Pipeline:
    """Aşama 2 kişiselleştirilmiş öneri ve keşfet boru hattı."""

    def __init__(
        self,
        interaction_store: InteractionStore,
        content_engine: ContentSimilarityEngine,
        diversity_engine: DiversityEngine = None,
        discover_engine: DiscoverEngine = None,
        affinity_weight: float = 0.35,
        content_sim_weight: float = 0.25,
    ):
        self.store = interaction_store
        self.profiler = InterestProfiler(self.store)
        self.content_engine = content_engine
        self.diversity_engine = diversity_engine or DiversityEngine()
        self.discover_engine = discover_engine or DiscoverEngine()

        self.affinity_weight = affinity_weight
        self.content_sim_weight = content_sim_weight

    def process(
        self,
        user: User,
        stage1_candidates: List[ScoredArticle],
        article_catalog: Dict[str, Article],
        is_discover_mode: bool = False,
    ) -> List[ScoredArticle]:
        """
        Aşama 1 adaylarını kişiselleştirir, içerik benzerliği ve MMR çeşitliliği uygular.
        """
        # 1. Kullanıcının dinamik ilgi profilini hesapla
        user_profile = self.profiler.compute_user_profile(user, article_catalog)

        # 2. Kullanıcının daha önce beğendiği / kaydettiği makaleleri al
        user_events = self.store.get_user_interactions(user.id)
        liked_article_ids = {
            ev.article_id for ev in user_events
            if ev.interaction_type in (InteractionType.LIKE, InteractionType.BOOKMARK, InteractionType.READ_LONG)
        }
        liked_articles = [article_catalog[aid] for aid in liked_article_ids if aid in article_catalog]

        # 3. Her makale için kişiselleştirilmiş skor bileşenlerini ekle
        personalized_items: List[ScoredArticle] = []
        for scored in stage1_candidates:
            sa = ScoredArticle(
                article=scored.article,
                final_score=scored.final_score * 0.40,  # Aşama 1 puanı %40 ağırlık taşır
                stage="stage2",
                score_breakdown=dict(scored.score_breakdown),
            )

            # Dinamik kategori ilgisi skoru
            affinity = self.profiler.get_affinity_score(user_profile, scored.article)
            sa.add_score("affinity", affinity, weight=self.affinity_weight)

            # İçerik benzerliği skoru (beğenilenlere göre)
            if liked_articles:
                sim = self.content_engine.compute_similarity_to_history(scored.article, liked_articles)
                sa.add_score("content_similarity", sim, weight=self.content_sim_weight)

            personalized_items.append(sa)

        # 4. Keşfet modu veya Ana Sayfa akışı
        if is_discover_mode:
            final_feed = self.discover_engine.compose_discover_feed(
                user, user_profile, personalized_items
            )
        else:
            # Benzerlik fonksiyonu (MMR için)
            def item_sim(a: ScoredArticle, b: ScoredArticle) -> float:
                vec_a = self.content_engine.vectorize(a.article.full_text)
                vec_b = self.content_engine.vectorize(b.article.full_text)
                return self.content_engine.cosine_similarity(vec_a, vec_b)

            # MMR ile çeşitlendir
            mmr_ranked = self.diversity_engine.rerank_with_mmr(personalized_items, item_sim)
            # Kategori doygunluğunu engelle
            final_feed = self.diversity_engine.apply_category_throttling(mmr_ranked)

        for idx, item in enumerate(final_feed):
            item.rank = idx + 1

        return final_feed

