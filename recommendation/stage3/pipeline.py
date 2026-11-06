"""
Aşama 3: İleri Düzey Öneri Boru Hattı (Stage 3 Advanced Pipeline)
===============================================================
Aşama 2 adaylarını alır ve Embedding tabanlı anlamsal benzerlik,
İşbirlikçi Filtreleme (Collaborative Filtering), Learning-to-Rank (LTR)
ve A/B Test yönlendirmesi ile nihai sıralamayı üretir.
"""

from __future__ import annotations

from typing import Dict, List, Optional

from recommendation.context_engine import ContextEngine
from recommendation.models import Article, ScoredArticle, User, UserContext
from recommendation.stage2.interaction_store import InteractionStore
from recommendation.stage2.interest_profiler import InterestProfiler
from recommendation.stage3.ab_testing import ABTestingManager
from recommendation.stage3.collaborative import CollaborativeFilteringEngine
from recommendation.stage3.embeddings import EmbeddingEngine
from recommendation.stage3.learning_to_rank import LearningToRankModel


class Stage3Pipeline:
    """Aşama 3 İleri Düzey Öneri Boru Hattı."""

    def __init__(
        self,
        interaction_store: InteractionStore,
        embedding_engine: Optional[EmbeddingEngine] = None,
        cf_engine: Optional[CollaborativeFilteringEngine] = None,
        ltr_model: Optional[LearningToRankModel] = None,
        ab_manager: Optional[ABTestingManager] = None,
        context_engine: Optional[ContextEngine] = None,
    ):
        self.store = interaction_store
        self.profiler = InterestProfiler(self.store)
        self.embedding_engine = embedding_engine or EmbeddingEngine()
        self.cf_engine = cf_engine or CollaborativeFilteringEngine(self.store)
        self.ltr_model = ltr_model or LearningToRankModel()
        self.ab_manager = ab_manager or ABTestingManager()
        self.context_engine = context_engine or ContextEngine()

    def process(
        self,
        user: User,
        stage2_candidates: List[ScoredArticle],
        article_catalog: Dict[str, Article],
        experiment_id: Optional[str] = None,
        context: Optional[UserContext] = None,
    ) -> List[ScoredArticle]:
        """
        Aday içerikleri Aşama 3 gelişmiş modelleriyle (Embedding, CF, LTR) puanlar.
        A/B testi tanımlıysa kullanıcı varyantına göre uygun pipeline'a yönlendirir.
        """
        # A/B Test Varyantı kontrolü
        variant = "production_ltr"
        if experiment_id and experiment_id in self.ab_manager.experiments:
            variant = self.ab_manager.assign_variant(experiment_id, user.id)
            self.ab_manager.record_impression(experiment_id, variant)

            # Kontrol grubundaysa doğrudan Aşama 2 sonucunu döndür (benchmark için)
            if variant == "control_stage2":
                return stage2_candidates

        # 1. İşbirlikçi Filtreleme matrisini hazırla
        self.cf_engine.fit()

        # 2. Kullanıcı embedding vektörünü çıkar
        user_interactions = self.store.get_user_interactions(user.id)
        user_embedding = self.embedding_engine.compute_user_embedding(
            user_interactions, article_catalog
        )

        # 3. Dinamik ilgi profili
        user_profile = self.profiler.compute_user_profile(user, article_catalog)

        # 4. Her aday için LTR özelliklerini çıkar
        feature_dict: Dict[str, Dict[str, float]] = {}
        for item in stage2_candidates:
            art = item.article

            # Embedding benzerliği
            art_emb = art.embedding or self.embedding_engine.generate_embedding(art.full_text)
            if user_embedding:
                emb_sim = self.embedding_engine.cosine_similarity(user_embedding, art_emb)
            else:
                emb_sim = 0.5

            # CF skoru
            cf_score = self.cf_engine.compute_cf_score(user.id, art.id)

            # İlgi profili skoru
            affinity = self.profiler.get_affinity_score(user_profile, art)

            # Aşama 1/2'den gelen hazır skorlar
            recency_score = item.score_breakdown.get("recency", 0.5)
            content_sim_score = item.score_breakdown.get("content_similarity", 0.0)

            # Bağlamsal sinyalleri (dil, bölge, saat dilimi, cihaz) hesapla
            ctx_features = self.context_engine.evaluate_context(art, context)

            features = self.ltr_model.extract_features(
                user=user,
                article=art,
                recency_val=recency_score,
                affinity_val=affinity,
                content_sim_val=content_sim_score,
                embedding_sim_val=emb_sim,
                cf_val=cf_score,
                context_features=ctx_features,
            )
            feature_dict[art.id] = features

        # 5. Learning to Rank ile yeniden sırala
        ranked = self.ltr_model.rank(user, stage2_candidates, feature_dict)
        return ranked

