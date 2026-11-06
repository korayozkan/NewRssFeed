"""
Aşama 2: İçerik Benzerliği (Content-Based Similarity & TF-IDF)
=============================================================
Kullanıcının daha önce beğendiği / uzun süre okuduğu makaleler ile
aday yeni makaleler arasındaki metin düzeyinde benzerliğin (TF-IDF ve Cosine Similarity)
hesaplanması.
"""

from __future__ import annotations

import math
import re
from collections import Counter, defaultdict
from typing import Dict, Iterable, List, Set

from recommendation.models import Article


class ContentSimilarityEngine:
    """TF-IDF ve Kosinüs Benzerliği tabanlı içerik karşılaştırıcı."""

    STOPWORDS: Set[str] = {
        "ve", "ile", "bir", "bu", "şu", "o", "da", "de", "için", "gibi", "kadar",
        "daha", "en", "çok", "ne", "var", "yok", "ama", "fakat", "ancak", "the",
        "and", "is", "in", "to", "of", "a", "an", "for", "on", "with", "as", "by",
    }

    def __init__(self):
        self.doc_count = 0
        self.doc_frequencies: Dict[str, int] = defaultdict(int)

    def _tokenize(self, text: str) -> List[str]:
        tokens = re.findall(r"\b[a-zA-ZğüşıöçĞÜŞİÖÇ0-9_]{2,}\b", text.lower())
        return [t for t in tokens if t not in self.STOPWORDS]

    def fit(self, corpus: Iterable[Article]) -> None:
        """Külliyatı (corpus) tarayarak IDF (ters belge frekansı) tablosunu çıkarır."""
        self.doc_count = 0
        self.doc_frequencies.clear()
        for article in corpus:
            self.doc_count += 1
            unique_terms = set(self._tokenize(article.full_text))
            for term in unique_terms:
                self.doc_frequencies[term] += 1

    def vectorize(self, text: str) -> Dict[str, float]:
        """Metni l2-normalleştirilmiş TF-IDF ağırlık vektörüne dönüştürür."""
        tokens = self._tokenize(text)
        if not tokens:
            return {}

        tf = Counter(tokens)
        total_tokens = len(tokens)
        tfidf: Dict[str, float] = {}

        for term, count in tf.items():
            tf_val = count / total_tokens
            # IDF: log((N + 1) / (df + 1)) + 1
            df = self.doc_frequencies.get(term, 0)
            idf_val = math.log((self.doc_count + 1) / (df + 1)) + 1.0
            tfidf[term] = tf_val * idf_val

        # L2 Normalizasyon
        norm = math.sqrt(sum(v * v for v in tfidf.values()))
        if norm > 0:
            return {k: v / norm for k, v in tfidf.items()}
        return tfidf

    @staticmethod
    def cosine_similarity(vec_a: Dict[str, float], vec_b: Dict[str, float]) -> float:
        """İki seyrek vektör arasındaki kosinüs benzerliğini döner (0.0 - 1.0)."""
        if not vec_a or not vec_b:
            return 0.0

        # Küçük olan küme üzerinden iterasyon (performans optimizasyonu)
        smaller, larger = (vec_a, vec_b) if len(vec_a) < len(vec_b) else (vec_b, vec_a)
        dot_product = sum(weight * larger.get(term, 0.0) for term, weight in smaller.items())
        return max(0.0, min(1.0, dot_product))

    def compute_similarity_to_history(
        self,
        candidate: Article,
        liked_articles: List[Article],
    ) -> float:
        """
        Aday makalenin, kullanıcının beğendiği geçmiş makaleler kümesine ortalama
        veya maksimum kosinüs benzerliğini hesaplar.
        """
        if not liked_articles:
            return 0.0

        cand_vec = self.vectorize(candidate.full_text)
        if not cand_vec:
            return 0.0

        scores = [
            self.cosine_similarity(cand_vec, self.vectorize(liked.full_text))
            for liked in liked_articles[:15]  # En son 15 beğeni
        ]
        return max(scores) if scores else 0.0

