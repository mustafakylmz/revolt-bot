# 🤖 Revolt Bot - Discord Bot Yönetim Paneli

Next.js TypeScript MongoDB Discord.js License: MIT

Bu proje, Discord sunucuları için güçlü rol yönetimi ve Faceit entegrasyonu sunan modern bir **web tabanlı bot yönetim sistemi**dir. Tamamen **herkese açık** ve **ücretsiz** olarak kullanılabilir.

## 🚀 Özellikler

* **Rol Yönetimi**: Kullanıcılar kendi rollerini seçebilir ve yönetebilir
* **Faceit Entegrasyonu**: Otomatik Faceit seviye kontrolü ve rol ataması
* **Web Dashboard**: Modern ve kullanıcı dostu arayüz
* **Discord OAuth**: Güvenli Discord ile giriş
* **7/24 Otomatik Güncelleme**: Faceit seviyeleri günlük olarak kontrol edilir
* **Herkese Açık**: Herkesin kullanabileceği açık bot sistemi

## 🛠️ Kurulum

### Gereksinimler

* Node.js 18+
* MongoDB
* Discord Bot Token
* Faceit API Key

### Adımlar

1. **Proje dosyalarını indirin**  
```bash
git clone https://github.com/mustafakylmz/revolt-bot.git
cd revolt-bot
```

2. **Bağımlılıkları yükleyin**  
```bash
npm install
```

3. **Çevre değişkenlerini ayarlayın**  
```bash
cp env.example .env
# .env dosyasını düzenleyip gerekli değerleri girin
```

4. **Uygulamayı build edin**  
```bash
npm run build
```

5. **Uygulamayı başlatın**  
```bash
npm start
```

## 🔧 Yönetim Script'leri

### Startup Script
```bash
./scripts/startup.sh
```
Uygulamayı başlatır ve gerekli kontrolleri yapar.

### Stop Script
```bash
./scripts/stop.sh
```
Uygulamayı güvenli bir şekilde durdurur.

### Restart Script
```bash
./scripts/restart.sh
```
Uygulamayı yeniden başlatır.

### Status Script
```bash
./scripts/status.sh
```
Uygulama durumunu detaylı olarak raporlar.

### Deployment Script
```bash
./scripts/deploy.sh
```
GitHub'dan güncellemeleri çeker ve uygulamayı yeniden başlatır.

### Auto-Update Script
```bash
./scripts/auto-update.sh
```
Cron ile çalıştırılarak otomatik güncelleme yapar.

## 🌐 Web Dashboard

Bot kurulduktan sonra web dashboard'una `http://localhost:3000` adresinden erişebilirsiniz.

### Dashboard Özellikleri

* Discord ile güvenli giriş
* Sunucu seçimi ve yönetimi
* Rol ayarları yapılandırması
* Faceit seviye rol eşleştirmeleri
* Bot durumu izleme

## 🔄 Otomatik Güncelleme

### Cron Job Ekleme

DirectAdmin üzerinden cron job ekleyin:

1. DirectAdmin → Advanced Features → Cron Jobs
2. Add Cron Job
3. Zamanlama: `0 * * * *` (her saat başı)
4. Command: `/home/musteriler/domains/bot.revolt.tr/public_html/scripts/auto-update.sh`

### Manuel Güncelleme

```bash
./scripts/deploy.sh
```

## 📋 Discord Komutları

* `/send-role-panel [kanal]` - Rol seçim paneli gönderir
* `/refresh-role-panel` - Rol panelini günceller
* `/faceit-role-button` - Faceit rol talep butonunu gönderir

## 🔧 API Endpoints

* `POST /api/interactions` - Discord bot interactions
* `GET /api/discord/guilds` - Kullanıcının sunucuları
* `GET /api/guilds/[guildId]/config` - Sunucu ayarları
* `POST /api/guilds/[guildId]/config` - Sunucu ayarlarını güncelle

## 🗄️ Veritabanı Yapısı

### guild_configs
```json
{
  "guildId": "String",
  "configurableRoleIds": ["String"],
  "faceitLevelRoles": "Object",
  "roleEmojiMappings": "Object",
  "rolePanelChannelId": "String",
  "rolePanelMessageId": "String"
}
```

### faceit_users
```json
{
  "discordId": "String",
  "guildId": "String",
  "faceitNickname": "String",
  "faceitLevel": "Number",
  "assignedRoleId": "String",
  "lastUpdated": "Date"
}
```

## 🚀 Deployment

### Otomatik Deployment (Önerilen)

Bu proje GitHub Actions ile otomatik deployment destekler:

1. **GitHub Secrets Ayarlayın:**  
```bash
DEPLOY_WEBHOOK_URL: https://your-server.com/api/deploy  
DEPLOY_TOKEN: your-secure-deployment-token  
```

2. **Sunucuda Deployment Ayarlayın:**  
```bash
# .env dosyasını oluşturun  
cp env.production .env  
# Değerleri düzenleyin  
# Deployment token'ını ayarlayın  
export DEPLOY_TOKEN="your-secure-deployment-token"  
# Auto-update cron job'ını kurun  
crontab -e
# 0 * * * * /home/musteriler/domains/bot.revolt.tr/public_html/scripts/auto-update.sh
```

3. **GitHub'a Push Yapın:**  
```bash
git push origin main  
# Otomatik olarak build, test ve deploy edilir
```

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🆘 Destek

Herhangi bir sorunuz veya probleminiz varsa:

* GitHub Issues açın
* Discord sunucumuzda soru sorun
* E-posta: info@revolt.tr

## 🎯 Roadmap

* Daha fazla oyun entegrasyonu
* Gelişmiş rol yönetimi
* Sunucu istatistikleri
* Çoklu dil desteği
* Mobile responsive iyileştirmeler

---

**Not**: Bu bot herkese açıktır ve ücretsiz olarak kullanılabilir. Kendi sunucunuzda barındırabilir veya mevcut hosted versiyonu kullanabilirsiniz.
