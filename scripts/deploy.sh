#!/bin/bash

# Revolt Bot Deployment Script (PM2 ile)
# Bu script GitHub'dan güncellemeleri çeker ve uygulamayı PM2 ile yeniden başlatır

set -e

echo "🚀 Revolt Bot Deployment başlatılıyor (PM2 ile)..."

# Mevcut dizine geç
cd "$(dirname "$0")/.."

# Git durumunu kontrol et
echo "📋 Git durumu kontrol ediliyor..."
git status

# GitHub'dan güncellemeleri çek
echo "⬇️ GitHub'dan güncellemeler çekiliyor..."
git fetch origin

# Mevcut branch'i kontrol et
CURRENT_BRANCH=$(git branch --show-current)
echo "🌿 Mevcut branch: $CURRENT_BRANCH"

# Uzak branch ile karşılaştır
if git rev-list HEAD...origin/$CURRENT_BRANCH --count | grep -q "0"; then
    echo "✅ Güncelleme yok, zaten güncel"
    exit 0
fi

# PM2'de uygulamayı durdur
echo "⏹️ PM2'de uygulama durduruluyor..."
npx pm2 stop revolt-bot

# Değişiklikleri çek
echo "🔄 Değişiklikler çekiliyor..."
git pull origin $CURRENT_BRANCH

# Bağımlılıkları güncelle
echo "📦 Bağımlılıklar güncelleniyor..."
npm install

# Uygulamayı build et
echo "🔨 Uygulama build ediliyor..."
npm run build

# PM2 ile uygulamayı yeniden başlat
echo "🚀 PM2 ile uygulama başlatılıyor..."
npx pm2 start ecosystem.config.js

# Başlatma için bekle
sleep 5

# Health check
echo "🏥 Health check yapılıyor..."
if curl -f http://localhost:3000/ > /dev/null 2>&1; then
    echo "✅ Uygulama başarıyla başlatıldı!"
    echo "🌐 URL: http://localhost:3000"
    echo "📋 PM2 durumu:"
    npx pm2 status
else
    echo "❌ Uygulama başlatılamadı!"
    echo "📋 PM2 log'ları:"
    npx pm2 logs revolt-bot --lines 10
    exit 1
fi

# PM2 durumunu kaydet
echo "💾 PM2 durumu kaydediliyor..."
npx pm2 save

echo "🎉 Deployment tamamlandı!"
