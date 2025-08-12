# 🤝 Katkıda Bulunma Rehberi

Revolt Bot projesine katkıda bulunmak istediğiniz için teşekkür ederiz! Bu rehber, projeye nasıl katkıda bulunabileceğinizi açıklar.

## 🚀 Başlangıç

1. **Repository'yi fork edin**
2. **Yerel makinenize clone edin**
   ```bash
   git clone https://github.com/yourusername/revolt-bot.git
   cd revolt-bot
   ```
3. **Bağımlılıkları yükleyin**
   ```bash
   npm install
   ```
4. **Geliştirme ortamını kurun**
   ```bash
   cp env.example .env
   # .env dosyasını düzenleyip gerekli değerleri girin
   ```

## 🛠️ Geliştirme

### Branch Stratejisi
- `main`: Stabil üretim kodu
- `develop`: Geliştirme dalı
- `feature/feature-name`: Yeni özellikler
- `bugfix/bug-name`: Hata düzeltmeleri
- `hotfix/fix-name`: Acil düzeltmeler

### Yeni Özellik Ekleme
1. `develop` dalından yeni bir branch oluşturun:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/amazing-feature
   ```

2. Kodunuzu yazın ve test edin
3. Commit mesajlarınızı anlamlı yazın:
   ```bash
   git commit -m "feat: add amazing new feature"
   ```

4. Push edin ve Pull Request oluşturun:
   ```bash
   git push origin feature/amazing-feature
   ```

### Commit Mesaj Formatı
Conventional Commits formatını kullanıyoruz:

- `feat:` - Yeni özellik
- `fix:` - Hata düzeltmesi
- `docs:` - Dokümantasyon değişiklikleri
- `style:` - Kod formatı değişiklikleri
- `refactor:` - Kod yeniden düzenleme
- `test:` - Test ekleme/düzenleme
- `chore:` - Diğer değişiklikler

## 🧪 Test Etme

```bash
# Linting
npm run lint

# Build test
npm run build

# Development server
npm run dev
```

## 📋 Pull Request Süreci

1. **Açıklayıcı bir başlık yazın**
2. **Değişiklikleri detaylandırın**
3. **Test edildiğinden emin olun**
4. **Screenshots ekleyin** (UI değişiklikleri için)
5. **Breaking changes varsa belirtin**

### Pull Request Template
```markdown
## 📝 Açıklama
Bu PR'da neler değişti?

## 🧪 Test
Nasıl test edildi?

## 📸 Screenshots
(Varsa UI değişikliklerinin ekran görüntüleri)

## ✅ Checklist
- [ ] Kod test edildi
- [ ] Linting geçti
- [ ] Dokümantasyon güncellendi
- [ ] Breaking changes belirtildi
```

## 🐛 Hata Bildirimi

GitHub Issues kullanarak hata bildirebilirsiniz:

1. **Mevcut issue'ları kontrol edin**
2. **Detaylı açıklama yazın**
3. **Hata adımlarını listeleyin**
4. **Sistem bilgilerini paylaşın**
5. **Ekran görüntüleri ekleyin**

### Issue Template
```markdown
## 🐛 Hata Açıklaması
Hata ne?

## 🔄 Tekrar Etme Adımları
1. ...
2. ...
3. ...

## 💻 Sistem Bilgileri
- OS: 
- Node.js: 
- Browser: 

## 📸 Ekran Görüntüleri
(Varsa)
```

## 📚 Kod Standartları

### TypeScript
- Tip tanımlamaları kullanın
- Interface'leri tercih edin
- JSDoc yorumları ekleyin

### React/Next.js
- Functional component'ler kullanın
- Hooks'u doğru şekilde kullanın
- Server/Client component'leri ayırın

### Styling
- Tailwind CSS kullanın
- Responsive tasarım yapın
- Accessibility standartlarına uyun

## 🆘 Yardım

- **Discord**: [Discord Sunucumuz](#)
- **Email**: info@revolt.tr
- **Documentation**: [Dokümantasyon](#)

## 🎉 Teşekkürler

Her türlü katkıya açığız:
- 🐛 Hata raporları
- 💡 Özellik önerileri
- 📝 Dokümantasyon iyileştirmeleri
- 🧪 Test yazma
- 🎨 UI/UX iyileştirmeleri
- 🌍 Çeviri katkıları

Katkılarınız için şimdiden teşekkür ederiz! 🙏
