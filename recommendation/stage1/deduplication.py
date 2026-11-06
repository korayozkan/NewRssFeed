"""
Aşama 1: Tekrar İçerik Kontrolü (Deduplication)
==============================================
Farklı RSS kaynaklarından gelen mükerrer veya neredeyse aynı (syndicated)
içeriklerin tespit edilmesi ve filtrelenmesi.

Yöntemler:
1. Canonical URL Normalizasyonu: UTM parametreleri ve takip taglerinin temizlenmesi.
2. Tam Eşleşme (Exact Hash): SHA-256 ile birebir aynı metinlerin elenmesi.
3. Yaklaşık Benzerlik (SimHash / N-Gram Jaccard): Başlık ve içerikteki benzerlik oranı
   eşik değerin (%75+) üzerindeyse daha güncel/güvenilir olanın seçilmesi.
"""

from __future__ import annotations

import hashlib
import re
from typing import Dict, Iterable, List, Optional, Set, Tuple
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from recommendation.models import Article


class ContentDeduplicator:
    """Mükerrer ve kopya içerikleri ayıklayan sınıf."""

    # Temizlenecek izleme/pazarlama URL parametreleri
    TRACKING_PARAMS: Set[str] = {
        "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
        "fbclid", "gclid", "ref", "source", "feed_id", "rss",
    }

    def __init__(self, simhash_threshold: float = 0.78):
        """
        Args:
            simhash_threshold: İki içeriğin kopya sayılması için gereken asgari
                               Jaccard/SimHash benzerlik oranı (0.0 - 1.0).
        """
        self.simhash_threshold = simhash_threshold
        self.seen_urls: Set[str] = set()
        self.seen_hashes: Set[str] = set()
        self.article_fingerprints: Dict[str, Set[str]] = {}

    @classmethod
    def normalize_url(cls, raw_url: str) -> str:
        """
        URL'den izleme parametrelerini ayıklar ve standart formata getirir.

        Args:
            raw_url: Orijinal makale URL'si.
        Returns:
            Normalleştirilmiş temiz URL.
        """
        parsed = urlparse(raw_url.strip())
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]

        clean_params = [
            (k, v) for k, v in parse_qsl(parsed.query)
            if k.lower() not in cls.TRACKING_PARAMS
        ]
        clean_query = urlencode(sorted(clean_params))
        path = parsed.path.rstrip("/")

        return urlunparse((parsed.scheme.lower(), netloc, path, "", clean_query, ""))

    @staticmethod
    def _text_hash(text: str) -> str:
        """Metnin SHA-256 özetini üretir."""
        cleaned = re.sub(r"\s+", " ", text.lower().strip())
        return hashlib.sha256(cleaned.encode("utf-8")).hexdigest()

    @staticmethod
    def _get_shingles(text: str, k: int = 3) -> Set[str]:
        """Metni k-gram (shingle) kümesine dönüştürür."""
        tokens = re.findall(r"\w+", text.lower())
        if len(tokens) < k:
            return set(tokens)
        return {" ".join(tokens[i:i + k]) for i in range(len(tokens) - k + 1)}

    def calculate_similarity(self, text_a: str, text_b: str) -> float:
        """
        İki metin arasındaki Jaccard k-gram benzerliğini hesaplar (0.0 - 1.0).
        """
        shingles_a = self._get_shingles(text_a)
        shingles_b = self._get_shingles(text_b)
        if not shingles_a or not shingles_b:
            return 0.0
        intersection = len(shingles_a & shingles_b)
        union = len(shingles_a | shingles_b)
        return intersection / union if union > 0 else 0.0

    def is_duplicate(self, article: Article) -> Tuple[bool, Optional[str]]:
        """
        Makalenin daha önce görülüp görülmediğini kontrol eder.

        Returns:
            (is_duplicate, reason): Kopya ise True ve nedeni döner.
        """
        # 1. URL kontrolü
        clean_url = self.normalize_url(article.url)
        if clean_url in self.seen_urls:
            return True, f"Aynı URL: {clean_url}"

        # 2. Tam metin hash kontrolü
        content_hash = self._text_hash(article.title + " " + article.content[:500])
        if content_hash in self.seen_hashes:
            return True, "Tam metin/başlık eşleşmesi"

        # 3. N-gram benzerlik kontrolü (başlık + özet)
        candidate_shingles = self._get_shingles(article.title + " " + article.content[:200])
        for existing_id, existing_shingles in self.article_fingerprints.items():
            if not existing_shingles or not candidate_shingles:
                continue
            intersection = len(existing_shingles & candidate_shingles)
            union = len(existing_shingles | candidate_shingles)
            jaccard = intersection / union if union > 0 else 0.0
            if jaccard >= self.simhash_threshold:
                return True, f"Benzer içerik ({existing_id} ile %{jaccard * 100:.1f} benzer)"

        return False, None

    def register(self, article: Article) -> None:
        """Makaleyi filtrenin bellek kütüğüne kaydeder."""
        clean_url = self.normalize_url(article.url)
        self.seen_urls.add(clean_url)
        content_hash = self._text_hash(article.title + " " + article.content[:500])
        self.seen_hashes.add(content_hash)
        self.article_fingerprints[article.id] = self._get_shingles(
            article.title + " " + article.content[:200]
        )

    def filter_duplicates(self, articles: Iterable[Article]) -> List[Article]:
        """
        Makale listesini tarar, mükerrerleri ayıklar ve benzersizleri döner.
        """
        unique_articles: List[Article] = []
        for article in articles:
            dup, _ = self.is_duplicate(article)
            if not dup:
                self.register(article)
                unique_articles.append(article)
        return unique_articles

