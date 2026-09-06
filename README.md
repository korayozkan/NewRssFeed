##  Neden Bu Proje?

Piyasadaki birçok RSS okuyucu uygulamasının kısıtlayıcı veya yetersiz hissettirmesi üzerine bu projeyi geliştirdim:

- **Ücretsiz ve Sınırsız:** Temel RSS özelliklerini sunmak için bile aylık abonelik talep eden servisler yerine %100 ücretsiz bir alternatif.
- **Modern ve Temiz Arayüz:** Karmaşık, göz yoran ve eski tarz RSS arayüzleri yerine minimalist, modern ve okuma odaklı bir UX/UI tasarımı.
- **%100 Veri Gizliliği:** Tüm verileriniz, okuma geçmişiniz ve ayarlarınız yalnızca kendi tarayıcınızın `localStorage` alanında tutulur. Sunucu yok, takipçi (tracker) yok, hesap oluşturma şartı yok.
- **Zaman Tasarrufu:** Sayfalarca içerik arasında kaybolmak yerine; akıllı puanlama algoritması, otomatik etiketleme, zen modu ve özelleştirilebilir tipografi sayesinde en önemli haberlere hızla ulaşıp zamandan tasarruf sağlarsınız.


# RSS Okuyucu





Tarayıcı tabanlı, sıfır bağımlılıklı RSS okuyucu. Kurulum gerektirmez — `index.html` dosyasını açmak yeterli.

YouTube, Reddit, GitHub, Medium, Substack, Mastodon ve standart RSS/Atom kaynaklarını destekler. Tüm veriler `localStorage`'da tutulur; herhangi bir sunucu veya hesap gerekmez.

---

## Özellikler

### Kaynak Yönetimi
- RSS, Atom, YouTube kanalı, Reddit, GitHub releases, Medium, Substack, Mastodon URL'lerini otomatik RSS'e dönüştürür
- OPML / JSON içe ve dışa aktarma
- 6 farklı ücretsiz CORS proxy üzerinden sıralı fallback — bir proxy çalışmazsa otomatik bir sonrakine geçer
- Feed önbelleği (15 dk) — aynı oturumda gereksiz proxy isteği atılmaz

### Anasayfa
- Tüm kaynaklardan puanlama algoritmasıyla seçilen **en önemli 5 haber**
- Puan kriterleri: yayın yaşı, okunmamışlık, yıldız, görsel varlığı, aciliyet kelimeleri, okuma geçmişiyle etiket örtüşmesi

### Makale Listesi
- Liste ve kart (grid) görünümü
- Okunmamış / yıldızlı filtresi
- Son 7 gün / tüm zamanlar zaman filtresi
- Debounce'lu tam metin arama (başlık, özet, kaynak)
- Akıllı etiketler — içerik analizine dayalı otomatik kategori (Teknoloji, Bilim, Finans, Politika, Güvenlik)

### Makale Okuma Modalı
- XSS korumalı HTML sanitizasyon (script, iframe, on* handler temizliği)
- Tipografi paneli: font ailesi (Inter / Lora / Mono / Sistem), boyut, satır yüksekliği, harf aralığı, içerik genişliği
- Zen modu — tüm UI gizlenir, sadece makale kalır
- Görsel lightbox — görsellere tıklayarak tam ekran önizleme
- Renkli metin vurgulama (seç + renk tıkla)
- Makale başına not alma
- **Akıllı öneri sistemi** — okuma geçmişinden profil çıkararak ilgili okunmamış makaleleri önerir

### Analitik Paneli
- Kaynak aktivitesi çubuk grafikleri
- En çok okunan makaleler listesi
- Gündem kelime bulutu (kelimelere tıklayarak filtreleme)
- Okuma istatistikleri: toplam / okunmuş / okunmamış / not / vurgu sayıları

---

## Kurulum

```
git clone https://github.com/korayozkan/RSS-Okuyucu.git
cd RSS-Okuyucu
# index.html dosyasını tarayıcıda aç
```

Herhangi bir `npm install`, derleme adımı veya sunucu gerekmez. Dosyayı doğrudan tarayıcıda açabilir ya da basit bir statik sunucu kullanabilirsiniz:

```bash
# Python ile hızlı sunucu (isteğe bağlı)
python -m http.server 8080
```

---

## Kullanım

### Kaynak Ekleme

Sol paneldeki URL alanına herhangi bir link yapıştırıp `+` butonuna ya da Enter'a basın:

| Platform   | Örnek URL                                  |
|------------|--------------------------------------------|
| RSS / Atom | `https://example.com/feed.xml`             |
| YouTube    | `youtube.com/@LinusTechTips`               |
| Reddit     | `reddit.com/r/technology`                  |
| GitHub     | `github.com/microsoft/vscode`              |
| Medium     | `medium.com/@kullanici`                    |
| Substack   | `kullanici.substack.com`                   |
| Mastodon   | `mastodon.social/@Gargron`                 |

Hızlı ekleme butonları (YouTube, Reddit, GitHub, Medium, Substack, Hacker News, Dev.to, Mastodon) sık kullanılan kaynaklar için kısayol sağlar.

### Klavye Kısayolları

| Tuş        | Eylem                                      |
|------------|--------------------------------------------|
| `Esc`      | Modalı / Lightbox'ı / Zen modunu kapat     |
| `Enter`    | Odaklı karta / feed öğesine git            |

### OPML İçe / Dışa Aktarma

Sol alt paneldeki **↓ İçe Aktar** ve **↑ Dışa Aktar** butonlarıyla `.opml`, `.xml` veya `.json` formatında kaynak listesi alıp verebilirsiniz. Feedly, Inoreader gibi okuyuculardan aktarım desteklenir.

---

## Dosya Yapısı

```
rss/
├── index.html          # Tek sayfa HTML iskeleti + tüm DOM
├── styles.css          # Tüm CSS (dark tema, responsive, animasyonlar)
├── app.js              # Orijinal tek dosya (referans olarak korunur)
└── js/                 # Modüler yapı
    ├── config.js       # Sabitler: varsayılan feed'ler, kategoriler, font haritası, platform ipuçları
    ├── state.js        # Runtime state nesnesi + uid/qs/qsa yardımcıları
    ├── storage.js      # localStorage okuma/yazma + feed önbelleği (15 dk TTL)
    ├── feed.js         # Fetch, proxy fallback, XML parse, URL dönüştürücü, CRUD, export/import
    ├── render.js       # Feed listesi, makale kartları, anasayfa, analitik, smart tag render
    ├── modal.js        # Modal aç/kapat, lightbox, zen modu, tipografi, vurgu, not, sanitize
    ├── events.js       # Tüm addEventListener bağlamaları (bindEvents)
    └── main.js         # init() — DOMContentLoaded giriş noktası
```

### Modül Bağımlılık Sırası

```
config → state → storage → feed → render → modal → events → main
```

Her modül bir öncekinin global değişkenlerine erişir. Modüller ES module değil, klasik `<script>` tag'larıyla sırayla yüklenir; bu sayede hiçbir derleme aracına ihtiyaç duyulmaz.

---

## Teknik Notlar

### Proxy Fallback Zinciri

CORS kısıtlamaları nedeniyle RSS feed'leri doğrudan tarayıcıdan çekilemez. Uygulama aşağıdaki proxy'leri sırayla dener (12 sn timeout):

1. `api.rss2json.com` — JSON yanıt, en güvenilir
2. `api.allorigins.win` — ham XML
3. `corsproxy.io` — ham XML
4. `thingproxy.freeboard.io` — ham XML
5. `api.codetabs.com` — JSON wrapper
6. `cors.eu.org` — son çare

### Veri Güvenliği

- `sanitize()` fonksiyonu makale HTML'inden `<script>`, `<iframe>`, `<form>`, `on*` event handler'ları ve `javascript:` link'lerini temizler
- `escHtml()` tüm render fonksiyonlarında kullanıcı verisini HTML'e gömmeden önce kaçırır

### Akıllı Öneri Algoritması

Okuma geçmişindeki makalelerin etiket ve kaynak frekansından bir profil çıkarılır. Okunmamış makaleler; etiket örtüşmesi (×4), mevcut makaleyle paylaşılan etiket (×10), kaynak skoru (×2), yenilik bonusu ve görsel varlığına göre puanlanır. En yüksek puanlı 4 makale önerilir.

---

## Lisans

MIT — [LICENSE](LICENSE) dosyasına bakın.
