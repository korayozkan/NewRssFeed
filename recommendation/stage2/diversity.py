"""
Aşama 2: İçerik Çeşitliliği (Diversity & Maximal Marginal Relevance - MMR)
========================================================================
Filtre balonunu (filter bubble) ve aynı kategoriden/kaynaktan art arda
tekrar eden içerik yığılmasını önleyen çeşitlilik algoritmaları.

1. Maximal Marginal Relevance (MMR):
   Alaka düzeyi (Relevance) ile zaten seçilmiş içeriklere benzerliği (Redundancy)
   arasında denge kurar:
   MMR = argmax_{d_i in R \ S} [ lambda * Sim_1(d_i, User) - (1 - lambda) * max_{d_j in S} Sim_2(d_i, d_j) ]

2. Kategori ve Kaynak Sınırlama (Throttling):
   Aynı kategoriden peş peşe en fazla K adet içerik gelmesine izin verir.
"""

from __future__ import annotations

from typing import Callable, List, Optional, Set

from recommendation.models import ScoredArticle


class DiversityEngine:
    """İçerik çeşitliliğini maksimize eden ve doygunluğu (saturation) engelleyen motor."""

    def __init__(
        self,
        mmr_lambda: float = 0.65,
        max_consecutive_category: int = 2,
        max_category_ratio: float = 0.40,
    ):
        """
        Args:
            mmr_lambda: 1.0 = sadece alaka düzeyi, 0.0 = maksimum çeşitlilik.
                        Genellikle 0.60 - 0.75 aralığı önerilir.
            max_consecutive_category: Art arda gelebilecek aynı kategoriden makale sayısı.
            max_category_ratio: Toplam listede tek bir kategorinin kaplayabileceği maks oran.
        """
        self.mmr_lambda = mmr_lambda
        self.max_consecutive_category = max_consecutive_category
        self.max_category_ratio = max_category_ratio

    def rerank_with_mmr(
        self,
        candidates: List[ScoredArticle],
        item_similarity_fn: Callable[[ScoredArticle, ScoredArticle], float],
        top_k: int = 30,
    ) -> List[ScoredArticle]:
        """
        Aday listesini MMR formülüyle çeşitlendirerek yeniden sıralar.
        """
        if not candidates:
            return []

        remaining = list(candidates)
        selected: List[ScoredArticle] = []

        # İlk olarak en yüksek skorlu makaleyi doğrudan al
        best_initial = max(remaining, key=lambda x: x.final_score)
        selected.append(best_initial)
        remaining.remove(best_initial)

        # Kalanları MMR skoru ile seç
        while remaining and len(selected) < top_k:
            best_item: Optional[ScoredArticle] = None
            best_mmr_score = -float("inf")

            for candidate in remaining:
                relevance = candidate.final_score
                # Seçilmişler arasındaki maksimum benzerliği bul
                max_sim_to_selected = max(
                    item_similarity_fn(candidate, sel) for sel in selected
                )

                mmr_val = (self.mmr_lambda * relevance) - ((1.0 - self.mmr_lambda) * max_sim_to_selected)

                if mmr_val > best_mmr_score:
                    best_mmr_score = mmr_val
                    best_item = candidate

            if best_item is not None:
                selected.append(best_item)
                remaining.remove(best_item)
            else:
                break

        # Geriye kalan adayları kuyruğa ekle
        selected.extend(remaining)
        return selected

    def apply_category_throttling(self, items: List[ScoredArticle]) -> List[ScoredArticle]:
        """
        Aynı kategorinin art arda gelmesini engeller ve listeyi dengeler.
        """
        if len(items) <= 2:
            return items

        result: List[ScoredArticle] = []
        deferred: List[ScoredArticle] = []
        last_category: Optional[str] = None
        consecutive_count = 0

        for item in items:
            cat = item.article.category.lower()
            if cat == last_category:
                consecutive_count += 1
            else:
                consecutive_count = 1
                last_category = cat

            if consecutive_count > self.max_consecutive_category:
                # Kategori kotası aşıldı, bu makaleyi bir sonraki uygun boşluğa ertele
                deferred.append(item)
            else:
                result.append(item)

        # Ertelenen makaleleri aralara serpiştir
        for def_item in deferred:
            inserted = False
            for idx in range(1, len(result)):
                prev_cat = result[idx - 1].article.category.lower()
                next_cat = result[idx].article.category.lower()
                item_cat = def_item.article.category.lower()

                if item_cat != prev_cat and item_cat != next_cat:
                    result.insert(idx, def_item)
                    inserted = True
                    break
            if not inserted:
                result.append(def_item)

        return result

