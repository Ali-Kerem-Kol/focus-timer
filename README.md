# 📱 Focus Timer Uygulaması  
React Native / Expo kullanılarak geliştirilmiş bir odaklanma takip uygulamasıdır.  
Bu proje, “Mobil Uygulama Geliştirme” dersi kapsamında verilen ödeve uygun şekilde  
MVP gereksinimlerini (%100) karşılayacak şekilde tasarlanmıştır.

Uygulama; zamanlayıcı, kategori seçimi, dikkat dağınıklığı takibi, seans kaydı,  
istatistiksel raporlama ve grafiksel gösterimler içerir.

---

## 🧭 İçindekiler
- [Özellikler](#özellikler)
- [Kullanılan Teknolojiler](#kullanılan-teknolojiler)
- [Proje Mimarisi](#proje-mimarisi)
- [Kurulum ve Çalıştırma](#kurulum-ve-çalıştırma)
- [Uygulama Ekranları](#uygulama-ekranları)
- [Veri Yapısı (AsyncStorage)](#veri-yapısı-asyncstorage)
- [Geliştirici Notları](#geliştirici-notları)

---

## ⭐ Özellikler

### 🕒 1. Odaklanma Zamanlayıcısı
- Kullanıcı süreyi **dakika + saniye** olarak kendi belirler.
- Kategori seçmeden sayaç başlatılamaz.
- Süre bitince bir uyarı verilir ve **seans özeti** gösterilir.

### 📱 2. AppState ile Dikkat Dağınıklığı Takibi
- Uygulamadan çıkıldığında timer otomatik durdurulur.
- Bu durum **dikkat dağınıklığı** olarak işaretlenir.

### 🔄 3. Seans Kaydı
Her odaklanma seansı, otomatik olarak `AsyncStorage` içine kaydedilir:

- Kategori  
- Toplam süre  
- Dikkat dağınıklığı sayısı  
- Seans tarih-saat bilgisi  

### 📊 4. Raporlama Ekranı
Rapor ekranında:

- Bugünkü toplam süre  
- Uygulamanın toplam kullanımı  
- Toplam dikkat dağınıklığı  
- Geçmiş tüm seansların listesi  

### 📈 5. Grafikler
Rapor ekranında iki adet grafik bulunur:

#### 📌 5.1 Son 7 Gün Bar Chart  
Her gün için toplam odaklanma süresi (dakika).

#### 📌 5.2 Kategori Dağılımı Pie Chart  
(Örn. ders, kodlama, proje, kitap)

---

## 🛠 Kullanılan Teknolojiler

| Teknoloji | Açıklama |
|----------|----------|
| **React Native** | Mobil uygulama geliştirme |
| **Expo Router** | Navigasyon ve sayfa yapısı |
| **AsyncStorage** | Kalıcı veri saklama |
| **react-native-chart-kit** | Bar & Pie grafikler |
| **AppState API** | Uygulama odak değişimlerini yakalama |
| **TypeScript** | Güvenli ve ölçeklenebilir kodlama |

---

## 📂 Proje Mimarisi



app/
├─ (tabs)/
│ ├─ index.tsx → Zamanlayıcı ekranı
│ ├─ explore.tsx → Raporlar ekranı (statistik + grafikler)
│ └─ _layout.tsx → Tab yapısı
├─ components/ → Ortak UI bileşenleri
├─ assets/ → Görseller
└─ ... (expo yapı dosyaları)


### 🧠 Akış Şeması (Flow)


Süre belirle → Kategori seç → Timer çalışır
↓
AppState değişirse dikkat dağınıklığı +1
↓
Süre biter → Seans özeti → Seans kaydedilir
↓
Rapor ekranı → İstatistikler + Grafikler


---

## ⚙️ Kurulum ve Çalıştırma

### 1️⃣ Depoyu klonla


git clone <repo-link>
cd focus-timer


### 2️⃣ Bağımlılıkları yükle


npm install


### 3️⃣ Mobilde çalıştır


npx expo start


QR kodu Expo Go uygulaması ile tarayarak çalıştırabilirsin.

---

## 📱 Uygulama Ekranları

### ▶️ Zamanlayıcı Ekranı
- Kategori seçimi  
- Dakika/saniye girişi  
- Dikkat dağınıklığı göstergesi  
- Başlat / Durdur / Sıfırla  

### 📊 Raporlar Ekranı
- Bugünkü kullanım süresi  
- Toplam kullanım süresi  
- Toplam dikkat dağınıklığı  
- **Son 7 gün bar chart**  
- **Kategori dağılımı pie chart**  
- Geçmiş seanslar listesi  

---

## 🗄 Veri Yapısı (AsyncStorage)

Seanslar şu formatta saklanır:

```json
{
  "id": "17023423423",
  "category": "ders",
  "duration": 900,
  "distractions": 1,
  "finishedAt": "2024-12-11T14:21:00.000Z"
}

Tüm seanslar "FOCUS_SESSIONS" anahtarında tutulur.