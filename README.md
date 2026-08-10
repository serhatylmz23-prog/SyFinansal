# SyFinansOtağı

Finansal veri takip ve portföy yönetim PWA'sı. **Eğlence/simülasyon amaçlıdır**, gerçek yatırım tavsiyesi değildir.

## 📱 Telefon/tablete kurulum (GitHub Pages üzerinden)

Bu bir "sunucusuz" PWA'dır — derleme (build) adımı gerektirmez, sadece HTTPS üzerinden statik dosya olarak servis edilmesi yeterlidir. Service Worker (çevrimdışı destek) **sadece HTTPS veya localhost üzerinde çalışır**, bu yüzden dosyaları doğrudan telefonda açmak (file://) yeterli olmaz — GitHub Pages en kolay ücretsiz çözümdür.

### 1. Depoyu oluşturun ve dosyaları yükleyin
1. GitHub'da yeni bir **public** repo oluşturun (örn. `syfinans-pwa`).
2. Bu zip'in içindeki **tüm dosya ve klasörleri** (`index.html`, `js/`, `icons/`, `manifest.json`, `sw.js`, favicon dosyaları vb.) repo'nun **kök dizinine** yükleyin — alt klasöre koymayın, yollar buna göre ayarlı.

### 2. GitHub Pages'i etkinleştirin
1. Repo → **Settings → Pages**
2. **Source**: "Deploy from a branch" seçin
3. **Branch**: `main` (veya kullandığınız branch), klasör: `/ (root)`
4. Kaydedin. Birkaç dakika içinde şu adreste yayınlanır:
   `https://KULLANICI_ADINIZ.github.io/REPO_ADINIZ/`

### 3. Telefonda/tablette "Ana Ekrana Ekle"
Yukarıdaki adresi telefonunuzun tarayıcısında açın:

**Android (Chrome):**
- Sağ üst ⋮ menü → **"Uygulamayı yükle"** veya **"Ana ekrana ekle"**

**iPhone/iPad (Safari — zorunlu, Chrome'da bu özellik yok):**
- Alt paylaş (⬆️) ikonuna dokunun → **"Ana Ekrana Ekle"**

Kurulduktan sonra uygulama simgeye dokunarak tam ekran, tarayıcı çubuğu olmadan açılır ve çevrimdışı modda da (önbelleğe alınan kısımlarıyla) çalışır.

## ⚠️ Önemli notlar
- **Konum izni**: Deprem yakınlığı ve hava durumu için konum istenir; uygulama içi bir pencere önce nedenini açıklar, tarayıcı izni ondan sonra çıkar. Reddederseniz Türkiye geneli varsayılan konumla çalışmaya devam eder.
- **Deprem sireni**: M4.5+ (yakın, ≤200km) veya M5.5+ (uzak/dünya) depremlerde tam ekran alarm + ses tetiklenir. Ses, tarayıcının "kullanıcı etkileşimi" kısıtlaması nedeniyle uygulamayı ilk açtığınızda bir yere dokunmadan çalışmayabilir — bu tarayıcı güvenlik kısıtıdır, bir kere dokunduktan sonra normal çalışır.
- **Yol/Trafik modülü** simülasyondur — gerçek zamanlı, ücretsiz bir radar/trafik veri kaynağı olmadığından içerik bir havuzdan rastgele seçilir, gerçek sürüş kararları için resmi navigasyon uygulamalarını kullanın.
- **PIN**: SHA-256 ile hashlenerek `localStorage`'da tutulur, düz metin değildir. Ancak bu istemci taraflı bir uygulama olduğundan gerçek bir hesap güvenliği sistemi yerine geçmez.

## 📂 Dosya yapısı
```
index.html          → Ana uygulama kabuğu (HTML+CSS)
js/app.js            → Tüm uygulama mantığı
manifest.json        → PWA kurulum tanımı
sw.js                → Service Worker (çevrimdışı önbellek)
icons/                → Uygulama ikonları (72px - 512px + maskable)
favicon*.png/.ico     → Tarayıcı sekmesi ikonları
site.webmanifest      → Yedek/ikincil manifest (bazı tarayıcılar için)
```

## 🗺️ Yol haritası (henüz eklenmedi)
- Çoklu kullanıcı profili (tek cihazda izole PIN'ler)
- Aile içi konum paylaşımı (açık onaylı, tek yönlü değil)
- Gerçek trafik/radar verisi (ücretli API anahtarı gerekir)
