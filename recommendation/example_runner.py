"""
Uçtan Uca Çalıştırılabilir Örnek Senaryo (End-to-End Simulation Runner)
======================================================================
Bu dosya Aşama 1, Aşama 2 ve Aşama 3 algoritmalarının tamamını
örnek veri kümesi üzerinde adım adım çalıştırır ve çıktıları ekrana basar.

Çalıştırma:
    python recommendation/example_runner.py
"""

from __future__ import annotations

import sys
import os
import time

# Paket yolunu ekle
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from recommendation.engine import RecommendationEngine
from recommendation.models import Article, InteractionType, User, UserContext


def create_sample_catalog() -> list[Article]:
    """Gerçekçi örnek RSS makaleleri kataloğu (bağlam etiketleri ile)."""
    now = time.time()
    return [
        Article(
            id="art_1",
            title="Python 3.14 ile Gelen Yeni Bellek Optimizasyonları",
            content="Python çekirdek ekibi GIL serbestisi ve yeni JIT derleyicisi üzerine önemli güncellemeler yayınladı.",
            url="https://python.org/news/314?utm_source=rss&ref=home",
            source_id="python_official",
            category="Yazılım",
            tags=["python", "performans", "jit"],
            published_at=now - (2 * 3600),  # 2 saat önce
            views=1200, likes=45, bookmarks=12,
            language="tr",
            region="TR",
            reading_time_minutes=3,       # Hızlı sabah okumasına uygun
        ),
        # Mükerrer / Kopya test içeriği (art_1 ile aynı içerik, farklı UTM)
        Article(
            id="art_1_dup",
            title="Python 3.14 ile Gelen Yeni Bellek Optimizasyonları (Özet)",
            content="Python çekirdek ekibi GIL serbestisi ve yeni JIT derleyicisi üzerine önemli güncellemeler yayınladı.",
            url="https://python.org/news/314?utm_source=twitter&utm_campaign=share",
            source_id="news_aggregator",
            category="Yazılım",
            tags=["python"],
            published_at=now - (1 * 3600),
            language="tr",
            region="TR",
            reading_time_minutes=3,
        ),
        Article(
            id="art_2",
            title="LLM Mimarilerinde Dikkat Mekanizmaları ve Transformer Evrimi",
            content="Büyük dil modellerinde KV cache optimizasyonları ve FlashAttention-3 teknik detayları.",
            url="https://arxiv.org/abs/2026.0123",
            source_id="arxiv_ai",
            category="Yapay Zeka",
            tags=["llm", "ai", "transformer", "mimari"],
            published_at=now - (6 * 3600),  # 6 saat önce
            views=3400, likes=120, bookmarks=89,
            language="en",
            region="GLOBAL",
            reading_time_minutes=14,      # Akşam / masaüstü derin okumasına uygun
        ),
        Article(
            id="art_3",
            title="React Native 0.88 ve Yeni Mimari Optimizasyonları",
            content="Fabric renderer ve TurboModules ile mobil arayüzlerde 120 FPS akıcılık.",
            url="https://reactnative.dev/blog/088",
            source_id="react_native_blog",
            category="Mobil",
            tags=["react-native", "mobil", "javascript"],
            published_at=now - (12 * 3600),  # 12 saat önce
            views=800, likes=30, bookmarks=8,
            language="tr",
            region="GLOBAL",
            reading_time_minutes=5,
        ),
        Article(
            id="art_4",
            title="Minimalist Arayüz Tasarımı: 2026 Trendleri ve Mikro Etkileşimler",
            content="Kullanıcı deneyimini güçlendiren haptik geri bildirimler ve karanlık mod kontrast dengesi.",
            url="https://uxdesign.cc/trends-2026",
            source_id="ux_collective",
            category="Tasarım",
            tags=["ux", "ui", "tasarım"],
            published_at=now - (24 * 3600),  # 1 gün önce
            views=1500, likes=90, bookmarks=34,
            language="tr",
            region="GLOBAL",
            reading_time_minutes=4,
        ),
        Article(
            id="art_5",
            title="Büyük Ölçekli Dağıtık Sistemlerde Raft Konsensüs Algoritması",
            content="Dağıtık veri tabanlarında veri tutarlılığı, lider seçimi ve split-brain çözümleri.",
            url="https://highscalability.com/raft-deep-dive",
            source_id="high_scalability",
            category="Yazılım",
            tags=["dağıtık-sistemler", "database", "mimari"],
            published_at=now - (48 * 3600),  # 2 gün önce
            views=2100, likes=85, bookmarks=40,
            language="en",
            region="US",
            reading_time_minutes=18,      # Masaüstü uzun okuma
        ),
        Article(
            id="art_6",
            title="Girişimcilikte İlk 1000 Kullanıcıya Ulaşma Rehberi",
            content="Ürün pazar uyumu ve organik büyüme stratejileri.",
            url="https://indiehackers.com/first-1000",
            source_id="indie_hackers",
            category="Girişimcilik",
            tags=["büyüme", "startup"],
            published_at=now - (72 * 3600),  # 3 gün önce
            views=4500, likes=160, bookmarks=75,
            language="tr",
            region="TR",
            reading_time_minutes=8,
        ),
        # Dil bariyeri testi: Kullanıcının desteklemediği dilde içerik
        Article(
            id="art_7_jp",
            title="最新の人工知能技術と日本のスタートアップ動向",
            content="日本国内における生成AIスタートアップの最新投資環境とオープンソース動向。",
            url="https://tech-japan.jp/ai-news",
            source_id="japan_ai_news",
            category="Yapay Zeka",
            tags=["ai", "japan"],
            published_at=now - (1 * 3600),
            language="ja",
            region="JP",
            reading_time_minutes=5,
        ),
    ]


def main():
    print("=" * 75)
    print("  RSS ÖNERİ SİSTEMİ - 3 AŞAMALI MOTOR TESTİ")
    print("=" * 75)

    engine = RecommendationEngine()
    articles = create_sample_catalog()
    engine.add_articles(articles)
    print(f"\n[+] {len(articles)} adet örnek makale kataloğa yüklendi.")

    # 1. Kullanıcı Tanımlama
    user = User(
        id="user_ahmet",
        username="ahmet_dev",
        followed_sources={"python_official", "arxiv_ai"},
        declared_interests={"Yazılım", "Yapay Zeka"},
    )
    engine.register_user(user)
    print(f"[+] Kullanıcı oluşturuldu: {user.username}")
    print(f"    - Takip Ettiği Kaynaklar: {user.followed_sources}")
    print(f"    - Beyan Ettiği İlgiler: {user.declared_interests}")

    # -------------------------------------------------------------
    # AŞAMA 1: Kural Tabanlı & Filtreleme Testi
    # -------------------------------------------------------------
    print("\n" + "-" * 75)
    print(">>> AŞAMA 1 TESTİ (Kaynak Takibi + İlgi Alanları + Güncellik + Deduplication)")
    print("-" * 75)
    s1_results = engine.recommend(user.id, stage_level=1, limit=5)
    for item in s1_results:
        print(f"  #{item.rank} [Skor: {item.final_score:.3f}] - {item.article.title}")
        print(f"      Detay: {item.score_breakdown}")

    # Kopya makale kontrolü
    item_ids = [x.article.id for x in s1_results]
    assert "art_1_dup" not in item_ids, "HATA: Kopya makale elenemedi!"
    print("\n[OK] 'art_1_dup' mükerrer makalesi Deduplication filtresi tarafından başarıyla elendi!")

    # -------------------------------------------------------------
    # AŞAMA 2: Kişiselleştirme & Keşfet Testi
    # -------------------------------------------------------------
    print("\n" + "-" * 75)
    print(">>> AŞAMA 2 TESTİ (Kullanıcı Davranışları + İlgi Ağırlıkları + MMR Çeşitlilik)")
    print("-" * 75)

    # Kullanıcı etkileşimleri simüle et
    print("[*] Kullanıcı etkileşimleri simüle ediliyor...")
    engine.record_user_event(user.id, "art_2", InteractionType.READ_LONG, dwell_time_seconds=95)
    engine.record_user_event(user.id, "art_2", InteractionType.LIKE)
    engine.record_user_event(user.id, "art_2", InteractionType.BOOKMARK)
    engine.record_user_event(user.id, "art_1", InteractionType.READ_SHORT, dwell_time_seconds=25)
    engine.record_user_event(user.id, "art_4", InteractionType.SKIP)  # Tasarım içeriğini hızla geçti (negatif)

    s2_results = engine.recommend(user.id, stage_level=2, limit=5)
    for item in s2_results:
        print(f"  #{item.rank} [Skor: {item.final_score:.3f}] - {item.article.title} ({item.article.category})")
        print(f"      Detay: {item.score_breakdown}")

    print("\n>>> KEŞFET (DISCOVER) MODU TESTİ (Exploration vs Exploitation)")
    discover_results = engine.recommend(user.id, stage_level=2, is_discover_mode=True, limit=5)
    for item in discover_results:
        print(f"  #{item.rank} [Aşama: {item.stage}] - {item.article.title} ({item.article.category})")

    # -------------------------------------------------------------
    # AŞAMA 3: İleri Düzey Öneri, LTR, Benzer Kullanıcılar ve A/B Testi
    # -------------------------------------------------------------
    print("\n" + "-" * 75)
    print(">>> AŞAMA 3 TESTİ (Embedding + CF + Learning to Rank + A/B Testleri)")
    print("-" * 75)

    # Benzer kullanıcı simülasyonu (Collaborative Filtering için)
    user_mehmet = User(
        id="user_mehmet",
        username="mehmet_ai",
        followed_sources={"arxiv_ai"},
        declared_interests={"Yapay Zeka"},
    )
    engine.register_user(user_mehmet)
    engine.record_user_event(user_mehmet.id, "art_2", InteractionType.LIKE)
    engine.record_user_event(user_mehmet.id, "art_5", InteractionType.BOOKMARK)

    # A/B Testi Tanımla
    engine.ab_manager.register_experiment(
        experiment_id="feed_v3_exp",
        variant_weights={"control_stage2": 0.50, "treatment_ltr": 0.50},
    )
    assigned_variant = engine.ab_manager.assign_variant("feed_v3_exp", user.id)
    print(f"[+] Kullanıcı '{user.username}' için A/B Test varyantı atandı: [{assigned_variant}]")

    s3_results = engine.recommend(user.id, stage_level=3, experiment_id="feed_v3_exp", limit=5)
    for item in s3_results:
        print(f"  #{item.rank} [LTR Puanı: {item.final_score:.4f}] - {item.article.title}")
        print(f"      Özellikler (Features): {item.score_breakdown}")

    # A/B Testi istatistiksel anlamlılık simülasyonu
    print("\n[*] A/B Test metrikleri simüle ediliyor (CTR ve Z-Testi)...")
    for _ in range(1000):
        engine.ab_manager.record_impression("feed_v3_exp", "control_stage2")
        engine.ab_manager.record_impression("feed_v3_exp", "treatment_ltr")
    # Treatment varyantı daha yüksek tıklama alıyor
    for _ in range(85):
        engine.ab_manager.record_click("feed_v3_exp", "control_stage2", dwell_time=45)
    for _ in range(130):
        engine.ab_manager.record_click("feed_v3_exp", "treatment_ltr", dwell_time=62)

    ctrl = engine.ab_manager.metrics["feed_v3_exp"]["control_stage2"]
    trt = engine.ab_manager.metrics["feed_v3_exp"]["treatment_ltr"]
    z, p_val, is_sig = engine.ab_manager.calculate_statistical_significance(ctrl, trt)

    print(f"  - Kontrol (Aşama 2): Gösterim={ctrl.impressions}, Tıklama={ctrl.clicks}, CTR=%{ctrl.ctr*100:.2f}")
    print(f"  - Tedavi  (Aşama 3 LTR): Gösterim={trt.impressions}, Tıklama={trt.clicks}, CTR=%{trt.ctr*100:.2f}")
    print(f"  - Z-Skoru: {z:.3f}, p-değeri: {p_val:.5f}, %95 Anlamlı mı?: {'EVET' if is_sig else 'HAYIR'}")

    # -------------------------------------------------------------
    # BAĞLAM DUYARLI (CONTEXT-AWARE: DİL, BÖLGE, SAAT DİLİMİ, CİHAZ) TESTİ
    # -------------------------------------------------------------
    print("\n" + "-" * 75)
    print(">>> BAĞLAM DUYARLI (CONTEXT-AWARE) ÖNERİ TESTİ")
    print("    (Dil, Bölge/Konum, Saat Dilimi / Günün Saati ve Cihaz Bilgisi)")
    print("-" * 75)

    # Durum 1: İstanbul'da sabah 08:30'da cep telefonundan bağlanan kullanıcı
    ctx_istanbul_morning_mobile = UserContext(
        language="tr",
        supported_languages=["tr", "en"],
        region="TR",
        timezone="Europe/Istanbul",
        local_hour=8,               # Sabah kahve saati
        device_type="mobile",
        platform="ios",
        network_speed="cellular",
    )
    print("\n[*] Durum 1: İstanbul, Sabah 08:30, iPhone (Hücresel Ağ, Türkçe)")
    print("    -> Beklenti: Hızlı, kısa süreli (1-4 dk), Türkçe ve yerel içerikler öne çıkmalı, Japonca elenmeli.")
    res_ctx1 = engine.recommend(user.id, stage_level=3, context=ctx_istanbul_morning_mobile, limit=4)
    for item in res_ctx1:
        print(f"  #{item.rank} [LTR Puanı: {item.final_score:.4f}] - {item.article.title}")
        print(f"      [Dil: {item.article.language}, Bölge: {item.article.region}, Okuma Süresi: {item.article.reading_time_minutes} dk]")
        print(f"      Bağlam Detayı: Dil={item.score_breakdown.get('context_language', 0):.2f}, Saat={item.score_breakdown.get('context_time', 0):.2f}, Cihaz={item.score_breakdown.get('context_device', 0):.2f}")

    # Japonca içeriğin dil bariyeri kontrolü
    assert all(x.article.id != "art_7_jp" for x in res_ctx1), "HATA: Bilinmeyen dildeki makale elenemedi!"
    print("[OK] Japonca makale (art_7_jp) dil bariyeri filtresiyle başarıyla elendi!")

    # Durum 2: San Francisco'da akşam 21:00'da iPad / Masaüstünden bağlanan kullanıcı
    ctx_sf_evening_desktop = UserContext(
        language="en",
        supported_languages=["en", "tr"],
        region="US",
        timezone="America/Los_Angeles",
        local_hour=21,              # Akşam derin okuma saati
        device_type="desktop",
        platform="web",
        network_speed="fast",
    )
    print("\n[*] Durum 2: San Francisco, Akşam 21:00, Masaüstü (Hızlı Wi-Fi, İngilizce)")
    print("    -> Beklenti: Uzun soluklu teknik makaleler (10+ dk), İngilizce ve geniş ekran mimari yazıları öne çıkmalı.")
    res_ctx2 = engine.recommend(user.id, stage_level=3, context=ctx_sf_evening_desktop, limit=4)
    for item in res_ctx2:
        print(f"  #{item.rank} [LTR Puanı: {item.final_score:.4f}] - {item.article.title}")
        print(f"      [Dil: {item.article.language}, Bölge: {item.article.region}, Okuma Süresi: {item.article.reading_time_minutes} dk]")
        print(f"      Bağlam Detayı: Dil={item.score_breakdown.get('context_language', 0):.2f}, Saat={item.score_breakdown.get('context_time', 0):.2f}, Cihaz={item.score_breakdown.get('context_device', 0):.2f}")

    print("\n" + "=" * 75)
    print("  TÜM AŞAMALAR VE TESTLER BAŞARIYLA TAMAMLANDI!")
    print("=" * 75)


if __name__ == "__main__":
    main()

