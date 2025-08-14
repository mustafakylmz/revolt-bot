#!/bin/bash

# Revolt Bot Stop Script (PM2 ile)
# Bu script uygulamayı PM2 ile güvenli bir şekilde durdurur

echo "⏹️ Revolt Bot PM2 ile durduruluyor..."

# Dizine geç
cd "$(dirname "$0")/.."

# PM2'de uygulama çalışıyor mu kontrol et
if ! npx pm2 list | grep -q "revolt-bot"; then
    echo "⚠️ Uygulama PM2'de çalışmıyor"
    exit 0
fi

# PM2'de uygulamayı durdur
echo "🛑 PM2'de uygulama durduruluyor..."
npx pm2 stop revolt-bot

# Kısa bir süre bekle
sleep 2

# Hala çalışan process var mı kontrol et
if npx pm2 list | grep -q "revolt-bot.*online"; then
    echo "⚠️ Uygulama hala çalışıyor, force stop yapılıyor..."
    npx pm2 delete revolt-bot
fi

echo "✅ Uygulama başarıyla durduruldu!"
