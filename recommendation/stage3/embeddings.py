"""
Aşama 3: Embedding Tabanlı Öneriler (Vector Embeddings & Semantic Search)
========================================================================
İçeriklerin ve kullanıcıların yoğun (dense) anlamsal vektör uzayında temsil
edilmesi ve kosinüs benzerliği ile anlamsal eşleşmelerin yakalanması.

Özellikler:
    1. Metin Vektörleştirme: Makalelerin başlık, özet ve etiketlerini yoğun
       anlamsal vektörlere dönüştürür (harici model desteği veya yerleşik hash projeksiyonu).
    2. Kullanıcı Profil Vektörü: Kullanıcının etkileşime girdiği makalelerin
       vektörlerinin ağırlıklı ağırlık merkezi (weighted centroid):
       v_user = sum(w_i * v_article_i) / sum(w_i)
    3. Anlamsal Benzerlik: v_user ile v_candidate arasındaki kosinüs benzerliği.
"""

from __future__ import annotations

import hashlib
import math
from typing import Dict, List, Optional

from recommendation.models import Article, UserInteraction


class EmbeddingEngine:
    """Yoğun vektör uzayında anlamsal temsil ve benzerlik arama motoru."""

    def __init__(self, dimension: int = 64):
        """
        Args:
            dimension: Vektör boyutu (varsayılan: 64). Harici modeller (ör. OpenAI 1536,
                       SentenceTransformers 384/768) ile de tam uyumludur.
        """
        self.dimension = dimension

    def generate_embedding(self, text: str) -> List[float]:
        """
        Metinden deterministik, normalize edilmiş yoğun özellik vektörü üretir.
        (Üretimde SentenceTransformers veya OpenAI/Gemini Embeddings ile tak-çıkar entegre edilebilir).
        """
        tokens = text.lower().split()
        if not tokens:
            return [0.0] * self.dimension

        vec = [0.0] * self.dimension
        for token in tokens:
            # Token bazlı çoklu hash projeksiyonu
            h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
            idx = h % self.dimension
            val = ((h >> 8) % 1000) / 500.0 - 1.0  # -1.0 ile +1.0 arası
            vec[idx] += val

        # L2 Normalizasyonu
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            return [x / norm for x in vec]
        return vec

    @staticmethod
    def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        """İki yoğun vektör arasındaki kosinüs benzerliğini döner (-1.0 ile 1.0 arası)."""
        if not vec_a or not vec_b or len(vec_a) != len(vec_b):
            return 0.0

        dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))

        if norm_a == 0 or norm_b == 0:
            return 0.0

        sim = dot_product / (norm_a * norm_b)
        # 0.0 - 1.0 aralığına ölçekle
        return max(0.0, min(1.0, (sim + 1.0) / 2.0))

    def compute_user_embedding(
        self,
        interactions: List[UserInteraction],
        article_catalog: Dict[str, Article],
        interaction_weights: Dict[str, float] = None,
    ) -> Optional[List[float]]:
        """
        Kullanıcının geçmiş etkileşimlerinin ağırlıklı ortalamasıyla kullanıcı vektörünü çıkarır.
        """
        weights = interaction_weights or {
            "like": 3.0, "bookmark": 2.5, "read_long": 2.0, "click": 1.0, "skip": -1.0
        }

        centroid = [0.0] * self.dimension
        total_weight = 0.0

        for event in interactions:
            article = article_catalog.get(event.article_id)
            if not article:
                continue

            emb = article.embedding or self.generate_embedding(article.full_text)
            w = weights.get(event.interaction_type.value, 1.0)
            if w <= 0:
                continue

            for i in range(self.dimension):
                centroid[i] += emb[i] * w
            total_weight += w

        if total_weight <= 0:
            return None

        # Normalize et
        norm = math.sqrt(sum(x * x for x in centroid))
        if norm > 0:
            return [x / norm for x in centroid]
        return None

