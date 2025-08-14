#!/bin/bash

# Revolt Bot Restart Script (PM2 ile)
# Bu script uygulamayı PM2 ile yeniden başlatır

echo "🔄 Revolt Bot PM2 ile yeniden başlatılıyor..."

# Dizine geç
cd "$(dirname "$0")/.."

# PM2'de uygulamayı yeniden başlat
echo "🔄 PM2'de uygulama yeniden başlatılıyor..."
npx pm2 restart revolt-bot

# Kısa bir süre bekle
sleep 3

# Durumu kontrol et
echo "📋 PM2 durumu:"
npx pm2 status

echo "🎉 Restart tamamlandı!"
