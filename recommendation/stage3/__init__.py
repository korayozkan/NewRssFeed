"""Aşama 3: İleri Düzey Öneri, Embedding'ler, Collaborative Filtering, LTR ve A/B Testleri."""

from recommendation.stage3.ab_testing import ABTestingManager, VariantMetrics
from recommendation.stage3.collaborative import CollaborativeFilteringEngine
from recommendation.stage3.embeddings import EmbeddingEngine
from recommendation.stage3.learning_to_rank import LearningToRankModel
from recommendation.stage3.pipeline import Stage3Pipeline

__all__ = [
    "EmbeddingEngine",
    "CollaborativeFilteringEngine",
    "LearningToRankModel",
    "ABTestingManager",
    "VariantMetrics",
    "Stage3Pipeline",
]

