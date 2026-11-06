"""
Bağlam Duyarlı Öneri Motoru (Context-Aware Recommendation Engine - CARS)
=======================================================================
Kullanıcının statik tercihlerinin ötesinde; dil, bölge/konum, saat dilimi
(günün saati, sirkadiyen ritim) ve cihaz/ağ bağlamını değerlendirerek
içerik önerilerini anlık duruma göre optimize eden motor.

Sinyaller:
1. Dil Uyumu (Language Affinity): Anadil, ikincil diller ve dil bariyeri.
2. Bölge Uyumu (Geographic Relevance): Yerel içerikler vs. Küresel (Global) trendler.
3. Saat Dilimi & Zaman Bağlamı (Circadian / Time-of-Day):
   - Sabah (06-10): Hızlı özetler, hap bilgiler (1-4 dk)
   - Gündüz (10-18): İş, teknik deep-dive, üretkenlik
   - Akşam (18-23): Uzun soluklu makaleler, derin denemeler (8+ dk)
   - Gece (23-06): Hafif okumalar, bilim, tasarım
   - Hafta Sonu: Proje geliştirme, hobi, kariyer rehberleri
4. Cihaz & Ağ (Device & Network):
   - Mobil vs. Tablet/Masaüstü ekran boyutu
   - Hücresel veri tasarrufu vs. Hızlı Wi-Fi
"""

from __future__ import annotations

import datetime
from typing import Dict, List, Optional, Tuple

from recommendation.models import Article, UserContext


class ContextEngine:
    """Dil, bölge, saat dilimi ve cihaz sinyallerini işleyen bağlamsal motor."""

    def __init__(
        self,
        weight_language: float = 0.35,
        weight_region: float = 0.20,
        weight_time_of_day: float = 0.25,
        weight_device: float = 0.20,
    ):
        self.w_lang = weight_language
        self.w_region = weight_region
        self.w_time = weight_of_day = weight_time_of_day
        self.w_device = weight_device

    # ── 1. Dil Uyumu Puanlaması ────────────────────────────────────────────
    @staticmethod
    def calculate_language_score(article: Article, context: UserContext) -> float:
        """
        Makale dili ile kullanıcının dil yetkinliğini kıyaslar.

        - Anadil tam eşleşmesi: 1.0
        - Desteklenen / İkincil dil (ör. İngilizce): 0.85
        - Bilinmeyen / Desteklenmeyen dil: 0.05 (Ağır filtreleme cezası)
        """
        art_lang = (article.language or "tr").lower().strip()
        user_primary = (context.language or "tr").lower().strip()
        user_supported = [l.lower().strip() for l in context.supported_languages]

        if art_lang == user_primary:
            return 1.0
        if art_lang in user_supported:
            return 0.85
        return 0.05

    # ── 2. Bölge ve Konum Uyumu ────────────────────────────────────────────
    @staticmethod
    def calculate_region_score(article: Article, context: UserContext) -> float:
        """
        Makalenin coğrafi odağı ile kullanıcının bölgesini kıyaslar.

        - Yerel odaklı içerik (kullanıcı ile aynı bölge): 1.0 (Yerel haber/etkinlik)
        - Küresel (Global) içerik: 0.85 (Her coğrafya için geçerli)
        - Farklı bir bölgenin spesifik yerel içeriği: 0.30
        """
        art_region = (article.region or "GLOBAL").upper().strip()
        user_region = (context.region or "GLOBAL").upper().strip()

        if art_region == user_region:
            return 1.0
        if art_region == "GLOBAL":
            return 0.85
        return 0.30

    # ── 3. Saat Dilimi ve Zaman Bağlamı ─────────────────────────────────────
    @staticmethod
    def resolve_local_hour(context: UserContext) -> int:
        """Kullanıcının saat dilimindeki anlık saati (0-23) çıkarır."""
        if context.local_hour is not None:
            return max(0, min(23, context.local_hour))

        # Saat dilimi verilmişse yerel saati hesapla
        try:
            # Standart Python zoneinfo (Python 3.9+)
            from zoneinfo import ZoneInfo
            now = datetime.datetime.now(ZoneInfo(context.timezone))
            return now.hour
        except Exception:
            # Fallback UTC+3 (Türkiye) veya sistem saati
            return datetime.datetime.now().hour

    def calculate_time_of_day_score(self, article: Article, context: UserContext) -> Tuple[float, str]:
        """
        Günün saatine ve okuma süresine göre sirkadiyen uygunluk skoru döner.

        Returns:
            (score, reason_tag)
        """
        hour = self.resolve_local_hour(context)
        read_time = article.reading_time_minutes or 4
        cat = article.category.lower()

        # A) SABAH (06:00 - 10:00): "Sabah Bülteni / Hızlı Hap Bilgiler"
        if 6 <= hour < 10:
            if read_time <= 4:
                return 1.0, "Sabah Hızlı Okuma (1-4 dk)"
            elif read_time <= 8:
                return 0.75, "Sabah Okuması"
            else:
                return 0.40, "Sabah için fazla uzun"

        # B) GÜNDÜZ / MESAİ (10:00 - 18:00): "Teknik Üretkenlik & İş"
        elif 10 <= hour < 18:
            if cat in ("yazılım", "yapay zeka", "mobil", "siber güvenlik"):
                return 1.0, "Çalışma Saatleri Odaklı"
            return 0.80, "Gündüz Akışı"

        # C) AKŞAM (18:00 - 23:00): "Derinlemesine İnceleme & Uzun Yazılar"
        elif 18 <= hour < 23:
            if read_time >= 7 or cat in ("girişimcilik", "tasarım", "bilim"):
                return 1.0, "Akşam Derin Okuma (Uzun format)"
            return 0.75, "Akşam Akışı"

        # D) GECE (23:00 - 06:00): "Gece Okuması / Hafif Konular"
        else:
            if cat in ("bilim", "tasarım", "felsefe") or read_time <= 5:
                return 0.95, "Gece Rahatlatıcı İçerik"
            return 0.60, "Gece için yoğun içerik"

    # ── 4. Cihaz ve Ağ Uyumu ──────────────────────────────────────────────
    @staticmethod
    def calculate_device_score(article: Article, context: UserContext) -> Tuple[float, str]:
        """
        Cihaz türü (Mobil, Tablet, Masaüstü) ve ağ hızına göre uygunluk.
        """
        dtype = (context.device_type or "mobile").lower()
        nspeed = (context.network_speed or "fast").lower()
        read_time = article.reading_time_minutes or 4

        score = 1.0
        notes = []

        # Cihaz uyumu
        if dtype == "mobile":
            if read_time > 15:
                score *= 0.70  # Mobilde çok uzun metinler zor tüketilir
                notes.append("Mobilde uzun")
            else:
                score *= 1.0
                notes.append("Mobil uyumlu")
        elif dtype in ("tablet", "desktop"):
            if read_time >= 8 or "kod" in article.tags or "mimari" in article.tags:
                score *= 1.10  # Geniş ekranda derin kod/mimari incelemesi avantajlı
                notes.append("Geniş ekran avantajı")

        # Ağ hızı kısıtı
        if nspeed in ("cellular", "slow") and article.has_rich_media:
            score *= 0.60  # Yavaş internette zengin medya yükleme cezası
            notes.append("Hücresel veri tasarrufu")

        return max(0.0, min(1.0, score)), " / ".join(notes)

    # ── 5. Birleşik Bağlam Puanlaması ──────────────────────────────────────
    def evaluate_context(
        self,
        article: Article,
        context: Optional[UserContext],
    ) -> Dict[str, float]:
        """
        Tüm bağlamsal boyutları hesaplar ve skor bileşenleri sözlüğü döner.
        """
        if context is None:
            return {
                "context_language": 1.0,
                "context_region": 1.0,
                "context_time": 1.0,
                "context_device": 1.0,
                "context_composite": 1.0,
            }

        s_lang = self.calculate_language_score(article, context)
        s_region = self.calculate_region_score(article, context)
        s_time, _ = self.calculate_time_of_day_score(article, context)
        s_device, _ = self.calculate_device_score(article, context)

        # Dil birincil eleme faktörüdür: Dil 0.05 ise kompozit skor da çöker
        composite = (
            (self.w_lang * s_lang) +
            (self.w_region * s_region) +
            (self.w_time * s_time) +
            (self.w_device * s_device)
        )
        if s_lang < 0.2:
            composite *= 0.1  # Bilinmeyen dillerin akışı kirletmesini önle

        return {
            "context_language": s_lang,
            "context_region": s_region,
            "context_time": s_time,
            "context_device": s_device,
            "context_composite": composite,
        }

