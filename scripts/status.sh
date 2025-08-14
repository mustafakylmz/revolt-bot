#!/bin/bash

# Revolt Bot Status Script (PM2 ile)
# Bu script uygulama durumunu PM2 üzerinden detaylı olarak raporlar

echo "📊 Revolt Bot Durum Raporu (PM2)"
echo "=================================="

# Dizine geç
cd "$(dirname "$0")/.."

# Git durumu
echo "🌿 Git Durumu:"
git status --porcelain | head -5
if [ $? -eq 0 ]; then
    echo "✅ Git repository erişilebilir"
    CURRENT_BRANCH=$(git branch --show-current)
    echo "📍 Mevcut branch: $CURRENT_BRANCH"
    echo "📅 Son commit: $(git log -1 --format='%h - %s (%cr)')"
else
    echo "❌ Git repository erişilemiyor"
fi

echo ""

# PM2 durumu
echo "🔄 PM2 Durumu:"
if npx pm2 list | grep -q "revolt-bot"; then
    echo "✅ Uygulama PM2'de çalışıyor"
    echo "📋 PM2 detayları:"
    npx pm2 show revolt-bot | grep -E "(status|uptime|memory|cpu|restarts)"
else
    echo "❌ Uygulama PM2'de çalışmıyor"
fi

echo ""

# Port durumu
echo "🌐 Port Durumu:"
if ss -tlnp | grep -q ":3000"; then
    echo "✅ Port 3000 aktif"
    PORT_INFO=$(ss -tlnp | grep ":3000")
    echo "📋 Port bilgisi: $PORT_INFO"
else
    echo "❌ Port 3000 pasif"
fi

echo ""

# Disk kullanımı
echo "💾 Disk Kullanımı:"
DISK_USAGE=$(du -sh . | cut -f1)
echo "📁 Proje boyutu: $DISK_USAGE"

echo ""

# PM2 log dosyaları
echo "📋 PM2 Log Dosyaları:"
if [ -d "logs" ]; then
    for log_file in logs/*.log; do
        if [ -f "$log_file" ]; then
            LOG_SIZE=$(du -h "$log_file" | cut -f1)
            echo "📄 $(basename "$log_file"): $LOG_SIZE"
            echo "🕐 Son güncelleme: $(stat -c %y "$log_file")"
        fi
    done
else
    echo "❌ Logs dizini bulunamadı"
fi

echo ""

# Health check
echo "🏥 Health Check:"
if curl -f http://localhost:3000/ > /dev/null 2>&1; then
    echo "✅ Web sayfası erişilebilir"
    RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null http://localhost:3000/)
    echo "⚡ Yanıt süresi: ${RESPONSE_TIME}s"
else
    echo "❌ Web sayfası erişilemiyor"
fi

echo ""
echo "=================================="
echo "📊 Durum raporu tamamlandı!"
