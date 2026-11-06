"""
Aşama 3: A/B Test Altyapısı (A/B Testing & Experimentation Framework)
====================================================================
Farklı öneri modellerini, algoritmik ağırlıkları ve sıralama stratejilerini
canlı kullanıcılar üzerinde test etmek ve performans metriklerini (CTR vb.)
istatistiksel anlamlılık (Z-test, p-value) ile karşılaştırmak için kullanılan sistem.

Özellikler:
    1. Deterministik Kullanıcı Bölümleme (Consistent Hash Bucketing):
       Kullanıcı ID'si ve Deney ID'si tuzlanarak (salt) % dilimlere atanır.
       Kullanıcı aynı deneyde her zaman aynı varyantı görür.
    2. Metrik Takibi: Gösterim (Impression), Tıklama (Click), Dwell Time ve CTR.
    3. İstatistiksel Anlamlılık: İki oranlı Z-Testi (Two-proportion Z-test) ile
       p-değeri ve %95 güven aralığı hesaplama.
"""

from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass
class VariantMetrics:
    """Belirli bir deney varyantının performans metrikleri."""
    name: str
    impressions: int = 0
    clicks: int = 0
    total_dwell_time: float = 0.0

    @property
    def ctr(self) -> float:
        """Tıklama Oranı (Click-Through Rate)."""
        return (self.clicks / self.impressions) if self.impressions > 0 else 0.0

    @property
    def avg_dwell_time(self) -> float:
        return (self.total_dwell_time / self.clicks) if self.clicks > 0 else 0.0


class ABTestingManager:
    """A/B testlerini yöneten, varyant yönlendirmesi yapan ve metrik toplayan yönetici."""

    def __init__(self):
        # experiment_id -> {variant_name: traffic_ratio}
        self.experiments: Dict[str, Dict[str, float]] = {}
        # experiment_id -> {variant_name: VariantMetrics}
        self.metrics: Dict[str, Dict[str, VariantMetrics]] = {}

    def register_experiment(self, experiment_id: str, variant_weights: Dict[str, float]) -> None:
        """
        Yeni bir A/B deneyi tanımlar.
        Örnek:
            register_experiment("rec_algo_v3", {"control_stage2": 0.50, "treatment_ltr": 0.50})
        """
        total = sum(variant_weights.values())
        normalized = {k: v / total for k, v in variant_weights.items()}
        self.experiments[experiment_id] = normalized
        self.metrics[experiment_id] = {name: VariantMetrics(name=name) for name in normalized}

    def assign_variant(self, experiment_id: str, user_id: str) -> str:
        """
        Kullanıcıyı deterministik olarak bir varyanta atar (Consistent Hashing).
        """
        if experiment_id not in self.experiments:
            raise ValueError(f"Bilinmeyen deney: {experiment_id}")

        variants = self.experiments[experiment_id]
        seed = f"{experiment_id}:{user_id}".encode("utf-8")
        bucket = int(hashlib.md5(seed).hexdigest(), 16) % 10000 / 10000.0  # 0.0 ile 1.0 arası

        cumulative = 0.0
        for variant_name, weight in variants.items():
            cumulative += weight
            if bucket <= cumulative:
                return variant_name

        return list(variants.keys())[-1]

    def record_impression(self, experiment_id: str, variant_name: str) -> None:
        """Gösterim kaydeder."""
        if experiment_id in self.metrics and variant_name in self.metrics[experiment_id]:
            self.metrics[experiment_id][variant_name].impressions += 1

    def record_click(self, experiment_id: str, variant_name: str, dwell_time: float = 0.0) -> None:
        """Tıklama ve tüketim süresi kaydeder."""
        if experiment_id in self.metrics and variant_name in self.metrics[experiment_id]:
            m = self.metrics[experiment_id][variant_name]
            m.clicks += 1
            m.total_dwell_time += dwell_time

    @staticmethod
    def calculate_statistical_significance(
        control: VariantMetrics,
        treatment: VariantMetrics,
    ) -> Tuple[float, float, bool]:
        """
        İki oranlı Z-Testi uygulayarak Z-skoru, p-değeri ve %95 anlamlılık durumunu hesaplar.

        Returns:
            (z_score, p_value, is_significant_p95)
        """
        n1, x1 = control.impressions, control.clicks
        n2, x2 = treatment.impressions, treatment.clicks

        if n1 == 0 or n2 == 0:
            return 0.0, 1.0, False

        p1 = x1 / n1
        p2 = x2 / n2
        p_pool = (x1 + x2) / (n1 + n2)

        if p_pool == 0 or p_pool == 1:
            return 0.0, 1.0, False

        se = math.sqrt(p_pool * (1.0 - p_pool) * (1.0 / n1 + 1.0 / n2))
        if se == 0:
            return 0.0, 1.0, False

        z = (p2 - p1) / se

        # Standart normal dağılım için iki kuyruklu p-değeri yaklaşımı (erf tabanlı)
        p_value = math.erfc(abs(z) / math.sqrt(2.0))
        is_significant = p_value < 0.05

        return z, p_value, is_significant

