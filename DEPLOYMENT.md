# 🚀 Revolt Bot Deployment Rehberi

Bu rehber, Revolt Bot uygulamasının nasıl güncelleneceğini ve yönetileceğini açıklar.

## 📋 Gereksinimler

- Node.js 18+ yüklü
- Git repository erişimi
- SSH erişimi

## 🔄 Manuel Güncelleme

### 1. GitHub'dan Güncellemeleri Çek

```bash
cd /home/musteriler/domains/bot.revolt.tr/public_html
git pull origin main
```

### 2. Bağımlılıkları Güncelle

```bash
npm install
```

### 3. Uygulamayı Build Et

```bash
npm run build
```

### 4. Uygulamayı Yeniden Başlat

```bash
# Eski process'i durdur
pkill -f "npm start"

# Yeni process'i başlat
nohup npm start > app.log 2>&1 &
```

## 🤖 Otomatik Güncelleme

### Deployment Script Kullanımı

```bash
./scripts/deploy.sh
```

Bu script otomatik olarak:
- GitHub'dan güncellemeleri çeker
- Bağımlılıkları günceller
- Uygulamayı build eder
- Uygulamayı yeniden başlatır

### Cron Job ile Otomatik Güncelleme

Her saat başı güncelleme kontrolü için:

```bash
# Cron job ekle
crontab -e

# Aşağıdaki satırı ekle:
0 * * * * /home/musteriler/domains/bot.revolt.tr/public_html/scripts/auto-update.sh
```

## 📁 Önemli Dosyalar

- `.env` - Çevre değişkenleri (GitHub'a gönderilmez)
- `app.log` - Uygulama log'ları
- `update.log` - Güncelleme log'ları
- `scripts/deploy.sh` - Deployment script'i
- `scripts/auto-update.sh` - Otomatik güncelleme script'i

## 🔧 Sorun Giderme

### Uygulama Başlamıyorsa

1. Log dosyasını kontrol edin:
```bash
tail -f app.log
```

2. Process'leri kontrol edin:
```bash
ps aux | grep node
```

3. Port kullanımını kontrol edin:
```bash
netstat -tlnp | grep :3000
```

### Build Hatası

1. Node modules'ı temizleyin:
```bash
rm -rf node_modules
npm install
```

2. Next.js cache'ini temizleyin:
```bash
rm -rf .next
npm run build
```

## 🌐 Web Erişimi

Uygulama başarıyla çalıştıktan sonra:
- Local: http://localhost:3000
- Web: https://bot.revolt.tr (DirectAdmin ayarlarından sonra)

## 📝 Notlar

- `.env` dosyası asla GitHub'a gönderilmez
- Güncelleme sırasında uygulama kısa süreliğine durur
- Log dosyaları otomatik olarak oluşturulur
- Script'ler hata durumunda otomatik olarak temizlik yapar

## 🆘 Destek

Sorun yaşarsanız:
1. Log dosyalarını kontrol edin
2. Git durumunu kontrol edin: `git status`
3. Process'leri kontrol edin: `ps aux | grep node`
