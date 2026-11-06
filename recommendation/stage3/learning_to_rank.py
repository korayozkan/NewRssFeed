"""
Aşama 3: Learning to Rank (LTR - Sıralama Öğrenme Modeli)
=========================================================
Kullanıcı, içerik ve etkileşim özelliklerini (features) birleştirerek
makalenin kullanıcı tarafından tıklanma / okunma olasılığını tahmin eden
sıralama modeli.

Özellik Mühendisliği (Feature Engineering):
    - f1: Recency Score (Güncellik)
    - f2: Source Followed (Kullanıcı kaynağı takip ediyor mu? 0/1)
    - f3: Category Affinity (Kullanıcının bu kategoriye ilgisi 0-1)
    - f4: Content Similarity (TF-IDF benzerliği 0-1)
    - f5: Embedding Cosine Sim (Anlamsal vektör benzerliği 0-1)
    - f6: Collaborative Score (Benzer kullanıcıların ilgisi 0-1)
    - f7: Global Popularity (Logaritmik beğeni + görüntülenme)

Model:
    Pointwise Logistic Ranking Function:
    y = Sigmoid(w^T * x + b)
    (Gerektiğinde LightGBM / XGBoost Ranker ile doğrudan değiştirilebilir).
"""

from __future__ import annotations

import math
from typing import Dict, List, Optional

from recommendation.models import Article, ScoredArticle, User


class LearningToRankModel:
    """Özellik çıkarımı ve LTR sıralama motoru."""

    # Varsayılan LTR ağırlık vektörü (model ağırlıkları)
    DEFAULT_WEIGHTS: Dict[str, float] = {
        "recency": 0.85,
        "source_followed": 1.20,
        "category_affinity": 1.10,
        "content_similarity": 0.95,
        "embedding_similarity": 1.35,
        "collaborative_score": 1.15,
        "popularity": 0.40,
        # Bağlamsal (Context-Aware) Ağırlıklar:
        "context_composite": 1.25,
        "context_language": 1.40,
        "context_time": 0.80,
        "context_device": 0.70,
        "bias": -0.50,
    }

    def __init__(self, weights: Optional[Dict[str, float]] = None):
        self.weights = weights or dict(self.DEFAULT_WEIGHTS)

    @staticmethod
    def _sigmoid(x: float) -> float:
        """Sayısal taşmayı (overflow) önleyen güvenli Sigmoid fonksiyonu."""
        if x < -40.0:
            return 0.0
        if x > 40.0:
            return 1.0
        return 1.0 / (1.0 + math.exp(-x))

    def extract_features(
        self,
        user: User,
        article: Article,
        recency_val: float,
        affinity_val: float,
        content_sim_val: float,
        embedding_sim_val: float,
        cf_val: float,
        context_features: Optional[Dict[str, float]] = None,
    ) -> Dict[str, float]:
        """Kullanıcı-İçerik çifti için özellik vektörü çıkarır."""
        source_followed = 1.0 if article.source_id in user.followed_sources else 0.0
        # Popülerlik: log(views + likes*2 + 1) normalize
        raw_pop = article.views + (article.likes * 2) + (article.bookmarks * 3)
        pop_score = min(1.0, math.log1p(raw_pop) / 10.0)

        feats = {
            "recency": recency_val,
            "source_followed": source_followed,
            "category_affinity": affinity_val,
            "content_similarity": content_sim_val,
            "embedding_similarity": embedding_sim_val,
            "collaborative_score": cf_val,
            "popularity": pop_score,
        }

        # Bağlamsal (Context-Aware) özellikleri ekle
        ctx = context_features or {}
        feats["context_composite"] = ctx.get("context_composite", 1.0)
        feats["context_language"] = ctx.get("context_language", 1.0)
        feats["context_time"] = ctx.get("context_time", 1.0)
        feats["context_device"] = ctx.get("context_device", 1.0)

        return feats

    def predict_score(self, features: Dict[str, float]) -> float:
        """Özellik vektörünü model ağırlıklarıyla çarparak nihai LTR skoru (0.0 - 1.0) döner."""
        linear_combination = self.weights.get("bias", 0.0)
        for feat_name, feat_val in features.items():
            weight = self.weights.get(feat_name, 0.0)
            linear_combination += weight * feat_val

        return self._sigmoid(linear_combination)

    def rank(
        self,
        user: User,
        candidates: List[ScoredArticle],
        feature_dict: Dict[str, Dict[str, float]],
    ) -> List[ScoredArticle]:
        """Aday listesini LTR tahmin skorlarına göre yeniden sıralar."""
        ranked: List[ScoredArticle] = []
        for item in candidates:
            feats = feature_dict.get(item.article.id, {})
            score = self.predict_score(feats)
            ltr_item = ScoredArticle(
                article=item.article,
                final_score=score,
                stage="stage3_ltr",
                score_breakdown=dict(feats),
            )
            ranked.append(ltr_item)

        ranked.sort(key=lambda x: x.final_score, reverse=True)
        for idx, item in enumerate(ranked):
            item.rank = idx + 1
        return ranked

