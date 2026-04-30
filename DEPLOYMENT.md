# 🚀 Revolt Bot Deployment Rehberi

Bu rehber, Revolt Bot uygulamasının Docker ile nasıl kurulacağını ve yönetileceğini açıklar.

## 📋 Gereksinimler

- Docker ve Docker Compose yüklü
- Git repository erişimi
- SSH erişimi (sunucu deploy için)

## 🐳 Docker ile Kurulum

### 1. Sistem Başlatma

```bash
cd /home/revoltbot/htdocs/bot.revolt.tr
./scripts/docker-startup.sh
```

Bu script:
- Eski Docker imagelarını temizler
- Uygulamayı build eder
- Docker image oluşturur
- MongoDB ve botu Docker Compose ile başlatır
- Health check yapar

### 2. Manuel Kontrol

```bash
# Containerları başlat
docker-compose up -d

# Containerları durdur
docker-compose down

# Logları takip et
docker-compose logs -f

# Durumu kontrol et
docker ps
```

## 🤖 GitHub Actions (Otomatik Deploy)

GitHub'a kod gönderildiğinde otomatik olarak:
1. Testler çalışır
2. Docker image build edilir
3. GitHub Container Registry'ye push edilir
4. Sunucuya deploy edilir

### Gerekli Secrets

GitHub repo settings'de these secrets'leri ekleyin:
- `SSH_PRIVATE_KEY`: Sunucuya SSH için private key
- `SERVER_HOST`: Sunucu IP/hostname
- `SSH_USER`: SSH kullanıcı adı
- `SERVER_KNOWN_HOSTS`: SSH known hosts

## 🔄 Manuel Güncelleme

### 1. GitHub'dan Güncellemeleri Çek

```bash
cd /home/revoltbot/htdocs/bot.revolt.tr
git pull origin main
```

### 2. Deploy Script Çalıştır

```bash
./scripts/server-deploy.sh
```

## 🖥️ Sunucu Reboot Sonrası Otomatik Başlatma

systemd servisi kurulu değilse:

```bash
# Servis dosyasını kopyala
sudo cp /home/revoltbot/htdocs/bot.revolt.tr/scripts/revolt-bot.service /etc/systemd/system/

# Servisi aktif et
sudo systemctl daemon-reload
sudo systemctl enable revolt-bot
sudo systemctl start revolt-bot

# Durumu kontrol et
sudo systemctl status revolt-bot
```

## 📁 Önemli Dosyalar ve Dizinler

- `.env` - Çevre değişkenleri (GitHub'a gönderilmez!)
- `docker-compose.yml` - Docker Compose yapılandırması
- `Dockerfile` - Docker image build yapılandırması
- `logs/` - Uygulama logları
- `mongodb/init/` - MongoDB başlangıç scriptleri
- `scripts/docker-startup.sh` - Docker başlatma scripti
- `scripts/server-deploy.sh` - Sunucu deployment scripti
- `scripts/revolt-bot.service` - systemd servisi

## 🔧 Sorun Giderme

### Uygulama Başlamıyorsa

1. Docker durumunu kontrol edin:
```bash
docker ps -a
docker logs revolt-bot
docker logs revolt-bot-mongodb
```

2. Health check yapın:
```bash
curl -f http://localhost:3000/api/health
```

3. Compose loglarını takip edin:
```bash
docker-compose logs -f
```

### Build Hatası

1. Node modules'ı temizleyin:
```bash
rm -rf node_modules
npm install
```

2. Docker image'ı rebuild edin:
```bash
docker-compose build --no-cache
```

### Port Çakışması

Başka bir uygulama 3000 portunu kullanıyorsa:
```bash
# Port kullanan process'i bul
lsof -i :3000
```

## 🌐 Web Erişimi

- Local: http://localhost:3000
- Web: https://bot.revolt.tr

## 📝 Önemli Notlar

- `.env` dosyası asla GitHub'a gönderilmez!
- MongoDB verileri `mongodb_data` volume'ünde saklanır
- Docker-compose `profiles` ile Traefik isteğe bağlı
- Health check 30 saniyede bir yapılır

## 🆘 Destek

Sorun yaşarsanız:
1. Log dosyalarını kontrol edin: `docker-compose logs`
2. Git durumunu kontrol edin: `git status`
3. Container durumunu kontrol edin: `docker ps -a`