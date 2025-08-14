#!/bin/bash

# Revolt Bot Deployment Script
# Bu script GitHub'dan güncellemeleri çeker ve uygulamayı yeniden başlatır

set -e

echo "🚀 Revolt Bot Deployment başlatılıyor..."

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

# Uygulamayı durdur
echo "⏹️ Uygulama durduruluyor..."
pkill -f "npm start" || true
pkill -f "node.*next" || true
sleep 2

# Değişiklikleri çek
echo "🔄 Değişiklikler çekiliyor..."
git pull origin $CURRENT_BRANCH

# Bağımlılıkları güncelle
echo "📦 Bağımlılıklar güncelleniyor..."
npm install

# Uygulamayı build et
echo "🔨 Uygulama build ediliyor..."
npm run build

# Uygulamayı başlat
echo "🚀 Uygulama başlatılıyor..."
nohup npm start > app.log 2>&1 &

# Başlatma için bekle
sleep 5

# Health check
echo "🏥 Health check yapılıyor..."
if curl -f http://localhost:3000/ > /dev/null 2>&1; then
    echo "✅ Uygulama başarıyla başlatıldı!"
    echo "🌐 URL: http://localhost:3000"
else
    echo "❌ Uygulama başlatılamadı!"
    echo "📋 Log dosyasını kontrol edin: tail -f app.log"
    exit 1
fi

echo "🎉 Deployment tamamlandı!"
