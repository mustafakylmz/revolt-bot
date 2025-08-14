#!/bin/bash

# Revolt Bot Startup Script (PM2 ile)
# Bu script uygulamayı PM2 ile başlatır ve gerekli kontrolleri yapar

set -e

echo "🚀 Revolt Bot PM2 ile başlatılıyor..."

# Dizine geç
cd "$(dirname "$0")/.."

# PM2 durumunu kontrol et
if npx pm2 list | grep -q "revolt-bot"; then
    echo "⚠️ Uygulama zaten PM2'de çalışıyor"
    npx pm2 status
    exit 0
fi

# Uygulama build edilmiş mi kontrol et
if [ ! -d ".next" ]; then
    echo "🔨 Uygulama build ediliyor..."
    npm run build
fi

# PM2 ile uygulamayı başlat
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

echo "🎉 Startup tamamlandı!"
