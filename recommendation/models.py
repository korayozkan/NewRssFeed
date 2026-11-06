"""
Veri Modelleri (Data Models)
============================
Öneri motorunun tüm aşamalarında (Aşama 1, Aşama 2, Aşama 3) paylaşılan
çekirdek veri yapıları ve tip tanımları.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set


class InteractionType(str, Enum):
    """Kullanıcı etkileşim türleri ve örtük geri bildirim sinyalleri."""
    IMPRESSION = "impression"      # İçerik ekranda belirdi (görüntülenme)
    CLICK = "click"                # Kullanıcı başlığa tıkladı
    READ_SHORT = "read_short"      # 10-30 saniye okuma
    READ_LONG = "read_long"        # 60+ saniye okuma (tam tüketim)
    BOOKMARK = "bookmark"          # Kaydetme / yıldızlama
    LIKE = "like"                  # Beğeni
    SHARE = "share"                # Paylaşım
    SKIP = "skip"                  # Hızlıca geçme / negatif sinyal


@dataclass
class Article:
    """RSS / Haber içeriği modeli."""
    id: str
    title: str
    content: str
    url: str
    source_id: str                 # RSS kaynak ID'si (ör. 'hackernews', 'techcrunch')
    category: str                  # Ana kategori (ör. 'Yazılım', 'Yapay Zeka', 'Tasarım')
    tags: List[str] = field(default_factory=list)
    published_at: float = field(default_factory=time.time)  # Unix timestamp
    author: Optional[str] = None
    views: int = 0
    likes: int = 0
    bookmarks: int = 0
    embedding: Optional[List[float]] = None  # Aşama 3 için vektör temsili
    language: str = "tr"                     # İçerik dili (ör. 'tr', 'en')
    region: str = "GLOBAL"                   # Odaklandığı bölge/ülke (ör. 'TR', 'US', 'GLOBAL')
    reading_time_minutes: int = 4            # Tahmini okuma süresi (dakika)
    device_suitability: List[str] = field(default_factory=lambda: ["mobile", "tablet", "desktop"])
    has_rich_media: bool = False             # Yoğun görsel/video var mı?
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def full_text(self) -> str:
        """İçerik benzerliği ve embedding için birleştirilmiş metin."""
        tags_str = " ".join(self.tags)
        return f"{self.title} {self.content} {tags_str}".strip()


@dataclass
class UserContext:
    """
    Kullanıcının anlık çevresel/bağlamsal (Context-Aware) durum bilgileri.
    Dil, bölge, saat dilimi ve cihaz bilgileri gibi sinyaller.
    """
    language: str = "tr"                     # Aktif tercih edilen dil ('tr', 'en')
    supported_languages: List[str] = field(default_factory=lambda: ["tr", "en"])
    region: str = "TR"                       # Kullanıcının bulunduğu bölge ('TR', 'US', 'GLOBAL')
    timezone: str = "Europe/Istanbul"        # IANA saat dilimi
    local_hour: Optional[int] = None         # Günün saati (0-23)
    is_weekend: Optional[bool] = None        # Hafta sonu mu?
    device_type: str = "mobile"              # 'mobile', 'tablet', 'desktop'
    platform: str = "ios"                    # 'ios', 'android', 'web'
    network_speed: str = "fast"              # 'fast', 'cellular', 'slow'
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class User:
    """Kullanıcı profili ve tercihleri."""
    id: str
    username: str
    followed_sources: Set[str] = field(default_factory=set)    # Takip edilen kaynak ID'leri
    declared_interests: Set[str] = field(default_factory=set)  # Açıkça belirtilen ilgi alanları/etiketler
    created_at: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class UserInteraction:
    """Bir kullanıcının belirli bir içerikle etkileşim olayı."""
    user_id: str
    article_id: str
    interaction_type: InteractionType
    timestamp: float = field(default_factory=time.time)
    dwell_time_seconds: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ScoredArticle:
    """Aday içerik ve hesaplanan skor bileşenleri."""
    article: Article
    final_score: float = 0.0
    stage: str = "stage1"
    score_breakdown: Dict[str, float] = field(default_factory=dict)
    rank: int = 0

    def add_score(self, component_name: str, score_value: float, weight: float = 1.0) -> None:
        """Skor bileşeni ekler ve son skoru günceller."""
        weighted = score_value * weight
        self.score_breakdown[component_name] = weighted
        self.final_score += weighted

