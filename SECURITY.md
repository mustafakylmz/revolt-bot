# 🔒 Güvenlik Politikası

## 🛡️ Desteklenen Versiyonlar

Aşağıdaki versiyonlar güvenlik güncellemeleri alır:

| Version | Destekleniyor |
| ------- | ------------- |
| 1.0.x   | ✅            |
| < 1.0   | ❌            |

## 🚨 Güvenlik Açığı Bildirimi

Güvenlik açığı bulduysanız, lütfen **hemen** bize bildirin. Güvenlik sorunlarını herkese açık issue'larda **paylaşmayın**.

### 📧 İletişim

- **Email**: info@revolt.tr
- **Discord**: [Özel mesaj](#)

### 📋 Bildiri Formatı

Lütfen aşağıdaki bilgileri içeren detaylı bir rapor gönderin:

```
Güvenlik Açığı Raporu
====================

Açıklama: [Açığın kısa açıklaması]

Etki: [Potansiyel etki ve risk seviyesi]

Tekrar Etme Adımları:
1. ...
2. ...
3. ...

Sistem Bilgileri:
- OS: 
- Node.js Version:
- Browser:

Ek Bilgiler:
[Diğer önemli detaylar]
```

## ⏱️ Yanıt Süreci

1. **24 saat içinde** - İlk yanıt
2. **72 saat içinde** - Başlangıç değerlendirme
3. **7 gün içinde** - Detaylı analiz ve plan
4. **30 gün içinde** - Düzeltme ve yayın

## 🏆 Güvenlik Halleri

Güvenlik açığı bulan katkıcıları onurlandırıyoruz:

- **Hall of Fame** - README'de isim
- **Special Thanks** - Release notlarında teşekkür
- **Bug Bounty** - Ciddi açıklar için ödül (duruma göre)

## 🔐 Güvenlik En İyi Uygulamaları

### Kullanıcılar İçin

1. **Environment Variables**
   - `.env` dosyasını asla commit etmeyin
   - Güçlü ve benzersiz secret'lar kullanın
   - Production'da farklı credential'lar kullanın

2. **Bot Permissions**
   - Sadece gerekli izinleri verin
   - Düzenli olarak izinleri gözden geçirin
   - Admin izinlerini sınırlayın

3. **Database Security**
   - MongoDB connection string'ini güvenli tutun
   - IP whitelist kullanın
   - SSL/TLS bağlantı kullanın

### Geliştiriciler İçin

1. **Code Security**
   - Input validation yapın
   - SQL injection'a karşı korunun
   - XSS saldırılarına karşı önlem alın

2. **Dependencies**
   - Düzenli olarak `npm audit` çalıştırın
   - Güncel paketler kullanın
   - Güvenlik açığı olan paketleri güncelleyin

3. **API Security**
   - Rate limiting uygulayın
   - Authentication/Authorization kontrolleri yapın
   - Sensitive data'yı loglamayın

## 🚫 Yasaklı Aktiviteler

Güvenlik testleri yaparken aşağıdakiler **yasaktır**:

- Production sistemlere zarar vermek
- Kullanıcı verilerini çalmak/ifşa etmek
- DoS/DDoS saldırıları yapmak
- Social engineering
- Fiziksel güvenlik testleri

## 📚 Güvenlik Kaynakları

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Discord Bot Security](https://discord.com/developers/docs/topics/oauth2#bot-vs-user-accounts)

## 🔄 Güvenlik Güncellemeleri

- **Kritik**: Anında yayınlanır
- **Yüksek**: 1-3 gün içinde
- **Orta**: 1-2 hafta içinde
- **Düşük**: Bir sonraki minor release'de

## 📞 Acil Durum İletişimi

Kritik güvenlik sorunları için:

- **24/7 Email**: info@revolt.tr
- **Discord**: @revolttr

---

**Not**: Bu politika düzenli olarak güncellenir. Son güncelleme: 2024
