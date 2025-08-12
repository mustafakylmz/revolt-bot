# 🤖 Revolt Bot - Discord Bot Yönetim Paneli

[![Next.js](https://img.shields.io/badge/Next.js-14.2.5-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.17.0-green?logo=mongodb)](https://www.mongodb.com/)
[![Discord.js](https://img.shields.io/badge/Discord.js-14.21.0-5865F2?logo=discord)](https://discord.js.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Bu proje, Discord sunucuları için güçlü rol yönetimi ve Faceit entegrasyonu sunan modern bir **web tabanlı bot yönetim sistemi**dir. Tamamen **herkese açık** ve **ücretsiz** olarak kullanılabilir.

## 🚀 Özellikler

- **Rol Yönetimi**: Kullanıcılar kendi rollerini seçebilir ve yönetebilir
- **Faceit Entegrasyonu**: Otomatik Faceit seviye kontrolü ve rol ataması
- **Web Dashboard**: Modern ve kullanıcı dostu arayüz
- **Discord OAuth**: Güvenli Discord ile giriş
- **7/24 Otomatik Güncelleme**: Faceit seviyeleri günlük olarak kontrol edilir
- **Herkese Açık**: Herkesin kullanabileceği açık bot sistemi

## 🛠️ Kurulum

### Gereksinimler

- Node.js 18+
- MongoDB
- Discord Bot Token
- Faceit API Key

### Adımlar

1. **Proje dosyalarını indirin**
   ```bash
   git clone <repository-url>
   cd revolt-bot
   ```

2. **Bağımlılıkları yükleyin**
   ```bash
   npm install
   ```

3. **Çevre değişkenlerini ayarlayın**
   ```bash
   cp env.example .env
   ```
   `.env` dosyasını düzenleyip gerekli değerleri girin.

4. **Discord komutlarını kaydedin**
   ```bash
   npm run register-commands
   ```

5. **Uygulamayı başlatın**
   ```bash
   # Geliştirme modu
   npm run dev

   # Üretim modu
   npm run build
   npm start
   ```

## 🎮 Discord Bot Kurulumu

1. [Discord Developer Portal](https://discord.com/developers/applications) adresine gidin
2. Yeni bir uygulama oluşturun
3. Bot sekmesine gidin ve bir bot oluşturun
4. Bot tokenını kopyalayın ve `.env` dosyasına ekleyin
5. OAuth2 URL Generator'dan bot linkini oluşturun:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Manage Roles`

## 📋 Discord Komutları

- `/send-role-panel [kanal]` - Rol seçim paneli gönderir
- `/refresh-role-panel` - Rol panelini günceller
- `/faceit-role-button` - Faceit rol talep butonunu gönderir

## 🌐 Web Dashboard

Bot kurulduktan sonra web dashboard'una `http://localhost:3000` adresinden erişebilirsiniz.

### Dashboard Özellikleri

- Discord ile güvenli giriş
- Sunucu seçimi ve yönetimi
- Rol ayarları yapılandırması
- Faceit seviye rol eşleştirmeleri
- Bot durumu izleme

## 🔧 API Endpoints

- `POST /api/interactions` - Discord bot interactions
- `GET /api/discord/guilds` - Kullanıcının sunucuları
- `GET /api/guilds/[guildId]/config` - Sunucu ayarları
- `POST /api/guilds/[guildId]/config` - Sunucu ayarlarını güncelle

## 🗄️ Veritabanı Yapısı

### guild_configs
```javascript
{
  guildId: String,
  configurableRoleIds: [String],
  faceitLevelRoles: Object,
  roleEmojiMappings: Object,
  rolePanelChannelId: String,
  rolePanelMessageId: String
}
```

### faceit_users
```javascript
{
  discordId: String,
  guildId: String,
  faceitNickname: String,
  faceitLevel: Number,
  assignedRoleId: String,
  lastUpdated: Date
}
```

## 🚀 Deployment

### Otomatik Deployment (Önerilen)

Bu proje GitHub Actions ile otomatik deployment destekler:

1. **GitHub Secrets Ayarlayın:**
   ```
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
   npm run deploy:setup-cron
   ```

3. **GitHub'a Push Yapın:**
   ```bash
   git push origin main
   # Otomatik olarak build, test ve deploy edilir
   ```

### Docker ile Deployment

```bash
# Docker ile çalıştırma
npm run docker:build
npm run docker:run

# Docker Compose ile (MongoDB dahil)
npm run docker:compose:up

# Logları görme
npm run docker:compose:logs
```

### Manuel Deployment

```bash
# Build ve start
npm run build
npm start

# Veya PM2 ile
pm2 start ecosystem.config.js
```

### Vercel Deployment

1. Projeyi GitHub'a yükleyin
2. Vercel'e bağlayın
3. Çevre değişkenlerini ekleyin
4. Deploy edin

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

- GitHub Issues açın
- Discord sunucumuzda soru sorun
- E-posta: info@revolt.tr

## 🎯 Roadmap

- [ ] Daha fazla oyun entegrasyonu
- [ ] Gelişmiş rol yönetimi
- [ ] Sunucu istatistikleri
- [ ] Çoklu dil desteği
- [ ] Mobile responsive iyileştirmeler

---

**Not**: Bu bot herkese açıktır ve ücretsiz olarak kullanılabilir. Kendi sunucunuzda barındırabilir veya mevcut hosted versiyonu kullanabilirsiniz.
