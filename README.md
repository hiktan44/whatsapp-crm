# WhatsApp CRM Sistemi

Modern WhatsApp tabanlı müşteri ilişkileri yönetim sistemi. Gerçek WhatsApp Web entegrasyonu ile toplu mesaj gönderimi, kişi yönetimi ve AI asistan özellikleri.

## 🚀 Özellikler

### 📱 **Gerçek WhatsApp Web Entegrasyonu**
- QR kod ile WhatsApp Web bağlantısı
- Otomatik kişi ve grup senkronizasyonu
- Gerçek zamanlı mesaj gönderimi
- Oturum kalıcılığı

### 📊 Dashboard
- Gerçek zamanlı istatistikler
- Mesaj gönderim trendi grafikleri
- Son aktiviteler takibi
- Performans metrikleri

### 📋 Kişi Yönetimi
- WhatsApp kişilerinden otomatik çekme
- Grup bazlı organizasyon
- Arama ve filtreleme
- Toplu işlemler

### 📤 Toplu Gönderim (Bulk Sender)
- **Alıcı Seçenekleri:**
  - Tüm kişilere gönderim
  - WhatsApp gruplarına gönderim
  - Özel kişi seçimi
  - Manuel telefon numarası girişi
  
- **Yeni Mesaj Özellikleri:**
  - 📧 **10 Profesyonel Şablon** (İş, Finans, Pazarlama, Destek)
  - 📝 **Gelişmiş Değişken Sistemi:**
    - `{isim}` - Sadece ilk isim
    - `{soyisim}` - Sadece soyisim  
    - `{isim} {soyisim}` - Tam isim
    - `{tarih}` - Günün tarihi
  - 🎯 **Hitap Seçici:** Sayın, Sevgili, Değerli
  - 📎 **Gelişmiş Medya Desteği** (250MB'a kadar, çoklu dosya)
  - ⚠️ **Abonelikten Çıkma Sistemi:**
    - Otomatik abonelik iptal linki
    - Abonelikten çıkan kişilere uyarı etiketi
    - Gönderim öncesi onay sistemi
  
- **Kullanıcı Deneyimi:**
  - 💬 **Chat-style mesaj kutusu** (her yönden büyütülebilir)
  - 🚀 **Hızlı Ekle Butonları** (imleç pozisyonuna ekleme)
  - 📱 **Tam responsive tasarım**
  - ⚡ **Gerçek zamanlı önizleme**
  
- **Güvenlik ve Kontrol:**
  - Akıllı gecikme sistemi (10, 100, 300, 500 mesaj sonrası)
  - Mesaj önizleme
  - Detaylı ilerleme takibi
  - Anti-spam koruması

### 🤖 AI Asistan
- Otomatik müşteri yanıtları
- Randevu yönetimi
- Mesaj buffer sistemi
- RAG tabanlı bilgi bankası

### 📝 Gelişmiş Şablon Sistemi
- 🎯 **10 Profesyonel Şablon:**
  - 🏢 İş Teklifi
  - 💰 Ödeme Hatırlatması
  - 🚀 Ürün Lansmanı
  - 📅 Toplantı Hatırlatması
  - 🛠️ Müşteri Desteği
  - 👋 Hoş Geldin Mesajı
  - 📦 Sipariş Onayı
  - 🎉 Bayram Tebriği
  - 💬 Geri Bildirim Talebi
  - 🎪 Etkinlik Davetiyesi
- 📂 **Kategori Filtreleme:** İş, Finans, Pazarlama, Destek, Sosyal
- 📝 **Manuel Yazım Seçeneği**
- 🎨 **Modern Modal Arayüz**
- 📱 **Responsive Tasarım**

### 📈 Analitik
- Gönderim raporları
- Başarı oranları
- Performans analizi

## 🛠️ Teknolojiler

- **Backend:** Node.js, Express.js, Netlify Functions
- **Database:** Supabase (PostgreSQL)
- **Real-time:** Supabase Realtime + Socket.IO
- **WhatsApp:** WhatsApp Web.js
- **AI Integration:** Model Context Protocol (MCP)
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Deployment:** Netlify + Supabase
- **Authentication:** Supabase Auth

## 📁 Dosya Yapısı

```
whatsapp-crm/
├── index.html          # Ana arayüz
├── styles.css          # CSS stilleri
├── script.js           # Frontend JavaScript
├── whatsapp-server.js  # WhatsApp Web.js sunucusu
├── ai-assistant.js     # AI asistan modülü
├── package.json        # Node.js bağımlılıkları
└── README.md           # Proje dokümantasyonu
```

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- Node.js (v16+)
- NPM (v8+)
- Modern web tarayıcısı

### 1. Bağımlılıkları Yükle
```bash
npm install
```

### 2. Environment Variables
```bash
cp env.example .env
# .env dosyasını ihtiyaçlarınıza göre düzenleyin
```

### 3. Sunucuyu Başlat
```bash
npm start

# Veya geliştirme modu için
npm run dev

# Demo mod için
npm run demo
```

### 4. WhatsApp Bağlantısı
1. Web arayüzünü açın: `http://localhost:3025/index.html`
2. **"WhatsApp'a Bağlan"** butonuna tıklayın
3. QR kodu telefonunuzla tarayın:
   - WhatsApp → ⋮ → **Bağlı Cihazlar** → **Cihaz Bağla**
   - QR kodu tarayın

### 5. Bağlantıyı Test Et
```bash
npm test
```

## 🌐 Deployment

### Netlify Deployment
1. **GitHub'a Push:**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Netlify'de Deploy:**
   - Netlify Dashboard'a gidin
   - "New site from Git" seçin
   - GitHub repository'sini seçin
   - Build settings:
     - Build command: `npm install`
     - Publish directory: `./`
   - Environment variables ekleyin:
     - `NODE_ENV=production`
     - `PORT=3025`

3. **Custom Domain (Opsiyonel):**
   - Netlify Dashboard → Domain settings
   - Custom domain ekleyin

### Environment Variables
Production için gerekli environment variables:
- `NODE_ENV=production`
- `PORT=3025`
- `WHATSAPP_CLIENT_ID=whatsapp-crm-client`
- `CORS_ORIGIN=*` (production'da specific domain kullanın)

## 💡 Kullanım Kılavuzu

### 1. WhatsApp'a Bağlanma
- Sağ üstteki "WhatsApp'a Bağlan" butonuna tıklayın
- Gerçek uygulamada QR kod ile WhatsApp Web bağlantısı kurulur

### 2. Kişi Ekleme
- Sol menüden "Kişiler" sekmesine gidin
- "Kişi Ekle" butonuna tıklayın
- Gerekli bilgileri doldurun ve kaydedin

### 3. Toplu Mesaj Gönderimi
- "Toplu Gönderim" sekmesine gidin
- Alıcıları seçin (Tümü/Grup/Özel)
- Mesajınızı yazın veya şablon seçin
- Medya ekleyin (opsiyonel)
- Gönderim ayarlarını yapın
- "Önizleme" ile kontrol edin
- "Gönder" butonuna tıklayın

### 4. Şablon Oluşturma
- "Şablonlar" sekmesine gidin
- "Yeni Şablon" butonuna tıklayın
- Şablon içeriğini oluşturun
- Değişkenleri kullanın: `{isim}`, `{telefon}`, `{tarih}`

## 🎯 Yeni Değişken Sistemi

Mesajlarınızda aşağıdaki değişkenleri kullanabilirsiniz:

### 📝 Temel Değişkenler
- `{isim}` - Sadece ilk isim (örn: "Ahmet")
- `{soyisim}` - Sadece soyisim (örn: "Yılmaz")
- `{isim} {soyisim}` - Tam isim (örn: "Ahmet Yılmaz")
- `{tarih}` - Bugünün tarihi (örn: "24.08.2025")

### 🎯 Hitap Seçenekleri
- **Sayın** → "Sayın {isim},"
- **Sevgili** → "Sevgili {isim},"
- **Değerli** → "Değerli {isim},"

### 🚀 Hızlı Ekle Butonları
Artık değişkenleri **imleç pozisyonuna** ekleyebilirsiniz:
- 👤 **İsim** butonu
- 👥 **İsim Soyisim** butonu
- 📅 **Tarih** butonu
- 📝 **Hitap Seçici** dropdown

**Örnek Kullanım:**
```
Sayın {isim},

🎉 {tarih} tarihli özel kampanyamızdan haberdar olmak istedik!

📞 Detaylar için bizi arayabilirsiniz.

Saygılarımızla,
{isim} {soyisim} için özel hazırlanmıştır.
```

## ⚙️ Gönderim Ayarları

### Gönderim Hızı
- **Normal:** 1 mesaj/saniye
- **Yavaş:** 1 mesaj/2 saniye (daha güvenli)
- **Hızlı:** 2 mesaj/saniye

### Güvenlik Özellikleri
- Rastgele gecikme ekleme
- Anti-spam koruması
- Gönderim limitleri

## 🎨 Tasarım Özellikleri

- **Responsive:** Tüm cihazlarda uyumlu
- **WhatsApp Teması:** Resmi WhatsApp renkleri
- **Modern UI:** Kullanıcı dostu arayüz
- **Animasyonlar:** Smooth geçişler
- **Dark Mode:** Yakında gelecek

## 🔒 Güvenlik

- XSS koruması
- CSRF koruması
- Veri validasyonu
- Güvenli dosya yükleme

## 📱 Responsive Tasarım

- **Desktop:** Full özellik desteği
- **Tablet:** Optimize edilmiş layout
- **Mobile:** Touch-friendly arayüz

## 🐛 Bilinen Sorunlar

- Gerçek WhatsApp API entegrasyonu gerekiyor
- Dosya yükleme boyut limiti: 16MB
- Safari'de bazı CSS özellikleri farklı görünebilir

## 

- [ ] WhatsApp Business API entegrasyonu
- [ ] Gerçek zamanlı mesaj durumu takibi
- [ ] Excel/CSV import/export
- [ ] Dark mode desteği
- [ ] Multi-language desteği
- [ ] Advanced analytics
- [ ] Webhook desteği
- [ ] Chatbot entegrasyonu



Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakınız.

## 📞 İletişim

- **Email:** info@example.com
- **Website:** https://example.com
- **GitHub:** https://github.com/username/whatsapp-crm


- WhatsApp resmi tasarım kılavuzu
- Font Awesome icon library
- Open source topluluğu

---

**⚠️ Önemli Not:** Bu uygulama WhatsApp'ın resmi API'sini kullanmamaktadır. Gerçek kullanım için WhatsApp Business API entegrasyonu gereklidir. WhatsApp'ın kullanım şartlarına uygun olarak kullanın.