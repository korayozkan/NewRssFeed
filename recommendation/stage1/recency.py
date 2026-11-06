"""
Aşama 1: Güncellik Puanlaması (Recency & Time Decay)
===================================================
Haber ve RSS akışlarında taze içeriklerin önceliklendirilmesi için
üstel zaman aşımı (exponential decay) modeli.

Formül:
    S_recency = exp(-lambda * delta_t)
    lambda = ln(2) / T_half_life

Örnek (T_half_life = 24 saat):
    - 0 saat (şimdi):      1.000 puan
    - 12 saat önce:        0.707 puan
    - 24 saat önce:        0.500 puan
    - 48 saat önce:        0.250 puan
    - 7 gün (168s) önce:   0.007 puan
"""

from __future__ import annotations

import math
import time
from typing import Optional


class RecencyScorer:
    """Zamana bağlı içerik güncellik skorlayıcısı."""

    def __init__(self, half_life_hours: float = 24.0, max_age_days: Optional[float] = 14.0):
        """
        Args:
            half_life_hours: İçeriğin güncellik puanının yarıya ineceği süre (saat).
            max_age_days: Bu günden daha eski içeriklere minimum taban puan (veya 0) verilir.
        """
        self.half_life_seconds = half_life_hours * 3600.0
        self.decay_constant = math.log(2) / self.half_life_seconds
        self.max_age_seconds = max_age_days * 86400.0 if max_age_days else None

    def calculate_score(self, published_at: float, current_time: Optional[float] = None) -> float:
        """
        Makalenin yayınlanma zamanına göre güncellik skorunu hesaplar (0.0 - 1.0).

        Args:
            published_at: Makalenin yayınlanma timestamp'i (saniye).
            current_time: Karşılaştırma referans zamanı (None ise şimdiki zaman).
        """
        now = current_time if current_time is not None else time.time()
        delta_t = max(0.0, now - published_at)

        if self.max_age_seconds and delta_t > self.max_age_seconds:
            # Çok eski içerikler için sıfır veya minimum ceza
            return 0.001

        score = math.exp(-self.decay_constant * delta_t)
        return max(0.0, min(1.0, score))

